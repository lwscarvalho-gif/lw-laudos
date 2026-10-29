import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  Sparkles,
  Stethoscope,
  Activity,
  Image as ImageIcon,
  ExternalLink,
  Lock,
  MessageSquare,
  AlertCircle,
  MapPin,
  FilePlus2,
  Eye,
  ShieldCheck,
} from 'lucide-react'
import { patientsService } from '@/services/patients'
import { examsService } from '@/services/exams'
import { reportsService } from '@/services/reports'
import { appointmentsService } from '@/services/appointments'
import { clinicalNotesService } from '@/services/clinicalNotes'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import type {
  Patient,
  Exam,
  Report,
  Appointment,
  ClinicalNote,
  ClinicalNoteType,
  GeriatricAssessment,
} from '@/types'
import { geriatricAssessmentsService } from '@/services/geriatricAssessments'
import { GeriatricAssessmentModal } from '@/components/GeriatricAssessmentModal'
import {
  formatDateBR,
  formatDateTimeBR,
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

interface TimelineItem {
  id: string
  kind:
    | 'appointment'
    | 'report'
    | 'exam'
    | 'clinical_note'
    | 'patient_note'
    | 'geriatric_assessment'
  timestamp: string // ISO string for sorting desc
  title: string
  subtitle?: string
  status?: string
  badgeVariant?: 'default' | 'outline' | 'secondary'
  badgeColor?: string
  scoreBadge?: string
  classificationBadge?: string
  author?: string
  authorRole?: string
  details?: string
  markdownContent?: string
  images?: string[]
  linkUrl?: string
  linkLabel?: string
  sourceObj: Appointment | Report | Exam | ClinicalNote | Patient | GeriatricAssessment
}

export default function PacienteDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, isDoctor, isSecretary, isManager, isAccounting } = useAuth()

  // Clinical access control
  // Non-clinical roles: Secretaria, Gestor, Contabilidade cannot see clinical notes, report bodies or exam findings
  const canAccessClinical = !isSecretary && !isManager && !isAccounting

  const [patient, setPatient] = useState<Patient | null>(null)
  const [exams, setExams] = useState<Exam[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([])
  const [geriatricAssessments, setGeriatricAssessments] = useState<GeriatricAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [geriatricModalOpen, setGeriatricModalOpen] = useState(false)

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

  // New evolution note modal
  const [evolutionModalOpen, setEvolutionModalOpen] = useState(false)
  const [newEvolutionContent, setNewEvolutionContent] = useState('')
  const [newEvolutionType, setNewEvolutionType] = useState<ClinicalNoteType>('Evolução')
  const [savingEvolution, setSavingEvolution] = useState(false)

  // Image preview modal (for request images)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  // Timeline filter
  const [timelineFilter, setTimelineFilter] = useState<
    'all' | 'appointments' | 'reports' | 'notes' | 'geriatric'
  >('all')

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const pPromise = patientsService.getById(id)
      const apptPromise = appointmentsService.getByPatientId(id)

      // Only load clinical records if user has clinical access
      const exPromise = canAccessClinical ? examsService.getByPatientId(id) : Promise.resolve([])
      const repPromise = canAccessClinical ? reportsService.getByPatientId(id) : Promise.resolve([])
      const notesPromise = canAccessClinical
        ? clinicalNotesService.getByPatientId(id)
        : Promise.resolve([])
      const gerPromise = canAccessClinical
        ? geriatricAssessmentsService.getByPatientId(id)
        : Promise.resolve([])

      const [p, appts, ex, rep, notes, ger] = await Promise.all([
        pPromise,
        apptPromise,
        exPromise,
        repPromise,
        notesPromise,
        gerPromise,
      ])

      setPatient(p)
      setAppointments(appts)
      setExams(ex)
      setReports(rep)
      setClinicalNotes(notes)
      setGeriatricAssessments(ger)

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
  useRealtime<ClinicalNote>('clinical_notes', () => loadData())
  useRealtime<GeriatricAssessment>('geriatric_assessments', () => loadData())

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
        title: 'Prontuário atualizado',
        description: 'Os dados cadastrais e observações foram salvos.',
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

  // Create new clinical evolution
  const handleCreateEvolution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !newEvolutionContent.trim()) {
      toast({
        title: 'Texto obrigatório',
        description: 'Digite o conteúdo da evolução clínica.',
        variant: 'destructive',
      })
      return
    }

    setSavingEvolution(true)
    try {
      const doctorName =
        (user as any)?.professional_name ||
        user?.name ||
        (user?.email ? user.email.split('@')[0] : 'Médico')
      const doctorCrm = (user as any)?.crm || ''
      const doctorCrmUf = (user as any)?.crm_uf || ''

      const newNote = await clinicalNotesService.create({
        patient_id: id,
        content: newEvolutionContent.trim(),
        note_type: newEvolutionType,
        author_name: doctorName,
        author_crm: doctorCrm,
        author_crm_uf: doctorCrmUf,
        note_date: new Date().toISOString(),
      })

      setClinicalNotes((prev) => [newNote, ...prev])
      setNewEvolutionContent('')
      setNewEvolutionType('Evolução')
      setEvolutionModalOpen(false)

      toast({
        title: 'Evolução registrada',
        description: 'Nota clínica adicionada à linha do tempo do prontuário.',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao salvar evolução',
        description: 'Não foi possível registrar a nota clínica.',
        variant: 'destructive',
      })
    } finally {
      setSavingEvolution(false)
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
        description: 'Prontuário e registros associados foram removidos.',
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

  // Build unified chronological clinical timeline (newest first)
  const timelineItems: TimelineItem[] = useMemo(() => {
    const list: TimelineItem[] = []

    // 1. Appointments
    appointments.forEach((appt) => {
      const reqImages = Array.isArray(appt.request_images)
        ? appt.request_images
        : appt.request_images
          ? [appt.request_images]
          : []

      const imgsUrls = reqImages.map((fn) => appointmentsService.getRequestImageUrl(appt, fn))

      list.push({
        id: `appt-${appt.id}`,
        kind: 'appointment',
        timestamp: appt.start_time || appt.created || '',
        title: `Agendamento: ${appt.exam_type}`,
        subtitle: `${appt.clinic_location} • ${formatCuiabaDateTime(appt.start_time)} (${appt.duration_minutes || 30} min)`,
        status: appt.status,
        badgeVariant: appt.status === 'Realizado' ? 'default' : 'secondary',
        badgeColor:
          appt.status === 'Realizado'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : appt.status === 'Em atendimento'
              ? 'bg-amber-50 text-amber-700 border-amber-300'
              : 'bg-blue-50 text-blue-700 border-blue-200',
        author: appt.created_by_name || 'Agendado pelo sistema',
        authorRole: appt.created_by_role || 'Secretaria',
        details: appt.notes
          ? `Obs/Preparo: ${appt.notes}${appt.referring_physician ? ` • Médico solicitante: ${appt.referring_physician}` : ''}`
          : appt.referring_physician
            ? `Médico solicitante: ${appt.referring_physician}`
            : undefined,
        images: imgsUrls,
        linkUrl: `/agenda`,
        linkLabel: 'Ver na Agenda',
        sourceObj: appt,
      })
    })

    // If non-clinical, stop here (they only see appointments)
    if (!canAccessClinical) {
      return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    }

    // 2. Reports
    reports.forEach((rep) => {
      const isDraft = rep.is_draft || rep.status === 'Rascunho'
      list.push({
        id: `rep-${rep.id}`,
        kind: 'report',
        timestamp: rep.signature_date || rep.created || '',
        title: `Laudo Médico: ${rep.title}`,
        subtitle: rep.exam_type ? `Tipo: ${rep.exam_type}` : 'Exame de imagem',
        status: isDraft ? 'Rascunho' : 'Finalizado',
        badgeVariant: isDraft ? 'secondary' : 'default',
        badgeColor: isDraft
          ? 'bg-amber-50 text-amber-700 border-amber-300'
          : 'bg-emerald-50 text-emerald-700 border-emerald-300',
        author: rep.author_name
          ? `Dr(a). ${rep.author_name}${rep.author_crm ? ` (CRM ${rep.author_crm}${rep.author_crm_uf ? `/${rep.author_crm_uf}` : ''})` : ''}`
          : undefined,
        authorRole: 'Médico',
        details: rep.conclusion ? `Conclusão diagnóstica: ${rep.conclusion}` : undefined,
        linkUrl: `/laudos/ultrassom?id=${rep.id}`,
        linkLabel: isDraft ? 'Editar rascunho de laudo' : 'Abrir laudo no editor',
        sourceObj: rep,
      })
    })

    // 3. Clinical notes / evolutions
    clinicalNotes.forEach((note) => {
      list.push({
        id: `note-${note.id}`,
        kind: 'clinical_note',
        timestamp: note.note_date || note.created || '',
        title: `Evolução Clínica (${note.note_type || 'Evolução'})`,
        status: note.note_type || 'Evolução',
        badgeVariant: 'outline',
        badgeColor: 'bg-teal-50 text-[#0C6B58] border-teal-200',
        author: note.author_name
          ? `Dr(a). ${note.author_name}${note.author_crm ? ` (CRM ${note.author_crm}${note.author_crm_uf ? `/${note.author_crm_uf}` : ''})` : ''}`
          : undefined,
        authorRole: 'Médico',
        details: note.content,
        sourceObj: note,
      })
    })

    // 4. Geriatric assessments (GeriTools)
    geriatricAssessments.forEach((ga) => {
      const typeLabel =
        ga.instrument_type === 'katz'
          ? 'Katz ABVD'
          : ga.instrument_type === 'lawton'
            ? 'Lawton AIVD'
            : ga.instrument_type === 'g8'
              ? 'G8 Triagem'
              : ga.instrument_type === 'fried'
                ? 'Fried Fragilidade'
                : 'Risco de Queda'

      list.push({
        id: `ger-${ga.id}`,
        kind: 'geriatric_assessment',
        timestamp: ga.assessment_date || ga.created || '',
        title: `Avaliação Geriátrica: ${ga.instrument_title || typeLabel}`,
        subtitle: `${typeLabel}: ${ga.score_display || 'Calculado'} — ${ga.classification}`,
        status: typeLabel,
        scoreBadge: ga.score_display,
        classificationBadge: ga.classification,
        badgeVariant: 'default',
        badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
        author: ga.author_name
          ? `Dr(a). ${ga.author_name}${ga.author_crm ? ` (CRM ${ga.author_crm}${ga.author_crm_uf ? `/${ga.author_crm_uf}` : ''})` : ''}`
          : undefined,
        authorRole: 'Médico',
        details: ga.clinical_notes || undefined,
        markdownContent: ga.summary_markdown,
        sourceObj: ga,
      })
    })

    // 5. Initial patient observation note if present
    if (patient?.notes?.trim()) {
      list.push({
        id: `pt-notes-${patient.id}`,
        kind: 'patient_note',
        timestamp: patient.created || '',
        title: 'Observação Inicial de Cadastro / Histórico Clínico',
        status: 'Cadastro',
        badgeVariant: 'outline',
        badgeColor: 'bg-gray-50 text-[#5F6E69] border-[#E5E9E7]',
        author: 'Ficha Cadastral',
        details: patient.notes,
        sourceObj: patient,
      })
    }

    return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [appointments, reports, clinicalNotes, geriatricAssessments, patient, canAccessClinical])

  // Filtered timeline
  const filteredTimeline = useMemo(() => {
    if (timelineFilter === 'all') return timelineItems
    if (timelineFilter === 'appointments') {
      return timelineItems.filter((item) => item.kind === 'appointment')
    }
    if (timelineFilter === 'reports') {
      return timelineItems.filter((item) => item.kind === 'report')
    }
    if (timelineFilter === 'notes') {
      return timelineItems.filter(
        (item) => item.kind === 'clinical_note' || item.kind === 'patient_note',
      )
    }
    if (timelineFilter === 'geriatric') {
      return timelineItems.filter((item) => item.kind === 'geriatric_assessment')
    }
    return timelineItems
  }, [timelineItems, timelineFilter])

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
        <p className="text-sm text-[#5F6E69]">Carregando prontuário eletrônico do paciente...</p>
      </div>
    )
  }

  if (!patient) return null

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
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
                Prontuário Ativo
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
            <>
              <Button
                onClick={() => setGeriatricModalOpen(true)}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white shadow-xs text-xs font-semibold"
              >
                <Activity className="w-3.5 h-3.5 mr-1.5" />
                Avaliação Geriátrica
              </Button>
              <Button
                onClick={() => navigate(`/laudos/ultrassom?paciente=${patient.id}`)}
                variant="outline"
                className="border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] text-xs font-semibold"
              >
                <FilePlus2 className="w-3.5 h-3.5 mr-1.5" />
                Iniciar Laudo
              </Button>
            </>
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
              deste paciente, mas não visualizam laudos nem evoluções médicas privativas.
            </p>
          </div>
        </div>
      )}

      {/* MAIN TABS: Prontuário & Linha do Tempo vs Dados Cadastrais vs Exames vs Laudos */}
      <Tabs defaultValue="prontuario" className="space-y-6">
        <TabsList className="bg-white border border-[#E5E9E7] p-1 rounded-xl">
          <TabsTrigger
            value="prontuario"
            className="data-[state=active]:bg-[#0C6B58] data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2"
          >
            <Activity className="w-4 h-4 mr-1.5" />
            Linha do Tempo Clínica ({timelineItems.length})
          </TabsTrigger>
          <TabsTrigger
            value="dados"
            className="data-[state=active]:bg-[#0C6B58] data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2"
          >
            <User className="w-4 h-4 mr-1.5" />
            Dados Cadastrais
          </TabsTrigger>
          {canAccessClinical && (
            <>
              <TabsTrigger
                value="exames"
                className="data-[state=active]:bg-[#0C6B58] data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2"
              >
                <ClipboardList className="w-4 h-4 mr-1.5" />
                Exames ({exams.length})
              </TabsTrigger>
              <TabsTrigger
                value="laudos"
                className="data-[state=active]:bg-[#0C6B58] data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                Laudos ({reports.length})
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* TAB 1: PRONTUÁRIO & LINHA DO TEMPO CRONOLÓGICA */}
        <TabsContent value="prontuario" className="space-y-6">
          {/* Action Bar inside Timeline */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E9E7]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1F2A27]">Filtrar linha do tempo:</span>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={timelineFilter === 'all' ? 'default' : 'ghost'}
                  onClick={() => setTimelineFilter('all')}
                  className={`h-7 text-xs ${
                    timelineFilter === 'all'
                      ? 'bg-[#0C6B58] text-white hover:bg-[#0A5949]'
                      : 'text-[#5F6E69]'
                  }`}
                >
                  Tudo ({timelineItems.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={timelineFilter === 'appointments' ? 'default' : 'ghost'}
                  onClick={() => setTimelineFilter('appointments')}
                  className={`h-7 text-xs ${
                    timelineFilter === 'appointments'
                      ? 'bg-[#0C6B58] text-white hover:bg-[#0A5949]'
                      : 'text-[#5F6E69]'
                  }`}
                >
                  Agendamentos ({appointments.length})
                </Button>
                {canAccessClinical && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant={timelineFilter === 'reports' ? 'default' : 'ghost'}
                      onClick={() => setTimelineFilter('reports')}
                      className={`h-7 text-xs ${
                        timelineFilter === 'reports'
                          ? 'bg-[#0C6B58] text-white hover:bg-[#0A5949]'
                          : 'text-[#5F6E69]'
                      }`}
                    >
                      Laudos ({reports.length})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={timelineFilter === 'notes' ? 'default' : 'ghost'}
                      onClick={() => setTimelineFilter('notes')}
                      className={`h-7 text-xs ${
                        timelineFilter === 'notes'
                          ? 'bg-[#0C6B58] text-white hover:bg-[#0A5949]'
                          : 'text-[#5F6E69]'
                      }`}
                    >
                      Evoluções ({clinicalNotes.length + (patient.notes ? 1 : 0)})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={timelineFilter === 'geriatric' ? 'default' : 'ghost'}
                      onClick={() => setTimelineFilter('geriatric')}
                      className={`h-7 text-xs ${
                        timelineFilter === 'geriatric'
                          ? 'bg-[#0C6B58] text-white hover:bg-[#0A5949]'
                          : 'text-[#5F6E69]'
                      }`}
                    >
                      GeriTools ({geriatricAssessments.length})
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Doctor actions in timeline */}
            {canAccessClinical && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setGeriatricModalOpen(true)}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs font-semibold h-8 shadow-xs"
                >
                  <Activity className="w-3.5 h-3.5 mr-1.5" />
                  Nova Avaliação Geriátrica
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEvolutionModalOpen(true)}
                  className="border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] text-xs font-semibold h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Nova Evolução
                </Button>
              </div>
            )}
          </div>

          {/* Chronological Timeline Feed */}
          {filteredTimeline.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-[#E5E9E7] text-center space-y-3">
              <Activity className="w-10 h-10 text-[#8A9691] mx-auto mb-1" />
              <h3 className="text-base font-bold text-[#1F2A27]">
                Linha do tempo sem eventos para este filtro
              </h3>
              <p className="text-xs text-[#5F6E69] max-w-md mx-auto">
                Registre uma evolução médica, agende uma consulta ou crie um exame para começar o
                histórico deste paciente.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <Button
                  size="sm"
                  onClick={() => navigate(`/agenda?paciente=${patient.id}`)}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  Agendar Consulta
                </Button>
                {canAccessClinical && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEvolutionModalOpen(true)}
                    className="border-[#0C6B58] text-[#0C6B58] text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar Evolução
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E5E9E7]">
              {filteredTimeline.map((item) => {
                const isAppt = item.kind === 'appointment'
                const isRep = item.kind === 'report'
                const isNote = item.kind === 'clinical_note'
                const isGer = item.kind === 'geriatric_assessment'
                const isPtNote = item.kind === 'patient_note'

                return (
                  <div key={item.id} className="relative group">
                    {/* Node marker on the vertical line */}
                    <div
                      className={`absolute -left-6 top-4 w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center transition ${
                        isAppt
                          ? 'border-blue-500 text-blue-600'
                          : isRep
                            ? 'border-emerald-600 text-emerald-600'
                            : isGer
                              ? 'border-[#0C6B58] text-[#0C6B58] bg-[#E8F3F0]'
                              : isNote
                                ? 'border-teal-600 text-teal-600'
                                : 'border-gray-400 text-gray-500'
                      }`}
                    >
                      {isAppt && <Calendar className="w-2.5 h-2.5" />}
                      {isRep && <FileText className="w-2.5 h-2.5" />}
                      {isGer && <Activity className="w-2.5 h-2.5" />}
                      {isNote && <Stethoscope className="w-2.5 h-2.5" />}
                      {isPtNote && <User className="w-2.5 h-2.5" />}
                    </div>

                    {/* Timeline card */}
                    <div className="bg-white p-5 rounded-2xl border border-[#E5E9E7] shadow-xs hover:border-[#0C6B58]/40 transition space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E5E9E7]/60 pb-2.5">
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-[#1F2A27]">{item.title}</span>
                            {isGer && item.scoreBadge && (
                              <Badge className="bg-[#0C6B58] text-white text-[11px] font-bold px-2 py-0.5">
                                Escore: {item.scoreBadge}
                              </Badge>
                            )}
                            {isGer && item.classificationBadge && (
                              <Badge
                                variant="outline"
                                className="border-teal-300 bg-teal-50 text-teal-900 text-[10px] font-semibold"
                              >
                                {item.classificationBadge}
                              </Badge>
                            )}
                            {item.status && !isGer && (
                              <Badge
                                variant={item.badgeVariant || 'outline'}
                                className={`text-[10px] font-semibold ${item.badgeColor || ''}`}
                              >
                                {item.status}
                              </Badge>
                            )}
                          </div>
                          {item.subtitle && (
                            <p className="text-xs text-[#5F6E69] flex items-center gap-1.5 font-medium">
                              {item.subtitle}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-medium text-[#8A9691] flex items-center sm:justify-end gap-1">
                            <Clock className="w-3 h-3 text-[#8A9691]" />
                            {item.timestamp
                              ? formatCuiabaDateTime(item.timestamp)
                              : 'Data não informada'}
                          </span>
                          {item.author && (
                            <span className="text-[11px] text-[#5F6E69] block">
                              Por: <strong className="text-[#1F2A27]">{item.author}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Markdown summary for geriatric assessment */}
                      {isGer && item.markdownContent && (
                        <div className="bg-[#FAFBFB] p-3.5 rounded-xl border border-[#D0E6E1] text-xs text-[#1F2A27] whitespace-pre-wrap leading-relaxed font-sans space-y-1">
                          {item.markdownContent}
                          {item.details && (
                            <div className="pt-2 border-t border-[#E5E9E7] text-[11px] text-[#5F6E69]">
                              <strong>Observações clínicas:</strong> {item.details}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Detail text for other items */}
                      {!isGer && item.details && (
                        <div className="bg-[#FAFBFB] p-3 rounded-xl border border-[#E5E9E7]/80 text-xs text-[#1F2A27] whitespace-pre-wrap leading-relaxed">
                          {item.details}
                        </div>
                      )}

                      {/* Attached Request Photos */}
                      {item.images && item.images.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-semibold text-[#0C6B58] flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5" />
                            {item.images.length} foto(s) da solicitação médica anexada(s):
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {item.images.map((url, imgIdx) => (
                              <button
                                key={imgIdx}
                                type="button"
                                onClick={() => setPreviewImageUrl(url)}
                                className="relative w-16 h-16 rounded-lg border border-[#E5E9E7] overflow-hidden bg-white hover:ring-2 hover:ring-[#0C6B58] transition"
                                title="Clique para ampliar a guia"
                              >
                                <img
                                  src={url}
                                  alt={`Solicitação ${imgIdx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action footer for geriatric assessment: copy / transfer formatted text */}
                      {isGer && (
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E9E7]/60">
                          <span className="text-[10px] text-[#8A9691]">
                            Disponível para anexação em laudos ou prontuário
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const text = item.markdownContent || item.details || ''
                                navigator.clipboard.writeText(text)
                                toast({
                                  title: 'Copiado para a área de transferência',
                                  description: 'O resumo formatado da avaliação foi copiado.',
                                })
                              }}
                              className="text-xs h-7 border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0]"
                            >
                              Copiar Texto Formatado
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              className="text-xs h-7 bg-[#0C6B58] hover:bg-[#0A5949] text-white"
                            >
                              <Link
                                to={`/laudos/ultrassom?paciente=${patient.id}&anexo_geriatrico=${(item.sourceObj as GeriatricAssessment).id}`}
                              >
                                Levar para o Laudo →
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Action footer */}
                      {item.linkUrl && (
                        <div className="pt-2 flex justify-end border-t border-[#E5E9E7]/60">
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="text-xs text-[#0C6B58] hover:bg-[#E8F3F0] h-7"
                          >
                            <Link to={item.linkUrl}>
                              {item.linkLabel || 'Abrir'}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
                  Cadastre o primeiro exame deste paciente no prontuário.
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

        {/* TAB 4: LAUDOS (MÉDICO) */}
        {canAccessClinical && (
          <TabsContent value="laudos" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1F2A27]">
                  Laudos Emitidos ({reports.length})
                </h3>
                <p className="text-xs text-[#5F6E69]">
                  Laudos de ultrassonografia estruturados ou texto livre.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate(`/laudos/ultrassom?paciente=${patient.id}`)}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Novo Laudo
              </Button>
            </div>

            {reports.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-[#E5E9E7] text-center">
                <FileText className="w-10 h-10 text-[#8A9691] mx-auto mb-2" />
                <p className="font-semibold text-sm text-[#1F2A27]">Nenhum laudo emitido</p>
                <p className="text-xs text-[#5F6E69] mt-1 mb-4">
                  Emita o primeiro laudo médico estruturado para este paciente.
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate(`/laudos/ultrassom?paciente=${patient.id}`)}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
                >
                  Iniciar Laudo
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E9E7] shadow-xs overflow-hidden divide-y divide-[#E5E9E7]">
                {reports.map((rep) => {
                  const isDraft = rep.is_draft || rep.status === 'Rascunho'
                  return (
                    <div
                      key={rep.id}
                      onClick={() => navigate(`/laudos/ultrassom?id=${rep.id}`)}
                      className="p-4 flex items-center justify-between hover:bg-[#F7F9F8] cursor-pointer transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-[#1F2A27]">{rep.title}</p>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              isDraft
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isDraft ? 'Rascunho' : 'Finalizado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#5F6E69]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#8A9691]" />
                            {formatDateBR(rep.signature_date || rep.created)}
                          </span>
                          {rep.author_name && <span>Assinado por: {rep.author_name}</span>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#0C6B58] text-xs font-semibold"
                      >
                        Abrir no Editor →
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* MODAL: NOVA AVALIAÇÃO GERIÁTRICA (GERITOOLS) */}
      <GeriatricAssessmentModal
        open={geriatricModalOpen}
        onOpenChange={setGeriatricModalOpen}
        patientId={patient.id}
        patientName={patient.name}
        doctorName={
          (user as any)?.professional_name ||
          user?.name ||
          (user?.email ? user.email.split('@')[0] : 'Médico')
        }
        doctorCrm={(user as any)?.crm}
        doctorCrmUf={(user as any)?.crm_uf}
        onSaved={(newAssessment) => {
          setGeriatricAssessments((prev) => [newAssessment, ...prev])
        }}
      />

      {/* MODAL: NOVA EVOLUÇÃO CLÍNICA */}
      <Dialog open={evolutionModalOpen} onOpenChange={setEvolutionModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#1F2A27]">
              <Stethoscope className="w-5 h-5 text-[#0C6B58]" />
              Nova Nota de Evolução Clínica
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5F6E69]">
              Registre a evolução médica do paciente. O registro terá carimbo de data/hora
              automática e identificação do médico.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEvolution} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de Registro</Label>
              <Select
                value={newEvolutionType}
                onValueChange={(val: ClinicalNoteType) => setNewEvolutionType(val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Evolução">Evolução Clínica Diária</SelectItem>
                  <SelectItem value="Anamnese">Anamnese / Histórico Inicial</SelectItem>
                  <SelectItem value="Retorno">Consulta de Retorno</SelectItem>
                  <SelectItem value="Intercorrência">Intercorrência / Urgência</SelectItem>
                  <SelectItem value="Geral">Observação Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evolution_text" className="text-xs font-semibold">
                Descrição da Evolução Clínica *
              </Label>
              <Textarea
                id="evolution_text"
                rows={6}
                value={newEvolutionContent}
                onChange={(e) => setNewEvolutionContent(e.target.value)}
                placeholder="Descreva sintomas, exame físico, conduta médica, hipóteses diagnósticas ou orientações..."
                className="text-xs leading-relaxed"
                required
              />
            </div>

            <div className="p-3 bg-[#E8F3F0] rounded-xl border border-[#D0E6E1] text-[11px] text-[#0C6B58] flex items-center justify-between">
              <span>
                Autor registrado:{' '}
                <strong>{(user as any)?.professional_name || user?.name || 'Médico'}</strong>
                {(user as any)?.crm ? ` (CRM ${(user as any).crm})` : ''}
              </span>
              <span>Data: Hoje (automática)</span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEvolutionModalOpen(false)}
                disabled={savingEvolution}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingEvolution}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold"
              >
                {savingEvolution ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Salvar Evolução
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              Excluir prontuário permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Atenção: Esta ação é definitiva e removerá o prontuário de{' '}
                <strong>{patient.name}</strong>, juntamente com todos os seus exames, laudos e
                evoluções clínicas registradas.
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
              {deleting ? 'Excluindo...' : 'Sim, excluir tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
