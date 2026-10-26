import pb from '@/lib/pocketbase/client'
import type { Template } from '@/types'

export const templatesService = {
  async getList(): Promise<Template[]> {
    return pb.collection('templates').getFullList<Template>({
      sort: '-created',
    })
  },

  async getMyTemplates(): Promise<Template[]> {
    const userId = pb.authStore.record?.id
    if (!userId) return []
    return pb.collection('templates').getFullList<Template>({
      filter: `owner_id = '${userId}' && is_general = false`,
      sort: '-created',
    })
  },

  async getGeneralTemplates(): Promise<Template[]> {
    return pb.collection('templates').getFullList<Template>({
      filter: `is_general = true`,
      sort: '-created',
    })
  },

  async getById(id: string): Promise<Template> {
    return pb.collection('templates').getOne<Template>(id)
  },

  async create(data: {
    title: string
    description?: string
    body: string
    is_general?: boolean
  }): Promise<Template> {
    const owner_id = pb.authStore.record?.id
    return pb.collection('templates').create<Template>({
      ...data,
      is_general: !!data.is_general,
      owner_id,
    })
  },

  async update(id: string, data: Partial<Template>): Promise<Template> {
    return pb.collection('templates').update<Template>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return pb.collection('templates').delete(id)
  },

  async copyToMyTemplates(template: Template): Promise<Template> {
    const owner_id = pb.authStore.record?.id
    return pb.collection('templates').create<Template>({
      title: `${template.title} (cópia)`,
      description: template.description || '',
      body: template.body,
      is_general: false,
      owner_id,
    })
  },
}
