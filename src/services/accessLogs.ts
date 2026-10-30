import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface AccessLog extends RecordModel {
  id: string
  user_id: string
  user_name: string
  user_role: string
  user_email?: string
  clinic_location?: string
  action: string
  resource_type: string
  resource_id?: string
  patient_id?: string
  patient_name?: string
  details?: string
  ip_address?: string
  created?: string
  updated?: string
}

export interface LogAccessInput {
  action: string
  resource_type: string
  resource_id?: string
  clinic_location?: string
  patient_id?: string
  patient_name?: string
  details?: string
}

export const accessLogsService = {
  /**
   * Log an access or modification action for LGPD audit compliance
   */
  async log(input: LogAccessInput): Promise<AccessLog | null> {
    try {
      const user = pb.authStore.record
      if (!user?.id) return null

      return await pb.collection('access_logs').create<AccessLog>({
        user_id: user.id,
        user_name: (user as any).professional_name || user.name || user.email || 'Usuário',
        user_role: (user as any).role || 'Médico',
        user_email: user.email || '',
        clinic_location: input.clinic_location || '',
        action: input.action,
        resource_type: input.resource_type,
        resource_id: input.resource_id || '',
        patient_id: input.patient_id || '',
        patient_name: input.patient_name || '',
        details: input.details || '',
      })
    } catch (err) {
      console.warn('Falha silenciosa ao registrar log de acesso LGPD:', err)
      return null
    }
  },

  /**
   * Get logs with filtering
   */
  async getLogs(params?: {
    patientId?: string
    userId?: string
    clinic?: string
    limit?: number
  }): Promise<AccessLog[]> {
    try {
      const filters: string[] = []
      if (params?.patientId) {
        filters.push(`patient_id = '${params.patientId.replace(/'/g, '')}'`)
      }
      if (params?.userId) {
        filters.push(`user_id = '${params.userId.replace(/'/g, '')}'`)
      }
      if (params?.clinic && params.clinic !== 'Todas') {
        filters.push(`clinic_location = '${params.clinic.replace(/'/g, '')}'`)
      }

      return await pb.collection('access_logs').getFullList<AccessLog>({
        filter: filters.length > 0 ? filters.join(' && ') : undefined,
        sort: '-created',
        limit: params?.limit || 100,
      })
    } catch {
      return []
    }
  },
}
