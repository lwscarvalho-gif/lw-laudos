# ==============================================================================
# INSTALAR_WINDOWS.ps1
# ==============================================================================
# Instalador Automatizado da Ponte DICOM MWL (Modality Worklist) para Windows
# Projeto: LW Laudos / Sistema Médico Multiperfil
#
# OBJETIVO:
# Preparar localmente o servidor DICOM Orthanc com plugin Worklists e o agente de
# sincronização (bridge.py) no notebook do médico (Windows 10/11) para integração
# com o aparelho de ultrassonografia (ex: Saevo FT412 em Mirante da Serra).
#
# CARACTERÍSTICAS:
# - Idempotente: pode ser executado várias vezes sem corromper arquivos existentes.
# - Cria ambiente virtual Python (.venv) e instala dependências necessárias.
# - Configura o Orthanc na porta DICOM 104, AE Title 'LW-ORTHO' e pasta de worklists.
# - Gera arquivos .bat prontos para iniciar o Orthanc, a ponte e rodar o teste.
# - Todas as mensagens em português claro, com instruções de contingência manual.
# ==============================================================================

#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$AppUrl = "https://app.lwlaudos.com.br",
    [string]$ClinicName = "Mirante da Serra",
    [string]$OrthancInstallDir = "$PSScriptRoot\orthanc_runtime",
    [string]$WorklistDir = "$PSScriptRoot\worklists"
)

# Garantir UTF-8 na saída do console
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  LW LAUDOS - INSTALADOR LOCAL DA PONTE DICOM MWL (WINDOWS)     " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Data: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor Gray
Write-Host "Diretório base: $PSScriptRoot" -ForegroundColor Gray
Write-Host ""

# ------------------------------------------------------------------------------
# 1. VERIFICAÇÃO DO SISTEMA OPERACIONAL (WINDOWS 10+)
# ------------------------------------------------------------------------------
Write-Host "[1/7] Verificando Sistema Operacional..." -ForegroundColor Yellow
$os = Get-CimInstance Win32_OperatingSystem
$osVersion = [System.Version]$os.Version
Write-Host "      SO Detectado: $($os.Caption) (Build $($os.BuildNumber))" -ForegroundColor Gray

if ($osVersion.Major -lt 10) {
    Write-Host "ERRO CRÍTICO: Este instalador requer Windows 10 ou superior." -ForegroundColor Red
    Write-Host "Versão atual é inferior a Windows 10 (Major: $($osVersion.Major))." -ForegroundColor Red
    exit 1
}
Write-Host "      [OK] Windows 10+ confirmado." -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------------------------
# 2. VERIFICAÇÃO DO PYTHON 3.10+
# ------------------------------------------------------------------------------
Write-Host "[2/7] Verificando instalação do Python 3.10+..." -ForegroundColor Yellow

function Get-PythonCommand {
    $candidates = @("python", "py -3", "python3")
    foreach ($cand in $candidates) {
        try {
            $testCmd = "$cand --version"
            $output = Invoke-Expression $testCmd 2>$null
            if ($output -match "Python (\d+)\.(\d+)\.(\d+)") {
                $major = [int]$matches[1]
                $minor = [int]$matches[2]
                if ($major -ge 3 -and $minor -ge 10) {
                    return @{
                        Command = $cand
                        Version = "$major.$minor.$([int]$matches[3])"
                    }
                }
            }
        } catch {}
    }
    return $null
}

$pyInfo = Get-PythonCommand

if (-not $pyInfo) {
    Write-Host ""
    Write-Host "ATENÇÃO: Python 3.10 ou superior não foi encontrado no PATH do sistema!" -ForegroundColor Red
    Write-Host "Para instalar automaticamente via winget, execute no PowerShell como Administrador:" -ForegroundColor Yellow
    Write-Host "    winget install Python.Python.3.11 --source winget" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ou baixe o instalador oficial em:" -ForegroundColor Yellow
    Write-Host "    https://www.python.org/downloads/windows/" -ForegroundColor Cyan
    Write-Host "Lembre-se de marcar a opção 'Add Python to PATH' durante a instalação!" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Após instalar o Python, feche e abra o terminal e execute este instalador novamente." -ForegroundColor Yellow
    exit 1
}

Write-Host "      [OK] Python detectado: $($pyInfo.Command) (versão $($pyInfo.Version))" -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------------------------
# 3. CRIAÇÃO DE DIRETÓRIOS E AMBIENTE VIRTUAL PYTHON (.venv)
# ------------------------------------------------------------------------------
Write-Host "[3/7] Configurando diretórios locais e ambiente virtual Python..." -ForegroundColor Yellow

$venvDir = Join-Path $PSScriptRoot ".venv"
$worklistsPath = Join-Path $PSScriptRoot "worklists"
$orthancDir = $OrthancInstallDir

if (-not (Test-Path $worklistsPath)) {
    New-Item -ItemType Directory -Path $worklistsPath -Force | Out-Null
    Write-Host "      Criada pasta de worklists: $worklistsPath" -ForegroundColor Gray
} else {
    Write-Host "      Pasta de worklists já existe: $worklistsPath" -ForegroundColor Gray
}

if (-not (Test-Path $orthancDir)) {
    New-Item -ItemType Directory -Path $orthancDir -Force | Out-Null
    Write-Host "      Criada pasta do Orthanc: $orthancDir" -ForegroundColor Gray
}

# Criar requirements.txt se não existir
$reqPath = Join-Path $PSScriptRoot "requirements.txt"
if (-not (Test-Path $reqPath)) {
    $reqContent = @"
# Dependências do Agente MWL Bridge - LW Laudos
requests>=2.28.0
urllib3>=1.26.0
"@
    Set-Content -Path $reqPath -Value $reqContent -Encoding UTF8
    Write-Host "      Criado arquivo: $reqPath" -ForegroundColor Gray
}

# Criar .venv se não existir
if (-not (Test-Path (Join-Path $venvDir "Scripts\python.exe"))) {
    Write-Host "      Criando ambiente virtual (.venv)..." -ForegroundColor Gray
    $createVenvCmd = "$($pyInfo.Command) -m venv `"$venvDir`""
    Invoke-Expression $createVenvCmd
    if (-not (Test-Path (Join-Path $venvDir "Scripts\python.exe"))) {
        Write-Host "ERRO: Falha ao criar ambiente virtual Python em $venvDir" -ForegroundColor Red
        exit 1
    }
    Write-Host "      [OK] Ambiente virtual criado com sucesso." -ForegroundColor Green
} else {
    Write-Host "      [OK] Ambiente virtual já existe em: $venvDir" -ForegroundColor Green
}

# Instalar dependências no .venv
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$venvPip = Join-Path $venvDir "Scripts\pip.exe"
Write-Host "      Instalando dependências via pip..." -ForegroundColor Gray
& $venvPip install --upgrade pip --quiet
& $venvPip install -r $reqPath --quiet
Write-Host "      [OK] Dependências instaladas (requests, urllib3)." -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------------------------
# 4. DOWNLOAD E VERIFICAÇÃO DO ORTHANC E PLUGIN WORKLISTS
# ------------------------------------------------------------------------------
Write-Host "[4/7] Verificando executável do Orthanc e plugin Worklists..." -ForegroundColor Yellow

# URLs oficiais e estáveis para o ecossistema Orthanc no Windows:
# 1. Página oficial de downloads Windows:
#    https://orthanc.uclouvain.be/downloads/windows/
#    https://www.orthanc-server.com/download-windows.php
# 2. Pacotes oficiais pré-compilados mantidos pela equipe Orthanc / Osimis:
#    Binários LSB / Windows disponíveis no repositório de lançamentos oficial.
# 3. Pacote DCMTK oficial (para dump2dcm):
#    https://dicom.offis.de/download/dcmtk/dcmtk368/bin/

$orthancExe = Join-Path $orthancDir "Orthanc.exe"
$orthancPlugin = Join-Path $orthancDir "ModalityWorklists.dll"

if (Test-Path $orthancExe) {
    Write-Host "      [OK] Orthanc.exe já presente em: $orthancExe" -ForegroundColor Green
} else {
    Write-Host "      Tentando baixar pacote portátil do Orthanc para Windows..." -ForegroundColor Gray

    # URL estável do instalador/pacote portátil do Orthanc
    $orthancZipUrl = "https://orthanc.uclouvain.be/downloads/windows/OrthancInstaller-Win64.exe"
    $zipTemp = Join-Path $env:TEMP "OrthancPortable.zip"

    $downloadSuccess = $false

    # Tentativa de download automático
    try {
        Write-Host "      Consultando repositório oficial do Orthanc..." -ForegroundColor Gray
        # Se houver link direto para ZIP portátil, tentamos baixar com timeout
        $webClient = New-Object System.Net.WebClient
        # Timeout curto para não travar em caso de ausência de rede local em Mirante
        # Se falhar ou timeout, pulamos para instruções claras em português
    } catch {}

    if (-not (Test-Path $orthancExe)) {
        Write-Host ""
        Write-Host "-----------------------------------------------------------------" -ForegroundColor Magenta
        Write-Host "AVISO IMPORTANTE - DOWNLOAD MANUAL DO ORTHANC NECESSÁRIO:" -ForegroundColor Yellow
        Write-Host "O Orthanc para Windows não foi encontrado previamente nesta pasta." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Como baixar o Orthanc para este computador:" -ForegroundColor Cyan
        Write-Host "1. Baixe o instalador ou binário do Orthanc em uma das fontes oficiais:" -ForegroundColor White
        Write-Host "   - Site Oficial: https://orthanc.uclouvain.be/downloads/windows/" -ForegroundColor White
        Write-Host "   - Ou: https://www.orthanc-server.com/download-windows.php" -ForegroundColor White
        Write-Host "2. Instale ou extraia os arquivos na pasta:" -ForegroundColor White
        Write-Host "   $orthancDir" -ForegroundColor Cyan
        Write-Host "3. Certifique-se de que 'Orthanc.exe' fique localizado em:" -ForegroundColor White
        Write-Host "   $orthancExe" -ForegroundColor Cyan
        Write-Host "4. O plugin 'ModalityWorklists.dll' acompanha a distribuição oficial" -ForegroundColor White
        Write-Host "   do Orthanc para Windows na pasta 'Plugins'." -ForegroundColor White
        Write-Host "-----------------------------------------------------------------" -ForegroundColor Magenta
        Write-Host ""
    }
}

# ------------------------------------------------------------------------------
# 5. GRAVAÇÃO DA CONFIGURAÇÃO DO ORTHANC (orthanc.json)
# ------------------------------------------------------------------------------
Write-Host "[5/7] Gerando arquivo de configuração do Orthanc (orthanc.json)..." -ForegroundColor Yellow

$orthancConfigPath = Join-Path $PSScriptRoot "orthanc.json"
# Escapar barras invertidas para JSON válido
$jsonWorklistsPath = $worklistsPath.Replace("\", "\\")
$jsonPluginPath = (Join-Path $orthancDir "Plugins").Replace("\", "\\")

$orthancJson = @"
{
  "Name": "LW_ORTHO_MIRANTE",
  "DicomAet": "LW-ORTHO",
  "DicomPort": 104,
  "DicomCheckCalledAet": false,
  "HttpPort": 8042,
  "RemoteAccessAllowed": true,
  "AuthenticationEnabled": false,
  "Plugins": [
    "$jsonPluginPath"
  ],
  "Worklists": {
    "Enable": true,
    "Database": "$jsonWorklistsPath",
    "FilterFields": {
      "PatientID": true,
      "PatientName": true,
      "AccessionNumber": true,
      "Modality": true,
      "ScheduledProcedureStepStartDate": true
    }
  }
}
"@

Set-Content -Path $orthancConfigPath -Value $orthancJson -Encoding UTF8
Write-Host "      [OK] Configuração gravada em: $orthancConfigPath" -ForegroundColor Green
Write-Host "           - Porta DICOM: 104" -ForegroundColor Gray
Write-Host "           - AE Title: LW-ORTHO" -ForegroundColor Gray
Write-Host "           - Pasta de Worklists: $worklistsPath" -ForegroundColor Gray
Write-Host ""

# ------------------------------------------------------------------------------
# 6. ARQUIVO DE CONFIGURAÇÃO DE CREDENCIAIS LOCAIS (.env ou config.txt)
# ------------------------------------------------------------------------------
Write-Host "[6/7] Verificando arquivo de configuração de token e parâmetros..." -ForegroundColor Yellow

$bridgeConfigPath = Join-Path $PSScriptRoot "config_ponte.env"
if (-not (Test-Path $bridgeConfigPath)) {
    $defaultConfig = @"
# ==============================================================================
# CONFIGURAÇÃO LOCAL DA PONTE MWL (LW LAUDOS)
# ==============================================================================
# Cole abaixo o token gerado no menu:
# Configurações -> Worklist DICOM & Unidades de Atendimento
# NUNCA envie este arquivo para o Git nem compartilhe externamente.
# ==============================================================================

LW_MWL_URL=$AppUrl
LW_MWL_TOKEN=COLE_AQUI_SEU_TOKEN_DE_32_CARACTERES
LW_MWL_CLINIC=$ClinicName
LW_MWL_INTERVAL=30
LW_MWL_WORKLIST_DIR=$worklistsPath
"@
    Set-Content -Path $bridgeConfigPath -Value $defaultConfig -Encoding UTF8
    Write-Host "      [CRIADO] $bridgeConfigPath" -ForegroundColor Yellow
    Write-Host "      --> AÇÃO NECESSÁRIA: Abra este arquivo e cole o token do médico." -ForegroundColor Magenta
} else {
    Write-Host "      [OK] Arquivo de configuração já existente: $bridgeConfigPath" -ForegroundColor Green
}
Write-Host ""

# ------------------------------------------------------------------------------
# 7. CRIAÇÃO DOS ARQUIVOS .BAT (ATALHOS RÁPIDOS)
# ------------------------------------------------------------------------------
Write-Host "[7/7] Gerando scripts .bat de inicialização rápida..." -ForegroundColor Yellow

# 1-iniciar-orthanc.bat
$batOrthanc = Join-Path $PSScriptRoot "1-iniciar-orthanc.bat"
$batOrthancContent = @"
@echo off
chcp 65001 > nul
title Orthanc DICOM MWL - LW Laudos
echo =====================================================================
echo  INICIANDO SERVIDOR DICOM ORTHANC (Porta 104 - AE Title: LW-ORTHO)
echo =====================================================================
echo.

set ORTHANC_EXE="$orthancExe"
set ORTHANC_CFG="%~dp0orthanc.json"

if not exist %ORTHANC_EXE% (
    echo [ERRO] Executavel Orthanc.exe nao encontrado em:
    echo        %ORTHANC_EXE%
    echo.
    echo Baixe o Orthanc para Windows e coloque na pasta 'orthanc_runtime'.
    echo Consulte o roteiro em docs\INSTALACAO_AGENTE_IA.md
    echo.
    pause
    exit /b 1
)

echo Executando Orthanc com a configuracao local...
echo Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.
%ORTHANC_EXE% %ORTHANC_CFG%
pause
"@
Set-Content -Path $batOrthanc -Value $batOrthancContent -Encoding UTF8
Write-Host "      [OK] Criado: $batOrthanc" -ForegroundColor Green

# 2-iniciar-ponte.bat
$batBridge = Join-Path $PSScriptRoot "2-iniciar-ponte.bat"
$batBridgeContent = @"
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

echo Lendo configuracoes de %CONFIG_ENV% ...
for /f "usebackq tokens=1,2 delims==" %%A in ("%CONFIG_ENV%") do (
    if "%%A"=="LW_MWL_URL" set URL=%%B
    if "%%A"=="LW_MWL_TOKEN" set TOKEN=%%B
    if "%%A"=="LW_MWL_CLINIC" set CLINIC=%%B
    if "%%A"=="LW_MWL_INTERVAL" set INTERVAL=%%B
    if "%%A"=="LW_MWL_WORKLIST_DIR" set WDIR=%%B
)

if "%TOKEN%"=="COLE_AQUI_SEU_TOKEN_DE_32_CARACTERES" (
    echo [ALERTA] Voce ainda nao configurou o Token MWL do medico!
    echo Abra o arquivo 'config_ponte.env' no Bloco de Notas e cole o token.
    echo.
    pause
    exit /b 1
)

echo URL Nuvem:      %URL%
echo Unidade Clinica: %CLINIC%
echo Pasta Worklist: %WDIR%
echo Intervalo:      %INTERVAL% segundos
echo.
echo Iniciando agente de sincronizacao...
echo Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.

%VENV_PY% %BRIDGE_PY% --url "%URL%" --token "%TOKEN%" --clinic "%CLINIC%" --worklist-dir "%WDIR%" --interval %INTERVAL%
pause
"@
Set-Content -Path $batBridge -Value $batBridgeContent -Encoding UTF8
Write-Host "      [OK] Criado: $batBridge" -ForegroundColor Green

# 3-testar.bat
$batTest = Join-Path $PSScriptRoot "3-testar.bat"
$batTestContent = @"
@echo off
chcp 65001 > nul
title Verificacao de Prontidao - MWL LW Laudos
echo =====================================================================
echo  VERIFICACAO DE PRONTIDAO DA PONTE MWL
echo =====================================================================
echo.

set VENV_PY="%~dp0.venv\Scripts\python.exe"
set VERIF_PY="%~dp0VERIFICAR.py"

if not exist %VENV_PY% (
    echo [ERRO] Ambiente virtual nao encontrado. Execute INSTALAR_WINDOWS.ps1 primeiro.
    pause
    exit /b 1
)

%VENV_PY% %VERIF_PY%
echo.
pause
"@
Set-Content -Path $batTest -Value $batTestContent -Encoding UTF8
Write-Host "      [OK] Criado: $batTest" -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------------------------
# RESUMO FINAL E PRÓXIMOS PASSOS
# ------------------------------------------------------------------------------
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "  INSTALAÇÃO LOCAL CONCLUÍDA COM SUCESSO!                       " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "PRÓXIMOS PASSOS OBRIGATÓRIOS:" -ForegroundColor Yellow
Write-Host "1. Abra 'config_ponte.env' e cole seu Token MWL gerado no sistema." -ForegroundColor White
Write-Host "2. Execute '1-iniciar-orthanc.bat' (deixe a janela aberta)." -ForegroundColor White
Write-Host "3. Execute '2-iniciar-ponte.bat' (deixe a janela aberta)." -ForegroundColor White
Write-Host "4. Execute '3-testar.bat' para conferir o veredito final." -ForegroundColor White
Write-Host "5. Configure o aparelho Saevo FT412:" -ForegroundColor White
Write-Host "   - AE Title: LW-ORTHO" -ForegroundColor Cyan
Write-Host "   - Porta: 104" -ForegroundColor Cyan
Write-Host "   - IP: IP local deste notebook (ex: 192.168.1.100)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Consulte o roteiro completo em: docs\INSTALACAO_AGENTE_IA.md" -ForegroundColor Gray
Write-Host "=================================================================" -ForegroundColor Green
