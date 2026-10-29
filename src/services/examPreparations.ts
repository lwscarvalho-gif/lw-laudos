import pb from '@/lib/pocketbase/client'
import { ExamPreparation } from '@/types'

export interface CreateExamPreparationInput {
  exam_type: string
  specialty?: string
  instructions: string
  general_notice?: string
  is_active?: boolean
}

export interface UpdateExamPreparationInput {
  exam_type?: string
  specialty?: string
  instructions?: string
  general_notice?: string
  is_active?: boolean
}

export const examPreparationsService = {
  async getAll(): Promise<ExamPreparation[]> {
    try {
      const records = await pb.collection('exam_preparations').getFullList<ExamPreparation>({
        sort: 'exam_type',
      })
      return records
    } catch (err) {
      console.warn('Erro ao carregar preparos de exames do banco:', err)
      return []
    }
  },

  async getByExamType(examType: string): Promise<ExamPreparation | null> {
    if (!examType || !examType.trim()) return null
    try {
      const sanitized = examType.trim().replace(/'/g, "\\'")
      const record = await pb
        .collection('exam_preparations')
        .getFirstListItem<ExamPreparation>(`exam_type = '${sanitized}' && is_active = true`)
      return record
    } catch (_) {
      // Try search by partial or case-insensitive via list
      try {
        const all = await this.getAll()
        const lower = examType.trim().toLowerCase()
        const found = all.find((p) => p.is_active !== false && p.exam_type.toLowerCase() === lower)
        return found || null
      } catch {
        return null
      }
    }
  },

  async create(data: CreateExamPreparationInput): Promise<ExamPreparation> {
    return await pb.collection('exam_preparations').create<ExamPreparation>({
      ...data,
      is_active: data.is_active !== undefined ? data.is_active : true,
    })
  },

  async update(id: string, data: UpdateExamPreparationInput): Promise<ExamPreparation> {
    return await pb.collection('exam_preparations').update<ExamPreparation>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('exam_preparations').delete(id)
  },
}
