# Arquitetura do Banco de Dados Local do LW Laudos (PocketBase v0.22+ SQLite)

Este diretório contém a estrutura necessária para inicializar uma instância limpa ou sincronizada do PocketBase em qualquer máquina Windows (ou Linux/Mac) de forma 100% offline.

## 1. Migrações Incluídas

As migrações em `pocketbase/migrations/` (0001 a 0021) reproduzem exatamente a estrutura do backend de produção:

- `0001_update_users_fields.js`: Campos estendidos de perfil médico e papéis (CRM, UF, especialidades, etc.)
- `0002_create_collections.js`: Coleções base (`patients`, `exams`, `reports`, `templates`, etc.)
- `0003_seed_data.js`: Dados iniciais e modelos de laudo padrão
- `0004_ultrasound_reports_and_images.js`: Laudos ultrassonográficos e armazenamento de imagens
- `0005_seed_ultrasound_findings.js`: Banco de achados ecográficos normais e patológicos
- `0006_add_signature_fields_to_reports.js`: Metadados e hash SHA-256 para assinaturas
- `0007_create_appointments.js`: Agendamentos e controle de status
- `0008_specialties_and_template_specialty.js`: Especialidades médicas
- `0009_multi_profile_schedule_sus.js`: Atendimento SUS e horários por clínica
- `0010_create_exam_preparations.js`: Orientações de preparo pré-exame
- `0011_exam_durations_by_exam_type.js`: Duração padrão por tipo de exame
- `0012_make_patient_document_optional.js`: Flexibilização de documento de paciente
- `0013_create_clinical_notes.js`: Notas clínicas isoladas
- `0014_create_geriatric_assessments.js`: Avaliações especializadas
- `0015_add_referring_physician_and_seed_guest.js`: Médico solicitante
- `0016_create_operators_and_access_logs.js`: Controle de operadores e trilha de auditoria LGPD
- `0017_add_digital_signature_preference.js`: Preferências de assinatura por médico
- `0018_add_doctor_cpf_and_signature_session.js`: CPF e sessão em nuvem
- `0019_increase_reports_text_limits.js`: Suporte a laudos extensos
- `0020_add_signed_pdf_and_validity_to_reports.js`: Armazenamento de PDF assinado
- `0021_create_text_masks.js`: Máscaras de texto e frases prontas

## 2. Localização dos Dados Persistentes (Windows)

No ambiente desktop, o PocketBase armazena o banco SQLite em:
`%APPDATA%\LWLaudos\pb_data\`
Isto garante que:

- Atualizações do executável do aplicativo NÃO sobrescrevam o banco de dados.
- O desinstalador preserve os dados clínicos por padrão (a menos que o usuário solicite explicitamente a remoção).
- Backups possam ser realizados copiando a pasta `%APPDATA%\LWLaudos\pb_data`.
