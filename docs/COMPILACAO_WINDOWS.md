# Guia de Compilação do Instalador Windows (Tauri 2 + PocketBase Offline + IA Local)

Este documento descreve os dois métodos para compilar e gerar o instalador executável (.exe / NSIS) do **LW Laudos**:

1. **Via GitHub Actions (Recomendado — Na nuvem, sem instalar compiladores no seu PC)**
2. **Via Compilação Local em Máquina Windows 10/11**

---

## 1. Método 1: GitHub Actions (Automatizado na Nuvem)

O repositório conta com o workflow oficial `.github/workflows/build-windows.yml` que roda em máquina virtual Windows da Microsoft, instala o Rust, Node.js v22 via pnpm, obtém os binários oficiais do PocketBase e llama.cpp, baixa o modelo GGUF escolhido e empacota o instalador NSIS completo.

### Pré-requisitos e Versões Auditadas Oficiais

- **PocketBase Servidor Oficial**: `v0.26.6` (a release `0.26.9` não existe no servidor oficial).
  - Arquivo: `pocketbase_0.26.6_windows_amd64.zip`
  - SHA-256 oficial: `16f5a8469431553576f8a17e25eeb060f02e7f7c95d2fd2f1d3dd5801931a33a` (extraído do `checksums.txt` oficial).
- **llama.cpp**: Release noturna fixada `b11960` (ou superior auditada).
  - Asset: `llama-b11960-bin-win-cpu-x64.zip` (compatível com qualquer PC sem GPU dedicada).
  - SHA-256 oficial do asset: `73f962f82850d244db47eaacb9d913637027b82399124324298576d58c5f4287` (verificado via API oficial do GitHub / digest).
- **Modelo GGUF**: `Qwen2.5-1.5B-Instruct-GGUF` (`qwen2.5-1.5b-instruct-q4_k_m.gguf` — licença permissiva comercial Apache 2.0).
  - SHA-256 oficial (Git LFS OID): `6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e`.
  - Divergência de hash de qualquer binário obrigatório ou modelo interrompe o build com `exit 1` (não é permitido continuar com stubs nem arquivos corrompidos).

### Como Acionar o Workflow (Ação Exata no GitHub)

1. Acesse o repositório no GitHub: [https://github.com/lwscarvalho-gif/lw-laudos](https://github.com/lwscarvalho-gif/lw-laudos)
2. No menu superior, clique na aba **Actions**.
3. Na lista de workflows à esquerda, selecione **Build Windows Installer (NSIS)**.
4. À direita da tela, clique no botão **Run workflow**:
   - **Branch**: selecione `main`.
   - **Baixar e empacotar o modelo GGUF Qwen2.5-Instruct Q4_K_M**: marque como `true` para incluir a IA offline no instalador.
   - **Versão oficial do PocketBase**: `0.26.6` (padrão corrigido).
   - **Release tag oficial do llama.cpp**: `b11960` (padrão CPU x64).
5. Clique no botão verde **Run workflow**.

### Como Baixar o Instalador Gerado

1. Aguarde a execução do pipeline (o processo leva de 8 a 15 minutos dependendo da velocidade da rede da VM para o modelo GGUF).
2. Quando o workflow finalizar com ícone verde de sucesso, clique sobre o card da execução.
3. No final da página, na seção **Artifacts**, localize o artefato:
   ```
   LW-Laudos-Windows-Setup-x64.zip
   ```
4. Clique para baixar o arquivo zip.
5. Descompacte o zip para obter o instalador:
   ```
   LW Laudos_0.0.57_x64-setup.exe
   ```
6. O arquivo pode ser copiado diretamente para um **pendrive** e instalado em qualquer máquina Windows 10 ou 11.
7. **Preservação de Dados em Atualizações**: A instalação ou atualização nunca apaga o banco de dados do usuário, pois os dados ficam persistidos no diretório `%APPDATA%\LWLaudos\pb_data`.

---

## 2. Método 2: Compilação Local no Windows do Proprietário

Caso prefira compilar no próprio notebook ou desktop de desenvolvimento:

### Pré-requisitos

1. **Rust e Cargo**: [https://rustup.rs](https://rustup.rs) (MSVC x64 + Visual Studio Build Tools C++).
2. **Node.js (v22)** e **pnpm**: [https://pnpm.io](https://pnpm.io).
3. **NSIS**: Gerenciado automaticamente pelo Tauri 2.
4. **WebView2 Runtime**: Já incluído no Windows 10/11.

### Posicionamento de Binários e Modelos (Sidecars)

1. **PocketBase**: Baixe o `pocketbase_0.26.6_windows_amd64.zip` oficial. Extraia e coloque em:
   ```
   src-tauri/binaries/pocketbase-x86_64-pc-windows-msvc.exe
   ```
2. **llama-server**: Baixe o release oficial `llama-b11960-bin-win-cpu-x64.zip`. Extraia e coloque em:
   ```
   src-tauri/binaries/llama-server-x86_64-pc-windows-msvc.exe
   ```
   Copie também as DLLs extraídas (`ggml.dll`, `llama.dll`, etc.) para a mesma pasta `src-tauri/binaries/`.
3. **Modelo GGUF (IA offline)**: Baixe `qwen2.5-1.5b-instruct-q4_k_m.gguf` oficial e coloque em:
   ```
   src-tauri/models/qwen2.5-1.5b-instruct-q4_k_m.gguf
   ```

### Executar Compilação

Na raiz do projeto:

```powershell
pnpm install --frozen-lockfile
pnpm run build
pnpm exec tauri build
```

O instalador NSIS gerado estará em:

```
src-tauri/target/release/bundle/nsis/LW Laudos_0.0.57_x64-setup.exe
```

---

## 3. Segurança e Auditoria

- **Nenhum STUB_LLAMA_SERVER**: O instalador não aceita executáveis simulados ou arquivos fictícios.
- **Tauri Sidecar**: O `main.rs` gerencia os subprocessos de forma independente, localiza portas livres dinamicamente e encerra ambos os processos ao fechar o programa.
- **Isolamento de Dados Clínicos**: O banco SQLite de pacientes permanece no `%APPDATA%\LWLaudos\pb_data` do médico, não sendo sobrescrito por novas versões do instalador.
