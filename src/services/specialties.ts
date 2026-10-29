import pb from '@/lib/pocketbase/client'
import type { MedicalSpecialty } from '@/types'

export interface CreateSpecialtyInput {
  name: string
  description?: string
  icon?: string
  sort_order?: number
  is_active?: boolean
}

export interface UpdateSpecialtyInput {
  name?: string
  description?: string
  icon?: string
  sort_order?: number
  is_active?: boolean
}

export const specialtiesService = {
  async getAll(): Promise<MedicalSpecialty[]> {
    return pb.collection('medical_specialties').getFullList<MedicalSpecialty>({
      sort: 'sort_order,name',
    })
  },

  async getActive(): Promise<MedicalSpecialty[]> {
    return pb.collection('medical_specialties').getFullList<MedicalSpecialty>({
      filter: 'is_active = true',
      sort: 'sort_order,name',
    })
  },

  async getById(id: string): Promise<MedicalSpecialty> {
    return pb.collection('medical_specialties').getOne<MedicalSpecialty>(id)
  },

  async create(data: CreateSpecialtyInput): Promise<MedicalSpecialty> {
    return pb.collection('medical_specialties').create<MedicalSpecialty>({
      ...data,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order ?? 0,
    })
  },

  async update(id: string, data: UpdateSpecialtyInput): Promise<MedicalSpecialty> {
    return pb.collection('medical_specialties').update<MedicalSpecialty>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return pb.collection('medical_specialties').delete(id)
  },
}
