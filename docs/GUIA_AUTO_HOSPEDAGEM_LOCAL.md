# LW Laudos — Guia Técnico de Auto-Hospedagem e Execução Local Autônoma

Versão Preliminar v0.0.6 • Sistema Médico Multiperfil

Este documento atende diretamente ao requisito de **execução local autônoma** do sistema em servidor ou computador físico da clínica (Windows, Linux ou macOS), sem dependência mandatória de nuvem, CDNs externos ou login remoto.

---

## 1. Avaliação Concreta de Auto-Hospedabilidade

O backend do LW Laudos é construído sobre o **PocketBase** (binário único, escrito em Go, com SQLite embutido e API REST + Realtime SSE nativa).

### 1.1 O que já é 100% portável e auto-hospedável localmente

- **Binário do Backend:** O PocketBase oficial roda nativamente em qualquer máquina (`./pocketbase serve`).
- **Migrações e Schema:** As migrações em `pocketbase/migrations/*.js` são código JS padrão do motor Goja do PocketBase e aplicam integralmente a estrutura de coleções (`users`, `patients`, `exams`, `templates`, `reports`, `ultrasound_findings`, `exam_images`, `user_permissions`).
- **Regras de Isolamento (RLS por `owner_id`):** Todas as regras de segurança são avaliadas pelo servidor (`@request.auth.id != '' && owner_id = @request.auth.id`). Elas rodam localmente com a mesma garantia de isolamento entre médicos.
- **Storage de Arquivos:** Imagens de ultrassom e logotipos de médicos são salvos na pasta local `pb_data/storage/` sem necessidade de S3 ou CDN externo.
- **Autenticação:** O subsistema de auth (senhas bcrypt, sessões JWT) é totalmente local no SQLite.
- **Geração de PDF e Impressão:** O compilador de PDF binário real (`%PDF-1.4`) roda em memória nativamente no navegador do médico, sem enviar dados para APIs de renderização em nuvem.

### 1.2 Dependências Impeditivas Reais (Sem Esconder Atrás de Selo)

Para garantir transparência técnica total, as seguintes dependências dependem de internet ou serviços externos e são tratadas explicitamente:

1. **Assinatura Digital ICP-Brasil em Nuvem (VIDaaS, Bird ID, SafeID, SerproID, RemoteID):**
   - _Dependência:_ Os Prestadores de Serviços de Confiança (PSCs) credenciados pela ICP-Brasil exigem conexão HTTPS com os servidores do PSC ou da IntegraICP/VaultID para autorização OAuth2 PKCE e assinatura de hash.
   - _Comportamento:_ **Opcional e desativado por padrão**. Em rede local sem internet, o status é exibido como `"Requer internet"`. A clínica continua emitindo laudos, finalizando exames e gerando PDFs autênticos normalmente.
2. **Assistente de IA Médica (LLMs):**
   - _Dependência:_ Chaves de API para modelos OpenAI/Anthropic/Skip AI exigem saída HTTPS para a internet.
   - _Comportamento:_ **Desconectado por padrão**. O editor de ultrassom e o banco de frases não dependem do assistente.
3. **Script de Proteção Skip Cloud no Preview Web (`skip.js`):**
   - _Dependência:_ No preview hospedado no Skip Cloud, o arquivo `index.html` contém `<script src="https://goskip.dev/skip.js"></script>`.
   - _Ação no deploy local:_ O script é tolerante a falhas (não bloqueia o React se estiver offline), mas em instalação local permanente pode ser removido do build estático.
4. **Envio de E-mails Transacionais (Convites de novos médicos):**
   - _Dependência:_ Em uma instalação local sem servidor SMTP configurado, o envio de convites por e-mail requer preenchimento das credenciais SMTP da clínica no painel admin do PocketBase (`http://localhost:8090/_/` -> Settings -> Mail settings).

---

## 2. Pré-Requisitos para Instalação Local na Clínica

- **Servidor da Clínica ou Computador do Médico:**
  - Sistema Operacional: Windows 10/11, Ubuntu/Debian Linux ou macOS.
  - Memória RAM mínima: 2 GB (4 GB recomendado).
  - Disco rígido: 10 GB livres (para armazenamento de fotogramas de exames).
- **Softwares:**
  - [PocketBase](https://pocketbase.io/) (versão v0.22+ ou v0.36+ compatível com a arquitetura do sistema operacional).
  - [Node.js](https://nodejs.org/) v18+ e npm (necessários apenas para gerar o build estático do frontend).
  - Navegador moderno: Google Chrome, Microsoft Edge ou Mozilla Firefox.

---

## 3. Passo a Passo de Instalação e Execução Local

### Passo 1: Preparar o Backend PocketBase

1. Crie uma pasta para o sistema, por exemplo `C:\lw-laudos\backend` ou `/opt/lw-laudos/backend`.
2. Baixe o executável do PocketBase e extraia-o nessa pasta.
3. Copie a pasta `pocketbase/migrations/` do projeto para dentro da pasta do executável:
   ```bash
   cp -r pocketbase/migrations /opt/lw-laudos/backend/pb_migrations
   ```
4. Inicie o servidor localmente:

   ```bash
   # No Linux/macOS:
   ./pocketbase serve --http="0.0.0.0:8090"

   # No Windows (PowerShell/CMD):
   .\pocketbase.exe serve --http="0.0.0.0:8090"
   ```

   _As migrações serão executadas automaticamente na inicialização, criando todas as tabelas e índices no arquivo `pb_data/data.db`._

### Passo 2: Criar a Conta de Administrador Local

1. Acesse pelo navegador: `http://localhost:8090/_/`
2. Cadastre o superusuário inicial do sistema da clínica.
3. Se desejar usar convites por e-mail, configure o servidor SMTP da clínica em **Settings -> Mail settings**.

### Passo 3: Compilar e Servir o Frontend

1. Na pasta raiz do código-fonte do projeto, configure a URL da API para apontar para o servidor local:
   ```bash
   # No arquivo .env.local (ou via variável de ambiente):
   VITE_POCKETBASE_URL=http://localhost:8090
   ```
   _(Caso o frontend seja acessado de outros computadores da rede da clínica, utilize o IP local do servidor, ex.: `http://192.168.1.100:8090`)._
2. Instale as dependências e compile:
   ```bash
   npm install
   npm run build
   ```
3. O build gerará a pasta `dist/`. Você pode servi-la:
   - **Opção A (Embarcado no PocketBase):** Copie o conteúdo de `dist/` para `pb_public/` na pasta do PocketBase. O sistema completo responderá diretamente em `http://localhost:8090`.
   - **Opção B (Servidor Web Dedicado):** Utilize Nginx, Caddy ou um servidor estático como `serve -s dist -l 3000`.

---

## 4. Importação, Exportação e Backup de Dados da Clínica

### 4.1 Backup Completo (Zero Configuração)

Como o PocketBase utiliza SQLite:

1. Para fazer backup, basta pausar o serviço ou usar a ferramenta de backup do painel admin (`/_/` -> Settings -> Backups).
2. O arquivo único `pb_data/data.db` contém **todos** os pacientes, exames, laudos e configurações.
3. A pasta `pb_data/storage/` contém **todos** os arquivos de imagens médicas e logotipos.
4. Para migrar de máquina, basta copiar a pasta `pb_data` inteira para o novo computador.

### 4.2 Exportação de Laudos e Prontuários

- Os laudos médicos são exportáveis em **PDF Real binário** individualmente ou via API REST em lote (`GET /api/collections/reports/records`).
- Cada laudo finalizado armazena seu conteúdo estruturado em JSON (`structured_data`), texto formatado em HTML e hash SHA-256 da versão.

---

## 5. Matriz de Conectividade e Comportamento em Modo Offline

| Componente                                      | Funciona Sem Internet?   | Funciona na Rede Local (LAN)? | Observações                              |
| ----------------------------------------------- | ------------------------ | ----------------------------- | ---------------------------------------- |
| **Editor Estruturado de Ultrassom**             | Sim                      | Sim                           | Edição e validação em tempo real         |
| **Biblioteca de Frases por Órgão**              | Sim                      | Sim                           | Salva no SQLite local                    |
| **Upload de Imagens de Exame**                  | Sim                      | Sim                           | Salvo no disco local (`pb_data/storage`) |
| **Rascunhos e Finalização**                     | Sim                      | Sim                           | Isolamento por `owner_id` ativo          |
| **Download de PDF Real (%PDF-1.4)**             | Sim                      | Sim                           | Compilado em memória no cliente          |
| **Impressão em Papel A4**                       | Sim                      | Sim                           | Via spooler da impressora da clínica     |
| **Assinatura Digital em Nuvem (VIDaaS/BirdID)** | **Não** (exige internet) | N/A                           | Exibe status _"Requer internet"_         |
| **Certificado Local A1/A3 (Futuro)**            | Sim                      | Sim                           | Planejado via ponte WebPKI/agente local  |
| **Assistente de IA Cloud**                      | **Não** (exige internet) | N/A                           | Exibe status _"Não conectado"_           |

---

## 6. Termo de Versão Preliminar

Este software encontra-se na versão v0.0.6. Mantém-se o aviso regulatório obrigatório em todos os documentos emitidos: _"Versão preliminar não homologada para uso real em diagnóstico médico definitivo sem conferência prévia do profissional responsável"_.
