@echo off
chcp 65001 > nul
title Orthanc DICOM MWL - LW Laudos
echo =====================================================================
echo  INICIANDO SERVIDOR DICOM ORTHANC (Porta 104 - AE Title: LW-ORTHO)
echo =====================================================================
echo.

set ORTHANC_EXE="%~dp0orthanc_runtime\Orthanc.exe"
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
