import pb from '@/lib/pocketbase/client'
import type { Report } from '@/types'

export const reportsService = {
  async getList(
    page = 1,
    perPage = 20,
    search = '',
  ): Promise<{ items: Report[]; totalItems: number; totalPages: number }> {
    let filter = ''
    if (search.trim()) {
      const term = search.trim().replace(/['"]/g, '')
      filter = `title ~ '${term}' || patient_id.name ~ '${term}'`
    }
    const res = await pb.collection('reports').getList<Report>(page, perPage, {
      filter,
      sort: '-created',
      expand: 'patient_id,exam_id,template_id',
    })
    return {
      items: res.items,
      totalItems: res.totalItems,
      totalPages: res.totalPages,
    }
  },

  async getAll(): Promise<Report[]> {
    return pb.collection('reports').getFullList<Report>({
      sort: '-created',
      expand: 'patient_id,exam_id,template_id',
    })
  },

  async getRecent(limit = 5): Promise<Report[]> {
    return pb
      .collection('reports')
      .getList<Report>(1, limit, {
        sort: '-created',
        expand: 'patient_id,exam_id',
      })
      .then((r) => r.items)
  },

  async getByPatientId(patientId: string): Promise<Report[]> {
    return pb.collection('reports').getFullList<Report>({
      filter: `patient_id = '${patientId}'`,
      sort: '-created',
      expand: 'patient_id,exam_id,template_id',
    })
  },

  async getByExamId(examId: string): Promise<Report | null> {
    const list = await pb.collection('reports').getList<Report>(1, 1, {
      filter: `exam_id = '${examId}'`,
      expand: 'patient_id,exam_id',
    })
    return list.items[0] || null
  },

  async getById(id: string): Promise<Report> {
    return pb.collection('reports').getOne<Report>(id, {
      expand: 'patient_id,exam_id,template_id',
    })
  },

  async create(data: {
    patient_id: string
    exam_id?: string
    template_id?: string
    title: string
    body: string
    status?: 'Rascunho' | 'Finalizado'
    is_draft?: boolean
    exam_type?: string
    structured_data?: any
    conclusion?: string
    images_config?: any
    author_name?: string
    author_crm?: string
    author_crm_uf?: string
    author_logo?: string
    referring_physician?: string
    clinic_location?: string
    signature_date?: string
    signature_hash_sha256?: string
    signature_provider?: string
    signature_status?: string
  }): Promise<Report> {
    const owner_id = pb.authStore.record?.id
    const user = pb.authStore.record

    // If finalizing, capture author identity at save time
    const author_name = data.author_name || user?.professional_name || user?.name || ''
    const author_crm = data.author_crm || user?.crm || ''
    const author_crm_uf = data.author_crm_uf || user?.crm_uf || ''
    const signature_date =
      data.status === 'Finalizado' ? data.signature_date || new Date().toISOString() : undefined

    return pb.collection('reports').create<Report>(
      {
        ...data,
        status: data.status || (data.is_draft ? 'Rascunho' : 'Finalizado'),
        author_name,
        author_crm,
        author_crm_uf,
        signature_date,
        owner_id,
      },
      {
        expand: 'patient_id,exam_id,template_id',
      },
    )
  },

  async update(id: string, data: Partial<Report>): Promise<Report> {
    return pb.collection('reports').update<Report>(id, data, {
      expand: 'patient_id,exam_id,template_id',
    })
  },

  async delete(id: string): Promise<boolean> {
    return pb.collection('reports').delete(id)
  },
}
