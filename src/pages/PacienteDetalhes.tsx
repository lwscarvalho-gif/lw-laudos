import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  FileText,
  User,
  Trash2,
  Plus,
  Loader2,
  Save,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  ExternalLink,
  Lock,
  FilePlus2,
  Eye,
  FileCheck,
} from 'lucide-react'
import { patientsService } from '@/services/patients'
import { examsService } from '@/services/exams'
import { reportsService } from '@/services/reports'
import { appointmentsService } from '@/services/appointments'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import type { Patient, Exam, Report, Appointment } from '@/types'
import {
  formatDateBR,
  formatCuiabaDate,
  formatCuiabaDateTime,
  maskCPF,
  maskPhone,
  parseLocalYMDToISO,
} from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { AuditLogViewerModal } from '@/components/AuditLogViewerModal'
import { ShieldCheck } from 'lucide-react'

export default function PacienteDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isSecretary, isManager, isAccounting, isOperator } = useAuth()

  // Clinical access control:
  // Non-clinical roles (Secretaria, Gestor, Contabilidade, Operador) do not see report details or exams, only cadastral and appointments
  const canAccessClinical = !isSecretary && !isManager && !isAccounting && !isOperator

  const [patient, setPatient] = useState<Patient | null>(null)
  const [exams, setExams] = useState<Exam[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  // Edit patient form
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    birth_date: '',
    sex: 'Feminino' as 'Feminino' | 'Masculino' | 'Outro',
    phone: '',
    email: '',
    address: '',
    sus_card: '',
    notes: '',
  })
  const [savingPatient, setSavingPatient] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Image preview modal (for request images)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [auditModalOpen, setAuditModalOpen] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const pPromise = patientsService.getById(id)
      const apptPromise = appointmentsService.getByPatientId(id)

      // Only load clinical records if user has clinical access
      const exPromise = canAccessClinical ? examsService.getByPatientId(id) : Promise.resolve([])
      const repPromise = canAccessClinical ? reportsService.getByPatientId(id) : Promise.resolve([])

      const [p, appts, ex, rep] = await Promise.all([pPromise, apptPromise, exPromise, repPromise])

      setPatient(p)
      setAppointments(appts)
      setExams(ex)
      setReports(rep)

      // LGPD audit log: log operator/user accessing patient file
      import('@/services/accessLogs').then(({ accessLogsService }) => {
        accessLogsService.log({
          action: 'Visualização da ficha cadastral do paciente',
          resource_type: 'patient',
          resource_id: p.id,
          patient_id: p.id,
          patient_name: p.name,
          details: `Acesso realizado na tela de detalhes`,
        })
      })

      setFormData({
        name: p.name || '',
        document: p.document || '',
        birth_date: p.birth_date ? p.birth_date.slice(0, 10) : '',
        sex: (p.sex as 'Feminino' | 'Masculino' | 'Outro') || 'Feminino',
        phone: p.phone || '',
        email: p.email || '',
        address: p.address || '',
        sus_card: p.sus_card || '',
        notes: p.notes || '',
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Paciente não encontrado ou sem permissão de acesso.',
        variant: 'destructive',
      })
      navigate('/pacientes')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, toast, canAccessClinical])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime updates
  useRealtime<Patient>('patients', () => loadData())
  useRealtime<Exam>('exams', () => loadData())
  useRealtime<Report>('reports', () => loadData())
  useRealtime<Appointment>('appointments', () => loadData())

  // Save patient profile
  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    const errs: Record<string, string> = {}
    if (!formData.name.trim()) errs.name = 'Nome completo é obrigatório.'
    if (formData.document.trim()) {
      const clean = formData.document.replace(/\D/g, '')
      if (clean.length !== 11) {
        errs.document = 'CPF deve conter 11 dígitos.'
      }
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'E-mail inválido.'

    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSavingPatient(true)
    try {
      const updated = await patientsService.update(id, {
        name: formData.name.trim(),
        document: formData.document.trim(),
        birth_date: formData.birth_date ? parseLocalYMDToISO(formData.birth_date) : undefined,
        sex: formData.sex,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        sus_card: formData.sus_card?.trim() || '',
        notes: formData.notes.trim(),
      })
      setPatient(updated)
      toast({
        title: 'Ficha atualizada',
        description: 'Os dados cadastrais do paciente foram salvos.',
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar as informações do paciente.',
        variant: 'destructive',
      })
    } finally {
      setSavingPatient(false)
    }
  }

  // Delete patient
  const handleDeletePatient = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await patientsService.delete(id)
      toast({
        title: 'Paciente excluído',
        description: 'Ficha e registros associados foram removidos.',
      })
      navigate('/pacientes')
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o paciente.',
        variant: 'destructive',
      })
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
        <p className="text-sm text-[#5F6E69]">Carregando ficha do paciente...</p>
      </div>
    )
  }

  if (!patient) return null

  // Sort reports newest first
  const sortedReports = [...reports].sort((a, b) => {
    const da = a.signature_date || a.created || ''
    const db = b.signature_date || b.created || ''
    return db.localeCompare(da)
  })

  // Sort appointments newest first
  const sortedAppointments = [...appointments].sort((a, b) => {
    const da = a.start_time || a.created || ''
    const db = b.start_time || b.created || ''
    return db.localeCompare(da)
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <AuditLogViewerModal
        open={auditModalOpen}
        onOpenChange={setAuditModalOpen}
        patientId={patient?.id}
        patientName={patient?.name}
      />
      {/* HEADER: Identification and Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E9E7] shadow-xs">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/pacientes')}
            className="border-[#E5E9E7] text-[#5F6E69] hover:text-[#1F2A27] shrink-0 mt-0.5"
            title="Voltar para lista de pacientes"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-[#1F2A27]">{patient.name}</h1>
              <Badge className="bg-[#E8F3F0] text-[#0C6B58] hover:bg-[#E8F3F0] border-none text-xs font-semibold">
                Ficha Ativa
              </Badge>
              {patient.sus_card && (
                <Badge
                  variant="outline"
                  className="border-teal-200 text-teal-800 text-[11px] font-mono"
                >
                  CNS: {patient.sus_card}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5F6E69]">
              {patient.document && (
                <span className="font-mono">
                  CPF: <strong className="text-[#1F2A27]">{maskCPF(patient.document)}</strong>
                </span>
              )}
              {patient.birth_date && (
                <span>
                  Nasc.:{' '}
                  <strong className="text-[#1F2A27]">{formatDateBR(patient.birth_date)}</strong>
                </span>
              )}
              {patient.sex && (
                <span>
                  Sexo: <strong className="text-[#1F2A27]">{patient.sex}</strong>
                </span>
              )}
              {patient.phone && (
                <span>
                  Tel: <strong className="text-[#1F2A27]">{maskPhone(patient.phone)}</strong>
                </span>
              )}
              {patient.address && (
                <span className="truncate max-w-xs" title={patient.address}>
                  Endereço: {patient.address}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick action buttons: New Appointment + New Report + Delete */}
        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
          <Button
            onClick={() => navigate(`/agenda?paciente=${patient.id}`)}
            variant="outline"
            className="border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] text-xs font-semibold"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            Novo Agendamento
          </Button>

          {canAccessClinical && (
            <Button
              onClick={() => navigate(`/laudos/ultrassom?paciente=${patient.id}`)}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white shadow-xs text-xs font-semibold"
            >
              <FilePlus2 className="w-3.5 h-3.5 mr-1.5" />
              Novo Laudo
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setDeleteModalOpen(true)}
            className="border-red-200 text-[#DC2626] hover:bg-red-50 hover:text-[#DC2626] text-xs"
            title="Excluir paciente"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* NON-CLINICAL ACCESS BANNER */}
      {!canAccessClinical && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Modo Administrativo / Secretaria Ativo</span>
            <p className="leading-relaxed text-amber-800">
              Conforme as diretrizes de privacidade e isolamento clínico do LW Laudos, os perfis de
              Secretaria, Gestor e Contabilidade têm acesso aos dados cadastrais e agendamentos
              deste paciente, mas não visualizam laudos nem exames médicos privativos.
            </p>
          </div>
        </div>
      )}

      {/* MAIN TABS: Ficha Centrada em Laudos vs Dados Cadastrais vs Exames */}
      <Tabs defaultValue="laudos" className="space-y-6">
        <TabsList className="bg-white border border-[#E5E9E7] p-1 rounded-xl">
          <TabsTrigger
            value="laudos"
            className="data-[state=active]:bg-[#0C6B58] data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Laudos e Agendamentos
          </TabsTrigger>
          <TabsTrigger
            value="dados"
            className="data-[state=active]:bg-[#0C6B58] data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2"
          >
            <User className="w-4 h-4 mr-1.5" />
            Dados Cadastrais
          </TabsTrigger>
          {canAccessClinical && (
            <TabsTrigger
              value="exames"
              className="data-[state=active]:bg-[#0C6B58] data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2"
            >
              <ClipboardList className="w-4 h-4 mr-1.5" />
              Exames ({exams.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* TAB 1: FICHA CENTRADA EM LAUDOS & AGENDAMENTOS */}
        <TabsContent value="laudos" className="space-y-8">
          {/* SEÇÃO 1: LAUDOS DE IMAGEM EM DESTAQUE */}
          {canAccessClinical && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#1F2A27] flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-[#0C6B58]" />
                    Laudos de Imagem ({sortedReports.length})
                  </h2>
                  <p className="text-xs text-[#5F6E69]">
                    Laudos médicos estruturados emitidos para este paciente. Clique para abrir ou
                    editar no editor.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/laudos/ultrassom?paciente=${patient.id}`)}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Iniciar Novo Laudo
                </Button>
              </div>

              {sortedReports.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-[#E5E9E7] text-center space-y-3">
                  <FileText className="w-10 h-10 text-[#8A9691] mx-auto" />
                  <div>
                    <p className="font-semibold text-sm text-[#1F2A27]">
                      Nenhum laudo emitido ainda
                    </p>
                    <p className="text-xs text-[#5F6E69] mt-0.5">
                      Este paciente ainda não possui laudos de imagem cadastrados.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/laudos/ultrassom?paciente=${patient.id}`)}
                    className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Iniciar Primeiro Laudo
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedReports.map((rep) => {
                    const isDraft = rep.is_draft || rep.status === 'Rascunho'
                    return (
                      <div
                        key={rep.id}
                        className={`bg-white p-5 rounded-2xl border transition shadow-xs hover:border-[#0C6B58] flex flex-col justify-between space-y-3 ${
                          isDraft ? 'border-amber-200 bg-amber-50/10' : 'border-[#E5E9E7]'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-sm text-[#1F2A27] leading-snug">
                              {rep.title || 'Laudo de Ultrassonografia'}
                            </span>
                            <Badge
                              className={`text-[10px] font-semibold shrink-0 ${
                                isDraft
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              }`}
                            >
                              {isDraft ? 'Rascunho' : 'Finalizado'}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-xs text-[#5F6E69]">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#8A9691]" />
                              <span>
                                {rep.signature_date
                                  ? `Assinado em ${formatCuiabaDateTime(rep.signature_date)}`
                                  : `Criado em ${formatCuiabaDateTime(rep.created)}`}
                              </span>
                            </div>
                            {rep.author_name && (
                              <p className="text-[11px]">
                                Médico: <strong>Dr(a). {rep.author_name}</strong>
                                {rep.author_crm
                                  ? ` (CRM ${rep.author_crm}${rep.author_crm_uf ? `/${rep.author_crm_uf}` : ''})`
                                  : ''}
                              </p>
                            )}
                            {rep.conclusion && (
                              <div className="p-2.5 rounded-lg bg-[#F7F9F8] border border-[#E5E9E7] text-[11px] text-[#1F2A27] line-clamp-2 mt-2">
                                <strong>Conclusão:</strong> {rep.conclusion}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#E5E9E7] flex items-center justify-between">
                          <Link
                            to={`/laudos/${rep.id}`}
                            className="text-xs text-[#5F6E69] hover:text-[#0C6B58] flex items-center gap-1 font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Visualizar
                          </Link>
                          <Button
                            asChild
                            size="sm"
                            className={`text-xs h-8 font-semibold ${
                              isDraft
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-[#0C6B58] hover:bg-[#0A5949] text-white'
                            }`}
                          >
                            <Link to={`/laudos/ultrassom?id=${rep.id}`}>
                              {isDraft ? 'Editar Rascunho →' : 'Abrir no Editor →'}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO 2: AGENDAMENTOS DE EXAMES (COM ANEXOS DAS FOTOS DA SOLICITAÇÃO) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1F2A27] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#0C6B58]" />
                  Agendamentos de Exames ({sortedAppointments.length})
                </h2>
                <p className="text-xs text-[#5F6E69]">
                  Histórico de agendamentos, clínica, quem agendou e fotos da solicitação médica com
                  ampliação.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/agenda?paciente=${patient.id}`)}
                className="border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Agendar Novo Exame
              </Button>
            </div>

            {sortedAppointments.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-[#E5E9E7] text-center space-y-3">
                <Calendar className="w-10 h-10 text-[#8A9691] mx-auto" />
                <div>
                  <p className="font-semibold text-sm text-[#1F2A27]">
                    Nenhum agendamento registrado
                  </p>
                  <p className="text-xs text-[#5F6E69] mt-0.5">
                    Este paciente ainda não possui horários agendados na agenda.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/agenda?paciente=${patient.id}`)}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs font-semibold"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  Agendar Exame
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedAppointments.map((appt) => {
                  const reqImages = Array.isArray(appt.request_images)
                    ? appt.request_images
                    : appt.request_images
                      ? [appt.request_images]
                      : []
                  const imgsUrls = reqImages.map((fn) =>
                    appointmentsService.getRequestImageUrl(appt, fn),
                  )

                  return (
                    <div
                      key={appt.id}
                      className="bg-white p-5 rounded-2xl border border-[#E5E9E7] shadow-xs space-y-4 hover:border-[#0C6B58]/40 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E5E9E7]/80 pb-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-[#1F2A27]">
                              {appt.exam_type}
                            </span>
                            <Badge
                              className={`text-[10px] font-semibold ${
                                appt.status === 'Realizado'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : appt.status === 'Em atendimento'
                                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {appt.status}
                            </Badge>
                            <span className="text-xs font-medium text-[#5F6E69]">
                              • {appt.clinic_location}
                            </span>
                          </div>
                          <p className="text-xs text-[#5F6E69] flex items-center gap-2">
                            <span>
                              Data do exame:{' '}
                              <strong>{formatCuiabaDateTime(appt.start_time)}</strong>
                            </span>
                            <span>({appt.duration_minutes || 30} min)</span>
                          </p>
                        </div>

                        <div className="text-right text-xs text-[#5F6E69]">
                          <span>
                            Agendado por:{' '}
                            <strong className="text-[#1F2A27]">
                              {appt.created_by_name || 'Sistema'}
                            </strong>{' '}
                            ({appt.created_by_role || 'Secretaria'})
                          </span>
                        </div>
                      </div>

                      {/* Informações adicionais do agendamento */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#5F6E69]">
                        {appt.referring_physician && (
                          <div className="p-2.5 bg-[#FAFBFB] rounded-lg border border-[#E5E9E7]">
                            <span className="font-semibold text-[#1F2A27] block">
                              Médico Solicitante:
                            </span>
                            <span>{appt.referring_physician}</span>
                          </div>
                        )}
                        {appt.notes && (
                          <div className="p-2.5 bg-[#FAFBFB] rounded-lg border border-[#E5E9E7]">
                            <span className="font-semibold text-[#1F2A27] block">
                              Preparo / Observações:
                            </span>
                            <span className="whitespace-pre-wrap">{appt.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Fotos da solicitação médica / encaminhamento com ampliação */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1F2A27] flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-[#0C6B58]" />
                            Fotos da Solicitação Médica / Encaminhamento ({imgsUrls.length})
                          </span>
                          <span className="text-[11px] text-[#8A9691]">
                            Clique para ampliar a guia
                          </span>
                        </div>

                        {imgsUrls.length === 0 ? (
                          <p className="text-xs text-[#8A9691] py-2.5 px-3 bg-[#FAFBFB] rounded-lg border border-dashed border-[#E5E9E7]">
                            Nenhuma foto de solicitação anexada a este agendamento.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {imgsUrls.map((url, imgIdx) => (
                              <div
                                key={imgIdx}
                                className="group relative border rounded-xl overflow-hidden bg-slate-50 aspect-4/3 flex items-center justify-center shadow-2xs hover:border-[#0C6B58] transition"
                              >
                                <img
                                  src={url}
                                  alt={`Solicitação médica ${imgIdx + 1}`}
                                  className="w-full h-full object-cover cursor-pointer"
                                  onClick={() => setPreviewImageUrl(url)}
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-1.5 text-white flex items-center justify-between opacity-0 group-hover:opacity-100 transition">
                                  <span className="text-[10px] font-medium">#{imgIdx + 1}</span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setPreviewImageUrl(url)}
                                    className="h-5 px-1.5 text-[10px] text-white hover:bg-white/20"
                                  >
                                    Ampliar
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Rodapé com atalhos da agenda / laudo */}
                      <div className="pt-2 border-t border-[#E5E9E7] flex items-center justify-between">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="text-xs text-[#5F6E69] hover:text-[#0C6B58]"
                        >
                          <Link to="/agenda">
                            Ver na Agenda
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Link>
                        </Button>

                        {canAccessClinical && (
                          <Button
                            asChild
                            size="sm"
                            className="text-xs font-semibold bg-[#0C6B58] hover:bg-[#0A5949] text-white"
                          >
                            <Link
                              to={`/laudos/ultrassom?paciente=${patient.id}&agendamento=${appt.id}`}
                            >
                              <FilePlus2 className="w-3.5 h-3.5 mr-1" />
                              {appt.status === 'Realizado'
                                ? 'Ver / Reabrir Laudo'
                                : 'Iniciar Laudo deste Exame'}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: DADOS CADASTRAIS (EDITÁVEIS) */}
        <TabsContent
          value="dados"
          className="bg-white p-6 rounded-2xl border border-[#E5E9E7] shadow-xs"
        >
          <form onSubmit={handleUpdatePatient} className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E9E7] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1F2A27]">
                  Ficha Cadastral e Dados Pessoais
                </h3>
                <p className="text-xs text-[#5F6E69]">
                  Dados identificadores do paciente, documentos e contatos.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                ID: {patient.id}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="det_name" className="text-xs font-semibold">
                  Nome completo *
                </Label>
                <Input
                  id="det_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={fieldErrors.name ? 'border-red-500' : ''}
                />
                {fieldErrors.name && <p className="text-xs text-[#DC2626]">{fieldErrors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="det_doc" className="text-xs font-semibold">
                  CPF{' '}
                  <span className="text-[10px] font-normal text-[#5F6E69]">
                    (obrigatório para SUS / HM Samuel Marques)
                  </span>
                </Label>
                <Input
                  id="det_doc"
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: maskCPF(e.target.value) })}
                  maxLength={14}
                  className={fieldErrors.document ? 'border-red-500' : ''}
                />
                {fieldErrors.document && (
                  <p className="text-xs text-[#DC2626]">{fieldErrors.document}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="det_birth" className="text-xs font-semibold">
                  Data de nascimento
                </Label>
                <Input
                  id="det_birth"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sexo</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(val: 'Feminino' | 'Masculino' | 'Outro') =>
                    setFormData({ ...formData, sex: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="det_phone" className="text-xs font-semibold">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="det_phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                  maxLength={15}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="det_email" className="text-xs font-semibold">
                  E-mail
                </Label>
                <Input
                  id="det_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={fieldErrors.email ? 'border-red-500' : ''}
                />
                {fieldErrors.email && <p className="text-xs text-[#DC2626]">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="det_sus" className="text-xs font-semibold">
                  Cartão Nacional de Saúde (CNS / SUS)
                </Label>
                <Input
                  id="det_sus"
                  value={formData.sus_card || ''}
                  onChange={(e) => setFormData({ ...formData, sus_card: e.target.value })}
                  placeholder="000 0000 0000 0000"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="det_address" className="text-xs font-semibold">
                  Endereço residencial completo
                </Label>
                <Input
                  id="det_address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <Label htmlFor="det_notes" className="text-xs font-semibold">
                  Observações de cadastro e histórico prévio
                </Label>
                <Textarea
                  id="det_notes"
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Alergias, cirurgias prévias, comorbidades ou observações gerais..."
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5E9E7] flex justify-end">
              <Button
                type="submit"
                disabled={savingPatient}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold"
              >
                {savingPatient ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Dados Cadastrais
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* TAB 3: EXAMES (MÉDICO) */}
        {canAccessClinical && (
          <TabsContent value="exames" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1F2A27]">
                  Histórico de Exames ({exams.length})
                </h3>
                <p className="text-xs text-[#5F6E69]">
                  Exames solicitados e realizados pelo paciente.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate(`/exames/novo?paciente=${patient.id}`)}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Novo Exame
              </Button>
            </div>

            {exams.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-[#E5E9E7] text-center">
                <ClipboardList className="w-10 h-10 text-[#8A9691] mx-auto mb-2" />
                <p className="font-semibold text-sm text-[#1F2A27]">Nenhum exame cadastrado</p>
                <p className="text-xs text-[#5F6E69] mt-1 mb-4">
                  Cadastre o primeiro exame deste paciente.
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate(`/exames/novo?paciente=${patient.id}`)}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
                >
                  Adicionar Exame
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E9E7] shadow-xs overflow-hidden divide-y divide-[#E5E9E7]">
                {exams.map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => navigate(`/exames/${ex.id}`)}
                    className="p-4 flex items-center justify-between hover:bg-[#F7F9F8] cursor-pointer transition"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-[#1F2A27]">{ex.type}</p>
                      <div className="flex items-center gap-3 text-xs text-[#5F6E69]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#8A9691]" />
                          {formatDateBR(ex.exam_date)}
                        </span>
                        {ex.indication && (
                          <span className="truncate max-w-md hidden sm:inline">
                            Indicação: {ex.indication}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          ex.status === 'Concluído'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : ex.status === 'Em análise'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {ex.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* MODAL: PREVIEW DE IMAGEM DA SOLICITAÇÃO */}
      <Dialog
        open={Boolean(previewImageUrl)}
        onOpenChange={(open) => !open && setPreviewImageUrl(null)}
      >
        <DialogContent className="max-w-4xl max-h-[92vh] p-2 flex flex-col items-center justify-center bg-black/95 border-none">
          {previewImageUrl && (
            <div className="relative w-full h-full flex flex-col items-center">
              <img
                src={previewImageUrl}
                alt="Solicitação médica"
                className="max-h-[82vh] max-w-full object-contain rounded-lg"
              />
              <div className="pt-2 text-center text-xs text-white/80">
                <a
                  href={previewImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-white"
                >
                  Abrir imagem original em nova aba
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: CONFIRMAR EXCLUSÃO DO PACIENTE */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Excluir paciente permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Atenção: Esta ação é definitiva e removerá a ficha de{' '}
                <strong>{patient.name}</strong>, juntamente com todos os seus exames e laudos
                vinculados.
              </p>
              <p className="font-semibold text-xs text-red-600">Esta ação não pode ser desfeita.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeletePatient()
              }}
              disabled={deleting}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              {deleting ? 'Excluindo...' : 'Sim, excluir paciente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
