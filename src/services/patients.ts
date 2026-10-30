import pb from '@/lib/pocketbase/client'
import type { Patient } from '@/types'

export const patientsService = {
  async getList(
    page = 1,
    perPage = 20,
    search = '',
  ): Promise<{ items: Patient[]; totalItems: number; totalPages: number }> {
    const user = pb.authStore.record
    const isOperator = (user as any)?.role === 'Operador'
    const assignedDoctor = (user as any)?.assigned_doctor

    const filters: string[] = []

    if (isOperator && assignedDoctor) {
      filters.push(`owner_id = '${assignedDoctor}'`)
    }

    if (search.trim()) {
      const term = search.trim().replace(/['"]/g, '')
      filters.push(`(name ~ '${term}' || document ~ '${term}')`)
    }

    const filter = filters.length > 0 ? filters.join(' && ') : ''

    const res = await pb.collection('patients').getList<Patient>(page, perPage, {
      filter: filter || undefined,
      sort: '-created',
    })
    return {
      items: res.items,
      totalItems: res.totalItems,
      totalPages: res.totalPages,
    }
  },

  async getAll(): Promise<Patient[]> {
    const user = pb.authStore.record
    const isOperator = (user as any)?.role === 'Operador'
    const assignedDoctor = (user as any)?.assigned_doctor

    let filter: string | undefined = undefined
    if (isOperator && assignedDoctor) {
      filter = `owner_id = '${assignedDoctor}'`
    }

    return pb.collection('patients').getFullList<Patient>({
      filter,
      sort: 'name',
    })
  },

  async getById(id: string): Promise<Patient> {
    return pb.collection('patients').getOne<Patient>(id)
  },

  async create(data: Partial<Patient>): Promise<Patient> {
    const user = pb.authStore.record
    const isOperator = (user as any)?.role === 'Operador'
    const assignedDoctor = (user as any)?.assigned_doctor

    // For operator, owner_id of patient must be assigned_doctor so doctor and operator share the patient
    const owner_id = isOperator && assignedDoctor ? assignedDoctor : user?.id
    return pb.collection('patients').create<Patient>({
      ...data,
      owner_id,
    })
  },

  async update(id: string, data: Partial<Patient>): Promise<Patient> {
    return pb.collection('patients').update<Patient>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return pb.collection('patients').delete(id)
  },
}
