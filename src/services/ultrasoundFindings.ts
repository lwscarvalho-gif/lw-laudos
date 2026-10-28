import pb from '@/lib/pocketbase/client'
import type { UltrasoundFinding } from '@/types'

export const ultrasoundFindingsService = {
  async getByOrgan(organ: string, examScope = 'ABDOME_TOTAL'): Promise<UltrasoundFinding[]> {
    return pb.collection('ultrasound_findings').getFullList<UltrasoundFinding>({
      filter: `(organ = '${organ}' || organ = 'todos') && (exam_scope = '${examScope}' || exam_scope = 'GERAL')`,
      sort: '-is_favorite,-is_default_normal,title',
    })
  },

  async getAllForScope(examScope = 'ABDOME_TOTAL'): Promise<UltrasoundFinding[]> {
    return pb.collection('ultrasound_findings').getFullList<UltrasoundFinding>({
      filter: `exam_scope = '${examScope}' || exam_scope = 'GERAL'`,
      sort: 'organ,-is_favorite,-is_default_normal,title',
    })
  },

  async getDefaultNormal(
    organ: string,
    examScope = 'ABDOME_TOTAL',
  ): Promise<UltrasoundFinding | null> {
    try {
      const list = await pb.collection('ultrasound_findings').getList<UltrasoundFinding>(1, 1, {
        filter: `organ = '${organ}' && (exam_scope = '${examScope}' || exam_scope = 'GERAL') && is_default_normal = true`,
      })
      if (list.items.length > 0) return list.items[0]
      // fallback to any normal
      const normalList = await pb
        .collection('ultrasound_findings')
        .getList<UltrasoundFinding>(1, 1, {
          filter: `organ = '${organ}' && (exam_scope = '${examScope}' || exam_scope = 'GERAL') && finding_type = 'normal'`,
        })
      return normalList.items[0] || null
    } catch {
      return null
    }
  },

  async create(data: {
    organ: string
    exam_scope?: string
    title: string
    finding_type: 'normal' | 'patologico'
    text_content: string
    is_default_normal?: boolean
    is_favorite?: boolean
    has_variables?: boolean
  }): Promise<UltrasoundFinding> {
    const owner_id = pb.authStore.record?.id
    return pb.collection('ultrasound_findings').create<UltrasoundFinding>({
      ...data,
      exam_scope: data.exam_scope || 'ABDOME_TOTAL',
      owner_id,
      is_shared: false,
    })
  },

  async update(id: string, data: Partial<UltrasoundFinding>): Promise<UltrasoundFinding> {
    return pb.collection('ultrasound_findings').update<UltrasoundFinding>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return pb.collection('ultrasound_findings').delete(id)
  },

  async toggleFavorite(id: string, currentStatus: boolean): Promise<UltrasoundFinding> {
    return pb.collection('ultrasound_findings').update<UltrasoundFinding>(id, {
      is_favorite: !currentStatus,
    })
  },
}
