import pb from '@/lib/pocketbase/client'
import type { Patient } from '@/types'

export const patientsService = {
  async getList(
    page = 1,
    perPage = 20,
    search = '',
  ): Promise<{ items: Patient[]; totalItems: number; totalPages: number }> {
    let filter = ''
    if (search.trim()) {
      const term = search.trim().replace(/['"]/g, '')
      filter = `name ~ '${term}' || document ~ '${term}'`
    }
    const res = await pb.collection('patients').getList<Patient>(page, perPage, {
      filter,
      sort: '-created',
    })
    return {
      items: res.items,
      totalItems: res.totalItems,
      totalPages: res.totalPages,
    }
  },

  async getAll(): Promise<Patient[]> {
    return pb.collection('patients').getFullList<Patient>({
      sort: 'name',
    })
  },

  async getById(id: string): Promise<Patient> {
    return pb.collection('patients').getOne<Patient>(id)
  },

  async create(data: Partial<Patient>): Promise<Patient> {
    const owner_id = pb.authStore.record?.id
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
