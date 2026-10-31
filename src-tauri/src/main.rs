// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::net::TcpListener;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, RunEvent, State};

struct SidecarState {
    pocketbase_child: Mutex<Option<Child>>,
    pocketbase_port: Mutex<u16>,
    llama_child: Mutex<Option<Child>>,
    llama_port: Mutex<u16>,
}

/// Encontra uma porta TCP livre iniciando a partir de `start_port`.
/// Evita conflitos com outros serviços locais (ex: outro PocketBase ou dev server).
fn find_free_port(start_port: u16) -> u16 {
    for port in start_port..(start_port + 100) {
        if let Ok(listener) = TcpListener::bind(("127.0.0.1", port)) {
            drop(listener);
            return port;
        }
    }
    start_port
}

/// Resolve o caminho de dados persistente no diretório do usuário:
/// Windows: %APPDATA%\LWLaudos\pb_data
/// Linux/macOS: ~/.local/share/LWLaudos/pb_data ou fallback seguro
fn resolve_persistent_pb_data_dir() -> PathBuf {
    let base_dir = dirs_or_fallback();
    let data_dir = base_dir.join("LWLaudos").join("pb_data");
    if let Err(err) = fs::create_dir_all(&data_dir) {
        eprintln!("[LW Laudos] Falha ao criar pasta de dados persistente: {:?}", err);
    }
    data_dir
}

fn dirs_or_fallback() -> PathBuf {
    if let Ok(app_data) = std::env::var("APPDATA") {
        return PathBuf::from(app_data);
    }
    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home).join(".local").join("share");
    }
    PathBuf::from(".")
}

/// Comando Tauri para o frontend checar o status e porta do PocketBase sidecar
#[tauri::command]
fn get_pocketbase_status(state: State<'_, SidecarState>) -> Result<serde_json::Value, String> {
    let port = *state.pocketbase_port.lock().map_err(|e| e.to_string())?;
    let child_guard = state.pocketbase_child.lock().map_err(|e| e.to_string())?;
    let is_running = child_guard.is_some();

    Ok(serde_json::json!({
        "running": is_running,
        "port": port,
        "url": format!("http://127.0.0.1:{}", port),
        "health_endpoint": format!("http://127.0.0.1:{}/api/health", port)
    }))
}

/// Inicia o executável do PocketBase local isolado, passando o diretório de dados persistente
fn spawn_pocketbase(app: &AppHandle, state: &SidecarState) {
    let port = find_free_port(8090);
    {
        if let Ok(mut p) = state.pocketbase_port.lock() {
            *p = port;
        }
    }

    let pb_data = resolve_persistent_pb_data_dir();
    let http_arg = format!("127.0.0.1:{}", port);
    let dir_arg = format!("{}", pb_data.display());

    // Tenta localizar o binário do sidecar empacotado pelo Tauri
    let binary_candidates = vec![
        app.path().resolve("binaries/pocketbase.exe", tauri::path::BaseDirectory::Resource).ok(),
        app.path().resolve("binaries/pocketbase", tauri::path::BaseDirectory::Resource).ok(),
        Some(PathBuf::from("src-tauri/binaries/pocketbase.exe")),
        Some(PathBuf::from("bin/pocketbase.exe")),
        Some(PathBuf::from("bin/pocketbase")),
    ];

    let mut found_bin: Option<PathBuf> = None;
    for candidate in binary_candidates.into_iter().flatten() {
        if candidate.exists() {
            found_bin = Some(candidate);
            break;
        }
    }

    if let Some(bin_path) = found_bin {
        println!("[LW Laudos] Iniciando PocketBase local em {} com dir {}", http_arg, dir_arg);
        match Command::new(bin_path)
            .arg("serve")
            .arg(format!("--http={}", http_arg))
            .arg(format!("--dir={}", dir_arg))
            .spawn()
        {
            Ok(child) => {
                if let Ok(mut guard) = state.pocketbase_child.lock() {
                    *guard = Some(child);
                }
            }
            Err(err) => {
                eprintln!("[LW Laudos] Erro ao iniciar processo PocketBase: {:?}", err);
            }
        }
    } else {
        println!("[LW Laudos] Binário do PocketBase não encontrado neste ambiente de desenvolvimento.");
    }
}

/// Encerramento seguro de subprocessos (PocketBase e Llama Server)
fn kill_sidecars(state: &SidecarState) {
    if let Ok(mut pb_guard) = state.pocketbase_child.lock() {
        if let Some(mut child) = pb_guard.take() {
            println!("[LW Laudos] Encerrando PocketBase local...");
            let _ = child.kill();
            let _ = child.wait();
        }
    }
    if let Ok(mut llama_guard) = state.llama_child.lock() {
        if let Some(mut child) = llama_guard.take() {
            println!("[LW Laudos] Encerrando Llama server...");
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

fn main() {
    let sidecar_state = SidecarState {
        pocketbase_child: Mutex::new(None),
        pocketbase_port: Mutex::new(8090),
        llama_child: Mutex::new(None),
        llama_port: Mutex::new(8080),
    };

    let app = tauri::Builder::default()
        .manage(sidecar_state)
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![get_pocketbase_status])
        .setup(|app| {
            let handle = app.handle();
            let state: State<SidecarState> = handle.state();
            spawn_pocketbase(handle, &state);
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("erro ao inicializar aplicativo Tauri LW Laudos");

    app.run(|app_handle, event| {
        if let RunEvent::ExitRequested { .. } | RunEvent::Exit = event {
            let state: State<SidecarState> = app_handle.state();
            kill_sidecars(&state);
        }
    });
}
