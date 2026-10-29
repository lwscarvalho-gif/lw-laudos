# Guia Prático de Teste de Campo: SAEVO FT412 em Mirante da Serra

> **ATENÇÃO / INSTALAÇÃO RÁPIDA POR AGENTE DE IA**:  
> Se o notebook do médico for configurado por um agente de IA (ChatGPT, Codex, Claude Code, Cursor) ou precisar de instalação automatizada sem comandos manuais, utilize diretamente:
>
> - **Roteiro para Agente de IA**: [`docs/INSTALACAO_AGENTE_IA.md`](INSTALACAO_AGENTE_IA.md)
> - **Instalador Automatizado Windows**: [`tools/mwl_bridge/INSTALAR_WINDOWS.ps1`](../tools/mwl_bridge/INSTALAR_WINDOWS.ps1)
> - **Atalhos Prontos**: `1-iniciar-orthanc.bat`, `2-iniciar-ponte.bat`, `3-testar.bat` e script de verificação `tools/mwl_bridge/VERIFICAR.py`.

## Cenário: Clínica sem Infraestrutura Local (Sem Rede, Sem Servidor, Sem PACS)

**Data do teste**: Planejado para amanhã  
**Local**: Clínica em Mirante da Serra (RO)  
**Equipamento no local**: Aparelho de Ultrassonografia **SAEVO FT412**  
**Sistema**: **LW Laudos / Sistema Médico Multiperfil (v0.0.14)**  
**Objetivo**: Testar fluxo clínico de ponta a ponta (agendamento no app → Modality Worklist no Saevo → realização do exame → elaboração do laudo com body marks e fotos → emissão do PDF), mantendo plano B manual funcional.

---

## 0. Princípio da Honestidade Técnica e Transparência

- **O que é comprovado em laboratório**:
  - Geração de arquivos binários DICOM Worklist (`.wl` via `dump2dcm` / DCMTK SOP Class `1.2.840.10008.5.1.4.31`).
  - Endpoint seguro na nuvem (`GET /backend/v1/mwl/appointments`) autenticado por token individual por médico (`owner_id`).
  - Consulta DICOM `C-FIND SCP` padrão respondida pelo servidor Orthanc com plugin Worklists ativo.
  - Editor estruturado do LW Laudos, atalhos por órgão (`Ctrl+N` / Normal), esquemas anatômicos Body Marks SVG, upload de fotos e geração do PDF binário nativo.
- **O que é esperado e requer validação in loco amanhã**:
  - O comportamento específico da tela `New Patient` → `WorkList` do software interno do Saevo FT412.
  - O manual do fabricante (https://saevo.com.br/wp-content/uploads/2023/04/Ultrassom-FT-412_77000001433.pdf) confirma que o FT412 dispõe de módulo DICOM com as abas **DICOM storage, C-Store, Worklist, Print e MPPS**, e busca via Worklist. Os nomes exatos dos botões e menus citados neste guia baseiam-se no padrão DICOM e manual Saevo, devendo ser confirmados no console físico da máquina.
  - **Aviso**: Não alegamos compatibilidade prévia validada especificamente com este exemplar físico da máquina Saevo; o objetivo do teste de campo de amanhã é justamente comprovar essa integração.

---

## 1. O Que Levar na Mala (Kit de Sobrevivência para Mirante da Serra)

Como a clínica **NÃO possui estrutura nenhuma** (sem rede, sem servidor, sem switch):

| Item                                                                   | Função                                                       | Observação Crítica                                                                                                   |
| :--------------------------------------------------------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **Notebook do Médico**                                                 | Servidor local Orthanc + Agente bridge + Acesso ao LW Laudos | Carregado na tomada + carregador. Deve conter Python 3 e Orthanc previamente baixados.                               |
| **Cabo de Rede Ethernet (Cat5e/Cat6) de 3 a 5 metros**                 | Ligação direta ou roteador                                   | Indispensável se ligar direto notebook ↔ aparelho Saevo.                                                             |
| **Mini Roteador Wi-Fi portátil ou Switch de 4/5 portas** (Recomendado) | Criar a **rede local (LAN)** física da sala                  | **Rede local NÃO é internet!** O roteador serve apenas para dar IP local ao notebook e ao Saevo FT412.               |
| **Celular com Hotspot 4G/5G ativo**                                    | Apenas para conexão com a nuvem do LW Laudos                 | O notebook se conecta ao Wi-Fi do celular para baixar os agendamentos da nuvem. O Saevo **NÃO** precisa de internet. |
| **Pendrive USB (Formatado em FAT32 ou NTFS)**                          | Plano B e transferência de imagens                           | Caso queira exportar imagens do ultrassom via USB diretamente para o notebook.                                       |
| **Impressora ou Papel (se houver)**                                    | Impressão física                                             | Se for imprimir laudos para entrega imediata aos pacientes.                                                          |

---

## 2. Topologia da Rede Local Mínima na Sala

### Opção A: Com Roteador Wi-Fi Portátil ou Switch (Mais Fácil e Estável)

```text
               ┌────────────────────────────────────────────────────────┐
               │ CELULAR 4G/5G (Roteador Wi-Fi Celular)                │
               │   • Fornece internet apenas ao Notebook                │
               └──────────────────────────┬─────────────────────────────┘
                                          │ Wi-Fi Internet
                                          ▼
┌──────────────────────┐  Cabo Rede  ┌───────────────────────────┐  Cabo Rede  ┌──────────────────────┐
│  SAEVO FT412         │◄───────────►│ Roteador Local / Switch   │◄───────────►│ NOTEBOOK DO MÉDICO   │
│  IP: 192.168.1.50    │             │ (Cria a LAN da sala)      │             │ IP: 192.168.1.100    │
│  AE: SAEVO_US        │             └───────────────────────────┘             │ Orthanc Port: 104    │
│  Mask: 255.255.255.0 │                                                       │ AE: ORTHANC_MWL      │
└──────────────────────┘                                                       └──────────────────────┘
```

### Opção B: Cabo Cruzado / Direto Notebook ↔ Saevo (Sem Roteador)

Placas de rede modernas possuem auto-MDIX (detectam cabo direto sem precisar de cabo cross).

1. Conecte o cabo de rede diretamente da porta Ethernet do notebook à porta Ethernet do Saevo FT412.
2. Defina IPs estáticos manuais na interface de rede cabeada:
   - **Notebook**: IP `192.168.1.100`, Máscara `255.255.255.0`, Gateway em branco.
   - **Saevo FT412**: IP `192.168.1.50`, Máscara `255.255.255.0`, Gateway `192.168.1.100`.
3. O notebook usa Wi-Fi com hotspot do celular para ter internet (acessar app na nuvem), enquanto a porta Ethernet cuida da comunicação DICOM local com o Saevo.

---

## 3. Preparação Prévia no Notebook (Fazer HOJE à Noite)

Não deixe para baixar pacotes em Mirante da Serra (onde o sinal de celular pode ser instável).

### Passo 3.1: Instalar Python e Biblioteca Requests

1. Verifique no terminal:
   ```bash
   python --version
   pip install requests
   ```

### Passo 3.2: Baixar DCMTK (Ferramenta `dump2dcm`)

- O agente `tools/mwl_bridge/bridge.py` compila os dados do paciente em formato binário DICOM Worklist `.wl` chamando o executável `dump2dcm`.
- **Windows**: Baixe o pacote oficial DCMTK (ex.: `dcmtk-3.6.8-win64-dynamic.zip` em https://dicom.offis.de/download/dcmtk/dcmtk368/ ou pacote binário pré-compilado).
- Extraia e certifique-se de que a pasta `bin` (onde está `dump2dcm.exe`) esteja no **PATH** do Windows ou copie `dump2dcm.exe` para a mesma pasta do script `bridge.py`.
- **Linux/Mac**: `sudo apt install dcmtk`

### Passo 3.3: Baixar e Instalar o Orthanc no Windows

- Baixe o instalador oficial do Orthanc para Windows (Osimis Windows Installer ou Orthanc Server Windows):
  - Link oficial: https://www.orthanc-server.com/download-windows.php
- Durante a instalação ou na pasta do Orthanc, certifique-se de que o plugin `ModalityWorklists` está habilitado.
- No arquivo de configuração `orthanc.json`:
  ```json
  {
    "Name": "ORTHANC_MIRANTE",
    "DicomAet": "ORTHANC_MWL",
    "DicomPort": 104,
    "DicomCheckCalledAet": false,
    "Worklists": {
      "Enable": true,
      "Database": "C:\\Orthanc\\worklists",
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
  _(Crie a pasta `C:\Orthanc\worklists` no notebook)._

> **Nota de Firewall do Windows**: Abra o Firewall do Windows no notebook e crie uma regra de entrada permitindo a porta **TCP 104** (ou desative o firewall temporariamente durante o teste de rede local).

### Passo 3.4: Obter o Token MWL do Médico no LW Laudos

1. Faça login no LW Laudos com sua conta médica (Dr. Lucas Willian).
2. Acesse **Configurações** → seção **Worklist DICOM & Unidades de Atendimento**.
3. Se não houver token, clique em **"Gerar Token MWL"**.
4. Copie o token de 32 caracteres (guarde no bloco de notas).
5. Certifique-se de cadastrar ou manter a unidade de atendimento desejada (ex.: `"Mirante da Serra"` ou `"Gastroimagem"`).

---

## 4. Configuração no Aparelho SAEVO FT412

> **Aviso de Transparência**: Procedimento baseado no manual técnico do fabricante Saevo FT412 (seção de configuração DICOM). Confronte os nomes dos botões com a interface física do aparelho.

### 4.1. Configurar IP do Aparelho

1. No teclado/console do Saevo, pressione a tecla **System Setting** (ou ícone de engrenagem).
2. Navegue até o menu **Network** (Rede).
3. Selecione a interface cabeada e defina:
   - **DHCP**: Desativado (Manual / Estático)
   - **IP Address**: `192.168.1.50`
   - **Subnet Mask**: `255.255.255.0`
   - **Gateway**: `192.168.1.1` (ou `192.168.1.100` se cabo direto)
   - **Local AE Title**: `SAEVO_US` (ou `FT412`)
4. Clique em **Save / Apply**.

### 4.2. Cadastrar o Servidor Worklist no Saevo FT412

1. No menu de configurações, vá até a aba **DICOM Setting** (ou **DICOM**).
2. Localize a sub-aba **Worklist** (o manual Saevo indica abas: DICOM storage, C-Store, Worklist, Print, MPPS).
3. Clique no botão **Add** (Adicionar).
4. Preencha os campos exatamente assim:
   - **Service Name** (ou Alias): `ORTHANC_LOCAL`
   - **AE Title (Called AE)**: `ORTHANC_MWL` (mesmo AE do `orthanc.json`)
   - **IP Address**: `192.168.1.100` (IP do notebook do médico)
   - **Port**: `104` (ou a porta configurada no Orthanc)
5. Clique no botão **Ping** ou **Echo / Verify**:
   - Se responder **Success / OK**: a comunicação física e o protocolo DICOM estão funcionando!
   - Se responder _Failed_: verifique cabo, IP e Firewall do Windows no notebook.
6. Clique em **Save / Default** para definir esta Worklist como padrão.

---

## 5. Execução do Agente de Ponte (`bridge.py`) no Notebook

Com o Orthanc rodando e o notebook conectado ao hotspot do celular:

```bash
python tools/mwl_bridge/bridge.py \
  --url "https://seu-dominio-lwlaudos.com" \
  --token "SEU_TOKEN_COPIADO_EM_CONFIGURACOES" \
  --clinic "Mirante da Serra" \
  --worklist-dir "C:\Orthanc\worklists" \
  --interval 30
```

_Se a unidade nos agendamentos for diferente, omita `--clinic` para sincronizar todos os agendamentos daquele dia._

O terminal exibirá:

```text
[INFO] Consultando nuvem para unidade 'Mirante da Serra'...
[INFO] Recebidos 3 agendamento(s) para sincronização.
[INFO] Worklist gerada: LW-20261028-A4B2.wl -> SILVA^MARIA
```

---

## 6. Checklist de Validação Passo a Passo (O Teste de Campo)

Siga esta sequência ordenada amanhã:

- [ ] **Etapa 1: Rede e Conectividade Física**
  - Notebook e Saevo conectados no mesmo roteador ou via cabo.
  - No notebook, abra o prompt de comando e teste: `ping 192.168.1.50`. O aparelho Saevo deve responder.
  - No Saevo, clique em **Echo / Verify** na tela do Worklist. Deve retornar sucesso.

- [ ] **Etapa 2: Agendamento no LW Laudos (Nuvem)**
  - No celular ou notebook (via 4G), acerte a data no menu **Agenda**.
  - Crie um novo agendamento com um paciente de teste (ex.: "TESTE CAMPO SAEVO", CPF, horário do dia).
  - Observe que o sistema gerou automaticamente o **Accession Number** (ex.: `LW-20261028-XXXX`).

- [ ] **Etapa 3: Sincronização do Agente Local**
  - Verifique o terminal do `bridge.py`: ele deve avisar que baixou o agendamento e gerou o arquivo `.wl` na pasta do Orthanc.

- [ ] **Etapa 4: Consulta no Saevo FT412**
  - No console do Saevo FT412, pressione o botão **New Patient** (ou **Patient**).
  - Na tela do paciente, clique no botão **WorkList** (ou **Search / Query**).
  - Verifique se a lista exibe o paciente agendado com:
    - Nome do paciente
    - Patient ID (CPF)
    - Accession Number
    - Procedimento / Descrição do exame
  - Selecione o paciente e clique em **Transfer / Start Exam**.
  - Confirme se os dados foram preenchidos na tela de exame sem digitação manual.

- [ ] **Etapa 5: Realização do Exame e Elaboração do Laudo**
  - Na tela de **Agenda** do LW Laudos, clique no botão **"Iniciar laudo"** daquele agendamento.
  - O editor estruturado de ultrassonografia abrirá com paciente, exame e agendamento vinculados.
  - Preencha os achados usando os botões **Normal** / atalho `Ctrl+N` nos órgãos desejados.
  - Se houver lesão relevante, selecione o **Body Mark** anatômico correspondente (Mama, Tireoide, DIU, Ombro, Abdome) e marque o ponto na figura SVG.
  - Conecte as fotos do ultrassom (via upload direto ou pendrive).
  - Clique em **"Prévia do Laudo / PDF"** e depois em **"Baixar Documento"** para validar o PDF binário gerado.
  - Clique em **"Finalizar Laudo"** (com a caixa de revisão atestada e status do agendamento marcado como "Realizado").

---

## 7. Plano B: Se a Ponte MWL Falhar no Campo (Operação em Contingência)

Se por qualquer motivo local (cabo com defeito, porta DICOM bloqueada no aparelho, versão de firmware do Saevo incompatível):

1. **A consulta do paciente segue normalmente**:
   - Pressione **New Patient** no Saevo FT412 e digite manualmente apenas o nome e CPF do paciente.
   - Realize o exame de ultrassonografia normalmente no aparelho.
2. **O LW Laudos funciona 100% de forma independente do MWL**:
   - No notebook (com hotspot 4G), abra a **Agenda** ou o menu **Laudos** → **Novo Laudo**.
   - O editor estruturado de ultrassonografia, a biblioteca de frases normais (`Ctrl+N`), o painel de esquemas anatômicos (Body Marks SVG) e a emissão de PDF com identificação profissional continuam operando integralmente.
   - As imagens podem ser copiadas do aparelho para o notebook via **pendrive USB** e anexadas pelo gerenciador de imagens do laudo.
3. **Nenhum paciente fica sem atendimento nem sem laudo**:
   - A falha do MWL apenas exige digitar o nome no aparelho Saevo; todo o restante do fluxo de documentação, auditoria e emissão do laudo permanece garantido.

---

## 8. Registro e Anotações para Trazer do Campo

Amanhã, anote para a equipe de desenvolvimento:

- [ ] Versão exata do software interno do Saevo FT412 (menu `System Info` / `About`).
- [ ] Se o botão de busca chamava-se `WorkList`, `Query`, `Search` ou outro nome.
- [ ] Se o Saevo aceitou caracteres acentuados (UTF-8 `ISO_IR 192`) ou se exigiu Latin-1 (`ISO_IR 100`).
- [ ] Foto da tela de configuração DICOM do Saevo para referência de futuros colegas.
