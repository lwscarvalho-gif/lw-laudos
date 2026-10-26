import pb from '@/lib/pocketbase/client'
import type { Exam, ExamStatus } from '@/types'

export const examsService = {
  async getList(
    page = 1,
    perPage = 20,
    search = '',
    status?: string,
  ): Promise<{ items: Exam[]; totalItems: number; totalPages: number }> {
    const filters: string[] = []

    if (search.trim()) {
      const term = search.trim().replace(/['"]/g, '')
      filters.push(`(type ~ '${term}' || patient_id.name ~ '${term}')`)
    }

    if (status && status !== 'Todos') {
      filters.push(`status = '${status}'`)
    }

    const filter = filters.length > 0 ? filters.join(' && ') : ''

    const res = await pb.collection('exams').getList<Exam>(page, perPage, {
      filter,
      sort: '-exam_date',
      expand: 'patient_id',
    })

    return {
      items: res.items,
      totalItems: res.totalItems,
      totalPages: res.totalPages,
    }
  },

  async getByPatientId(patientId: string): Promise<Exam[]> {
    return pb.collection('exams').getFullList<Exam>({
      filter: `patient_id = '${patientId}'`,
      sort: '-exam_date',
      expand: 'patient_id',
    })
  },

  async getById(id: string): Promise<Exam> {
    return pb.collection('exams').getOne<Exam>(id, {
      expand: 'patient_id',
    })
  },

  async create(data: {
    patient_id: string
    type: string
    exam_date: string
    status?: ExamStatus
    indication?: string
    technical_notes?: string
  }): Promise<Exam> {
    const owner_id = pb.authStore.record?.id
    return pb.collection('exams').create<Exam>(
      {
        ...data,
        status: data.status || 'Pendente',
        owner_id,
      },
      {
        expand: 'patient_id',
      },
    )
  },

  async update(id: string, data: Partial<Exam>): Promise<Exam> {
    return pb.collection('exams').update<Exam>(id, data, {
      expand: 'patient_id',
    })
  },

  async delete(id: string): Promise<boolean> {
    return pb.collection('exams').delete(id)
  },
}
