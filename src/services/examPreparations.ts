import pb from '@/lib/pocketbase/client'
import { ExamPreparation } from '@/types'

export interface CreateExamPreparationInput {
  exam_type: string
  specialty?: string
  instructions: string
  general_notice?: string
  duration_minutes?: number
  is_active?: boolean
}

export interface UpdateExamPreparationInput {
  exam_type?: string
  specialty?: string
  instructions?: string
  general_notice?: string
  duration_minutes?: number
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

  /**
   * Helper to parse doctor's custom duration dictionary
   */
  parseUserExamDurations(
    config: Record<string, number> | string | undefined | null,
  ): Record<string, number> {
    if (!config) return {}
    if (typeof config === 'object' && config !== null) return config as Record<string, number>
    if (typeof config === 'string') {
      try {
        const parsed = JSON.parse(config)
        return typeof parsed === 'object' && parsed !== null ? parsed : {}
      } catch {
        return {}
      }
    }
    return {}
  },

  /**
   * Resolves the effective duration in minutes for an exam type:
   * 1. Doctor's custom duration for this specific exam
   * 2. Catalog default duration_minutes for this exam
   * 3. Doctor's general default_appointment_duration
   * 4. Fallback 30
   */
  resolveDurationForExam(
    examType: string,
    catalog: ExamPreparation[] | { exam_type: string; duration_minutes?: number }[],
    user?: {
      default_appointment_duration?: number
      exam_durations_config?: Record<string, number> | string
    } | null,
  ): number {
    const trimmed = (examType || '').trim().toLowerCase()
    if (!trimmed) {
      return user?.default_appointment_duration || 30
    }

    // 1. Doctor override
    const userDurations = this.parseUserExamDurations(user?.exam_durations_config)
    for (const [key, value] of Object.entries(userDurations)) {
      if (key.trim().toLowerCase() === trimmed && typeof value === 'number' && value > 0) {
        return value
      }
    }

    // 2. Catalog duration
    const found = catalog.find((c) => (c.exam_type || '').trim().toLowerCase() === trimmed)
    if (found && typeof found.duration_minutes === 'number' && found.duration_minutes > 0) {
      return found.duration_minutes
    }

    // 3. Doctor general default
    if (user?.default_appointment_duration && user.default_appointment_duration > 0) {
      return user.default_appointment_duration
    }

    return 30
  },

  /**
   * Saves a doctor's custom duration preference for an exam type
   */
  async saveUserExamDuration(
    userId: string,
    examType: string,
    durationMinutes: number,
  ): Promise<Record<string, number>> {
    const userRecord = await pb.collection('users').getOne(userId)
    const current = this.parseUserExamDurations(userRecord.exam_durations_config)
    const updated = {
      ...current,
      [examType.trim()]: durationMinutes,
    }
    await pb.collection('users').update(userId, {
      exam_durations_config: updated,
    })
    return updated
  },
}
