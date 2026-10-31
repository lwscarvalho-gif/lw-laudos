#!/usr/bin/env bash
# ==============================================================================
# LW LAUDOS - INICIALIZADOR DO BACKEND POCKETBASE LOCAL (LINUX / MACOS)
# Para desenvolvimento e testes locais de banco de dados offline
# ==============================================================================

set -e

DATA_DIR="${HOME}/.local/share/LWLaudos/pb_data"
MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../pocketbase/migrations" && pwd)"
HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../pocketbase/hooks" && pwd)"
PORT=8090

mkdir -p "$DATA_DIR"

echo "====================================================================="
echo "[LW LAUDOS] Iniciando backend PocketBase local..."
echo "Diretório de Dados: $DATA_DIR"
echo "Migrações: $MIGRATIONS_DIR"
echo "Porta: http://127.0.0.1:$PORT"
echo "====================================================================="

if command -v pocketbase >/dev/null 2>&1; then
    pocketbase serve --dir="$DATA_DIR" --migrationsDir="$MIGRATIONS_DIR" --hooksDir="$HOOKS_DIR" --http="127.0.0.1:$PORT"
elif [ -f "$(dirname "${BASH_SOURCE[0]}")/pocketbase" ]; then
    "$(dirname "${BASH_SOURCE[0]}")/pocketbase" serve --dir="$DATA_DIR" --migrationsDir="$MIGRATIONS_DIR" --hooksDir="$HOOKS_DIR" --http="127.0.0.1:$PORT"
else
    echo "[ERRO] Binário pocketbase não encontrado no PATH ou em bin/pocketbase."
    echo "Baixe de https://pocketbase.io/docs/ e coloque em bin/pocketbase"
    exit 1
fi
