# LW Laudos — Status e Contexto Geral do Projeto

> **Destinatário deste documento**: Agente de IA externo autônomo ou assistente interativo (ChatGPT, Codex, Claude Code, Cursor, Copilot) que executará **APENAS** a instalação local da ponte DICOM Modality Worklist (MWL) no notebook do proprietário em Mirante da Serra (RO).  
> **Aviso de Escopo e Governança**: O desenvolvimento do LW Laudos (código frontend, componentes React, regras de negócio, serviços, banco de dados e migrações) foi realizado e é guiado **exclusivamente pelo Skip** (assistente desta plataforma). O papel deste agente externo é **estritamente limitado à instalação, configuração e teste de prontidão local no notebook Windows** do médico, **sem alterar o código da aplicação nem realizar desenvolvimento**.

---

## 1. Visão do Produto

- **Nome do Sistema**: **LW Laudos — Sistema Médico Multiperfil** (exibido na interface provisoriamente como _"Sistema Médico Multiperfil"_).
- **Idioma e Tom**: 100% em português brasileiro (`pt-BR`), com design clínico sóbrio, foco em usabilidade médica ágil, contraste acessível e tipografia legível para ambiente hospitalar/ambulatorial.
- **Usuário Inicial e Administrador**: Dr. Lucas Willian da Silva, Médico Radiologista, **CRM RO 6955** (perfil administrador).
- **Princípio Multiperfil e Isolamento de Dados**:
  - Contas de médicos adicionais são criadas **exclusivamente por convite** enviado pelo administrador (não há auto-cadastro público).
  - Isolamento estrito de prontuários, pacientes, exames, agendamentos e laudos por `owner_id` no banco de dados (Row Level Security nativo do PocketBase).
  - O administrador gerencia os usuários, mas não tem acesso automático ao conteúdo clínico privado dos outros médicos.
  - Cada laudo emitido possui a identificação profissional formal do médico autor (nome completo, CRM, UF, especialidade e logotipo individual cadastrado em Configurações).

---

## 2. Histórico de Versões

Abaixo está o resumo cronológico de evolução do sistema no repositório:

- **v0.0.2 — Base Multiperfil e Estrutura Clínica**:
  - Autenticação e controle de acesso com isolamento por `owner_id`.
  - Fluxo de convites para novos médicos emitidos pelo administrador.
  - Editor estruturado de Ultrassonografia de Abdome Total com atalhos de laudo normal por órgão (`Ctrl+N` / botão "Normal").
  - Biblioteca de achados e frases médicas reutilizáveis.
  - Upload e gerenciamento de imagens do exame.
  - Geração de documento PDF com cabeçalho clínico.
  - Assistente IA médico exibido honestamente como _"Não conectado"_ (sem invenção de LLM simulada).
  - Tela de Integrações estruturada.

- **v0.0.3 — Ajustes de Usabilidade e Correções Clínicas**:
  - Tratamento rigoroso de fuso horário e data local (`formatCuiabaDate` / `America/Porto_Velho` / `America/Cuiaba` UTC-4).
  - Correção de foco no editor e no seletor de arquivos de imagens.
  - Prévia de laudo e PDF renderizados _in-app_.
  - Roteamento e persistência da URL do rascunho de laudo.

- **v0.0.5 — Motor de PDF Binário Real e Personalização do Médico**:
  - Criação do compilador próprio de PDF binário (`%PDF-1.4`) direto em TypeScript no navegador, sem bibliotecas externas pesadas ou servidores externos de renderização.
  - Separação clara de páginas A4 para texto do laudo e páginas dedicadas para fotogramas de imagens médicas (grades de 2, 4 ou 6 imagens por página).
  - Upload de logotipo personalizado por médico em Configurações, impresso no cabeçalho dos laudos.
  - Suporte a drag & drop no upload de imagens.
  - Remoção de presunções de títulos profissionais não confirmados.

- **v0.0.6–v0.0.7 — Módulo de Assinatura Digital e Preparação de Auto-Hospedagem**:
  - Estrutura preparada para assinatura digital com Prestadores de Serviços de Confiança (PSCs) credenciados pela ICP-Brasil (adaptadores para VIDaaS, BirdID, SafeID, SerproID, RemoteID).
  - Módulo **desativado por padrão** e com estados honestos (sem credenciais reais embutidas).
  - Cálculo criptográfico de hash SHA-256 por versão do laudo e PDF.
  - Suporte completo a auto-hospedagem local: variável `VITE_POCKETBASE_URL` para apontar o frontend para servidor local em `http://localhost:8090` e guia técnico detalhado em `docs/GUIA_AUTO_HOSPEDAGEM_LOCAL.md`.

- **v0.0.8 — Honestidade e Transparência de Estados em `/integracoes`**:
  - Exibição cristalina do estado de conectividade: _"Ambiente atual: Nuvem / Preparação para instalação local"_.
  - Serviços locais rotulados com precisão como _"Instalação local pendente"_.
  - Testes sintéticos de arquitetura de assinatura e criptografia movidos para página de diagnóstico isolada acessada por URL direto (`/diagnostico-desenvolvimento`), sem poluir a visão operacional do médico.

- **v0.0.13 — Body Marks (Esquemas Anatômicos Vetoriais)**:
  - Desenvolvimento de esquemas anatômicos vetoriais próprios em SVG puro:
    - **Mama** (Direita e Esquerda) com 4 quadrantes anatômicos e escala horária de 1 a 12 horas.
    - **Útero / Pelve** com visualização transvaginal e status de DIU (tópico, baixo, ausente).
    - **Ombro** com visualização anterior/posterior, tendões do manguito rotador e graduação de lesão.
    - **Tireoide** e **Abdome** com topografia por quadrantes e regiões.
  - Marcação interativa de lesões pelo médico com coordenadas, descrição e numeração sequencial.
  - Marcas salvas na estrutura JSON do laudo e renderizadas em página dedicada no PDF binário emitido.

- **v0.0.14 — Agendamento de Consultas com DICOM Modality Worklist (MWL)**:
  - Agenda individual por médico vinculada à clínica/unidade de atendimento.
  - Geração automática no servidor de **Accession Number** padronizado (`LW-AAAA-MM-DD-XXXX`).
  - Preenchimento completo de tags DICOM padrão para ultrassonografia (SOP Class MWL `1.2.840.10008.5.1.4.31`, Modality `US`, charset `ISO_IR 192`).
  - Emissão de Token MWL de 32 caracteres por médico em **Configurações → Worklist DICOM & Unidades de Atendimento**.
  - Endpoint seguro e autenticado no backend (`GET /backend/v1/mwl/appointments`) para consulta por token.
  - Agente local de sincronização `tools/mwl_bridge/bridge.py` e documentação de integração com servidor DICOM Orthanc em `docs/GUIA_WORKLIST_ORTHANC.md`.

- **v0.0.15 — Varredura de Falhas e Validação Integrada**:
  - Correção rigorosa do vínculo bidirecional entre Exame e Agendamento.
  - Correção do fluxo de revogação e regeneração do token MWL individual.
  - Elaboração do guia operacional para Mirante da Serra em `docs/GUIA_TESTE_CAMPO_MIRANTE.md`.

- **v0.0.16 — Modelos de Laudo por Especialidade**:
  - Migração `0008_specialties_and_template_specialty.js` criando a coleção `medical_specialties` e campo `specialty_id` em `templates`.
  - Filtros rápidos por especialidade na tela de Modelos, badges visuais com cores por área.
  - Gestão de especialidades clínicas exclusiva para o administrador.
  - Ação de clonagem/cópia de modelo geral preservando especialidade.

- **v0.0.17 — Pacote de Instalação Automatizada da Ponte MWL**:
  - Script automatizado PowerShell para Windows: `tools/mwl_bridge/INSTALAR_WINDOWS.ps1`.
  - Atalhos operacionais de 1 clique:
    - `1-iniciar-orthanc.bat` (sobe o servidor DICOM local na porta 104).
    - `2-iniciar-ponte.bat` (sobe o agente Python que puxa agendamentos da nuvem).
    - `3-testar.bat` (executa a bateria de validação de prontidão em `VERIFICAR.py`).
  - Script de verificação automatizada dos 8 itens essenciais: `tools/mwl_bridge/VERIFICAR.py`.
  - Arquivo modelo de variáveis locais `config_ponte.env.example`.
  - Manual passo a passo para o agente de IA: `docs/INSTALACAO_AGENTE_IA.md`.

---

## 3. Arquitetura Atual do Sistema

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          NAVEGADOR DO MÉDICO                            │
│  React 18 + Vite + TypeScript + Tailwind CSS (shadcn/ui)                │
│                                                                         │
│  • Single Page Application (SPA) responsiva                             │
│  • Editor estruturado de US com atalhos de teclado (Ctrl+N)            │
│  • Módulo Body Mark (SVGs vetoriais puros em memória)                   │
│  • Motor de PDF binário real (%PDF-1.4 em TypeScript) sem API externa   │
└───────────────────────┬─────────────────────────────────────────────────┘
                        │
                        │ HTTPS REST + Realtime SSE (PocketBase JS SDK)
                        │ (URL dinâmica: VITE_POCKETBASE_URL ou Nuvem)
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       BACKEND (PocketBase v0.22+)                       │
│  Hospedado no Skip Cloud (portável para servidor local Windows/Linux)   │
│                                                                         │
│  • SQLite embutido com transações ACID                                  │
│  • Coleções principais: users, patients, exams, reports, templates,    │
│    medical_specialties, appointments, user_permissions                  │
│  • Regras RLS estritas de isolamento por owner_id                       │
│  • pb_hooks com endpoints customizados (/backend/v1/mwl/appointments)   │
│  • Migrações declarativas (0001 a 0008)                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Principais Características Técnicas

1. **Frontend**: Desenvolvido em React + Vite + TypeScript. Não usa serviços de terceiros para montagem de laudos ou manipulação gráfica.
2. **Backend**: Instância PocketBase. Todas as regras de controle de acesso são checadas no lado do servidor. URL configurável em tempo de build/execução através de `VITE_POCKETBASE_URL`.
3. **Geração de PDF**: Compilador binário direto (`src/lib/pdfBuilder.ts` e `src/lib/pdfGenerator.ts`). Não depende de Puppeteer, wkhtmltopdf, serviços externos ou Node.js em tempo de execução. Roda 100% no navegador cliente.
4. **Isolamento de Dados**: Cada médico só acessa o que gerou (`owner_id = @request.auth.id`). Os tokens MWL são únicos por médico e validam a chave nos hooks do PocketBase.

---

## 4. Estado dos Dados no Banco

- O banco de dados contém **APENAS registros de teste fictícios e sintéticos** utilizados durante a validação da arquitetura:
  - Paciente sintético de teste: `"TESTE — Demonstração LW (fictício)"` (ID: `mjjngduz3steate`, CPF fictício `000.000.000-00`).
  - Laudo rascunho de demonstração: ID `muvdbwmrw3hagrr` (associado ao exame `dgw4edb2sb9jfqg`).
- **Nenhum dado real de paciente** está cadastrado no sistema.
- **Importante**: O agente externo **não deve apagar, alterar nem sobrescrever** estes registros sintéticos, pois eles servem como fixture de demonstração e validação do fluxo do rascunho.

---

## 5. O que NÃO Está Feito / O que NÃO Conectar

Para garantir honestidade técnica intransigente, o agente externo deve estar ciente de que:

1. **Assistente de IA Médica (LLMs)**:
   - O painel exibe deliberadamente a condição _"Não conectado"_.
   - **Nenhum** provedor de IA (OpenAI, Anthropic, Claude, Skip AI) está configurado com chaves ativas no frontend. Não tente "consertar" nem simular respostas de IA.
2. **Ponte MWL Local (Orthanc + bridge.py)**:
   - A ponte foi desenvolvida, testada em simulação estática e empacotada em scripts `.bat` e `.ps1`.
   - **Ela nunca foi executada em um ambiente físico real com o aparelho Saevo FT412**. O teste de campo em Mirante da Serra será a sua primeira execução prática real.
3. **Provedores de Assinatura Digital ICP-Brasil**:
   - Os adaptadores para PSCs (VIDaaS, BirdID, SafeID, SerproID, RemoteID) estão estruturados na arquitetura, mas **não possuem credenciais comerciais cadastradas**.
   - O sistema opera com a assinatura manual/carimbo no papel por padrão (modo offline) ou emissão digital simples. Não insira credenciais falsas.
4. **Homologação com Fabricantes**:
   - Não há homologação ou certificado assinado por nenhum fabricante de equipamento (Saevo, GE, Philips, Mindray).
   - O software opera estritamente sob as especificações abertas da norma internacional DICOM 3.0 e do manual técnico público do Saevo FT412.

---

## 6. Regras Obrigatórias para o Agente de IA Externo

O agente externo (ChatGPT / Codex / Claude Code / etc.) deve observar estritamente as regras abaixo:

1. **Escopo Restrito à Instalação Local**:
   - Sua única responsabilidade é seguir os passos de instalação da ponte local no notebook Windows do médico.
   - **Não altere** nenhum arquivo de código do app (`src/**`), nenhum componente React, nenhuma folha de estilo e nenhuma migração do PocketBase.
2. **Preservação de Credenciais e Segurança**:
   - Não altere senhas, chaves de autenticação, nem regras de permissão no PocketBase.
   - O token MWL do médico deve ser lido unicamente do arquivo local `tools/mwl_bridge/config_ponte.env` (que nunca deve ser commitado no Git). Nunca "hardcode" o token no código.
3. **Integridade de Dados**:
   - Não remova, não renomeie e não altere os registros existentes no banco de dados (ex.: paciente fictício `mjjngduz3steate` e rascunho `muvdbwmrw3hagrr`).
4. **Honestidade Técnica nos Testes**:
   - Diferencie claramente **revisão estática de código** de **execução real em tempo de execução**.
   - Nunca afirme que um serviço funcionou sem ter verificado o código de retorno ou a saída real dos scripts no console do Windows.
5. **Roteiro Mandatório**:
   - Siga rigorosamente o passo a passo descrito em [`docs/INSTALACAO_AGENTE_IA.md`](INSTALACAO_AGENTE_IA.md).
6. **Plano B Operacional**:
   - Se por qualquer motivo a ponte Orthanc ou a comunicação DICOM falhar no local, acione imediatamente o **Plano B**:
     - O médico digita o nome e CPF do paciente direto no aparelho Saevo FT412.
     - O exame é realizado normalmente.
     - As fotos são exportadas para um pendrive USB e anexadas no laudo do LW Laudos pelo notebook conectado ao hotspot do celular.
     - O laudo é gerado em PDF e impresso normalmente. Nenhum paciente fica sem atendimento.

---

## 7. O Teste de Campo em Mirante da Serra

| Parâmetro                        | Detalhe                                                                                                                                                                                                                                                             |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Localização**                  | Clínica em Mirante da Serra (interior de Rondônia).                                                                                                                                                                                                                 |
| **Condições do Local**           | Sala de atendimento **sem infraestrutura de TI prévia** (sem servidor local, sem cabeamento estruturado, sem PACS, sem roteador corporativo).                                                                                                                       |
| **Equipamento de Ultrassom**     | **SAEVO FT412** (dispõe de suporte nativo a DICOM Worklist no manual técnico).                                                                                                                                                                                      |
| **Topologia de Rede Local**      | Notebook do médico conectado ao aparelho Saevo via **cabo Ethernet direto** (IPs estáticos: Notebook `192.168.1.100`, Saevo `192.168.1.50`, porta DICOM `104`, AE Title `LW-ORTHO`).                                                                                |
| **Conexão com a Nuvem**          | Notebook conectado via Wi-Fi ao **Hotspot 4G/5G do celular** do médico para sincronizar a agenda do LW Laudos com a nuvem. O aparelho Saevo não necessita de internet.                                                                                              |
| **Critério de Sucesso do Teste** | Um exame agendado na tela de **Agenda** do LW Laudos na nuvem é baixado pelo script `bridge.py`, disponibilizado pelo Orthanc local e **aparece listado na tela de Worklist (New Patient → Worklist) do aparelho Saevo FT412** pronto para transferência dos dados. |

---

_Documento consolidado para orientação do agente local no notebook do Dr. Lucas Willian da Silva (CRM RO 6955)._
