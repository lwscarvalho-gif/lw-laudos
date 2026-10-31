@echo off
REM ==============================================================================
REM LW LAUDOS - SCRIPT AUTOMATIZADO DE BUILD WINDOWS (DESKTOP OFFLINE)
REM Execute este script em uma maquina Windows com Node.js e Rust instalados.
REM ==============================================================================

echo ==============================================================================
echo [LW LAUDOS] Verificando ambiente de compilacao...
echo ==============================================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado. Instale Node.js LTS de https://nodejs.org
    pause
    exit /b 1
)

where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Rust/Cargo nao encontrado. Instale Rust de https://rustup.rs
    pause
    exit /b 1
)

echo [OK] Node.js e Cargo detectados com sucesso.
echo.

if not exist "src-tauri\binaries\pocketbase-x86_64-pc-windows-msvc.exe" (
    echo [AVISO] Binario PocketBase sidecar nao encontrado em src-tauri\binaries\
    echo Por favor, coloque pocketbase-x86_64-pc-windows-msvc.exe em src-tauri\binaries\
    echo Consulte docs\COMPILACAO_WINDOWS.md para instrucoes.
    pause
    exit /b 1
)

echo [1/3] Instalando dependencias do frontend...
call npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao executar npm install.
    pause
    exit /b 1
)

echo [2/3] Compilando frontend React + Vite...
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Falha na compilacao do frontend.
    pause
    exit /b 1
)

echo [3/3] Compilando aplicativo Tauri 2 e gerando instalador NSIS...
call npx @tauri-apps/cli build
if %errorlevel% neq 0 (
    echo [ERRO] Falha na compilacao do instalador Tauri.
    pause
    exit /b 1
)

echo.
echo ==============================================================================
echo [SUCESSO] Instalador Windows gerado com sucesso!
echo Localizacao: src-tauri\target\release\bundle\nsis\
echo Pronto para distribuicao e instalacao 100% offline via pendrive.
echo ==============================================================================
pause
