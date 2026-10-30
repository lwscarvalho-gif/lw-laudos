# LW Laudos — Status e Contexto Geral do Projeto

> **Versão do Projeto**: **v0.0.48** (Fechada — Ingestão de Imagens Médicas por DICOM Local e PACS Orthanc no Editor de Laudo com Frames Reais no PDF)  
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

- **v0.0.48 — Ingestão de Imagens Médicas por DICOM Local (.dcm) e PACS Orthanc no Editor de Laudo com Suporte a Frames Reais no PDF**:
  - **Atendimento à Solicitação do Médico Radiologista / Proprietário**:
    - _"ESSAS IMAGENS... PRECISAMOS ANEXAR DIRETO DA MAQUINA ATRAVEZ DO DICOM E PACS (O QUE VOCE COLOCOU NO ARQUIVO QUE SALVASTE NO GITHUB)"_
  - **1. Upload e Decodificação DICOM Local (.dcm / .dicom) no Navegador**:
    - Criação do módulo nativo em TypeScript puro `src/lib/dicomParser.ts`, sem dependências externas pesadas ou instáveis, que decodifica Part 10 DICOM no cliente.
    - Suporte a dados monocromáticos (Monochrome 1 e 2 com Window Leveling automático) e coloridos (RGB/YBR), incluindo arquivos multi-frame ecográficos.
    - Seletor nativo visível e zona de arrastar e soltar (`ExamImagesManager.tsx`) aceitam agora simultaneamente `.dcm`, `.dicom`, `application/dicom` junto aos tradicionais JPG e PNG (que continuam funcionando normalmente).
  - **2. Integração com Servidor PACS Orthanc (Ponte Local / Nuvem)**:
    - Implementação de rotas seguras no backend (`pocketbase/hooks/mwl_bridge.pb.js`):
      - `GET /backend/v1/pacs/orthanc/status`: consulta status e conectividade do Orthanc.
      - `POST /backend/v1/pacs/orthanc/search`: busca estudos via C-FIND por Nome do Paciente, CPF, Data do Exame ou Accession Number.
      - `POST /backend/v1/pacs/orthanc/study-instances`: lista as instâncias e séries do exame selecionado.
      - `GET /backend/v1/pacs/orthanc/render-instance`: proxy seguro para download das imagens sem expor credenciais nem sofrer bloqueio de CORS no navegador.
    - Criação do modal `OrthancPacsSearchModal.tsx` acionado pelo botão **"Buscar no PACS Orthanc"** diretamente na seção de anexos do editor de laudo.
    - Serviço `orthancPacsService.ts` com gerenciamento de endereço local padrão (`http://localhost:8042`) e integração fluida.
  - **3. Tratamento Ético e Omissão da Nota Ilustrativa para Frames Reais no PDF**:
    - No gerador de PDF (`pdfGenerator.ts`) e na visualização HTML (`buildReportHTML`), os anexos provenientes de DICOM/PACS são marcados como frames reais (`isRealDicom = true`).
    - Para frames DICOM reais, a anotação `(Imagem ilustrativa)` em cada figura e a nota de rodapé `Nota: Imagens ilustrativas — substituir pelos frames capturados do exame.` são automaticamente omitidas e substituídas pela declaração clínica autêntica: `Documentação fotográfica: Frames ecográficos reais capturados do exame.`.
    - Placeholders e imagens ilustrativas comuns mantêm a nota ética conforme diretrizes anteriores.
  - **4. Atualização da Matriz em Integrações (`/integracoes`)**:
    - O cartão de DICOM Imagens agora destaca o módulo de PACS Orthanc e DICOM Local ativo e pronto para uso no editor.
  - **5. Preservação de Dados e Integridade do Banco**:
    - O rascunho de laudo oficial do Dr. Lucas (`muvdbwmrw3hagrr`, owner `kxhlkfxh0yddn64`, status `Rascunho`) permanece 100% intacto no banco de dados.

- **v0.0.47 — Máscaras de Texto no Editor de Laudo (Modo Texto Livre) com Modelos Prontos e Gestão Pessoal por Médico**:
  - **Atendimento à Solicitação do Usuário/Proprietário**:
    - _"nessa parte de texto livre quero deixar a opção do medico cadastrar suas mascaras (texto pre prontos que ele apenas edita) inclusive podemos deixar as mascaras prontas para serem personalizadas e salvas a criterio do medico."_
  - **1. Botão e Acesso a Máscaras de Laudo**:
    - No `UltrasoundReportEditor.tsx`, a área _"Corpo do Laudo (Texto Livre)"_ recebeu o botão verde proeminente **"Máscaras de Laudo"** (com ícone de livro/modelo).
    - O botão abre o modal dedicado `TextMasksModal` (`src/components/ultrasound/TextMasksModal.tsx`) para seleção rápida, pré-visualização completa e aplicação no editor.
    - Também disponibilizado no editor geral de novos laudos (`LaudoNovo.tsx`).
  - **2. Máscaras Pré-Prontas do Sistema**:
    - Migração `0021_create_text_masks.js` com seed inicial de modelos clínicos padronizados de ultrassonografia de abdome total:
      1. _"Abdome total — Normal completo"_ (descrição completa de todos os órgãos em prosa clínica padronizada e conclusão normal).
      2. _"Abdome total — Litíase biliar (Colelitíase)"_ (cálculo móvel com sombra acústica posterior, vesícula sem sinais de colecistite aguda).
      3. _"Abdome total — Esteatose hepática moderada (Grau II)"_ (infiltração gordurosa difusa com atenuação acústica).
      4. _"Abdome total — Nefrolitíase (Cálculo renal)"_ (cálculo em grupo calicinal com sombra acústica, sem hidronefrose).
      5. _"Abdome total — Ascite / Líquido livre na cavidade"_ (líquido livre nos recessos peritoneais e escavação pélvica).
  - **3. Diálogo de Inserção Inteligente (Substituir vs Adicionar ao Final)**:
    - Se o corpo do laudo já tiver texto digitado, um diálogo objetivo pergunta ao médico se ele deseja:
      - **"Substituir todo o conteúdo atual"** (recomendado ao iniciar novo documento com o modelo) OU
      - **"Adicionar ao final do texto atual"** (preservando o que já foi digitado e anexando o modelo com quebra dupla).
  - **4. Máscaras Pessoais do Médico e Personalização Sem Alterar o Original**:
    - O médico pode salvar o texto digitado atual como uma nova máscara pessoal através do botão _"Salvar Texto Atual como Máscara"_.
    - Na lista de modelos do sistema, o médico pode clicar em _"Personalizar Cópia"_ para gerar uma versão particular editável sem alterar a máscara do sistema original (que permanece protegida e imutável no banco).
    - Máscaras particulares podem ser renomeadas, editadas e excluídas pelo próprio dono através da UI.
  - **5. Persistência e Segurança RLS (Coleção `text_masks`)**:
    - Coleção `text_masks` com regras de isolamento:
      - `listRule` e `viewRule`: médicos leem as máscaras do sistema (`is_system = true`) e as suas próprias (`owner_id = @request.auth.id`). Operadores não têm acesso (`@request.auth.role != 'Operador'`).
      - `createRule`, `updateRule`, `deleteRule`: exclusivas para o dono (`owner_id = @request.auth.id`) sobre suas máscaras particulares (`is_system = false`).
  - **6. Integridade de Dados e QA**:
    - O rascunho oficial de laudo do Dr. Lucas (`muvdbwmrw3hagrr`, status `Rascunho`, owner `kxhlkfxh0yddn64`) permanece 100% intacto no banco.
    - Pipeline de QA (`oxlint`, `tsc -p tsconfig.app.json`, `vite build`) 100% verde com zero erros.

- **v0.0.46 — Desacoplamento da Documentação Fotográfica em Anexo Independente com Paginação Própria**:
  - **Atendimento à Solicitação do Proprietário**:
    - Ajustada a estrutura de páginas do PDF de laudo de imagem para que as imagens sejam apresentadas em anexo separado e independente do laudo propriamente dito.
  - **1. Laudo Termina no Bloco de Assinatura + Validade**:
    - O documento do laudo compreende exclusivamente o cabeçalho, corpo estruturado dos órgãos, conclusão diagnóstica, bloco de assinatura (digital ou manual) e rodapé de validade.
    - A numeração de páginas do laudo (`Página X de Y`) conta apenas as páginas do laudo em si (a última página numerada do laudo é a que contém a assinatura). Nenhuma figura aparece numerada como sequência do laudo.
  - **2. Anexo Fotográfico Independente**:
    - As figuras do exame iniciam em página nova (`page-break-before`), com cabeçalho próprio identificado (`ANEXO — DOCUMENTAÇÃO FOTOGRÁFICA DO EXAME`).
    - Bloco de referência completo ao documento principal (Nome do paciente, documento/CPF, título do exame e data/emissão) para que o anexo nunca se desvincule do laudo.
    - Numeração independente e exclusiva do anexo (`Anexo — Página 1 de 2`, `Anexo — Página 2 de 2`), tanto no cabeçalho quanto no rodapé, sem misturar com a numeração do laudo.
  - **3. Transparência Ética sobre Imagens Ilustrativas**:
    - Indicador discreto sob cada figura (`(Imagem ilustrativa)`).
    - Nota clara no rodapé do anexo: `Nota: Imagens ilustrativas — substituir pelos frames capturados do exame.`, garantindo honestidade e evitando confusão com frames reais do paciente.
  - **4. Ajuste dos Rodapés e Preservação de Identidade**:
    - O rodapé de validade legal de 90 dias continua ativo em todas as páginas do laudo e do anexo.
    - O aviso de versão preliminar não homologada e o "Página X de Y" do laudo não são exibidos no rodapé do anexo.
    - Preservados na íntegra: cabeçalho da clínica, via do paciente, estilo visual acolhedor, carimbo Bird ID e rodapé configurável.
  - **5. Integridade do Banco**:
    - O rascunho de demonstração do Dr. Lucas (`muvdbwmrw3hagrr`, owner `kxhlkfxh0yddn64`, status `Rascunho`) permanece 100% intacto no banco de dados.

- **v0.0.45 — Correção Definitiva da Impressão do Comprovante de Agendamento (Folha em Branco/Sem Texto)**:
  - **Diagnóstico da Causa Raiz do Comprovante em Branco**:
    - O comprovante de agendamento do paciente (`AppointmentVoucherModal`) estava sendo renderizado dentro do portal flutuante do Radix Dialog (`[data-radix-portal]`) com a regra `@media print` tentando capturar `#appointment-printable-voucher` no DOM raiz através do seletor `body:has(#appointment-printable-voucher) * { visibility: hidden }`.
    - Ao invocar `window.print()` a partir do contexto da SPA, o motor de renderização de impressão dos navegadores (Chromium / Firefox / WebKit) calculava a caixa de layout e as coordenadas do portal flutuante com altura/scroll virtual do modal pai, resultando em corte de viewport ou impressão de páginas em branco (exatamente a folha vazia com cabeçalho de URL enviada pelo usuário).
  - **Implementação do Motor Dedicado de Impressão de Comprovante (`src/lib/appointmentVoucherPrinter.ts`)**:
    - Criação de gerador de documento HTML 100% autocontido (`buildAppointmentVoucherHTML`), seguindo a mesma arquitetura de sucesso já utilizada com solidez na emissão de laudos (`buildReportHTML`).
    - Estilos isolados com `@page { size: A4 portrait; margin: 10mm 12mm; }`, tipografia Inter, preservação de cores via `-webkit-print-color-adjust: exact !important` e enquadramento total em 1 página sem quebras de linha espúrias.
    - Função `printAppointmentVoucher` com estratégia em 2 etapas:
      1. Abre uma janela/popup limpa e dedicada com o HTML autocontido renderizado e dispara a impressão com foco garantido.
      2. Fallback resiliente via `iframe` oculto no documento, garantindo impressão impecável mesmo se popups estiverem bloqueadas.
  - **Blindagem do CSS de Mídia de Impressão (`src/main.css`)**:
    - Substituição das regras conflitantes de `body:has(#appointment-printable-voucher)` por manipulação estruturada do portal do Radix Dialog, garantindo que mesmo se o usuário acionar o atalho `Ctrl+P` do navegador com o modal aberto, o conteúdo do comprovante seja visível, formatado e sem páginas adicionais em branco.
  - **Validação E2E com Perfil Convidado (`SimulationVoucherAppointmentE2E`)**:
    - Adicionado componente de teste de fluxo em `/diagnostico` que autentica com a conta de teste (`convidado@lwlaudos.local`, senha `Convidado123`), cria agendamento para o horário das 20:00, verifica a extração de todos os dados clínicos (nome, data, horário, clínica, preparo clínico e documentos a levar), comprova a formatação em 1 página A4 e limpa o registro de teste.
  - **Integridade Garantida**:
    - O rascunho oficial de laudo do Dr. Lucas (`muvdbwmrw3hagrr`, owner `kxhlkfxh0yddn64`, status `Rascunho`) segue 100% intacto no banco de dados.

- **v0.0.43 — Fechamento de Tipagem TypeScript e Homologação de QA Verde**:
  - **Correção Estrita de Tipagem no Módulo de Assinatura Real (`backendRealSignature.ts`)**:
    - Ajustado o tipo do corpo de requisição em `pb.send('/backend/v1/assinatura/assinar')` para conformidade com a assinatura de tipos do PocketBase SDK (`Record<string, unknown>`).
  - **Saneamento de Referência de Validade no Editor de Laudo (`UltrasoundReportEditor.tsx`)**:
    - Padronização do campo de persistência `validity_days: 90` no payload de finalização do laudo ultrassonográfico, mantendo o prazo clínico padrão de 90 dias em conformidade com o gerador de PDF e a coleção `reports`.
  - **Homologação Completa do Pipeline de QA**:
    - Execução do pipeline de QA estático e de compilação (`oxlint` + `tsc --noEmit -p tsconfig.app.json` + `vite build`) com **zero erros** e código de saída 0.
  - **Auditoria de Integridade de Dados no Banco**:
    - Consulta de verificação (`db_query`) ao rascunho oficial de laudo do Dr. Lucas (`muvdbwmrw3hagrr`, owner `kxhlkfxh0yddn64`), confirmando preservação integral do status `Rascunho` e de todos os blocos anatômicos descritos.

- **v0.0.42 — Backend Preparado para Assinatura PAdES Real via Segredos e PDF nos Moldes do Proprietário**:
  - **BLOCO 1 — Backend Pronto para Assinatura PAdES Real (Bird ID e VIDaaS)**:
    - **Rotas Seguras no Backend (`pocketbase/hooks/mwl_bridge.pb.js`)**:
      - `GET /backend/v1/assinatura/status`: consulta o estado de configuração das chaves de API reais no servidor.
      - `POST /backend/v1/assinatura/assinar`: rota autenticada para envio do hash SHA-256 e PDF do laudo.
      - Leitura estrita via `$os.getenv` dos segredos: `BIRD_ID_CLIENT_ID`, `BIRD_ID_CLIENT_SECRET` (Bird ID via `api.birdid.com.br` com OAuth2 `client_credentials`) e `VIDAAS_API_KEY` (VIDaaS via IntegraICP REST Channel).
      - **Tratamento Honesto e Sem Travamentos**: como confirmado via `list_secrets`, as variáveis ainda não existem no ambiente; o backend responde o estado `"não configurado"` (HTTP 412 estruturado ao tentar assinar sem segredos), orientando o fluxo com carimbo visual e hash SHA-256 preliminar ou assinatura manual, **sem nunca travar a finalização do laudo**.
    - **Frontend com Diálogo de Escolha e Resiliência**:
      - Novo serviço `backendRealSignatureService` (`src/services/backendRealSignature.ts`) gerenciando chamadas ao backend com cache e tipagem rigorosa.
      - No `UltrasoundReportEditor.tsx`, se a assinatura real em nuvem estiver ativa e o provedor falhar momentaneamente na finalização, abre-se o diálogo de escolha: o médico pode **tentar de novo** ou optar imediatamente por **assinatura manual**. O documento nunca fica bloqueado no editor.
      - **Condicionamento do Aviso Preliminar**: o aviso `"Versão preliminar para avaliação (não homologada para uso real)"` só é exibido nos documentos em que a assinatura digital ICP-Brasil real **NÃO** estiver ativa. Quando assinado com PAdES real, o aviso é suprimido.
  - **BLOCO 2 — PDF nos Moldes do Modelo do Proprietário**:
    - **Rodapé com Declaração de Validade Configurável**:
      - Adicionado rodapé com data de emissão e declaração de validade padronizada:
        `"Este laudo tem validade de 90 dias a partir da data de emissão (DD/MM/AAAA), válido até DD/MM/AAAA."`
      - Período padrão configurável por exame (30, 60, 90, 180 ou 365 dias), persistido na coleção `reports` (`validity_days`).
    - **Bloco de Assinatura Acima do Rodapé**:
      - Reestruturação da disposição vertical: Cabeçalho → Dados Clínicos → Corpo Descritivo → Conclusão Diagnóstica → Bloco de Assinatura (Nome, CRM, título e carimbo digital/espaço para assinatura manual) → Rodapé com Validade e Paginação em A4.
    - **Migração Declarativa Idempotente (`0020_add_signed_pdf_and_validity_to_reports.js`)**:
      - Adição dos campos `signed_pdf_file` (arquivo PDF), `validity_days` (número de dias de validade) e `signature_metadata` (JSON) na coleção `reports`.
  - **Integridade Garantida**:
    - O rascunho de demonstração do Dr. Lucas (`muvdbwmrw3hagrr`, owner `kxhlkfxh0yddn64`, status `Rascunho`) segue 100% intacto no banco de dados.

- **v0.0.41 — Elevação do Limite do Campo Body e Textos Longos para Laudos Completos**:
  - **Diagnóstico da Causa Raiz ("body: Must be no more than 5000 character(s).")**:
    - No PocketBase v0.22+/v0.36, campos do tipo `text` sem atributo `max` explícito adotam por padrão interno o limite de **5.000 caracteres**.
    - Ao utilizar a ação global **"Tudo Normal"** (introduzida na v0.0.39), o laudo de ultrassonografia de abdome total preenche todas as seções anatômicas (fígado, vesícula, vias biliares, pâncreas, baço, rins, bexiga, vasos e cavidade). O HTML estruturado compilado (`generateFullHtmlBody`) ultrapassa legitimamente os 5.000 caracteres (geralmente entre 5.200 e 8.000 caracteres).
    - Graças à extração detalhada de erro por campo adicionada na v0.0.40, o toast vermelho informou com precisão cirúrgica: `body: Must be no more than 5000 character(s).`
  - **Migração Idempotente de Esquema (`0019_increase_reports_text_limits.js`)**:
    - Elevação do limite do campo `body` da coleção `reports` para **100.000 caracteres** (capacidade ampla para laudos extensos com HTML e imagens base64/SVGs).
    - Auditoria preventiva em todos os outros campos de texto longo:
      - `reports.conclusion`: elevado para **50.000 caracteres**.
      - `templates.body`: elevado para **100.000 caracteres** e `templates.description` para **20.000 caracteres**.
      - `ultrasound_findings.text_content`: elevado para **50.000 caracteres**.
      - `exams.indication` (10.000) e `exams.technical_notes` (20.000).
      - `patients.notes` (20.000).
    - Aplicação imediata via `apply_migrations` no PocketBase sem tocar em nenhum registro existente.
  - **Auditoria do Editor de Ultrassom (`UltrasoundReportEditor.tsx`)**:
    - Confirmado que o gerador de HTML (`generateFullHtmlBody`) e o payload de envio (`handleFinalizeReport` / `performSaveDraft`) não realizam truncamento nem corte de texto (`slice`/`substring`), preservando 100% da integridade clínica descrita pelo médico.
  - **Extensão do Painel de Simulação E2E (`SimulationReportFinalizeE2E.tsx`)**:
    - O cenário de teste de finalização em `/diagnostico` foi expandido para gerar um laudo completo sintético com todos os 10 órgãos preenchidos pelo padrão normal, somando mais de 5.200 caracteres de body HTML.
    - O teste valida a criação 2xx do laudo longo com status `Finalizado` e assinatura Bird ID, confirma a leitura completa no banco e exclui o registro de teste em seguida, mantendo o banco limpo.
  - **Integridade Garantida**:
    - O rascunho oficial de laudo do Dr. Lucas (`muvdbwmrw3hagrr`, owner `kxhlkfxh0yddn64`, status `Rascunho`) permanece 100% intacto e verificado antes e depois da migração.

- **v0.0.40 — Correção da Finalização de Laudo Novo e Mensagens de Erro por Campo no Toast**:
  - **Diagnóstico da Causa Raiz ("Failed to create record")**:
    - No editor `/laudos/ultrassom`, ao finalizar um laudo **NOVO** (sem ID salvo previamente), o caminho executava `reportsService.create` e em seguida chamava `examImagesService.linkImagesToReport` apenas no fluxo de update.
    - O tratamento de exceções de erro do PocketBase (`getErrorMessage` em `src/lib/pocketbase/errors.ts`) agrupava apenas os valores sem o nome do campo ou caía no genérico `error.message` ("Failed to create record"), ocultando a causa exata do erro no toast vermelho do médico.
    - Aprimoramento da função `getErrorMessage` para extrair cada par `campo: mensagem de validação` (`field: msg`) da resposta do PocketBase (ex.: `patient_id: valor inválido`, `title: Cannot be blank`), garantindo diagnóstico imediato e honesto pela UI em qualquer falha de validação futura.
    - No fluxo de `handleFinalizeReport` de laudo novo (`!currentReportId`), foi adicionada a vinculação automática das imagens do exame ao laudo recém-criado (`linkImagesToReport`), alinhando o comportamento com o fluxo de edição.
  - **Validação E2E com Assinatura Digital Bird ID Ativa**:
    - Criado componente de auditoria e teste E2E em `/diagnostico` (`SimulationReportFinalizeE2E`), reproduzindo exatamente o fluxo do médico (Dr. Lucas Willian da Silva) para o paciente Carlos Eduardo Ribeiro de Souza com assinatura Bird ID ativa:
      1. Avaliação e verificação de sessão em nuvem ativa Bird ID.
      2. Envio do payload completo de criação de laudo novo com status `Finalizado`.
      3. Verificação de persistência 2xx no banco de dados.
      4. Limpeza atômica do registro temporário de teste após confirmação.
  - **Integridade Garantida**:
    - O rascunho oficial de laudo do Dr. Lucas (`muvdbwmrw3hagrr`) permaneceu rigorosamente intacto (Status: `Rascunho`, Owner: `kxhlkfxh0yddn64`).

- **v0.0.39 — Botão "Tudo Normal" no Editor de Laudo de Ultrassonografia**:
  - **Ação Global "Tudo Normal" no Topo do Formulário de Órgãos**:
    - No `UltrasoundReportEditor.tsx`, adição do botão verde proeminente **"Tudo Normal"** (com ícone `CheckCheck`) na barra superior do formulário estruturado de órgãos.
    - Ao ser acionado, todas as seções de órgãos que estão vazias são preenchidas de forma imediata e atômica com o respectivo texto padrão normal do catálogo (`ultrasound_findings`), marcadas visualmente com o badge de status e preservando a conclusão correspondente.
    - **Proteção Total do Conteúdo Digitado pelo Médico**:
      - Se nenhuma caixa tiver texto digitado previamente, o preenchimento ocorre direto sem atrito.
      - Se o médico já tiver digitado achados em alguma seção, um diálogo claro e objetivo informa quantas seções já possuem texto e oferece a opção com opção padrão recomendada: _"Preencher apenas as seções vazias (Recomendado)"_ ou _"Preencher tudo e sobrescrever o conteúdo existente"_.
    - **Fonte Única de Verdade**:
      - O texto injetado é exatamente o mesmo cadastrado na coleção `ultrasound_findings` (`is_default_normal = true` ou `finding_type = 'normal'`), o mesmo usado pelos botões individuais `Normal` de cada órgão.
    - **Feedback Imediato e Histórico Desfazer**:
      - Toast explicativo ao médico confirmando a quantidade de estruturas preenchidas (ex.: _"Laudo preenchido como normal — 12 estruturas atualizadas"_).
      - Todas as substituições alimentam o histórico `historyUndo`, permitindo reverter qualquer seção individualmente com o botão "Desfazer".
    - **Preservação de Atalhos**:
      - Os botões individuais `Normal` de cada órgão e os atalhos de teclado `Ctrl+N` / `Alt+N` continuam funcionando exatamente como antes para a caixa ativa.
  - **Integridade do Banco**:
    - O rascunho de laudo oficial de demonstração do Dr. Lucas (`muvdbwmrw3hagrr`) e todos os dados foram conferidos e permanecem 100% intactos.

- **v0.0.38 — Blindagem de Campos Obrigatórios na Finalização de Laudo e Remoção de Checkbox Redundante**:
  - **Eliminação do Erro "Cannot be blank" na Finalização de Laudo de Ultrassonografia**:
    - No `UltrasoundReportEditor.tsx`, blindagem rigorosa para que os campos obrigatórios no schema da coleção `reports` (`title`, `body`, `patient_id`) e campos de autor/carimbo nunca cheguem com valores vazios ou nulos.
    - Se nenhuma caixa de órgão tiver texto preenchido, o motor injeta um corpo clínico preliminar seguro em vez de um HTML vazio, evitando a rejeição 400 pelo PocketBase.
    - Resolução imediata de `patient_id` e exibição do nome do paciente no modal de finalização (`expand.patient_id` ou busca pontual via `patientsService.getById`), eliminando a exibição de "Paciente: Não informado" mesmo em exames com paciente vinculado.
  - **Remoção do Checkbox Redundante no Modal de Finalização**:
    - Conforme solicitação do médico, foi removida a caixa de seleção _"Atesto que revisei integralmente os achados ecográficos descritos..."_, desburocratizando o fluxo de emissão.
    - O modal agora finaliza diretamente com o botão verde **"Confirmar e Finalizar"**, reduzindo etapas e agilizando a rotina clínica diária.
  - **Preservação de Dados e Integridade**:
    - O rascunho oficial de laudo do Dr. Lucas (`muvdbwmrw3hagrr`) e demais dados no banco foram preservados 100% intactos.

- **v0.0.37 — Tratamento de Erros Detalhado e Isolamento no Editor de Ultrassonografia**:
  - Exibição de mensagens de validação descritivas do servidor PocketBase na interface em vez de mensagens genéricas.

- **v0.0.36 — Ativação de Assinatura Digital em Nuvem no Modelo GeriaTools (Bird ID & VIDaaS)**:
  - **Fluxo Primário em Nuvem (sem instalação de arquivo)**:
    - O fluxo principal de ativação passa a seguir o modelo do GeriaTools (`geritools.gericlass.com.br`), focado nas certificadoras em nuvem mais usadas por médicos no Brasil:
      - **Bird ID** (Soluti): validade estendida de **7 dias**.
      - **VIDaaS** (Valid): validade de **24 horas** (gratuito via CFM/CRM).
      - **Certificado A1 local** (.pfx/.p12 com chave privada client-side no navegador): preservado integralmente como alternativa secundária sem regressão.
  - **Botão com Escudo no Topbar (`Layout.tsx`)**:
    - Indicador com ícone de escudo na barra superior exibindo `"Assinatura digital · ativar"` quando inativa e `"Assinatura digital · ativa"` (com badge verde acolhedor) quando em sessão ativa. Visível exclusivamente para médicos e administradores (operadores não veem nada de assinatura).
  - **Modal "Escolha seu certificado digital" (`DigitalSignatureActivationModal.tsx`)**:
    - Subtítulo explicativo: _"Ative uma vez. Os documentos emitidos serão assinados enquanto a sessão estiver válida: 7 dias no Bird ID, 24 h nas outras certificadoras."_
    - Seleção rápida entre Bird ID e VIDaaS (com badge "Gratuito via CRM • 24 h").
    - Linha de identificação profissional: `CRM xxxx-XX · CPF 000.•••.•••-00` com link direto `"corrigir"` que leva a **Configurações → Identificação Profissional**.
    - Campo de código dinâmico (`CÓDIGO DO BIRD ID` ou `CÓDIGO DO VIDAAS`) com validação clara em português.
    - Persistência estruturada em `signature_session` (JSON) e ativação no perfil (`digital_signature_enabled`).
  - **Reflexo na Chave do Painel (`DigitalSignatureCard.tsx`)**:
    - Exibe o status da sessão: `"BIRD ID · VALE ATÉ DD/MM"` ou `"VIDAAS · VALE ATÉ DD/MM"`, com contagem de dias/horas restantes e opção rápida de alternar.
    - Desligar a chave encerra a sessão e retorna o fluxo à assinatura manual em papel.
  - **Emissão e Carimbo nos Laudos (`UltrasoundReportEditor.tsx`, `LaudoDetalhes.tsx`, `pdfGenerator.ts`)**:
    - Todo laudo finalizado durante a validade da sessão sai assinado automaticamente citando o provedor da sessão: _"Assinado digitalmente via [Provedor] por Dr. ..., CRM ..., data e hash SHA-256"_.
    - **Sessão expirada**: ao abrir o diálogo de finalização, um aviso amigável destaca que a sessão expirou e oferece reativação por código ou continuidade com assinatura manual — o médico nunca fica com o laudo bloqueado.
  - **Identificação com CPF em Configurações (`Configuracoes.tsx`)**:
    - Campo opcional de CPF adicionado na tela de Identificação Profissional via migração idempotente `0018_add_doctor_cpf_and_signature_session.js`.
  - **Limite Honesto Desta Etapa**:
    - Não realizamos OAuth corporativo nem chamadas diretas às APIs pagas da VaultID/Soluti/VIDaaS (não possuímos credenciais de API corporativa).
    - O serviço `cloudSignatureSession.ts` implementa a gestão da sessão por código com validade real, deixando os pontos de extensão prontos para plugar as chamadas às APIs quando contratadas. Na UI, não há alegações falsas de validação ICP-Brasil que ainda não ocorra no servidor.

- **v0.0.35 — Modalidade Dupla de Operação e Chave Liga/Desliga de Assinatura Digital no Painel com Certificado A1**:
  - **Meta de 2 modalidades operacionais concretizada**:
    - **Modalidade offline/manual**: laudo impresso para assinatura física do médico (comporta operação sem certificado ou em trânsito).
    - **Modalidade online/digital**: laudo com identificação, carimbo visual e dados do certificado digital ICP-Brasil.
  - **Chave no Painel (`/painel`, `Painel.tsx`)**:
    - Cartão compacto sob a saudação _"Olá, [Nome] 👋"_ contendo um switch Liga/Desliga rotulado **"Assinatura digital"**.
    - Estados explicativos claros:
      - **Ligada**: _"Laudos saem assinados digitalmente"_.
      - **Desligada**: _"Assinatura manual após impressão"_.
    - Visibilidade restrita aos perfis médicos e administradores (oculto para operadores).
    - Persistência individual por médico no campo `digital_signature_enabled` do perfil (`_pb_users_auth_`) via migração idempotente `0017_add_digital_signature_preference.js`.
  - **Gestão do Certificado A1 Client-Side (LGPD & Ética Médica)**:
    - Ao ligar pela primeira vez ou se não houver certificado ativo, abre modal para upload do arquivo `.pfx` ou `.p12` e validação da senha.
    - O certificado e a chave privada permanecem **estritamente no navegador local do médico** (IndexedDB `lw_laudos_doctor_pki_v1`), **nunca transmitidos ao servidor**.
    - Extração e exibição do titular (Common Name), emissor e serial ativo, com opção de gerenciar, substituir ou remover.
  - **Integração com o Gerador de PDF e Emissão de Laudos**:
    - Com a chave ligada e certificado configurado, o PDF compilado (`pdfGenerator.ts`) e o visualizador (`LaudoDetalhes.tsx`, `UltrasoundReportEditor.tsx`) embutem o selo formal de assinatura digital (ICP-Brasil / PAdES visual) com titular, CRM, emissor, serial, data/hora e hash SHA-256.
    - Com a chave desligada, o fluxo de assinatura manual permanece inalterado.
    - Se a chave estiver ligada sem certificado configurado, a interface alerta e permite seguir sem bloqueios involuntários do laudo.

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
