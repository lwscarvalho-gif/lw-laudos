import pb from '@/lib/pocketbase/client'
import type { GeriatricAssessment, GeriatricInstrumentId } from '@/types'

export interface CreateGeriatricAssessmentInput {
  patient_id: string
  instrument_type: GeriatricInstrumentId
  instrument_title: string
  score_number?: number
  score_display?: string
  classification: string
  summary_markdown?: string
  answers_json?: Record<string, string>
  clinical_notes?: string
  author_name?: string
  author_crm?: string
  author_crm_uf?: string
  assessment_date?: string
}

export interface UpdateGeriatricAssessmentInput {
  clinical_notes?: string
  answers_json?: Record<string, string>
  score_number?: number
  score_display?: string
  classification?: string
  summary_markdown?: string
}

export const geriatricAssessmentsService = {
  /**
   * List all geriatric assessments for a given patient, sorted by created/assessment_date desc.
   * RLS ensures doctor only views their own evaluations.
   */
  async getByPatientId(patientId: string): Promise<GeriatricAssessment[]> {
    try {
      const records = await pb
        .collection('geriatric_assessments')
        .getFullList<GeriatricAssessment>({
          filter: `patient_id = '${patientId}'`,
          sort: '-created',
          expand: 'owner_id,patient_id',
        })
      return records
    } catch {
      return []
    }
  },

  /**
   * Get single assessment by id
   */
  async getById(id: string): Promise<GeriatricAssessment> {
    return pb.collection('geriatric_assessments').getOne<GeriatricAssessment>(id, {
      expand: 'owner_id,patient_id',
    })
  },

  /**
   * Create new geriatric assessment
   */
  async create(data: CreateGeriatricAssessmentInput): Promise<GeriatricAssessment> {
    const user = pb.authStore.model
    if (!user?.id) throw new Error('Usuário não autenticado.')

    const authorName =
      data.author_name ||
      (user as any).professional_name ||
      user.name ||
      (user.email ? user.email.split('@')[0] : 'Médico')

    const authorCrm = data.author_crm || (user as any).crm || ''
    const authorCrmUf = data.author_crm_uf || (user as any).crm_uf || ''

    const payload = {
      owner_id: user.id,
      patient_id: data.patient_id,
      instrument_type: data.instrument_type,
      instrument_title: data.instrument_title,
      score_number: data.score_number,
      score_display: data.score_display,
      classification: data.classification,
      summary_markdown: data.summary_markdown,
      answers_json: data.answers_json || {},
      clinical_notes: data.clinical_notes || '',
      author_name: authorName,
      author_crm: authorCrm,
      author_crm_uf: authorCrmUf,
      assessment_date: data.assessment_date || new Date().toISOString(),
    }

    return pb.collection('geriatric_assessments').create<GeriatricAssessment>(payload, {
      expand: 'owner_id,patient_id',
    })
  },

  /**
   * Update clinical notes or assessment answers
   */
  async update(id: string, data: UpdateGeriatricAssessmentInput): Promise<GeriatricAssessment> {
    return pb.collection('geriatric_assessments').update<GeriatricAssessment>(id, data, {
      expand: 'owner_id,patient_id',
    })
  },

  /**
   * Delete geriatric assessment
   */
  async delete(id: string): Promise<boolean> {
    return pb.collection('geriatric_assessments').delete(id)
  },
}
