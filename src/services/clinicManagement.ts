import pb from '@/lib/pocketbase/client'

export type ProcedureCategory =
  | 'abdome'
  | 'tireoide'
  | 'articulacoes'
  | 'partes_moles'
  | 'doppler'
  | 'obstetricia'
  | 'geral'

export type PaymentModality =
  | 'CARTAO_PARCELADO'
  | 'CARTAO_VISTA'
  | 'PIX_DINHEIRO'
  | 'VALOR_ESPECIAL'
  | 'CONVENIO'

export type FinancialStatus =
  | 'PAGO_INTEGRAL'
  | 'PAGO_PARCIAL'
  | 'PENDENTE'
  | 'CORTESIA_AUTORIZADA'
  | 'CONVENIO'
  | 'ESTORNADO'

export type SpecialPriceStatus = 'Pendente' | 'Aprovada' | 'Recusada'

export interface ClinicProcedure {
  id: string
  clinic_location: string
  name: string
  category: ProcedureCategory
  internal_code?: string
  modality?: string
  default_duration_minutes?: number
  is_active: boolean
  price_card_installment?: number
  price_card_cash?: number
  price_pix_cash?: number
  doctor_payout_type?: 'none' | 'fixed' | 'percentage'
  doctor_payout_value?: number
  price_history?:
    | string
    | Array<{ date: string; author: string; reason: string; oldPrices?: Record<string, number> }>
  created?: string
  updated?: string
}

export interface ClinicFinancialSettings {
  id: string
  clinic_location: string
  preauthorized_discount_pct: number
  allow_doctor_payout: boolean
  allow_exam_with_pending_payment: boolean
  notes?: string
  created?: string
  updated?: string
}

export interface SpecialPriceRequest {
  id: string
  clinic_location: string
  patient_name: string
  patient_id?: string
  appointment_id?: string
  procedure_name: string
  original_price: number
  requested_price: number
  difference_amount: number
  is_full_courtesy: boolean
  justification: string
  requester_id?: string
  requester_name: string
  requester_role: string
  authorized_by_id?: string
  authorized_by_name?: string
  status: SpecialPriceStatus
  decision_date?: string
  decision_notes?: string
  created?: string
  updated?: string
}

export interface FinancialTransaction {
  id: string
  clinic_location: string
  appointment_id?: string
  exam_id?: string
  patient_id?: string
  patient_name: string
  doctor_id?: string
  doctor_name?: string
  procedure_name: string
  table_price_used: number
  modality: PaymentModality
  discount_amount: number
  final_charged_amount: number
  received_amount: number
  pending_balance: number
  financial_status: FinancialStatus
  payment_method: string
  payment_date?: string
  arrival_time?: string
  special_price_request_id?: string
  doctor_payout_amount?: number
  is_reversal: boolean
  reversal_reason?: string
  reversal_date?: string
  reversal_user_name?: string
  operator_id?: string
  operator_name?: string
  notes?: string
  created?: string
  updated?: string
}

class ClinicManagementService {
  // 1. Catálogo de Procedimentos
  async getProcedures(clinicLocation?: string): Promise<ClinicProcedure[]> {
    try {
      const filter = clinicLocation ? `clinic_location = "${clinicLocation}"` : ''
      const records = await pb.collection('clinic_procedures').getFullList<ClinicProcedure>({
        filter: filter || undefined,
        sort: 'name',
      })
      return records
    } catch (err) {
      console.error('Erro ao listar procedimentos da clínica:', err)
      return []
    }
  }

  async saveProcedure(data: Partial<ClinicProcedure>): Promise<ClinicProcedure> {
    if (data.id) {
      return await pb.collection('clinic_procedures').update<ClinicProcedure>(data.id, data)
    }
    return await pb.collection('clinic_procedures').create<ClinicProcedure>(data)
  }

  async toggleProcedureActive(id: string, is_active: boolean): Promise<ClinicProcedure> {
    return await pb.collection('clinic_procedures').update<ClinicProcedure>(id, { is_active })
  }

  // 2. Configurações da Clínica
  async getSettings(clinicLocation: string): Promise<ClinicFinancialSettings | null> {
    try {
      const rec = await pb
        .collection('clinic_financial_settings')
        .getFirstListItem<ClinicFinancialSettings>(`clinic_location = "${clinicLocation}"`)
      return rec
    } catch {
      return null
    }
  }

  async saveSettings(data: Partial<ClinicFinancialSettings>): Promise<ClinicFinancialSettings> {
    if (data.id) {
      return await pb
        .collection('clinic_financial_settings')
        .update<ClinicFinancialSettings>(data.id, data)
    }
    return await pb.collection('clinic_financial_settings').create<ClinicFinancialSettings>(data)
  }

  // 3. Solicitações de Valor Especial
  async getSpecialPriceRequests(clinicLocation: string): Promise<SpecialPriceRequest[]> {
    try {
      const records = await pb
        .collection('special_price_requests')
        .getFullList<SpecialPriceRequest>({
          filter: `clinic_location = "${clinicLocation}"`,
          sort: '-created',
        })
      return records
    } catch (err) {
      console.error('Erro ao listar solicitações de valor especial:', err)
      return []
    }
  }

  async createSpecialPriceRequest(
    data: Omit<SpecialPriceRequest, 'id' | 'created' | 'updated'>,
  ): Promise<SpecialPriceRequest> {
    return await pb.collection('special_price_requests').create<SpecialPriceRequest>(data)
  }

  async reviewSpecialPriceRequest(
    id: string,
    review: {
      status: 'Aprovada' | 'Recusada'
      authorized_by_id: string
      authorized_by_name: string
      decision_notes?: string
    },
  ): Promise<SpecialPriceRequest> {
    return await pb.collection('special_price_requests').update<SpecialPriceRequest>(id, {
      ...review,
      decision_date: new Date().toISOString(),
    })
  }

  // 4. Lançamentos Financeiros (Recebimentos e Estornos)
  async getTransactions(
    clinicLocation: string,
    options?: { date?: string; doctorName?: string },
  ): Promise<FinancialTransaction[]> {
    try {
      let filter = `clinic_location = "${clinicLocation}"`
      if (options?.date) {
        // filter by day
        filter += ` && payment_date >= "${options.date} 00:00:00" && payment_date <= "${options.date} 23:59:59"`
      }
      if (options?.doctorName) {
        filter += ` && doctor_name = "${options.doctorName}"`
      }
      const records = await pb
        .collection('financial_transactions')
        .getFullList<FinancialTransaction>({
          filter,
          sort: '-created',
        })
      return records
    } catch (err) {
      console.error('Erro ao listar transações financeiras:', err)
      return []
    }
  }

  async registerPayment(
    data: Omit<FinancialTransaction, 'id' | 'created' | 'updated'>,
  ): Promise<FinancialTransaction> {
    // Proibir duplicação de receita se já existir transação ativa não estornada para o mesmo agendamento
    if (data.appointment_id) {
      try {
        const existing = await pb
          .collection('financial_transactions')
          .getFirstListItem<FinancialTransaction>(
            `appointment_id = "${data.appointment_id}" && is_reversal = false`,
          )
        if (existing) {
          // Atualiza a transação existente em vez de criar uma duplicada
          return await pb
            .collection('financial_transactions')
            .update<FinancialTransaction>(existing.id, data)
        }
      } catch {
        // não existe, prossegue com create
      }
    }
    return await pb.collection('financial_transactions').create<FinancialTransaction>(data)
  }

  async reverseTransaction(
    id: string,
    reversal: {
      reversal_reason: string
      reversal_user_name: string
    },
  ): Promise<FinancialTransaction> {
    return await pb.collection('financial_transactions').update<FinancialTransaction>(id, {
      financial_status: 'ESTORNADO',
      is_reversal: true,
      reversal_reason: reversal.reversal_reason,
      reversal_user_name: reversal.reversal_user_name,
      reversal_date: new Date().toISOString(),
      received_amount: 0,
    })
  }
}

export const clinicManagementService = new ClinicManagementService()
