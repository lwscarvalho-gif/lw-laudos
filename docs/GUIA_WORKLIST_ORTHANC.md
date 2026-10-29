# Guia Completo: Servidor DICOM Modality Worklist (MWL) Local com Orthanc

Este documento detalha o procedimento técnico honesto e realista para viabilizar a **Modality Worklist (DICOM MWL)** para o **LW Laudos / Sistema Médico Multiperfil** em clínicas onde não há servidor MWL disponível (como na Gastroimagem e na Clínica Principal).

---

## 1. Contexto Clínico e Princípio da Realidade Técnica

### O Problema Físico da Nuvem vs. Aparelho de Ultrassonografia

1. Os aparelhos de ultrassonografia (GE LOGIQ/Voluson, Philips EPIQ/Affiniti, Mindray DC/TE, Samsung Medison, SonoSite) utilizam o protocolo DICOM padrão sobre portas de rede local (normalmente TCP 104 ou 4242) disparando mensagens de consulta `C-FIND-RQ`.
2. Servidores em nuvem pública (Web apps convencionais) **não abrem portas TCP raw diretamente na intranet da clínica** nem possuem roteamento nativo sem VPN complexa e cara.
3. Se o radiologista tentar apontar o aparelho de ultrassom para um endereço da nuvem diretamente, o aparelho apresentará erro de timeout de rede (`C-FIND Failed` ou `Association Rejected`).

### A Solução Arquitetural Recomendada

Instalar um servidor DICOM leve e gratuito de código aberto (**Orthanc**) em um computador local dentro da rede da clínica, acompanhado do plugin oficial `Worklists`, e alimentá-lo através de um **Agente de Ponte (MWL Bridge)** fornecido no repositório (`tools/mwl_bridge/bridge.py`).

```text
[ LW Laudos Nuvem ]
       │
       ▼ (HTTPS REST / Token individual por médico)
[ Agente bridge.py ] (Computador local na clínica / notebook do médico)
       │
       ├────────────────────────────────────────┐
       ▼ (Modo 1: REST API /worklists)           ▼ (Modo 2: Arquivos .wl atômicos)
[ Servidor Orthanc Local ] <───────────── [ Pasta de Worklists ]
(Plugin Worklists Oficial)                 (/var/lib/orthanc/worklists ou C:\lw-laudos\...\worklists)
(Porta DICOM 104 / AE Title: LW-ORTHO)
       ▲
       │ (DICOM C-FIND SCP na rede local)
[ Aparelhos de Ultrassom ] (Saevo FT412, GE, Philips, Mindray, Samsung, SonoSite)
```

---

## 2. Instalação e Configuração do Orthanc Local na Clínica

O Orthanc pode ser instalado em Windows, Linux ou via Docker em um computador que fique ligado durante o horário de atendimento da clínica (pode ser o mesmo micro da recepção ou um mini PC dedicado).

### Opção A: Instalação via Docker (Recomendada para Linux / Windows com WSL2)

Crie um arquivo `docker-compose.yml` na máquina local:

```yaml
version: '3.8'

services:
  orthanc:
    image: orthancteam/orthanc:latest
    container_name: orthanc-mwl
    restart: unless-stopped
    ports:
      - '4242:4242' # Porta DICOM padrão do Orthanc (ou 104:104)
      - '8042:8042' # Interface Web REST do Orthanc
    volumes:
      - ./orthanc.json:/etc/orthanc/orthanc.json:ro
      - ./worklists:/var/lib/orthanc/worklists
    environment:
      - ORTHANC__NAME=ORTHANC_CLINICA
```

### Configuração do Plugin Worklists no `orthanc.json`

No arquivo de configuração do Orthanc (`orthanc.json`), certifique-se de habilitar o plugin de worklists:

```json
{
  "Name": "ORTHANC_MWL",
  "DicomAet": "ORTHANC",
  "DicomPort": 104,
  "DicomCheckCalledAet": false,
  "Worklists": {
    "Enable": true,
    "Database": "/var/lib/orthanc/worklists",
    "FilterFields": {
      "PatientID": true,
      "PatientName": true,
      "AccessionNumber": true,
      "Modality": true,
      "ScheduledProcedureStepStartDate": true
    }
  }
}
```

---

## 3. Configuração do Agente de Ponte (`bridge.py`)

O agente de ponte gerencia o ciclo de vida completo dos exames (criação, atualização e remoção ao cancelar/concluir):

- **Criação**: Gera entrada na worklist com AccessionNumber determinístico (`LW-YYYYMMDD-XXXX`).
- **Atualização**: Quando um agendamento é editado na agenda (horário, paciente, observações, status), a entrada no Orthanc é imediatamente atualizada.
- **Remoção**: Quando cancelado ou concluído, a entrada é removida da worklist, mantendo o console do ultrassom limpo.
- **Resiliência**: Tratamento claro de token revogado ou falha de rede com backoff exponencial automático.

### Modos de Operação Suportados:

1. **REST API Direta do Orthanc**: se o Orthanc tiver o plugin Worklists com REST ativado, a ponte comunica via HTTP (`POST /worklists/create`, `PUT /worklists/{id}` e `DELETE /worklists/{id}`).
2. **Sistema de Arquivos + DCMTK**: compila arquivos `.wl` com substituição atômica na pasta vigiada pelo Orthanc.

### Requisitos no computador da clínica:

1. Python 3.10+ (ou >= 3.8):
   ```bash
   pip install -r tools/mwl_bridge/requirements.txt
   ```
2. Ferramentas DCMTK (necessário para o utilitário `dump2dcm` no modo arquivo):
   - **Ubuntu/Debian**: `sudo apt install dcmtk`
   - **Windows**: Baixar binários DCMTK do site oficial dcmtk.org e adicionar a pasta `bin` às Variáveis de Ambiente (`PATH`).

### Execução do Agente:

Gere o Token MWL em **Configurações → Worklist DICOM** no sistema LW Laudos e inicie o agente:

```bash
python3 tools/mwl_bridge/bridge.py \
  --url "https://app.lwlaudos.com.br" \
  --token "SEU_TOKEN_GERADO_NO_SISTEMA" \
  --clinic "Gastroimagem" \
  --worklist-dir "./worklists" \
  --orthanc-url "http://localhost:8042" \
  --interval 30
```

Para validar a prontidão e testar o ciclo de vida do Orthanc de ponta a ponta:

```bash
python3 tools/mwl_bridge/VERIFICAR.py
```

---

## 4. Operação em Duas Clínicas (Gastroimagem e Clínica Principal)

Como o médico radiologista trabalha em **duas clínicas distintas** e nenhuma expõe MWL para ele:

1. **Na Gastroimagem**:
   - Computador da Gastroimagem roda uma instância Orthanc local.
   - O agente de ponte roda com o argumento `--clinic "Gastroimagem"`.
   - Apenas os pacientes e horários agendados para a Gastroimagem aparecem no aparelho daquela unidade.
2. **Na Clínica Principal**:
   - Computador da Clínica Principal roda outra instância Orthanc local.
   - O agente roda com `--clinic "Clínica Principal"`.
   - Apenas os exames da Clínica Principal são carregados.
3. **Privacidade e Isolamento**:
   - A agenda na nuvem é unificada na visão do médico, mas física e logicamente segregada nas clínicas locais.
   - O token MWL pertence unicamente à conta do médico (isolamento por `owner_id`), garantindo que outros médicos não acessem os agendamentos dele.

---

## 5. Configuração dos Aparelhos de Ultrassom por Fabricante

Abaixo estão os parâmetros típicos de configuração no console de cada fabricante.

> **Importante / Transparência**: Os menus variam conforme a versão do software interno de cada aparelho. Estes dados baseiam-se nos manuais de conformidade DICOM (DICOM Conformance Statements) dos fabricantes e exigem validação in loco pelo operador do equipamento.

### 1. GE Healthcare (LOGIQ P9 / E9 / S8 / Voluson E8 / Versana)

1. Pressione a tecla **Utility** ou **Configurações** no console.
2. Navegue até **Connectivity** (Conectividade) → aba **Dataflow** ou **DICOM**.
3. Em _DICOM Services_, selecione **Worklist (MWL)**.
4. Preencha:
   - **Service Name**: `ORTHANC_MWL`
   - **IP Address**: IP fixo do computador do Orthanc na rede local (ex.: `192.168.1.150`)
   - **Port**: `104` (ou `4242`)
   - **AE Title (Called AE)**: `ORTHANC`
   - **Local AE Title (Calling AE)**: Nome do aparelho (ex.: `LOGIQ_US01`)
5. Clique em **Ping / Echo (C-ECHO)** para testar a comunicação.
6. Na tela de início do exame (Patient), pressione o botão **Search Worklist** ou **Worklist**.

### 2. Philips (EPIQ 5/7, Affiniti 50/70, Lumify)

1. Pressione **Setups** → **Network / Print Setup** → **DICOM Setup**.
2. Clique em **Add Service** e selecione o tipo **Modality Worklist**.
3. Configure:
   - **Alias**: `Orthanc MWL`
   - **Server IP**: IP local do Orthanc
   - **Port Number**: `104`
   - **Server AE Title**: `ORTHANC`
4. Habilite o envio de caracteres em UTF-8 ou Latin-1 (`Specific Character Set`).
5. Realize o teste com **Verify**.
6. No botão **Patient**, clique em **Worklist Query**.

### 3. Mindray (DC-70, DC-80, Resona, TE7)

1. Pressione **Setup** no teclado e vá em **Network / DICOM** → aba **DICOM**.
2. Selecione o serviço **Worklist** na lista e clique em **Add** / **Property**.
3. Defina:
   - **Device Name**: `Orthanc`
   - **IP Address**: IP da máquina local
   - **Port**: `104`
   - **AE Title**: `ORTHANC`
4. Na tela de Paciente, selecione a aba **Worklist** e clique em **Query** (Consulta).

### 4. Samsung Medison (WS80A, HS70A, V8, RS85)

1. Vá em **Admin** → **Connectivity** → **DICOM**.
2. Em _Server List_, adicione o servidor com a função **Worklist**.
3. Preencha IP, Porta (`104`) e AE Title (`ORTHANC`).
4. Em _Worklist Search Criteria_, defina a consulta para buscar a data atual (`Today`) e modalidade `US`.

### 5. Fujifilm Sonosite (Edge II, PX, M-Turbo)

1. Pressione **System** → **DICOM Setup** → **Worklist**.
2. Configure o IP do servidor local, porta e AE Title.
3. Em **Query Mode**, escolha automático ao iniciar exame ou manual.

---

## 6. Solução de Problemas Comuns (Troubleshooting)

- **Erro `Connection Refused` no aparelho**:
  - Verifique o Firewall do Windows na máquina do Orthanc: a porta TCP 104 (ou 4242) deve ter regra de entrada liberada para a sub-rede da clínica.
- **Caracteres com acentuação incorreta no aparelho (ex.: Ç, Ã, É)**:
  - No `bridge.py`, a tag `(0008,0005)` está configurada para `ISO_IR 192` (UTF-8). Se o aparelho for muito antigo e exigir Latin-1, configure para `ISO_IR 100`.
- **Aparelho não lista exames de dias anteriores**:
  - É o comportamento normal do C-FIND. O aparelho envia filtro da data do dia (`ScheduledProcedureStepStartDate = YYYYMMDD`).
- **Nenhum exame retornado**:
  - Verifique se o agendamento no LW Laudos está com o status `Agendado`, `Confirmado` ou `Em atendimento` e se o nome da clínica confere com o parâmetro `--clinic`.
