import pb from '@/lib/pocketbase/client'

export type DailyClosingMode = 'completo' | 'solicitante' | 'sintetico'

export interface DailyClosingItem {
  patient_id?: string
  patient_name: string
  procedure_name: string
  referring_physician?: string
  executing_doctor?: string
  exam_id?: string
  appointment_id?: string
  status: 'Laudo Finalizado' | 'Falta do Paciente'
  time?: string
  amount?: number
}

export interface DailyClosingRecord {
  id: string
  clinic_location: string
  closing_date: string
  mode: DailyClosingMode
  total_finalized: number
  total_absent: number
  data_json: {
    items: DailyClosingItem[]
    by_physician?: Array<{
      physician: string
      count_finalized: number
      procedures: Array<{ name: string; count: number }>
    }>
    summary?: {
      total_procedures: number
      total_patients: number
      total_absent: number
    }
  }
  issued_by_id?: string
  issued_by_name?: string
  issued_by_role?: string
  issued_at?: string
  version?: number
  created?: string
  updated?: string
}

class DailyClosingsService {
  async getByDateAndClinic(clinicLocation: string, date: string): Promise<DailyClosingRecord[]> {
    try {
      const records = await pb.collection('daily_closings').getFullList<DailyClosingRecord>({
        filter: `clinic_location = "${clinicLocation}" && closing_date = "${date}"`,
        sort: '-issued_at',
      })
      return records
    } catch (err) {
      console.error('Erro ao buscar fechamentos diários:', err)
      return []
    }
  }

  async saveClosing(data: {
    clinic_location: string
    closing_date: string
    mode: DailyClosingMode
    total_finalized: number
    total_absent: number
    data_json: DailyClosingRecord['data_json']
    issued_by_id?: string
    issued_by_name?: string
    issued_by_role?: string
  }): Promise<DailyClosingRecord> {
    // Determina o número da versão (reimpressão auditada)
    let version = 1
    try {
      const previous = await this.getByDateAndClinic(data.clinic_location, data.closing_date)
      if (previous.length > 0) {
        version = (previous[0].version || 1) + 1
      }
    } catch {
      /* ignore */
    }

    const payload = {
      ...data,
      issued_at: new Date().toISOString(),
      version,
    }

    return await pb.collection('daily_closings').create<DailyClosingRecord>(payload)
  }
}

export const dailyClosingsService = new DailyClosingsService()
