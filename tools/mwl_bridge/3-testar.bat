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
    echo [AVISO] .venv local nao encontrado, tentando python global...
    python "%~dp0VERIFICAR.py"
    goto fim
)

%VENV_PY% %VERIF_PY%

:fim
echo.
pause
