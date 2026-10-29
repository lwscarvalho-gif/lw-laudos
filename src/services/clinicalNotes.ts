import pb from '@/lib/pocketbase/client'
import type { ClinicalNote, ClinicalNoteType } from '@/types'

export interface CreateClinicalNoteInput {
  patient_id: string
  content: string
  note_type?: ClinicalNoteType
  note_date?: string
  author_name?: string
  author_crm?: string
  author_crm_uf?: string
}

export interface UpdateClinicalNoteInput {
  content?: string
  note_type?: ClinicalNoteType
  note_date?: string
}

export const clinicalNotesService = {
  /**
   * List all clinical notes for a given patient, sorted by created/note_date desc
   * Respects RLS: doctors only see their own notes
   */
  async getByPatientId(patientId: string): Promise<ClinicalNote[]> {
    try {
      const records = await pb.collection('clinical_notes').getFullList<ClinicalNote>({
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
   * Get single clinical note by ID
   */
  async getById(id: string): Promise<ClinicalNote> {
    return pb.collection('clinical_notes').getOne<ClinicalNote>(id, {
      expand: 'owner_id,patient_id',
    })
  },

  /**
   * Create a new clinical note (evolution)
   */
  async create(data: CreateClinicalNoteInput): Promise<ClinicalNote> {
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
      content: data.content.trim(),
      note_type: data.note_type || 'Evolução',
      note_date: data.note_date || new Date().toISOString(),
      author_name: authorName,
      author_crm: authorCrm,
      author_crm_uf: authorCrmUf,
    }

    return pb.collection('clinical_notes').create<ClinicalNote>(payload, {
      expand: 'owner_id,patient_id',
    })
  },

  /**
   * Update clinical note
   */
  async update(id: string, data: UpdateClinicalNoteInput): Promise<ClinicalNote> {
    return pb.collection('clinical_notes').update<ClinicalNote>(id, data, {
      expand: 'owner_id,patient_id',
    })
  },

  /**
   * Delete clinical note
   */
  async delete(id: string): Promise<boolean> {
    return pb.collection('clinical_notes').delete(id)
  },
}
