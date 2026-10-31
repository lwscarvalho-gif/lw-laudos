# Guia de Compilação do Instalador Windows (Tauri 2 + PocketBase Offline + IA Local)

Este documento descreve os dois métodos para compilar e gerar o instalador executável (.exe / NSIS) do **LW Laudos**:

1. **Via GitHub Actions (Recomendado — Na nuvem, sem instalar compiladores no seu PC)**
2. **Via Compilação Local em Máquina Windows 10/11**

---

## 1. Método 1: GitHub Actions (Automatizado na Nuvem)

O repositório conta com o workflow oficial `.github/workflows/build-windows.yml` que roda em máquina virtual Windows da Microsoft, instala o Rust, Node.js, obtém os binários oficiais do PocketBase e llama.cpp, baixa o modelo GGUF escolhido e empacota o instalador NSIS completo.

### Como Acionar o Workflow (Passo a Passo)

1. Acesse o repositório no GitHub: [https://github.com/lwscarvalho-gif/lw-laudos](https://github.com/lwscarvalho-gif/lw-laudos)
2. No menu superior, clique na aba **Actions**.
3. Na lista de workflows à esquerda, selecione **Build Windows Installer (NSIS)**.
4. À direita da tela, clique no botão **Run workflow**:
   - **Branch**: selecione `main` (ou a branch de release).
   - **Baixar e empacotar o modelo GGUF Qwen2.5-Instruct Q4_K_M**: marque como `true` para incluir a IA offline no instalador.
   - **Versão oficial do PocketBase**: `0.26.9` (padrão).
   - **Release tag oficial do llama.cpp**: `b4822` (padrão).
5. Clique no botão verde **Run workflow**.

### Como Baixar o Instalador Gerado

1. Aguarde a execução do pipeline (o processo leva de 8 a 15 minutos dependendo do download do modelo GGUF).
2. Quando o workflow finalizar com ícone verde de sucesso, clique sobre o card da execução.
3. No final da página, na seção **Artifacts**, localize o artefato:
   ```
   LW-Laudos-Windows-Setup-x64.zip
   ```
4. Clique para baixar o arquivo zip.
5. Descompacte o zip para obter o instalador:
   ```
   LW Laudos_0.0.54_x64-setup.exe
   ```
6. O arquivo pode ser copiado diretamente para um **pendrive** e instalado em qualquer máquina Windows 10 ou 11.

---

## 2. Método 2: Compilação Local no Windows do Proprietário

Caso prefira compilar no próprio notebook ou desktop de desenvolvimento:

### Pré-requisitos

1. **Rust e Cargo**: [https://rustup.rs](https://rustup.rs) (MSVC x64 + Visual Studio Build Tools C++).
2. **Node.js (v18+)**: [https://nodejs.org](https://nodejs.org).
3. **NSIS**: Gerenciado automaticamente pelo Tauri 2.
4. **WebView2 Runtime**: Já incluído no Windows 10/11.

### Posicionamento de Binários (Sidecars)

1. **PocketBase**: Baixe o `pocketbase_0.26.9_windows_amd64.zip` oficial. Extraia e coloque em:
   ```
   src-tauri/binaries/pocketbase-x86_64-pc-windows-msvc.exe
   ```
2. **llama-server**: Baixe o release oficial do llama.cpp para Windows x64. Extraia e coloque em:
   ```
   src-tauri/binaries/llama-server-x86_64-pc-windows-msvc.exe
   ```
3. **Modelo GGUF (Opcional para IA)**: Coloque o arquivo `qwen2.5-1.5b-instruct-q4_k_m.gguf` em:
   ```
   src-tauri/models/qwen2.5-1.5b-instruct-q4_k_m.gguf
   ```

### Executar Compilação

Na raiz do projeto:

```powershell
npm install
npm run build
npx @tauri-apps/cli build
```

O instalador NSIS gerado estará em:

```
src-tauri/target/release/bundle/nsis/LW Laudos_0.0.54_x64-setup.exe
```

---

## 3. Segurança e Segredos de Assinatura

- **Sem credenciais expostas**: O workflow não possui chaves nem dados sensíveis.
- **Assinatura de Código Opcional**: Caso configure o segredo `TAURI_SIGNING_PRIVATE_KEY` nas configurações do repositório (Settings → Secrets and variables → Actions), o Tauri assinará os executáveis. Se ausente, o pipeline degrada com aviso claro e gera o instalador self-contained perfeitamente funcional.
- **Nenhum Dado de Paciente**: O instalador não contém banco de dados de pacientes nem informações clínicas — o banco SQLite do PocketBase é criado do zero no primeiro lançamento da aplicação na máquina do médico.
