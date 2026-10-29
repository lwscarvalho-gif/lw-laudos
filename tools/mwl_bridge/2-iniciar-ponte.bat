@echo off
chcp 65001 > nul
title Ponte MWL Nuvem-Orthanc - LW Laudos
echo =====================================================================
echo  INICIANDO PONTE MWL (Sincronizacao Nuvem -> Orthanc Local)
echo =====================================================================
echo.

set VENV_PY="%~dp0.venv\Scripts\python.exe"
set BRIDGE_PY="%~dp0bridge.py"
set CONFIG_ENV="%~dp0config_ponte.env"

if not exist %VENV_PY% (
    echo [ERRO] Ambiente virtual Python nao encontrado.
    echo Execute primeiro: powershell -ExecutionPolicy Bypass -File .\INSTALAR_WINDOWS.ps1
    pause
    exit /b 1
)

if not exist "%CONFIG_ENV%" (
    echo [ERRO] Arquivo de configuracao 'config_ponte.env' nao encontrado.
    echo Execute INSTALAR_WINDOWS.ps1 ou crie o arquivo a partir do modelo.
    pause
    exit /b 1
)

echo Lendo configuracoes de %CONFIG_ENV% ...
for /f "usebackq tokens=1,2 delims==" %%A in ("%CONFIG_ENV%") do (
    if "%%A"=="LW_MWL_URL" set URL=%%B
    if "%%A"=="LW_MWL_TOKEN" set TOKEN=%%B
    if "%%A"=="LW_MWL_CLINIC" set CLINIC=%%B
    if "%%A"=="LW_MWL_INTERVAL" set INTERVAL=%%B
    if "%%A"=="LW_MWL_WORKLIST_DIR" set WDIR=%%B
)

if "%TOKEN%"=="" (
    echo [ERRO] Token MWL esta vazio no arquivo 'config_ponte.env'.
    pause
    exit /b 1
)

if "%TOKEN%"=="COLE_AQUI_SEU_TOKEN_DE_32_CARACTERES" (
    echo [ALERTA] Voce ainda nao configurou o Token MWL do medico!
    echo Abra o arquivo 'config_ponte.env' no Bloco de Notas e cole o token.
    echo.
    pause
    exit /b 1
)

if "%WDIR%"=="" set WDIR="%~dp0worklists"
if "%INTERVAL%"=="" set INTERVAL=30

echo URL Nuvem:       %URL%
echo Unidade Clinica: %CLINIC%
echo Pasta Worklist:  %WDIR%
echo Intervalo:       %INTERVAL% segundos
echo.
echo Iniciando agente de sincronizacao...
echo Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.

%VENV_PY% %BRIDGE_PY% --url "%URL%" --token "%TOKEN%" --clinic "%CLINIC%" --worklist-dir "%WDIR%" --orthanc-url "http://localhost:8042" --interval %INTERVAL%
pause
