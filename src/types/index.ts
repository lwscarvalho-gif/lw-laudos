export type UserRole = 'Administrador' | 'Médico'

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
  created?: string
  updated?: string
}

import type { RecordModel } from 'pocketbase'

export interface Patient extends RecordModel {
  id: string
  owner_id: string
  name: string
  document: string // CPF
  birth_date?: string
  sex?: 'Feminino' | 'Masculino' | 'Outro'
  phone?: string
  email?: string
  address?: string
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
  created?: string
  updated?: string
  // expanded relations
  expand?: {
    patient_id?: Patient
  }
}

export interface Template extends RecordModel {
  id: string
  owner_id: string
  title: string
  description?: string
  body: string
  is_general?: boolean
  created?: string
  updated?: string
}

export type ReportStatus = 'Rascunho' | 'Finalizado'

export interface UltrasoundSectionData {
  id: string
  label: string
  text: string
  isCustom?: boolean
}

export interface ReportStructuredData {
  sections: UltrasoundSectionData[]
  conclusion: string
  observations?: string
  mode: 'structured' | 'freetext'
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
  author_logo?: string
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
