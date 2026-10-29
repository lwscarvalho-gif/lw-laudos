export type UserRole =
  | 'Administrador Geral'
  | 'Administrador'
  | 'Médico'
  | 'Secretaria'
  | 'Gestor'
  | 'Contabilidade'

export interface User {
  id: string
  email: string
  name: string
  role?: UserRole
  crm?: string
  crm_uf?: string
  professional_name?: string
  professional_title?: string
  logo?: string
  header?: string
  active?: boolean
  verified?: boolean
  mwl_token?: string
  clinics_config?: string[] | string
  default_appointment_duration?: number
  exam_durations_config?: Record<string, number> | string
  created?: string
  updated?: string
}

import type { RecordModel } from 'pocketbase'

export interface Patient extends RecordModel {
  id: string
  owner_id: string
  name: string
  document?: string // CPF (obrigatório exclusivamente no HM Samuel Marques dos Santos)
  birth_date?: string
  sex?: 'Feminino' | 'Masculino' | 'Outro'
  phone?: string
  email?: string
  address?: string
  sus_card?: string // Cartão do SUS
  notes?: string
  created?: string
  updated?: string
}

export type ExamStatus = 'Pendente' | 'Em análise' | 'Concluído'

export interface Exam extends RecordModel {
  id: string
  owner_id: string
  patient_id: string
  type: string
  exam_date: string
  status: ExamStatus
  indication?: string
  technical_notes?: string
  appointment_id?: string
  created?: string
  updated?: string
  // expanded relations
  expand?: {
    patient_id?: Patient
    appointment_id?: Appointment
  }
}

export type AppointmentStatus =
  | 'Agendado'
  | 'Confirmado'
  | 'Em atendimento'
  | 'Realizado'
  | 'Cancelado'

export interface Appointment extends RecordModel {
  id: string
  owner_id: string
  patient_id: string
  start_time: string // ISO string
  duration_minutes: number
  exam_type: string
  clinic_location: string
  status: AppointmentStatus
  notes?: string
  referring_physician?: string
  accession_number: string
  patient_name_dicom?: string
  patient_id_dicom?: string
  patient_birth_date?: string
  patient_sex?: string
  modality?: string
  study_description?: string
  scheduled_station_ae?: string
  exam_id?: string
  created_by?: string
  created_by_name?: string
  created_by_role?: string
  updated_by?: string
  updated_by_name?: string
  updated_by_role?: string
  request_images?: string[] | string
  created?: string
  updated?: string
  // expanded relations
  expand?: {
    patient_id?: Patient
    owner_id?: User
    created_by?: User
    updated_by?: User
  }
}

export interface MedicalSpecialty extends RecordModel {
  id: string
  name: string
  description?: string
  icon?: string
  sort_order?: number
  is_active?: boolean
  created?: string
  updated?: string
}

export interface Template extends RecordModel {
  id: string
  owner_id: string
  specialty_id?: string
  title: string
  description?: string
  body: string
  is_general?: boolean
  created?: string
  updated?: string
  expand?: {
    specialty_id?: MedicalSpecialty
  }
}

export type ReportStatus = 'Rascunho' | 'Finalizado'

export interface UltrasoundSectionData {
  id: string
  label: string
  text: string
  isCustom?: boolean
}

export type BodyMarkSchemeId =
  | 'none'
  | 'mama_direita'
  | 'mama_esquerda'
  | 'utero_transvaginal'
  | 'ombro_articular'
  | 'tireoide'
  | 'abdome_fatia'

export interface BodyMarkPoint {
  id: string
  number: number
  x: number // 0..1 normalized
  y: number // 0..1 normalized
  side?: 'Direito' | 'Esquerdo' | 'Bilateral' | 'Não se aplica'
  quadrant?:
    | 'Superomedial'
    | 'Superolateral'
    | 'Inferomedial'
    | 'Inferolateral'
    | 'Retroareolar'
    | 'Não se aplica'
  clockHour?: number // 1..12
  distanceFromNippleCm?: string // ex: "2.5 cm"
  deviceStatus?: 'Normoposicionado' | 'Mal posicionado' | 'Não se aplica'
  tendon?:
    | 'Supraespinhal'
    | 'Infraespinhal'
    | 'Subescapular'
    | 'Tendão longo do bíceps'
    | 'Outro'
    | 'Não se aplica'
  lesionGrade?:
    | 'Grau 1 (leve)'
    | 'Grau 2 (moderada)'
    | 'Grau 3 (grave)'
    | 'Ruptura parcial'
    | 'Ruptura completa'
    | 'Não se aplica'
  description: string
}

export interface BodyMarksState {
  schemeId: BodyMarkSchemeId
  points: BodyMarkPoint[]
}

export interface ReportStructuredData {
  sections: UltrasoundSectionData[]
  conclusion: string
  observations?: string
  mode: 'structured' | 'freetext'
  body_marks?: BodyMarksState
}

export interface ReportImagesConfig {
  imagesPerPage: 2 | 4 | 6
}

export interface Report extends RecordModel {
  id: string
  owner_id: string
  patient_id: string
  exam_id?: string
  template_id?: string
  title: string
  body: string
  status?: ReportStatus
  is_draft?: boolean
  exam_type?: string
  structured_data?: ReportStructuredData | null
  conclusion?: string
  images_config?: ReportImagesConfig | null
  author_name?: string
  author_crm?: string
  author_crm_uf?: string
  author_title?: string
  author_logo?: string
  signature_hash_sha256?: string
  signature_provider?: string
  signature_status?: string
  signature_date?: string
  created?: string
  updated?: string
  // expanded relations
  expand?: {
    patient_id?: Patient
    exam_id?: Exam
    template_id?: Template
  }
}

export interface UltrasoundFinding extends RecordModel {
  id: string
  owner_id: string
  exam_scope: string
  organ: string
  title: string
  finding_type: 'normal' | 'patologico'
  text_content: string
  is_default_normal?: boolean
  is_favorite?: boolean
  is_shared?: boolean
  has_variables?: boolean
  created?: string
  updated?: string
}

export interface ExamImage extends RecordModel {
  id: string
  owner_id: string
  exam_id?: string
  report_id?: string
  file: string
  caption?: string
  sort_order?: number
  selected_for_print?: boolean
  created?: string
  updated?: string
}

export type InvitationStatus = 'Pendente' | 'Aceito' | 'Expirado'

export interface Invitation {
  id: string
  email: string
  name: string
  role: UserRole
  token: string
  status: InvitationStatus
  expires_at?: string
  created_by?: string
  created?: string
  updated?: string
}

export interface ExamPreparation extends RecordModel {
  id: string
  exam_type: string
  specialty?: string
  instructions: string
  general_notice?: string
  duration_minutes?: number
  is_active?: boolean
  created?: string
  updated?: string
}

export interface UserPermissions {
  id: string
  user: string
  can_create_patients?: boolean
  can_read_patients?: boolean
  can_update_patients?: boolean
  can_delete_patients?: boolean
  can_create_exams?: boolean
  can_read_exams?: boolean
  can_update_exams?: boolean
  can_delete_exams?: boolean
  can_create_reports?: boolean
  can_read_reports?: boolean
  can_update_reports?: boolean
  can_delete_reports?: boolean
  can_create_templates?: boolean
  can_read_templates?: boolean
  can_update_templates?: boolean
  can_delete_templates?: boolean
  created?: string
  updated?: string
}
