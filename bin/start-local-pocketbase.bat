@echo off
REM ==============================================================================
REM LW LAUDOS - INICIALIZADOR DO BACKEND POCKETBASE LOCAL (WINDOWS)
REM Executa o PocketBase apontando para o diretorio de dados persistente local.
REM ==============================================================================

setlocal enabledelayedexpansion

set DATA_DIR=%APPDATA%\LWLaudos\pb_data
set MIGRATIONS_DIR=%~dp0..\pocketbase\migrations
set HOOKS_DIR=%~dp0..\pocketbase\hooks
set PORT=8090
set PORT_FILE=%APPDATA%\LWLaudos\backend_port.txt

if not exist "%APPDATA%\LWLaudos" (
    mkdir "%APPDATA%\LWLaudos"
)

if not exist "%DATA_DIR%" (
    mkdir "%DATA_DIR%"
)

REM Gravar a porta ativa para comunicacao segura com o aplicativo Tauri
echo %PORT% > "%PORT_FILE%"

echo =====================================================================
echo [LW LAUDOS] Iniciando backend PocketBase local...
echo Diretorio de Dados: %DATA_DIR%
echo Migracoes: %MIGRATIONS_DIR%
echo Porta: http://127.0.0.1:%PORT%
echo =====================================================================

REM Procura binario pocketbase.exe no diretorio de instalacao ou sidecar
if exist "%~dp0pocketbase.exe" (
    "%~dp0pocketbase.exe" serve --dir="%DATA_DIR%" --migrationsDir="%MIGRATIONS_DIR%" --hooksDir="%HOOKS_DIR%" --http="127.0.0.1:%PORT%"
) else if exist "%~dp0..\src-tauri\binaries\pocketbase-x86_64-pc-windows-msvc.exe" (
    "%~dp0..\src-tauri\binaries\pocketbase-x86_64-pc-windows-msvc.exe" serve --dir="%DATA_DIR%" --migrationsDir="%MIGRATIONS_DIR%" --hooksDir="%HOOKS_DIR%" --http="127.0.0.1:%PORT%"
) else (
    echo [ERRO] Binario pocketbase.exe nao encontrado.
    echo Baixe o PocketBase para Windows (v0.22+) e posicione em bin\pocketbase.exe
    pause
    exit /b 1
)
