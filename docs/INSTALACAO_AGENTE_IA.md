# Roteiro de Instalação e Operação para Agente de IA (Notebook do Médico)

> **Destinatário deste documento**: Agente de IA autônomo ou assistente interativo (ChatGPT, Codex, Claude Code, Cursor, Copilot) rodando no notebook Windows do médico radiologista em Mirante da Serra (RO).  
> **Objetivo**: Conduzir e executar a instalação da ponte DICOM Modality Worklist (MWL) entre o LW Laudos e o aparelho de ultrassonografia **SAEVO FT412**, sem depender de conhecimento técnico do proprietário.

---

## 0. Contexto e Parâmetros da Missão

- **Repositório GitHub**: `https://github.com/lwscarvalho-gif/lw-laudos`
- **Diretório da ponte local**: `tools/mwl_bridge/`
- **Aparelho local**: Saevo FT412 (sem PACS prévio, sem servidor local, sala sem rede estruturada)
- **Topologia de rede**:
  - Notebook conectado ao **Hotspot 4G/5G do celular** (para baixar agendamentos da nuvem do app).
  - Notebook conectado ao **Saevo FT412** via cabo de rede Ethernet direto (ou mini roteador/switch local).
  - IP sugerido do notebook: `192.168.1.100` | IP do Saevo: `192.168.1.50`
  - Porta DICOM: `104` | AE Title do Orthanc: `LW-ORTHO`

---

## 1. Ordem Obrigatória de Execução

O agente de IA deve executar estritamente nesta ordem cronológica:

```text
[Passo 1] Clonar/atualizar repositório no notebook
   │
   ▼
[Passo 2] Executar o instalador automático INSTALAR_WINDOWS.ps1
   │
   ▼
[Passo 3] Orientar o médico a obter o Token MWL e colar em config_ponte.env
   │
   ▼
[Passo 4] Iniciar o servidor DICOM Orthanc (1-iniciar-orthanc.bat)
   │
   ▼
[Passo 5] Iniciar o agente da ponte (2-iniciar-ponte.bat)
   │
   ▼
[Passo 6] Executar o script de prontidão (3-testar.bat / VERIFICAR.py)
   │
   ▼
[Passo 7] Configurar o aparelho Saevo FT412 e testar consulta C-FIND
   │
   ▼
[Plano B] Se algo falhar, acionar imediatamente o modo contingência manual
```

---

## 2. Passo a Passo Detalhado para o Agente de IA

### Passo 1: Baixar ou Atualizar o Repositório

No PowerShell ou terminal do Windows:

```powershell
cd C:\
git clone https://github.com/lwscarvalho-gif/lw-laudos.git
cd C:\lw-laudos\tools\mwl_bridge
```

_Se a pasta já existir:_

```powershell
cd C:\lw-laudos
git pull origin main
cd tools\mwl_bridge
```

**Saída esperada**:
`Updating ...` ou `Already up to date.` com os arquivos `INSTALAR_WINDOWS.ps1`, `bridge.py`, `VERIFICAR.py`, etc., visíveis.

---

### Passo 2: Executar o Instalador Automatizado

Execute no PowerShell (como Administrador se for instalar Python/regras de firewall):

```powershell
powershell -ExecutionPolicy Bypass -File .\INSTALAR_WINDOWS.ps1
```

**O que o instalador faz**:

1. Valida se o Windows é versão 10 ou superior.
2. Checa se Python 3.10+ está presente (se ausente, orienta o comando `winget install Python.Python.3.11`).
3. Cria a pasta virtual Python local (`.venv`) e instala `requests>=2.28.0`.
4. Gera a configuração do Orthanc (`orthanc.json`) com AE Title `LW-ORTHO`, porta `104` e pasta de worklists.
5. Gera o arquivo de parâmetros locais `config_ponte.env`.
6. Cria os atalhos `.bat` de operação.

**Saída esperada**:

```text
=================================================================
  INSTALAÇÃO LOCAL CONCLUÍDA COM SUCESSO!
=================================================================
PRÓXIMOS PASSOS OBRIGATÓRIOS:
1. Abra 'config_ponte.env' e cole seu Token MWL gerado no sistema.
2. Execute '1-iniciar-orthanc.bat' (deixe a janela aberta).
...
```

**O que fazer se o instalador alertar sobre o Orthanc**:
Se o instalador indicar que o `Orthanc.exe` não está presente na pasta `orthanc_runtime`:

- **Ação do Agente**:
  1. Baixe o pacote oficial do Orthanc para Windows em:  
     `https://orthanc.uclouvain.be/downloads/windows/` ou `https://www.orthanc-server.com/download-windows.php`
  2. Extraia ou copie `Orthanc.exe` e a pasta `Plugins` (contendo `ModalityWorklists.dll`) para a pasta:  
     `C:\lw-laudos\tools\mwl_bridge\orthanc_runtime\`
  3. Reexecute `powershell -ExecutionPolicy Bypass -File .\INSTALAR_WINDOWS.ps1`.

---

### Passo 3: Configurar o Token do Médico em `config_ponte.env`

Solicite ao médico radiologista a seguinte ação simples na interface web:

1. No navegador do notebook, acesse o LW Laudos.
2. Navegue até **Configurações** → seção **Worklist DICOM & Unidades de Atendimento**.
3. Clique em **"Gerar Token MWL"** (ou copie o token existente de 32 caracteres).
4. Abra o arquivo `C:\lw-laudos\tools\mwl_bridge\config_ponte.env` no Bloco de Notas ou com o comando PowerShell:

```powershell
notepad .\config_ponte.env
```

Substitua a linha:

```ini
LW_MWL_TOKEN=COLE_AQUI_SEU_TOKEN_DE_32_CARACTERES
```

pelo token real copiado, por exemplo:

```ini
LW_MWL_TOKEN=a1b2c3d4e5f6789012345678abcdef01
```

E salve o arquivo (`Ctrl+S`).

> **Regra de Segurança**: NUNCA commite nem envie o arquivo `config_ponte.env` com token real para o repositório Git.

---

### Passo 4: Iniciar o Servidor DICOM Orthanc

No terminal ou dando duplo clique no arquivo:

```powershell
.\1-iniciar-orthanc.bat
```

**Saída esperada**:
Abre uma nova janela de console com logs do Orthanc indicando:

```text
W1028 ... Orthanc version ... has started
W1028 ... DICOM server listening with AET: LW-ORTHO on port: 104
W1028 ... HTTP server listening on port 8042
```

_Mantenha esta janela aberta em segundo plano._

**Fallback se a porta 104 falhar**:
Se der erro `Permission Denied` ou `Address already in use`:

1. Execute o terminal como **Administrador** (portas abaixo de 1024 no Windows às vezes exigem privilégio de rede).
2. Se houver firewall bloqueando, libere no PowerShell como Administrador:
   ```powershell
   New-NetFirewallRule -DisplayName "Orthanc DICOM 104" -Direction Inbound -LocalPort 104 -Protocol TCP -Action Allow
   ```

---

### Passo 5: Iniciar a Ponte de Sincronização

Em outra janela de terminal ou dando duplo clique:

```powershell
.\2-iniciar-ponte.bat
```

**Saída esperada**:

```text
=== Iniciando LW Laudos MWL Bridge ===
[INFO] Consultando nuvem para unidade 'Mirante da Serra'...
[INFO] Recebidos X agendamento(s) para sincronização.
[INFO] Worklist gerada: LW-20261028-XXXX.wl -> NOME^PACIENTE
```

_Mantenha esta janela aberta em segundo plano._

---

### Passo 6: Rodar a Verificação de Prontidão

Execute:

```powershell
.\3-testar.bat
```

_(ou `.venv\Scripts\python.exe VERIFICAR.py`)_

**Saída esperada de sucesso**:

```text
[✔] 1. Python instalado: v3.11.x
[✔] 2. Biblioteca 'requests' instalada
[✔] 3. Orthanc REST API respondendo em http://localhost:8042
[✔] 4. Porta DICOM TCP 104 ABERTA
[✔] 5. Plugin Worklists do Orthanc ATIVO
[✔] 6. Ciclo de vida da Worklist validado no Orthanc (criou, listou e removeu entrada sintética)
[✔] 7. Token MWL configurado localmente
[✔] 8. Conectividade com a nuvem bem-sucedida (Dr. Lucas Willian)
[✔] 9. Agendamentos recebidos da nuvem: N agendamento(s) ativo(s)

★★★★★  VEREDITO: PRONTO PARA O APARELHO!  ★★★★★
```

Se o veredito listar pendências (com símbolos `✘`), leia o item apontado e aplique a correção descrita na própria tela.

---

### Passo 7: Configuração no Aparelho SAEVO FT412

Instrua o médico a aplicar estes parâmetros no console físico do aparelho Saevo:

1. **Acessar o menu de configuração de rede**:
   - Pressione a tecla **System Setting** (ícone de engrenagem) no console.
   - Navegue até o menu **Network** (Rede).
   - Defina o IP do Saevo como estático:
     - IP: `192.168.1.50`
     - Máscara: `255.255.255.0`
     - Gateway: `192.168.1.100` (IP do notebook)
     - Local AE Title: `SAEVO_US`

2. **Cadastrar o Servidor de Worklist**:
   - No menu de configurações, vá até **DICOM Setting** → aba **Worklist**.
   - Clique em **Add** (Adicionar).
   - Preencha exatamente:
     - **Service Name**: `ORTHANC_LOCAL`
     - **AE Title (Called AE)**: `LW-ORTHO`
     - **IP Address**: `192.168.1.100` _(ou o IP atual do notebook do médico na rede cabeada)_
     - **Port**: `104`
   - Clique no botão **Ping** ou **Echo / Verify**:
     - Se responder **Success / OK**: conexão DICOM validada com sucesso!
   - Clique em **Save / Default** para torná-la a worklist padrão.

3. **Consultar o Paciente no Saevo**:
   - No teclado/console do Saevo, pressione **New Patient** (ou **Patient**).
   - Na tela do paciente, clique no botão **WorkList** (ou **Search / Query**).
   - Os pacientes agendados no LW Laudos aparecerão na lista.
   - Selecione o paciente e clique em **Transfer / Start Exam**.
   - Os dados (Nome, CPF/Patient ID, Accession Number) são transferidos para o exame sem digitação manual.

---

## 3. Plano B (Operação de Contingência em Caso de Falha da Ponte)

Se a ponte não subir a tempo ou o aparelho não comunicar pela porta DICOM:

1. **Não atrase o atendimento clínico**:
   - Pressione **New Patient** no console do Saevo FT412 e digite manualmente apenas o nome e CPF do paciente.
   - Realize o exame normalmente no aparelho.
2. **O LW Laudos funciona 100% de forma independente do MWL**:
   - No notebook (com Wi-Fi/4G do celular), acesse o app na nuvem.
   - Abra a **Agenda** ou clique em **Laudos** → **Novo Laudo**.
   - O editor estruturado de ultrassonografia, biblioteca de frases normais (`Ctrl+N`), esquemas anatômicos (Body Marks SVG) e a geração de PDF funcionam normalmente.
3. **Fotos do exame via USB**:
   - Exporte as fotos do exame do Saevo para um **pendrive USB**.
   - Insira o pendrive no notebook e anexe as fotos diretamente no gerenciador de imagens do laudo.
   - Emita e assine o laudo normalmente.
