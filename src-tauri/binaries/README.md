# Binários Sidecar do LW Laudos (PocketBase)

Para a compilação do executável Windows e empacotamento NSIS via Tauri, o Tauri requer o binário do PocketBase nomeado com o target triple da máquina de destino:

- Windows 64-bit:
  `pocketbase-x86_64-pc-windows-msvc.exe`

- Linux 64-bit (para desenvolvimento/testes locais):
  `pocketbase-x86_64-unknown-linux-gnu`

- macOS Apple Silicon (se aplicável):
  `pocketbase-aarch64-apple-darwin`

## Como obter o executável para Windows:
1. Baixe a versão oficial do PocketBase (v0.22+ ou v0.26+) em:
   https://github.com/pocketbase/pocketbase/releases
2. Extraia o arquivo `pocketbase.exe`.
3. Renomeie para `pocketbase-x86_64-pc-windows-msvc.exe`.
4. Salve dentro desta pasta (`src-tauri/binaries/`).
5. Ao rodar `cargo tauri build`, o Tauri incluirá o PocketBase automaticamente no instalador NSIS.
