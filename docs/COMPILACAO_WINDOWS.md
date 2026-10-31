# Guia de Compilação do Instalador Windows (Tauri 2 + PocketBase Offline)

Este documento contém o passo a passo exato para compilar e gerar o instalador executável (.exe / NSIS) do **LW Laudos** em uma máquina Windows 10 ou Windows 11.

---

## 1. Pré-requisitos no Windows

Instale os seguintes componentes uma única vez na máquina de build:

1. **Rust e Cargo**
   - Baixe o instalador oficial `rustup-init.exe` em [https://rustup.rs](https://rustup.rs)
   - Durante a instalação, selecione a opção padrão (MSVC x64).
   - Requer o _Visual Studio C++ Build Tools_ (instalado automaticamente pelo rustup ou manualmente via Visual Studio Installer com a carga de trabalho "Desenvolvimento para Desktop com C++").

2. **Node.js (v18+)**
   - Baixe a versão LTS de [https://nodejs.org](https://nodejs.org).

3. **NSIS (Nullsoft Scriptable Install System)**
   - O Tauri 2 gerencia o empacotamento NSIS nativamente. Caso prefira instalar previamente, baixe de [https://nsis.sourceforge.io/](https://nsis.sourceforge.io/).

4. **WebView2 Runtime**
   - Já vem pré-instalado em todas as versões modernas do Windows 10 e Windows 11.
   - O instalador configurado no `tauri.conf.json` utiliza `webviewInstallMode: offlineInstaller` para permitir instalação offline em computadores sem conexão.

---

## 2. Preparação do Binário do PocketBase (Sidecar)

Antes de gerar o build, o executável do PocketBase para Windows precisa estar posicionado na pasta `src-tauri/binaries/`:

1. Baixe o `pocketbase_..._windows_amd64.zip` em [https://github.com/pocketbase/pocketbase/releases](https://github.com/pocketbase/pocketbase/releases).
2. Extraia o `pocketbase.exe`.
3. Renomeie o arquivo para:
   ```
   src-tauri/binaries/pocketbase-x86_64-pc-windows-msvc.exe
   ```
4. Se desejar testar a execução antes do empacotamento, coloque uma cópia também em `bin/pocketbase.exe`.

---

## 3. Comandos de Compilação

Abra o terminal (PowerShell ou Prompt de Comando) na raiz do projeto:

```powershell
# 1. Instalar dependências do frontend
npm install

# 2. Gerar o build do frontend e o instalador Windows NSIS
npm run tauri:build
```

> **Aviso de Compilação de Instalador**: O instalador `.exe` (NSIS) requer compilação nativa em máquina Windows 10/11 com Rust (`cargo`) e o pacote Visual Studio C++ Build Tools instalado. Não declare o instalador pronto sem a compilação e teste real do arquivo `.exe` gerado.

_(Ou diretamente via cargo tauri)_:

```powershell
npx @tauri-apps/cli build
```

---

## 4. Localização do Instalador Gerado

Após a compilação bem-sucedida, o instalador do Windows estará localizado em:

```
src-tauri/target/release/bundle/nsis/LW Laudos_0.0.51_x64-setup.exe
```

Este arquivo único pode ser copiado para um **pendrive** e instalado em qualquer computador com Windows 10 ou 11 sem necessidade de internet, sem Node.js e sem ferramentas de desenvolvimento.

---

## 5. Estratégia de Distribuição por Pendrive

No pendrive, organize:

1. `LW Laudos_Setup.exe` (o instalador gerado).
2. Pasta opcional `Backup_Modelos/` contendo arquivos JSON de modelos ultrassonográficos para importação inicial.
3. Pasta `Documentacao/` com o manual rápido do usuário.
