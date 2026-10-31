import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  DollarSign,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Download,
  ShieldAlert,
  ArrowUpRight,
  BadgePercent,
  Calendar,
  Building2,
  Stethoscope,
  Undo2,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  clinicManagementService,
  ClinicProcedure,
  ClinicFinancialSettings,
  SpecialPriceRequest,
  FinancialTransaction,
  ProcedureCategory,
  PaymentModality,
} from '@/services/clinicManagement'
import { appointmentsService } from '@/services/appointments'
import { patientsService } from '@/services/patients'
import type { Appointment } from '@/types'
import { getCuiabaTodayYMD, formatCuiabaDate, formatCuiabaTime } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export default function GestaoClinica() {
  const { user, isSecretary, isManager, isAdmin, isDoctor } = useAuth()
  const { toast } = useToast()

  // Selected clinic (isolated per clinic)
  const doctorClinics = useMemo<string[]>(() => {
    if (user?.allowed_clinics) {
      if (Array.isArray(user.allowed_clinics)) return user.allowed_clinics
      try {
        const parsed = JSON.parse(user.allowed_clinics)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {
        /* ignore */
      }
    }
    return ['HM Samuel Marques dos Santos', 'Gastroimagem']
  }, [user?.allowed_clinics])

  const [selectedClinic, setSelectedClinic] = useState<string>(
    doctorClinics[0] || 'HM Samuel Marques dos Santos',
  )
  const [selectedDate, setSelectedDate] = useState<string>(getCuiabaTodayYMD())
  const [activeTab, setActiveTab] = useState<string>('recebimento')

  // Data states
  const [procedures, setProcedures] = useState<ClinicProcedure[]>([])
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [specialRequests, setSpecialRequests] = useState<SpecialPriceRequest[]>([])
  const [settings, setSettings] = useState<ClinicFinancialSettings | null>(null)
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedApptForPayment, setSelectedApptForPayment] = useState<Appointment | null>(null)
  const [selectedProcedureForPayment, setSelectedProcedureForPayment] =
    useState<ClinicProcedure | null>(null)
  const [paymentModality, setPaymentModality] = useState<PaymentModality>('PIX_DINHEIRO')
  const [paymentMethodName, setPaymentMethodName] = useState<string>('PIX')
  const [finalChargedAmount, setFinalChargedAmount] = useState<number>(0)
  const [receivedAmount, setReceivedAmount] = useState<number>(0)
  const [paymentNotes, setPaymentNotes] = useState<string>('')

  // Special Price Request Modal
  const [specialModalOpen, setSpecialModalOpen] = useState(false)
  const [specialRequestedPrice, setSpecialRequestedPrice] = useState<number>(0)
  const [specialIsFullCourtesy, setSpecialIsFullCourtesy] = useState<boolean>(false)
  const [specialJustification, setSpecialJustification] = useState<string>('')

  // Procedure Add/Edit Modal
  const [procedureModalOpen, setProcedureModalOpen] = useState(false)
  const [editingProcedure, setEditingProcedure] = useState<Partial<ClinicProcedure> | null>(null)

  // Reversal Modal
  const [reversalModalOpen, setReversalModalOpen] = useState(false)
  const [txToReverse, setTxToReverse] = useState<FinancialTransaction | null>(null)
  const [reversalReason, setReversalReason] = useState<string>('')

  // Load clinic data
  const loadClinicData = useCallback(async () => {
    setLoading(true)
    try {
      const [procs, txs, requests, clinicSettings, allAppts] = await Promise.all([
        clinicManagementService.getProcedures(selectedClinic),
        clinicManagementService.getTransactions(selectedClinic),
        clinicManagementService.getSpecialPriceRequests(selectedClinic),
        clinicManagementService.getSettings(selectedClinic),
        appointmentsService.getAll(),
      ])

      setProcedures(procs)
      setTransactions(txs)
      setSpecialRequests(requests)
      setSettings(clinicSettings)

      // Filter appointments for selected clinic and date
      const filteredAppts = allAppts.filter((a) => {
        const d = a.start_time.slice(0, 10)
        return (a.clinic_location === selectedClinic || !a.clinic_location) && d === selectedDate
      })
      setTodayAppointments(filteredAppts)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar dados da clínica',
        description: 'Verifique a conexão com o servidor local.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [selectedClinic, selectedDate, toast])

  useEffect(() => {
    loadClinicData()
  }, [loadClinicData])

  // Secretary flow: Stage 2 (Arrival)
  const handleMarkArrival = async (appt: Appointment) => {
    const arrivalIso = new Date().toISOString()
    try {
      await appointmentsService.update(appt.id, {
        status: 'Confirmado',
      })
      toast({
        title: 'Chegada confirmada!',
        description: `Paciente ${appt.expand?.patient_id?.name || ''} registrado na recepção às ${formatCuiabaTime(arrivalIso)}.`,
      })
      loadClinicData()
    } catch (err) {
      toast({
        title: 'Erro ao registrar chegada',
        description: String(err),
        variant: 'destructive',
      })
    }
  }

  // Open payment modal
  const handleOpenPayment = (appt: Appointment) => {
    setSelectedApptForPayment(appt)
    // Find matching procedure in catalog
    const matchedProc =
      procedures.find((p) => p.name.toLowerCase() === appt.exam_type.toLowerCase()) || procedures[0]
    setSelectedProcedureForPayment(matchedProc || null)

    const basePrice = matchedProc?.price_pix_cash || 200
    setPaymentModality('PIX_DINHEIRO')
    setPaymentMethodName('PIX')
    setFinalChargedAmount(basePrice)
    setReceivedAmount(basePrice)
    setPaymentNotes('')
    setPaymentModalOpen(true)
  }

  // Calculate price based on modality
  const handleModalityChange = (mod: PaymentModality) => {
    setPaymentModality(mod)
    if (!selectedProcedureForPayment) return
    let price = selectedProcedureForPayment.price_pix_cash || 200
    if (mod === 'CARTAO_VISTA') {
      price = selectedProcedureForPayment.price_card_cash || price
      setPaymentMethodName('Cartão Débito')
    } else if (mod === 'CARTAO_PARCELADO') {
      price = selectedProcedureForPayment.price_card_installment || price
      setPaymentMethodName('Cartão Crédito Parcelado')
    } else if (mod === 'PIX_DINHEIRO') {
      price = selectedProcedureForPayment.price_pix_cash || price
      setPaymentMethodName('PIX')
    } else if (mod === 'CONVENIO') {
      price = 0
      setPaymentMethodName('Faturamento Convênio')
    }
    setFinalChargedAmount(price)
    setReceivedAmount(price)
  }

  // Save payment / transaction
  const handleSavePayment = async () => {
    if (!selectedApptForPayment || !selectedProcedureForPayment) return

    const tablePrice = selectedProcedureForPayment.price_pix_cash || finalChargedAmount
    const diffDiscount = Math.max(0, tablePrice - finalChargedAmount)
    const pendingBalance = Math.max(0, finalChargedAmount - receivedAmount)

    let financialStatus: any = 'PAGO_INTEGRAL'
    if (finalChargedAmount === 0 && paymentModality === 'VALOR_ESPECIAL') {
      financialStatus = 'CORTESIA_AUTORIZADA'
    } else if (paymentModality === 'CONVENIO') {
      financialStatus = 'CONVENIO'
    } else if (pendingBalance > 0 && receivedAmount > 0) {
      financialStatus = 'PAGO_PARCIAL'
    } else if (receivedAmount === 0) {
      financialStatus = 'PENDENTE'
    }

    try {
      await clinicManagementService.registerPayment({
        clinic_location: selectedClinic,
        appointment_id: selectedApptForPayment.id,
        exam_id: selectedApptForPayment.exam_id,
        patient_id: selectedApptForPayment.patient_id,
        patient_name: selectedApptForPayment.expand?.patient_id?.name || 'Paciente sem cadastro',
        doctor_id: selectedApptForPayment.owner_id,
        doctor_name: user?.professional_name || 'Dr. Médico',
        procedure_name: selectedProcedureForPayment.name,
        table_price_used: tablePrice,
        modality: paymentModality,
        discount_amount: diffDiscount,
        final_charged_amount: finalChargedAmount,
        received_amount: receivedAmount,
        pending_balance: pendingBalance,
        financial_status: financialStatus,
        payment_method: paymentMethodName,
        payment_date: new Date().toISOString(),
        arrival_time: new Date().toISOString(),
        operator_id: user?.id,
        operator_name: user?.name || user?.email || 'Secretária',
        notes: paymentNotes,
        is_reversal: false,
      })

      // Update appointment status to confirm arrival and payment
      await appointmentsService.update(selectedApptForPayment.id, {
        status: 'Confirmado',
      })

      toast({
        title: 'Recebimento registrado com sucesso!',
        description: `Valor de R$ ${receivedAmount.toFixed(2)} gravado sem duplicidade.`,
      })
      setPaymentModalOpen(false)
      loadClinicData()
    } catch (err) {
      toast({
        title: 'Erro ao registrar recebimento',
        description: String(err),
        variant: 'destructive',
      })
    }
  }

  // Request Special Price / Courtesy
  const handleOpenSpecialRequest = () => {
    setSpecialRequestedPrice(0)
    setSpecialIsFullCourtesy(false)
    setSpecialJustification('')
    setSpecialModalOpen(true)
  }

  const handleSubmitSpecialRequest = async () => {
    if (!selectedApptForPayment || !selectedProcedureForPayment) return
    const tablePrice = selectedProcedureForPayment.price_pix_cash || 200
    const reqPrice = specialIsFullCourtesy ? 0 : Number(specialRequestedPrice)
    const diff = tablePrice - reqPrice

    if (!specialJustification.trim()) {
      toast({
        title: 'Justificativa obrigatória',
        description: 'Informe o motivo do valor especial ou cortesia.',
        variant: 'destructive',
      })
      return
    }

    // Check pre-authorized margin (e.g. 10%)
    const maxDiscountPct = settings?.preauthorized_discount_pct || 0
    const discountPct = (diff / tablePrice) * 100
    const withinMargin = discountPct <= maxDiscountPct && !specialIsFullCourtesy

    try {
      await clinicManagementService.createSpecialPriceRequest({
        clinic_location: selectedClinic,
        patient_name: selectedApptForPayment.expand?.patient_id?.name || 'Paciente',
        patient_id: selectedApptForPayment.patient_id,
        appointment_id: selectedApptForPayment.id,
        procedure_name: selectedProcedureForPayment.name,
        original_price: tablePrice,
        requested_price: reqPrice,
        difference_amount: diff,
        is_full_courtesy: specialIsFullCourtesy,
        justification: specialJustification,
        requester_id: user?.id,
        requester_name: user?.name || 'Secretária',
        requester_role: user?.role || 'Secretaria',
        status: withinMargin ? 'Aprovada' : 'Pendente',
        decision_notes: withinMargin
          ? 'Aprovado automaticamente pela margem pré-autorizada.'
          : undefined,
      })

      if (withinMargin) {
        toast({
          title: 'Desconto pré-autorizado aplicado!',
          description: `Desconto de ${discountPct.toFixed(1)}% aprovado pela política da clínica.`,
        })
        setFinalChargedAmount(reqPrice)
        setReceivedAmount(reqPrice)
        setPaymentModality('VALOR_ESPECIAL')
      } else {
        toast({
          title: 'Solicitação encaminhada ao gestor',
          description: 'Desconto acima da margem/cortesia aguarda aprovação de um Gestor.',
        })
      }
      setSpecialModalOpen(false)
      loadClinicData()
    } catch (err) {
      toast({
        title: 'Erro ao solicitar valor especial',
        description: String(err),
        variant: 'destructive',
      })
    }
  }

  // Manager Approve/Reject special request
  const handleReviewSpecialRequest = async (
    req: SpecialPriceRequest,
    status: 'Aprovada' | 'Recusada',
  ) => {
    // Audit rule: Secretary CANNOT approve own request
    if (user?.role === 'Secretaria' && req.requester_id === user?.id) {
      toast({
        title: 'Ação não permitida',
        description:
          'A secretária solicitante não tem permissão para aprovar a própria solicitação.',
        variant: 'destructive',
      })
      return
    }

    try {
      await clinicManagementService.reviewSpecialPriceRequest(req.id, {
        status,
        authorized_by_id: user?.id || '',
        authorized_by_name: user?.name || 'Gestor Responsável',
        decision_notes: `Decisão tomada em ${formatCuiabaDate(new Date().toISOString())}`,
      })
      toast({
        title: status === 'Aprovada' ? 'Solicitação Aprovada!' : 'Solicitação Recusada',
        description: `Valor especial de R$ ${req.requested_price.toFixed(2)} para ${req.patient_name}.`,
      })
      loadClinicData()
    } catch (err) {
      toast({
        title: 'Erro ao revisar solicitação',
        description: String(err),
        variant: 'destructive',
      })
    }
  }

  // Reverse transaction
  const handleConfirmReversal = async () => {
    if (!txToReverse || !reversalReason.trim()) return
    try {
      await clinicManagementService.reverseTransaction(txToReverse.id, {
        reversal_reason: reversalReason,
        reversal_user_name: user?.name || user?.email || 'Gestor/Secretária',
      })
      toast({
        title: 'Lançamento estornado com sucesso!',
        description: 'O valor recebido foi zerado e o motivo registrado para auditoria.',
      })
      setReversalModalOpen(false)
      setTxToReverse(null)
      loadClinicData()
    } catch (err) {
      toast({
        title: 'Erro ao estornar lançamento',
        description: String(err),
        variant: 'destructive',
      })
    }
  }

  // Save Procedure
  const handleSaveProcedure = async () => {
    if (!editingProcedure?.name || !editingProcedure?.category) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome e a categoria do procedimento.',
        variant: 'destructive',
      })
      return
    }
    try {
      await clinicManagementService.saveProcedure({
        ...editingProcedure,
        clinic_location: selectedClinic,
        is_active: editingProcedure.is_active ?? true,
      })
      toast({
        title: 'Procedimento salvo!',
        description: 'Tabela de preços da clínica atualizada com sucesso.',
      })
      setProcedureModalOpen(false)
      loadClinicData()
    } catch (err) {
      toast({
        title: 'Erro ao salvar procedimento',
        description: String(err),
        variant: 'destructive',
      })
    }
  }

  // Daily report metrics
  const reportMetrics = useMemo(() => {
    const activeTxs = transactions.filter((t) => !t.is_reversal)
    const totalBilled = activeTxs.reduce((acc, t) => acc + (t.final_charged_amount || 0), 0)
    const totalReceived = activeTxs.reduce((acc, t) => acc + (t.received_amount || 0), 0)
    const totalPending = activeTxs.reduce((acc, t) => acc + (t.pending_balance || 0), 0)
    const totalDiscounts = activeTxs.reduce((acc, t) => acc + (t.discount_amount || 0), 0)
    const courtesiesCount = activeTxs.filter(
      (t) => t.financial_status === 'CORTESIA_AUTORIZADA',
    ).length
    const examsCount = activeTxs.length
    const avgTicket = examsCount > 0 ? totalReceived / examsCount : 0

    return {
      totalBilled,
      totalReceived,
      totalPending,
      totalDiscounts,
      courtesiesCount,
      examsCount,
      avgTicket,
    }
  }, [transactions])

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Data',
      'Paciente',
      'Procedimento',
      'Modalidade',
      'PrecoTabela',
      'Desconto',
      'ValorFinal',
      'ValorRecebido',
      'SaldoPendente',
      'Status',
      'Operador',
    ]
    const rows = transactions.map((t) => [
      t.payment_date?.slice(0, 10) || '',
      `"${t.patient_name}"`,
      `"${t.procedure_name}"`,
      t.modality,
      t.table_price_used,
      t.discount_amount,
      t.final_charged_amount,
      t.received_amount,
      t.pending_balance,
      t.financial_status,
      `"${t.operator_name || ''}"`,
    ])
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `relatorio_financeiro_${selectedClinic.replace(/\s+/g, '_')}_${selectedDate}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#0C6B58] bg-[#E8F3F0] px-2 py-0.5 rounded uppercase">
              Gestão da Clínica • Financeiro Operacional
            </span>
            <span className="text-xs text-[#5F6E69]">Isolado por Unidade</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1F2A27]">Gestão da Clínica</h1>
          <p className="text-sm text-[#5F6E69] mt-0.5">
            Fluxo da secretária, recebimentos, aprovação de cortesias e catálogo de procedimentos
          </p>
        </div>

        {/* Clinic Selector & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white border border-[#E5E9E7] px-3 py-1.5 rounded-lg shadow-xs">
            <Building2 className="w-4 h-4 text-[#0C6B58]" />
            <Select value={selectedClinic} onValueChange={setSelectedClinic}>
              <SelectTrigger className="h-7 border-none text-xs font-semibold focus:ring-0 p-0 w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {doctorClinics.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadClinicData}
            className="h-9 text-xs border-[#E5E9E7]"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 text-xs border-[#E5E9E7] text-[#0C6B58]"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-xs">
          <div className="flex items-center justify-between text-[#5F6E69] text-xs">
            <span>Faturamento Bruto</span>
            <DollarSign className="w-4 h-4 text-[#0C6B58]" />
          </div>
          <span className="text-xl font-bold text-[#1F2A27] mt-1 block">
            R$ {reportMetrics.totalBilled.toFixed(2)}
          </span>
          <span className="text-[11px] text-[#8A9691] mt-0.5 block">
            {reportMetrics.examsCount} atendimentos registrados
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-xs">
          <div className="flex items-center justify-between text-[#5F6E69] text-xs">
            <span>Valor Recebido (Caixa)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl font-bold text-emerald-700 mt-1 block">
            R$ {reportMetrics.totalReceived.toFixed(2)}
          </span>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">
            Ticket médio: R$ {reportMetrics.avgTicket.toFixed(2)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-xs">
          <div className="flex items-center justify-between text-[#5F6E69] text-xs">
            <span>Saldo Pendente</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-xl font-bold text-amber-700 mt-1 block">
            R$ {reportMetrics.totalPending.toFixed(2)}
          </span>
          <span className="text-[11px] text-amber-600 mt-0.5 block">A receber ou convênio</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-xs">
          <div className="flex items-center justify-between text-[#5F6E69] text-xs">
            <span>Cortesias Aprovadas</span>
            <BadgePercent className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-xl font-bold text-purple-700 mt-1 block">
            {reportMetrics.courtesiesCount} exames
          </span>
          <span className="text-[11px] text-purple-600 mt-0.5 block">
            Sem receita • Auditoria ativa
          </span>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border border-[#E5E9E7] p-1 h-11 rounded-xl">
          <TabsTrigger value="recebimento" className="text-xs font-semibold gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            Fluxo da Secretária / Fila do Médico
          </TabsTrigger>
          <TabsTrigger value="procedimentos" className="text-xs font-semibold gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Catálogo e Tabela de Preços
          </TabsTrigger>
          <TabsTrigger value="solicitacoes" className="text-xs font-semibold gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Autorizações de Desconto (
            {specialRequests.filter((r) => r.status === 'Pendente').length})
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-xs font-semibold gap-1.5">
            <Receipt className="w-3.5 h-3.5" />
            Histórico Financeiro e Estornos
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FLUXO DA SECRETÁRIA */}
        <TabsContent value="recebimento" className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E9E7] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E5E9E7] bg-[#FAFBFB] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#1F2A27]">
                  Atendimentos de Hoje ({formatCuiabaDate(selectedDate)})
                </h3>
                <p className="text-xs text-[#5F6E69]">
                  Etapa 1 Agendamento → Etapa 2 Chegada → Etapa 3 Recebimento → Etapa 4 Fila do
                  Médico
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs bg-white border border-[#E5E9E7] rounded px-2 py-1"
                />
              </div>
            </div>

            <div className="divide-y divide-[#E5E9E7]">
              {todayAppointments.length === 0 ? (
                <div className="p-12 text-center text-[#8A9691] text-xs">
                  Nenhum agendamento para esta data na unidade selecionada.
                </div>
              ) : (
                todayAppointments.map((appt) => {
                  const pt = appt.expand?.patient_id
                  const tx = transactions.find(
                    (t) => t.appointment_id === appt.id && !t.is_reversal,
                  )

                  return (
                    <div
                      key={appt.id}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAFBFB] transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#1F2A27]">
                            {pt?.name || 'Paciente sem cadastro'}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {appt.status}
                          </Badge>
                          {tx ? (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                tx.financial_status === 'CORTESIA_AUTORIZADA'
                                  ? 'border-purple-300 text-purple-700 bg-purple-50'
                                  : tx.financial_status === 'PAGO_INTEGRAL'
                                    ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                                    : 'border-amber-300 text-amber-700 bg-amber-50'
                              }`}
                            >
                              {tx.financial_status === 'CORTESIA_AUTORIZADA'
                                ? 'Cortesia Autorizada'
                                : `R$ ${tx.received_amount.toFixed(2)} (${tx.payment_method})`}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-red-200 text-red-600 bg-red-50 text-[10px]"
                            >
                              Pagamento Pendente
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5F6E69]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#0C6B58]" />
                            {formatCuiabaTime(appt.start_time)} ({appt.duration_minutes || 20} min)
                          </span>
                          <span>•</span>
                          <span className="font-medium text-[#1F2A27]">{appt.exam_type}</span>
                          <span>•</span>
                          <span>{appt.clinic_location || selectedClinic}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {appt.status === 'Agendado' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkArrival(appt)}
                            className="text-xs h-8 text-[#0C6B58] border-[#0C6B58]/30 hover:bg-[#E8F3F0]"
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1" />
                            Registrar Chegada
                          </Button>
                        )}

                        <Button
                          size="sm"
                          onClick={() => handleOpenPayment(appt)}
                          className="text-xs h-8 bg-[#0C6B58] hover:bg-[#0A5949] text-white"
                        >
                          <DollarSign className="w-3.5 h-3.5 mr-1" />
                          {tx ? 'Editar / Consultar Recebimento' : 'Registrar Recebimento'}
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: CATÁLOGO DE PROCEDIMENTOS E PREÇOS */}
        <TabsContent value="procedimentos" className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E9E7] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E5E9E7] bg-[#FAFBFB] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#1F2A27]">
                  Tabela de Preços Oficial — {selectedClinic}
                </h3>
                <p className="text-xs text-[#5F6E69]">
                  Modalidades: Cartão Parcelado, Cartão à Vista e PIX ou Dinheiro
                </p>
              </div>

              {(isManager || isAdmin) && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingProcedure({
                      name: '',
                      category: 'abdome',
                      price_pix_cash: 200,
                      price_card_cash: 230,
                      price_card_installment: 250,
                      default_duration_minutes: 20,
                      is_active: true,
                    })
                    setProcedureModalOpen(true)
                  }}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Novo Procedimento
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAFBFB] text-[#5F6E69] border-b border-[#E5E9E7]">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Procedimento</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Duração</th>
                    <th className="p-3">PIX / Dinheiro</th>
                    <th className="p-3">Cartão à Vista</th>
                    <th className="p-3">Cartão Parcelado</th>
                    <th className="p-3">Status</th>
                    {(isManager || isAdmin) && <th className="p-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E7]">
                  {procedures.map((proc) => (
                    <tr key={proc.id} className="hover:bg-[#FAFBFB]">
                      <td className="p-3 font-mono text-[#5F6E69]">{proc.internal_code || '—'}</td>
                      <td className="p-3 font-bold text-[#1F2A27]">{proc.name}</td>
                      <td className="p-3 capitalize">{proc.category.replace('_', ' ')}</td>
                      <td className="p-3">{proc.default_duration_minutes || 20} min</td>
                      <td className="p-3 font-semibold text-emerald-700">
                        R$ {(proc.price_pix_cash || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-[#1F2A27]">
                        R$ {(proc.price_card_cash || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-[#1F2A27]">
                        R$ {(proc.price_card_installment || 0).toFixed(2)}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={
                            proc.is_active
                              ? 'border-emerald-300 text-emerald-700'
                              : 'border-gray-200 text-gray-400'
                          }
                        >
                          {proc.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      {(isManager || isAdmin) && (
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingProcedure(proc)
                              setProcedureModalOpen(true)
                            }}
                            className="h-7 text-xs text-[#0C6B58]"
                          >
                            Editar
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: SOLICITAÇÕES DE VALOR ESPECIAL / CORTESIA */}
        <TabsContent value="solicitacoes" className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E9E7] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E5E9E7] bg-[#FAFBFB]">
              <h3 className="font-bold text-sm text-[#1F2A27]">
                Autorizações de Desconto e Cortesia Integral
              </h3>
              <p className="text-xs text-[#5F6E69]">
                Descontos fora da margem pré-autorizada exigem aprovação do Gestor. Secretária não
                aprova o próprio pedido.
              </p>
            </div>

            <div className="divide-y divide-[#E5E9E7]">
              {specialRequests.length === 0 ? (
                <div className="p-12 text-center text-[#8A9691] text-xs">
                  Nenhuma solicitação de valor especial registrada.
                </div>
              ) : (
                specialRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1F2A27]">{req.patient_name}</span>
                        <Badge
                          variant="outline"
                          className={
                            req.status === 'Aprovada'
                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                              : req.status === 'Recusada'
                                ? 'border-red-300 text-red-700 bg-red-50'
                                : 'border-amber-300 text-amber-700 bg-amber-50 animate-pulse'
                          }
                        >
                          {req.status}
                        </Badge>
                        {req.is_full_courtesy && (
                          <Badge
                            variant="outline"
                            className="border-purple-300 text-purple-700 bg-purple-50"
                          >
                            Cortesia Integral
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-[#5F6E69]">
                        <strong>{req.procedure_name}</strong> • Valor de Tabela: R${' '}
                        {req.original_price.toFixed(2)} → Solicitado: R${' '}
                        {req.requested_price.toFixed(2)} (Diferença: R${' '}
                        {req.difference_amount.toFixed(2)})
                      </p>
                      <p className="text-xs text-[#1F2A27] italic">
                        "Justificativa: {req.justification}"
                      </p>
                      <p className="text-[11px] text-[#8A9691]">
                        Solicitado por: {req.requester_name} ({req.requester_role}) em{' '}
                        {formatCuiabaDate(req.created || '')}
                        {req.authorized_by_name && ` • Julgado por: ${req.authorized_by_name}`}
                      </p>
                    </div>

                    {req.status === 'Pendente' && (isManager || isAdmin) && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleReviewSpecialRequest(req, 'Aprovada')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReviewSpecialRequest(req, 'Recusada')}
                          className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-8"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Recusar
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: HISTÓRICO FINANCEIRO E ESTORNOS */}
        <TabsContent value="historico" className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E9E7] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E5E9E7] bg-[#FAFBFB]">
              <h3 className="font-bold text-sm text-[#1F2A27]">
                Histórico de Transações e Estornos
              </h3>
              <p className="text-xs text-[#5F6E69]">
                Todos os lançamentos auditáveis. Alterações em tabela não afetam valores passados.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAFBFB] text-[#5F6E69] border-b border-[#E5E9E7]">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Paciente</th>
                    <th className="p-3">Procedimento</th>
                    <th className="p-3">Modalidade</th>
                    <th className="p-3">Cobrado</th>
                    <th className="p-3">Recebido</th>
                    <th className="p-3">Situação</th>
                    <th className="p-3">Operador</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E7]">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className={tx.is_reversal ? 'bg-red-50/40' : 'hover:bg-[#FAFBFB]'}
                    >
                      <td className="p-3">
                        {formatCuiabaDate(tx.payment_date || tx.created || '')}
                      </td>
                      <td className="p-3 font-bold text-[#1F2A27]">{tx.patient_name}</td>
                      <td className="p-3">{tx.procedure_name}</td>
                      <td className="p-3">{tx.payment_method}</td>
                      <td className="p-3">R$ {tx.final_charged_amount.toFixed(2)}</td>
                      <td className="p-3 font-semibold text-emerald-700">
                        R$ {tx.received_amount.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={
                            tx.financial_status === 'ESTORNADO'
                              ? 'border-red-300 text-red-700 bg-red-50'
                              : tx.financial_status === 'CORTESIA_AUTORIZADA'
                                ? 'border-purple-300 text-purple-700 bg-purple-50'
                                : 'border-emerald-300 text-emerald-700 bg-emerald-50'
                          }
                        >
                          {tx.financial_status}
                        </Badge>
                      </td>
                      <td className="p-3 text-[#5F6E69]">{tx.operator_name}</td>
                      <td className="p-3 text-right">
                        {!tx.is_reversal && (isManager || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTxToReverse(tx)
                              setReversalReason('')
                              setReversalModalOpen(true)
                            }}
                            className="h-7 text-xs text-red-600 hover:bg-red-50"
                          >
                            <Undo2 className="w-3.5 h-3.5 mr-1" />
                            Estornar
                          </Button>
                        )}
                        {tx.is_reversal && (
                          <span className="text-[10px] text-red-600 block">
                            Motivo: {tx.reversal_reason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: RECEBIMENTO / PAGAMENTO */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E9E7]">
          <DialogHeader>
            <DialogTitle className="text-base text-[#1F2A27]">
              Registrar Recebimento de Exame
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5F6E69]">
              Paciente: {selectedApptForPayment?.expand?.patient_id?.name || 'Paciente'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Procedimento</Label>
              <Select
                value={selectedProcedureForPayment?.id}
                onValueChange={(id) => {
                  const p = procedures.find((x) => x.id === id)
                  setSelectedProcedureForPayment(p || null)
                  if (p) {
                    const price = p.price_pix_cash || 200
                    setFinalChargedAmount(price)
                    setReceivedAmount(price)
                  }
                }}
              >
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} (Tabela: R$ {(p.price_pix_cash || 0).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Modalidade de Cobrança</Label>
              <Select
                value={paymentModality}
                onValueChange={(val) => handleModalityChange(val as PaymentModality)}
              >
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX_DINHEIRO">PIX OU DINHEIRO</SelectItem>
                  <SelectItem value="CARTAO_VISTA">CARTÃO À VISTA</SelectItem>
                  <SelectItem value="CARTAO_PARCELADO">CARTÃO PARCELADO</SelectItem>
                  <SelectItem value="CONVENIO">CONVÊNIO</SelectItem>
                  <SelectItem value="VALOR_ESPECIAL">VALOR ESPECIAL / CORTESIA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Valor Cobrado (R$)</Label>
                <Input
                  type="number"
                  value={finalChargedAmount}
                  onChange={(e) => setFinalChargedAmount(Number(e.target.value))}
                  className="mt-1 h-9 text-xs font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Valor Recebido (R$)</Label>
                <Input
                  type="number"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(Number(e.target.value))}
                  className="mt-1 h-9 text-xs font-bold text-emerald-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAFBFB] border border-[#E5E9E7]">
              <div>
                <span className="font-semibold text-[#1F2A27] block">
                  Desconto Excepcional ou Cortesia?
                </span>
                <span className="text-[11px] text-[#5F6E69] block">
                  Encaminhar solicitação de valor especial para aprovação
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenSpecialRequest}
                className="h-7 text-xs text-[#0C6B58] border-[#0C6B58]/30"
              >
                Solicitar
              </Button>
            </div>

            <div>
              <Label className="text-xs font-semibold">Observações do Recebimento</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Ex: Pago metade no PIX e metade em dinheiro..."
                className="mt-1 text-xs"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPaymentModalOpen(false)}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSavePayment}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-9"
            >
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: SOLICITAÇÃO DE VALOR ESPECIAL / CORTESIA */}
      <Dialog open={specialModalOpen} onOpenChange={setSpecialModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E9E7]">
          <DialogHeader>
            <DialogTitle className="text-base text-[#1F2A27]">
              Solicitação de Valor Especial ou Cortesia
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5F6E69]">
              Exige justificativa e aprovação auditável do Gestor da Clínica.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="flex items-center gap-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
              <input
                type="checkbox"
                id="cortesiaCheck"
                checked={specialIsFullCourtesy}
                onChange={(e) => {
                  setSpecialIsFullCourtesy(e.target.checked)
                  if (e.target.checked) setSpecialRequestedPrice(0)
                }}
                className="rounded text-purple-600"
              />
              <label
                htmlFor="cortesiaCheck"
                className="text-xs font-bold text-purple-900 cursor-pointer"
              >
                Cortesia Integral (Valor Zero)
              </label>
            </div>

            {!specialIsFullCourtesy && (
              <div>
                <Label className="text-xs font-semibold">Valor Solicitado (R$)</Label>
                <Input
                  type="number"
                  value={specialRequestedPrice}
                  onChange={(e) => setSpecialRequestedPrice(Number(e.target.value))}
                  className="mt-1 h-9 text-xs font-bold"
                />
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold">Justificativa da Solicitação *</Label>
              <Textarea
                value={specialJustification}
                onChange={(e) => setSpecialJustification(e.target.value)}
                placeholder="Ex: Acordo com médico solicitante, paciente hipossuficiente, etc."
                className="mt-1 text-xs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSpecialModalOpen(false)}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitSpecialRequest}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-9"
            >
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ADICIONAR / EDITAR PROCEDIMENTO */}
      <Dialog open={procedureModalOpen} onOpenChange={setProcedureModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E9E7]">
          <DialogHeader>
            <DialogTitle className="text-base text-[#1F2A27]">
              {editingProcedure?.id ? 'Editar Procedimento' : 'Novo Procedimento'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5F6E69]">
              Defina os preços específicos desta clínica.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Nome do Procedimento *</Label>
              <Input
                value={editingProcedure?.name || ''}
                onChange={(e) => setEditingProcedure({ ...editingProcedure, name: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Categoria</Label>
                <Select
                  value={editingProcedure?.category || 'abdome'}
                  onValueChange={(val) =>
                    setEditingProcedure({ ...editingProcedure, category: val as ProcedureCategory })
                  }
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abdome">Abdome</SelectItem>
                    <SelectItem value="tireoide">Tireoide</SelectItem>
                    <SelectItem value="articulacoes">Articulações</SelectItem>
                    <SelectItem value="partes_moles">Partes Moles</SelectItem>
                    <SelectItem value="doppler">Doppler</SelectItem>
                    <SelectItem value="obstetricia">Obstetrícia</SelectItem>
                    <SelectItem value="geral">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Duração Padrão (min)</Label>
                <Input
                  type="number"
                  value={editingProcedure?.default_duration_minutes || 20}
                  onChange={(e) =>
                    setEditingProcedure({
                      ...editingProcedure,
                      default_duration_minutes: Number(e.target.value),
                    })
                  }
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold">PIX/Dinheiro (R$)</Label>
                <Input
                  type="number"
                  value={editingProcedure?.price_pix_cash || 0}
                  onChange={(e) =>
                    setEditingProcedure({
                      ...editingProcedure,
                      price_pix_cash: Number(e.target.value),
                    })
                  }
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Cartão Vista (R$)</Label>
                <Input
                  type="number"
                  value={editingProcedure?.price_card_cash || 0}
                  onChange={(e) =>
                    setEditingProcedure({
                      ...editingProcedure,
                      price_card_cash: Number(e.target.value),
                    })
                  }
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Cartão Parc. (R$)</Label>
                <Input
                  type="number"
                  value={editingProcedure?.price_card_installment || 0}
                  onChange={(e) =>
                    setEditingProcedure({
                      ...editingProcedure,
                      price_card_installment: Number(e.target.value),
                    })
                  }
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setProcedureModalOpen(false)}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProcedure}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-9"
            >
              Salvar Procedimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: ESTORNO AUDITÁVEL */}
      <Dialog open={reversalModalOpen} onOpenChange={setReversalModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E9E7]">
          <DialogHeader>
            <DialogTitle className="text-base text-red-600 flex items-center gap-1.5">
              <Undo2 className="w-4 h-4" />
              Estorno de Lançamento Financeiro
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5F6E69]">
              Esta ação anula a receita do lançamento e registra justificativa auditável.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p>
              Paciente: <strong>{txToReverse?.patient_name}</strong> • Valor:{' '}
              <strong>R$ {txToReverse?.received_amount.toFixed(2)}</strong>
            </p>
            <div>
              <Label className="text-xs font-semibold">Motivo do Estorno *</Label>
              <Textarea
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="Ex: Erro de digitação no valor, exame cancelado após pagamento..."
                className="mt-1 text-xs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setReversalModalOpen(false)}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmReversal}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-9"
            >
              Confirmar Estorno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
