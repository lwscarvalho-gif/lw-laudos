# LW Laudos — Status e Contexto Geral do Projeto

> **Versão do Projeto**: **v0.0.34**  
> **Destinatário deste documento**: Agente de IA externo autônomo ou assistente interativo (ChatGPT, Codex, Claude Code, Cursor, Copilot) que executará **APENAS** a instalação local da ponte DICOM Modality Worklist (MWL) no notebook do proprietário em Mirante da Serra (RO).  
> **Aviso de Escopo e Governança**: O desenvolvimento do LW Laudos (código frontend, componentes React, regras de negócio, serviços, banco de dados e migrações) foi realizado e é guiado **exclusivamente pelo Skip** (assistente desta plataforma). O papel deste agente externo é **estritamente limitado à instalação, configuração e teste de prontidão local no notebook Windows** do médico, **sem alterar o código da aplicação, migrações, permissões, autenticação nem dados**.

---

## 1. Visão do Produto

- **Nome do Sistema**: **LW Laudos — Sistema Médico Multiperfil** (exibido na interface provisoriamente como _"Sistema Médico Multiperfil"_).
- **Idioma e Tom**: 100% em português brasileiro (`pt-BR`), com design clínico sóbrio, foco em usabilidade médica ágil, contraste acessível e tipografia legível para ambiente hospitalar/ambulatorial.
- **Usuário Inicial e Administrador**: Dr. Lucas Willian da Silva, Médico Radiologista, **CRM RO 6955** (perfil administrador).
- **Princípio Multiperfil e Matriz de Acesso (v0.0.19–v0.0.24)**:
  - Perfis suportados no sistema:
    - **Administrador Geral** e **Administrador**: Gestão completa de usuários, convites, especialidades, catálogo de preparos e configurações do sistema.
    - **Médico**: Acesso clínico a laudos, emissão, assinatura, modelos, agenda, configuração individual de tempo por exame e geração de token MWL.
    - **Secretária**: Gestão da agenda de consultas, cadastro de pacientes, upload e análise de fotos de solicitações médicas por IA no backend, impressão de comprovante do paciente.
    - **Gestor**: Acompanhamento de indicadores operacionais, listagem de agendamentos e pacientes.
    - **Contabilidade**: Visualização e conferência de agendamentos e volumes para fins de faturamento.
  - Contas são criadas **exclusivamente por convite** enviado pelo administrador (não há auto-cadastro público).
  - Isolamento estrito de prontuários e laudos clínicos por `owner_id` no banco de dados (Row Level Security nativo do PocketBase). O administrador gerencia os usuários, mas não acessa automaticamente o conteúdo clínico privado dos outros médicos.
  - Registro de auditoria de quem agendou (`created_by`, `created_by_name`, `created_by_role`, `updated_by`, `updated_by_name`, `updated_by_role`).

---

## 2. Histórico de Versões

Abaixo está o resumo cronológico completo da evolução do sistema no repositório:

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
  - Geração automática no servidor de **Accession Number** padronizado (`LW-YYYYMMDD-XXXX`).
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

- **v0.0.17–v0.0.18 — Pacote de Instalação Automatizada da Ponte MWL**:
  - Script automatizado PowerShell para Windows: `tools/mwl_bridge/INSTALAR_WINDOWS.ps1`.
  - Atalhos operacionais de 1 clique:
    - `1-iniciar-orthanc.bat` (sobe o servidor DICOM local na porta 104).
    - `2-iniciar-ponte.bat` (sobe o agente Python que puxa agendamentos da nuvem).
    - `3-testar.bat` (executa a bateria de validação de prontidão em `VERIFICAR.py`).
  - Script de verificação automatizada `tools/mwl_bridge/VERIFICAR.py`.
  - Arquivo modelo de variáveis locais `config_ponte.env.example`.
  - Manual passo a passo para o agente de IA: `docs/INSTALACAO_AGENTE_IA.md`.
  - Documento de status inicial em `docs/STATUS_PROJETO.md`.

- **v0.0.19–v0.0.21 — Novos Perfis, Operação SUS Municipal, Preparos de Exames e Importação com IA no Backend**:
  - **Novos perfis de acesso** (migração `0009_multi_profile_schedule_sus.js`): inclusão dos papéis `Secretaria`, `Gestor` e `Contabilidade`, além de `Médico` e `Administrador`.
  - **Auditoria de agendamento**: rastreamento de quem criou e editou o agendamento (`created_by`, `created_by_name`, `created_by_role`, etc.).
  - **Renomeação da unidade pública**: substituição da antiga _"Clínica Principal"_ por **"HM Samuel Marques dos Santos"** (Hospital Municipal vinculado à Prefeitura de Mirante da Serra).
  - **Regra de identificação SUS**: validação estrita de CPF, Cartão do SUS (15 dígitos) e Endereço no HM Samuel Marques dos Santos.
  - **Anexos da solicitação médica**: upload de fotos/xerox da guia médica direto no agendamento (`request_images`).
  - **Catálogo de preparos por tipo de exame** (migração `0010_create_exam_preparations.js`): instruções clínicas parametrizáveis em **Configurações → Preparos de Exames** com injeção automática nas observações do agendamento.
  - **Comprovante do paciente em A4**: modal `AppointmentVoucherModal` com botão de impressão de via formatada do agendamento contendo dados da unidade, horário, Accession Number e preparo clínico em destaque.
  - **Importação da guia por foto via IA no backend**: endpoint `POST /backend/v1/ai/analyze-request-image` em `pocketbase/hooks/mwl_bridge.pb.js` utilizando visão computacional no servidor. A chave do gateway de IA **nunca trafega pelo navegador**. Os dados extraídos chegam como proposta preliminar e exigem **revisão humana obrigatória** antes de salvar.

- **v0.0.22 — Duração Configurável por Tipo de Exame**:
  - Migração `0011_exam_durations_by_exam_type.js`.
  - Adição do campo `duration_minutes` no catálogo de preparos e `exam_durations_config` (JSON) na coleção de usuários (`_pb_users_auth_`).
  - Cada médico pode definir os minutos padrão por exame em **Configurações → Preparos de Exames**; na Agenda o horário de término é calculado automaticamente conforme a duração configurada, permanecendo editável caso a caso.

- **v0.0.23 — Correção de Escopo de Obrigatoriedade Documental**:
  - Migração `0012_make_patient_document_optional.js`: o campo `document` (CPF) da coleção `patients` tornou-se opcional a nível de schema.
  - A obrigatoriedade de CPF, Cartão do SUS e Endereço é aplicada **EXCLUSIVAMENTE** na unidade **HM Samuel Marques dos Santos** (regra do SUS municipal).
  - Nas clínicas particulares (ex.: Gastroimagem ou clínicas privadas cadastradas pelo médico), apenas o **nome** do paciente é obrigatório no agendamento, agilizando atendimentos privados e de urgência.

- **v0.0.24 — Fortalecimento da Integração Orthanc/MWL e Ciclo de Vida Completo**:
  - **Ciclo de vida completo no agente `bridge.py`**:
    - Criação de nova entrada com AccessionNumber determinístico e higienizado via `sanitize_worklist_id`.
    - Atualização idempotente via `PUT /worklists/{id}` (ou recriação controlada via `POST /worklists/create` com remoção prévia).
    - Cancelamento e conclusão de exames: remoção imediata da worklist via `DELETE /worklists/{id}` ou exclusão do arquivo `.wl`, impedindo poluição da tela do aparelho.
    - Gravação atômica no fallback de arquivos `.wl` (escrita em `.tmp` seguida de `os.replace`) para evitar leitura corrompida de arquivos parciais pelo Orthanc.
  - **Tratamento robusto de erros no agente**:
    - Detecção de token revogado, expirado ou inválido (HTTP 401/403) com mensagem explicativa em português claro no console e orientação direta de regeneração na UI.
    - Retry com backoff exponencial diante de falhas momentâneas de rede ou quedas do hotspot celular.
  - **Verificação de ponta a ponta em `VERIFICAR.py`**:
    - Teste de ciclo de vida sintético real no Orthanc (cria entrada sintética sem dados reais de pacientes, verifica se foi listada e remove em seguida).
    - Teste de conectividade e autenticação com o endpoint na nuvem (`GET /backend/v1/mwl/appointments`) usando o token local.
    - Veredito estrito: a mensagem `"★★★★★  VEREDITO: PRONTO PARA O APARELHO!  ★★★★★"` só é emitida se 100% dos itens forem validados com sucesso.

- **v0.0.25–v0.0.26 — Estabilização e Validações Gerais de Fluxo**:
- Consolidação de templates, diagnósticos e correções nas regras de formulário.

- **v0.0.27 — Histórico de Prontuário Integrado (Transição)**:
  - Experimentação inicial de prontuário integrado com linha do tempo clínica e avaliações geriátricas (GeriTools).

- **v0.0.28 — Separação Estratégica: Foco Exclusivo em Laudos de Imagem**:
  - **Decisão do Proprietário**: _"Vou separar o prontuário do sistema de laudos. ENTÃO NESSE PROJETO MANTEREMOS APENAS OS LAUDOS."_
  - O **LW Laudos** passa a concentrar 100% de sua energia no fluxo de laudos de imagem, agenda completa com AccessionNumber/MWL DICOM (Orthanc), comprovante A4, preparos, duração por exame, body marks e isolamento multiperfil.
  - O prontuário eletrônico completo (evoluções clínicas, anamneses, consultas de retorno, escalas geriátricas) será desenvolvido futuramente como um **produto separado**.
  - **O que foi removido da UI nesta versão**:
    - Seções e botões de evolução clínica (`clinical_notes`) na ficha do paciente.
    - Avaliações geriátricas (`geriatric_assessments`), modal GeriTools, badges de escores geriátricos e o parâmetro/fluxo `?anexo_geriatrico` no `UltrasoundReportEditor`.
    - Os utilitários e fixtures órfãos de cálculo geriátrico foram removidos do bundle do app e da página de diagnóstico.
    - A identidade "Prontuário ↗" na Agenda e no Editor foi renomeada para **"Ficha do paciente ↗"**.
    - A rota `/pacientes/:id` voltou a ser a **Ficha do Paciente laudo-cêntrica**: laudos de ultrassonografia (rascunho/finalizado) em destaque com link direto para o editor, e abaixo os agendamentos de exames com status, clínica, responsável pelo agendamento e fotos ampliáveis das solicitações médicas (contexto essencial do exame).
  - **Preservação de Dados no Banco**:
    - **NENHUMA coleção ou dado foi destruído no banco de dados**. As coleções `clinical_notes` (migração 0013) e `geriatric_assessments` (migração 0014) continuam intactas no schema PocketBase com todas as suas regras de RLS e índices, preparadas para futura exportação/migração para o novo produto de prontuário quando for lançado.

- **v0.0.29 — Locais de Trabalho Estruturados e Resolução de Compatibilidade na Agenda**:
  - **Evolução do Modelo de Clínicas/Locais de Atendimento**:
    - O campo `clinics_config` do perfil do médico passou a suportar objetos estruturados `{ id, name, logo }` (`UserClinicItem`), permitindo atribuir um logotipo exclusivo para cada local de atuação clínica.
  - **Correção Crítica de Runtime em `/agenda`**:
    - Normalização retrocompatível da leitura de clínicas na Agenda (`doctorClinics` em `Agenda.tsx`): o código aceita de forma transparente tanto o formato clássico (array de strings) quanto o formato novo (array de objetos `{ id, name, logo }`), extraindo sempre o nome em string para exibição nos seletores e persistência no agendamento (`clinic_location`).
    - Eliminação completa do erro `Uncaught Error: Objects are not valid as a React child (found: object with keys {id, name, logo})` ao acessar a rota `/agenda` com contas que já usavam o formato novo (como a conta teste do perfil médico convidado).
  - **Gerenciamento Completo de Locais de Trabalho em Configurações**:
    - Implementação de modal e interface visual para criar, renomear e carregar logotipo (PNG, JPEG, SVG) de cada clínica/unidade de atendimento em **Configurações → Preferências & Unidades**.
    - Persistência estruturada em `clinics_config` mantendo o isolamento rigoroso por médico (cada profissional gerencia unicamente suas próprias clínicas).
    - Preservação intacta de todos os dados do banco, incluindo o rascunho de laudo `muvdbwmrw3hagrr` e os registros do Dr. Lucas e da conta de teste convidado.

- **v0.0.34 — Operadores do Sistema com Vínculo ao Local, Isolamento Rígido, LGPD e Ética Médica**:
  - **Criação do Perfil "Operador"**:
    - Adicionado na matriz de convites administrativos com vinculação obrigatória no ato da criação: (a) o médico a quem serve (`assigned_doctor`) e (b) o(s) local(is) de atendimento em que atua (`allowed_clinics`).
  - **Isolamento Rígido entre Unidades nos Dois Sentidos**:
    - Quem opera para a Gastroimagem não visualiza nada do HM Samuel Marques dos Santos e vice-versa.
    - Aplicado no backend via regras RLS no PocketBase (migração `0016_create_operators_and_access_logs.js`) e reforçado no serviço de agendamentos (`appointmentsService`) e pacientes (`patientsService`).
  - **Limitação de Acesso (Ética Médica e Mínimo Necessário)**:
    - O operador pode consultar e cadastrar pacientes estritamente para agendamento (nome, nascimento, sexo, telefone e — quando exigido pela unidade pública HM Samuel — CPF, Cartão do SUS e endereço).
    - O operador pode criar, editar e cancelar agendamentos nos seus locais autorizados, anexar a foto da solicitação e emitir o comprovante A4.
    - **Bloqueio Absoluto na API e UI**: o operador **NÃO PODE** ler conteúdo clínico (texto de laudos, imagens do exame, body marks, evoluções clínicas ou modelos). A coleção `reports`, `exam_images`, `clinical_notes` e `templates` rejeita explicitamente requisições de operadores a nível de API (`@request.auth.role != 'Operador'`).
  - **Conformidade LGPD**:
    - Criação da coleção `access_logs` para registro de auditoria (quem acessou qual paciente/recurso, quando, em qual clínica e qual ação).
    - Modal de visualização de auditoria LGPD disponível na ficha do paciente para o médico e administrador.
  - **Interface Dedicada ao Operador**:
    - Menu lateral do operador reduzido unicamente a **Agenda** e **Pacientes**. Rotas clínicas e de configurações redirecionam com segurança.
  - **Validação e Simulações E2E**:
    - Bateria automatizada e auditável em `/diagnostico` testando o ciclo completo do operador (agendamento isolado, bloqueio na API a laudos) e do médico (exame realizado, laudo finalizado e agendamento como Realizado), com limpeza de descartáveis e comprovação da integridade do rascunho oficial `muvdbwmrw3hagrr`.

---

## 3. Arquitetura Atual do Sistema (v0.0.29)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          NAVEGADOR DO USUÁRIO                           │
│  React 18 + Vite + TypeScript + Tailwind CSS (shadcn/ui)                │
│                                                                         │
│  • Perfis: Administrador Geral, Admin, Médico, Secretária, Gestor,      │
│    Contabilidade                                                        │
│  • Editor estruturado de US com atalhos (Ctrl+N) e banco de frases      │
│  • Módulo Body Mark (SVGs vetoriais puros de mama, pelve, ombro...)     │
│  • Compilador de PDF binário real (%PDF-1.4 em TypeScript) sem API ext  │
│  • Agenda com cálculo automático de duração por tipo de exame           │
│  • Comprovante do paciente em A4 com preparo e orientações de exame     │
│  • Importação de guia médica por foto (proposta sujeita à revisão)      │
└───────────────────────┬─────────────────────────────────────────────────┘
                        │
                        │ HTTPS REST + Realtime SSE (PocketBase JS SDK)
                        │ (URL dinâmica: VITE_POCKETBASE_URL ou Nuvem Skip)
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       BACKEND (PocketBase v0.22+)                       │
│  Hospedado no Skip Cloud (portável para servidor local Windows/Linux)   │
│                                                                         │
│  • SQLite embutido com transações ACID                                  │
│  • Coleções: users, patients, exams, reports, templates,               │
│    medical_specialties, appointments, user_permissions,                 │
│    exam_preparations, clinical_notes, geriatric_assessments             │
│  • Regras RLS estritas (médico acessa seus laudos;                      │
│    secretária/gestor acessam agenda e pacientes sem dados clínicos)     │
│  • pb_hooks:                                                            │
│    - GET  /backend/v1/mwl/appointments (autenticado por Token MWL)      │
│    - POST /backend/v1/ai/analyze-request-image (Gateway IA no backend)  │
│    - Geração automática de AccessionNumber (LW-YYYYMMDD-XXXX)           │
│  • Migrações declarativas aplicadas: 0001 a 0013                        │
└───────────────────────┬─────────────────────────────────────────────────┘
                        │
                        │ Polling HTTPS (Bearer Token do Médico)
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     NOTEBOOK DO MÉDICO (WINDOWS)                        │
│                                                                         │
│  • Hotspot 4G/5G do celular: conecta o notebook à nuvem                 │
│  • tools/mwl_bridge/bridge.py: sincroniza agendamentos ativos           │
│  • Orthanc Server (localhost:8042 REST / porta TCP 104 DICOM)           │
│  • Plugin Modality Worklists (entradas atômicas / ciclo de vida)        │
│  • tools/mwl_bridge/VERIFICAR.py: bateria de prontidão ponta a ponta   │
└───────────────────────┬─────────────────────────────────────────────────┘
                        │
                        │ Cabo Ethernet Direto (TCP/IP 192.168.1.x)
                        │ Protocolo DICOM 3.0 C-FIND SCP (porta 104)
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   APARELHO DE ULTRASSONOGRAFIA                          │
│                   SAEVO FT412 (Mirante da Serra, RO)                    │
│                                                                         │
│  • Consulta Worklist nativa (New Patient → WorkList → Search)           │
│  • Importa paciente, ID, sexo, data e Accession Number sem digitação    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Estado dos Dados no Banco

- O banco de dados em produção/demonstração contém **registros sintéticos de teste**:
  - Paciente sintético de teste: `"TESTE — Demonstração LW (fictício)"` (ID: `mjjngduz3steate`, CPF fictício `000.000.000-00`).
  - Laudo rascunho de demonstração: ID `muvdbwmrw3hagrr` (associado ao exame `dgw4edb2sb9jfqg`).
- **Nenhum dado sensível de paciente real** está registrado sem consentimento ou de forma estática.
- **Importante**: O agente externo **não deve apagar, alterar nem sobrescrever** registros de demonstração ou tabelas do banco.

---

## 5. O que NÃO Está Feito / Pendências Reais de Campo

Para manter honestidade técnica rigorosa, registre o que ainda está pendente:

1. **Teste de Campo Físico em Mirante da Serra com o Saevo FT412**:
   - A ponte `bridge.py` e os scripts de teste (`VERIFICAR.py`) foram desenvolvidos e validados com simulações e ciclo de vida sintético.
   - **O teste físico real com o cabo de rede conectado ao equipamento Saevo FT412 em Mirante da Serra ainda está pendente**. A prova de campo definirá o sucesso da comunicação física DICOM C-FIND.
2. **Prova Final da Ponte com Orthanc Real no Notebook**:
   - Depende de o executável `Orthanc.exe` com a biblioteca `ModalityWorklists.dll` estar instalado na máquina Windows conforme orientações de `docs/INSTALACAO_AGENTE_IA.md`.
3. **Cliques Reais no SVG dos Body Marks**:
   - O editor visual de Body Marks renderiza os esquemas SVG e permite posicionar e listar marcadores com quadrantes/horas/regiões; melhorias no mapeamento de clique vetorial interativo direto sobre cada polígono específico continuam como evolução futura.
4. **Provedores de Assinatura Digital ICP-Brasil**:
   - A infraestrutura está pronta nos adaptadores de serviço (`src/services/digitalSignature.ts`), porém **desativada por padrão**, operando no modo de assinatura manual em papel ou emissão digital simples. Nenhuma credencial comercial falsa deve ser inserida.

---

## 6. Regras Obrigatórias para o Agente de IA Externo

O agente externo (ChatGPT / Codex / Claude Code / etc.) deve observar estritamente as regras abaixo:

1. **Papel Exclusivo de Instalação Local**:
   - Sua única responsabilidade é seguir os passos de instalação da ponte local no notebook Windows do médico.
   - **NÃO alterar** nenhum arquivo de código do app (`src/**`), nenhum componente React, nenhuma folha de estilo, nenhum arquivo de migração do PocketBase (`pocketbase/migrations/**`), nem regras de hook.
   - O desenvolvimento e a evolução do código do sistema continuam guiados exclusivamente pelo **Skip**.
2. **Preservação de Credenciais e Segurança**:
   - Não altere senhas, chaves de autenticação, nem regras de permissão no PocketBase.
   - O token MWL do médico deve ser lido unicamente do arquivo local `tools/mwl_bridge/config_ponte.env` (que nunca deve ser commitado no Git). Nunca "hardcode" o token no código.
3. **Integridade de Dados**:
   - Não remova, não renomeie e não altere os registros existentes no banco de dados.
4. **Honestidade Técnica nos Testes**:
   - Diferencie claramente **revisão estática de código** de **execução real em tempo de execução**.
   - Nunca afirme que um serviço funcionou sem ter verificado o código de retorno ou a saída real dos scripts no console do Windows.
5. **Roteiro Mandatório**:
   - Siga rigorosamente o passo a passo descrito em [`docs/INSTALACAO_AGENTE_IA.md`](INSTALACAO_AGENTE_IA.md).
6. **Plano B Operacional**:
   - Se por qualquer motivo a ponte Orthanc ou a comunicação DICOM falhar no local, acione imediatamente o **Plano B**:
     - O médico digita o nome do paciente direto no aparelho Saevo FT412.
     - O exame é realizado normalmente.
     - As fotos são exportadas para um pendrive USB e anexadas no laudo do LW Laudos pelo notebook conectado ao hotspot do celular.
     - O laudo é gerado em PDF e impresso normalmente. Nenhum atendimento é interrompido.

---

## 7. O Teste de Campo em Mirante da Serra

| Parâmetro                        | Detalhe                                                                                                                                                                                                                                                             |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Localização**                  | HM Samuel Marques dos Santos / Clínica em Mirante da Serra (interior de Rondônia).                                                                                                                                                                                  |
| **Condições do Local**           | Sala de atendimento **sem infraestrutura de TI prévia** (sem servidor dedicado de TI, sem cabeamento estruturado de rede, sem PACS hospitalar, sem roteador corporativo).                                                                                           |
| **Equipamento de Ultrassom**     | **SAEVO FT412** (dispõe de suporte nativo a DICOM Worklist no manual técnico).                                                                                                                                                                                      |
| **Topologia de Rede Local**      | Notebook do médico conectado ao aparelho Saevo via **cabo Ethernet direto** (IPs estáticos: Notebook `192.168.1.100`, Saevo `192.168.1.50`, porta DICOM `104`, AE Title `LW-ORTHO`).                                                                                |
| **Conexão com a Nuvem**          | Notebook conectado via Wi-Fi ao **Hotspot 4G/5G do celular** do médico para sincronizar a agenda do LW Laudos com a nuvem Skip. O aparelho Saevo não necessita de internet.                                                                                         |
| **Critério de Sucesso do Teste** | Um exame agendado na tela de **Agenda** do LW Laudos na nuvem é baixado pelo script `bridge.py`, disponibilizado pelo Orthanc local e **aparece listado na tela de Worklist (New Patient → Worklist) do aparelho Saevo FT412** pronto para transferência dos dados. |

---

_Documento consolidado para orientação do agente local no notebook do Dr. Lucas Willian da Silva (CRM RO 6955) — Estado do Projeto v0.0.29._
