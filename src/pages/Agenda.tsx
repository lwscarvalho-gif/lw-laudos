import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Play,
  CalendarDays,
  CalendarRange,
  Loader2,
  Trash2,
  Edit,
  Tag,
  Stethoscope,
  Printer,
  Sparkles,
  Camera,
  RefreshCw,
  HelpCircle,
  MoreVertical,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { appointmentsService } from '@/services/appointments'
import { patientsService } from '@/services/patients'
import { examsService } from '@/services/exams'
import { reportsService } from '@/services/reports'
import type { Appointment, Patient, AppointmentStatus } from '@/types'
import {
  getCuiabaTodayYMD,
  formatCuiabaDate,
  formatCuiabaTime,
  formatCuiabaDateTime,
  combineCuiabaDateTimeToISO,
  CLINIC_TIMEZONE,
  maskCPF,
  maskPhone,
} from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { useToast } from '@/hooks/use-toast'
import { AppointmentVoucherModal } from '@/components/AppointmentVoucherModal'
import { examPreparationsService } from '@/services/examPreparations'
import { requestAnalysisService, ExtractedRequestData } from '@/services/requestAnalysis'

// Default standard exam types for quick selection
const COMMON_EXAM_TYPES = [
  'Ultrassonografia Abdome Total',
  'Ultrassonografia Abdome Superior',
  'Ultrassonografia Aparelho Urinário',
  'Ultrassonografia Pélvica Ginecológica',
  'Ultrassonografia Transvaginal',
  'Ultrassonografia Mama Bilateral',
  'Ultrassonografia Tireoide com Doppler',
  'Ultrassonografia Articular (Ombro)',
  'Ultrassonografia Doppler de Carótidas e Vertebrais',
  'Ultrassonografia Músculo-esquelética',
]

// Helper to format minutes from midnight to HH:mm
function formatMinutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function Agenda() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  // Selected date in Cuiaba timezone (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => getCuiabaTodayYMD())
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [selectedClinicFilter, setSelectedClinicFilter] = useState<string>('Todas')
  const [statusFilter, setStatusFilter] = useState<string>('Todos')

  // Appointments list & loading
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  // Modal create/edit appointment
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)

  // Form fields
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>('existing')
  const [formPatientId, setFormPatientId] = useState<string>('')
  const [formNewPatientName, setFormNewPatientName] = useState<string>('')
  const [formNewPatientCpf, setFormNewPatientCpf] = useState<string>('')
  const [formNewPatientPhone, setFormNewPatientPhone] = useState<string>('')
  const [formNewPatientSex, setFormNewPatientSex] = useState<'Feminino' | 'Masculino' | 'Outro'>(
    'Feminino',
  )
  const [formNewPatientBirthDate, setFormNewPatientBirthDate] = useState<string>('')
  const [formNewPatientSusCard, setFormNewPatientSusCard] = useState<string>('')
  const [formNewPatientAddress, setFormNewPatientAddress] = useState<string>('')

  const [formDate, setFormDate] = useState<string>(selectedDate)
  const [formTime, setFormTime] = useState<string>('08:00')
  const [formDuration, setFormDuration] = useState<number>(user?.default_appointment_duration || 30)
  const [formExamType, setFormExamType] = useState<string>('Ultrassonografia Abdome Total')
  const [customExamType, setCustomExamType] = useState<string>('')
  const [formClinic, setFormClinic] = useState<string>('')
  const [formStatus, setFormStatus] = useState<AppointmentStatus>('Agendado')
  const [formNotes, setFormNotes] = useState<string>('')
  const [formReferring, setFormReferring] = useState<string>('')
  const [formRequestFiles, setFormRequestFiles] = useState<File[]>([])
  const [existingRequestImages, setExistingRequestImages] = useState<string[]>([])
  const [selectedAppointmentForDetail, setSelectedAppointmentForDetail] =
    useState<Appointment | null>(null)
  const [previewImageModalUrl, setPreviewImageModalUrl] = useState<string | null>(null)
  const [savingAppointment, setSavingAppointment] = useState(false)

  // Voucher modal state
  const [voucherModalOpen, setVoucherModalOpen] = useState(false)
  const [voucherAppointment, setVoucherAppointment] = useState<Appointment | null>(null)

  // Exam preparations catalog state & confirmation dialog
  const [prepCatalog, setPrepCatalog] = useState<
    { exam_type: string; instructions: string; duration_minutes?: number }[]
  >([])
  const [pendingPrepReplacement, setPendingPrepReplacement] = useState<{
    newExam: string
    newText: string
  } | null>(null)
  const [prepConfirmDialogOpen, setPrepConfirmDialogOpen] = useState(false)

  // AI Request Image Analysis state
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const [aiReviewDialogOpen, setAiReviewDialogOpen] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedRequestData | null>(null)
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null)
  const [pendingAnalyzedFile, setPendingAnalyzedFile] = useState<File | null>(null)

  // Load preparations catalog
  useEffect(() => {
    examPreparationsService.getAll().then((data) => {
      setPrepCatalog(
        data.map((d) => ({
          exam_type: d.exam_type,
          instructions: d.instructions,
          duration_minutes: d.duration_minutes,
        })),
      )
    })
  }, [])

  // Delete modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Doctor's configured clinics (normalized to array of strings for names)
  const doctorClinics = useMemo<string[]>(() => {
    // If current user is Operator, strictly return only allowed clinics assigned to them
    if (user?.role === 'Operador' && user?.allowed_clinics) {
      if (Array.isArray(user.allowed_clinics)) return user.allowed_clinics
      try {
        const parsed = JSON.parse(user.allowed_clinics)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {
        /* ignore */
      }
    }

    const defaultClinics = ['HM Samuel Marques dos Santos', 'Gastroimagem']
    if (!user?.clinics_config) {
      return defaultClinics
    }

    const extractName = (item: unknown): string => {
      if (!item) return ''
      if (typeof item === 'string') {
        return item === 'Clínica Principal' || item === 'Principal'
          ? 'HM Samuel Marques dos Santos'
          : item
      }
      if (typeof item === 'object' && item !== null && 'name' in item) {
        const n = String((item as { name?: unknown }).name || '').trim()
        return n === 'Clínica Principal' || n === 'Principal' ? 'HM Samuel Marques dos Santos' : n
      }
      return ''
    }

    let rawList: unknown[] = []
    if (Array.isArray(user.clinics_config)) {
      rawList = user.clinics_config
    } else {
      try {
        const parsed = JSON.parse(user.clinics_config)
        if (Array.isArray(parsed)) {
          rawList = parsed
        }
      } catch {
        /* intentionally ignored */
      }
    }

    const names = rawList
      .map(extractName)
      .filter((name): name is string => Boolean(name && name.trim()))
    return names.length > 0 ? names : defaultClinics
  }, [user?.clinics_config])

  // Set default clinic for form
  useEffect(() => {
    if (!formClinic && doctorClinics.length > 0) {
      setFormClinic(doctorClinics[0])
    }
  }, [doctorClinics, formClinic])

  // Calculate week range for week view
  const weekDays = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const curr = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
    // Day of week in UTC (0 is Sunday)
    const dayOfWeek = curr.getUTCDay()
    // Start on Monday (or Sunday) -> let's start on Monday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(curr.getTime() + diffToMonday * 24 * 60 * 60 * 1000)

    const days = []
    for (let i = 0; i < 6; i++) {
      // Mon to Sat
      const dIter = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000)
      const year = dIter.getUTCFullYear()
      const month = String(dIter.getUTCMonth() + 1).padStart(2, '0')
      const day = String(dIter.getUTCDate()).padStart(2, '0')
      const ymd = `${year}-${month}-${day}`
      days.push({
        ymd,
        dateObj: dIter,
        label: dIter.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }),
        formatted: `${day}/${month}`,
      })
    }
    return days
  }, [selectedDate])

  // Load appointments and patients
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [allPts, allAppts] = await Promise.all([
        patientsService.getAll(),
        appointmentsService.getAll(),
      ])
      setPatients(allPts)
      setAppointments(allAppts)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar a agenda.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // If URL has ?paciente=ID, pre-open new appointment modal with that patient selected
  useEffect(() => {
    const ptParam = searchParams.get('paciente')
    if (ptParam && patients.length > 0) {
      const targetPt = patients.find((p) => p.id === ptParam)
      if (targetPt) {
        setEditingAppointment(null)
        setPatientMode('existing')
        setFormPatientId(targetPt.id)
        setFormDate(selectedDate)
        setFormTime('08:00')
        const initialExam = 'Ultrassonografia Abdome Total'
        const initialDuration = examPreparationsService.resolveDurationForExam(
          initialExam,
          prepCatalog,
          user,
        )
        setFormDuration(initialDuration)
        setFormExamType(initialExam)
        setCustomExamType('')
        setFormClinic(doctorClinics[0] || 'HM Samuel Marques dos Santos')
        setFormStatus('Agendado')
        const defaultPrep = prepCatalog.find((p) => p.exam_type === initialExam)
        setFormNotes(
          defaultPrep?.instructions ||
            'Jejum absoluto de 8 horas. Bexiga confortavelmente cheia (beber 4 a 5 copos de água 1h antes e não urinar).',
        )
        setFormReferring('')
        setFormRequestFiles([])
        setExistingRequestImages([])
        setModalOpen(true)
      }
    }
  }, [searchParams, patients, selectedDate, prepCatalog, user, doctorClinics])

  // Navigate date
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const step = viewMode === 'day' ? 1 : 7
    const prev = new Date(Date.UTC(y, m - 1, d - step, 12, 0, 0))
    const nextYmd = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}`
    setSelectedDate(nextYmd)
  }

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const step = viewMode === 'day' ? 1 : 7
    const next = new Date(Date.UTC(y, m - 1, d + step, 12, 0, 0))
    const nextYmd = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
    setSelectedDate(nextYmd)
  }

  const handleToday = () => {
    setSelectedDate(getCuiabaTodayYMD())
  }

  // Auto-fill or ask before replacing notes with exam preparation, and prefill exam duration
  const handleExamTypeChange = (newType: string) => {
    setFormExamType(newType)
    const effectiveType = newType === 'Outro (personalizado)' ? customExamType : newType
    if (!effectiveType) return

    // Auto-fill duration according to the selected exam type (doctor override -> catalog -> user default)
    const suggestedDuration = examPreparationsService.resolveDurationForExam(
      effectiveType,
      prepCatalog,
      user,
    )
    if (suggestedDuration > 0) {
      setFormDuration(suggestedDuration)
    }

    // Find in prepCatalog
    const found = prepCatalog.find((p) => p.exam_type.toLowerCase() === effectiveType.toLowerCase())
    if (!found || !found.instructions) return

    const currentNotes = formNotes.trim()
    if (!currentNotes) {
      // Empty -> auto fill directly
      setFormNotes(found.instructions)
    } else if (currentNotes !== found.instructions) {
      // Already has text -> ask confirmation before replacing
      setPendingPrepReplacement({
        newExam: effectiveType,
        newText: found.instructions,
      })
      setPrepConfirmDialogOpen(true)
    }
  }

  // Open modal for new appointment at specific hour
  const openNewAppointmentModal = (dateStr = selectedDate, timeStr = '08:00') => {
    setEditingAppointment(null)
    setPatientMode('existing')
    setFormPatientId(patients[0]?.id || '')
    setFormNewPatientName('')
    setFormNewPatientCpf('')
    setFormNewPatientPhone('')
    setFormNewPatientSex('Feminino')
    setFormNewPatientBirthDate('')
    setFormNewPatientSusCard('')
    setFormNewPatientAddress('')
    setFormRequestFiles([])
    setExistingRequestImages([])
    setFormDate(dateStr)
    setFormTime(timeStr)
    const initialExam = 'Ultrassonografia Abdome Total'
    const initialDuration = examPreparationsService.resolveDurationForExam(
      initialExam,
      prepCatalog,
      user,
    )
    setFormDuration(initialDuration)
    setFormExamType(initialExam)
    setCustomExamType('')
    setFormClinic(doctorClinics[0] || 'HM Samuel Marques dos Santos')
    setFormStatus('Agendado')
    // Pre-fill initial default exam prep
    const defaultPrep = prepCatalog.find((p) => p.exam_type === initialExam)
    setFormNotes(
      defaultPrep?.instructions ||
        'Jejum absoluto de 8 horas. Bexiga confortavelmente cheia (beber 4 a 5 copos de água 1h antes e não urinar).',
    )
    setFormReferring('')
    setModalOpen(true)
  }

  // Open modal for editing
  const openEditModal = (appt: Appointment) => {
    setEditingAppointment(appt)
    setPatientMode('existing')
    setFormPatientId(appt.patient_id)
    setFormDate(formatCuiabaDate(appt.start_time).split('/').reverse().join('-')) // YYYY-MM-DD
    setFormTime(formatCuiabaTime(appt.start_time))
    setFormDuration(appt.duration_minutes || 30)

    if (COMMON_EXAM_TYPES.includes(appt.exam_type)) {
      setFormExamType(appt.exam_type)
      setCustomExamType('')
    } else {
      setFormExamType('Outro (personalizado)')
      setCustomExamType(appt.exam_type)
    }

    setFormClinic(appt.clinic_location || doctorClinics[0] || 'HM Samuel Marques dos Santos')
    setFormStatus(appt.status)
    setFormNotes(appt.notes || '')
    setFormReferring(appt.referring_physician || '')
    setFormRequestFiles([])
    const imgs = Array.isArray(appt.request_images)
      ? appt.request_images
      : appt.request_images
        ? [appt.request_images]
        : []
    setExistingRequestImages(imgs)
    setModalOpen(true)
  }

  // Save appointment (create or update)
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalExamType =
      formExamType === 'Outro (personalizado)' ? customExamType.trim() : formExamType
    if (!finalExamType) {
      toast({
        title: 'Tipo de exame obrigatório',
        description: 'Informe o tipo de exame para o agendamento.',
        variant: 'destructive',
      })
      return
    }

    if (!formClinic) {
      toast({
        title: 'Local/Clínica obrigatório',
        description: 'Selecione a clínica do atendimento.',
        variant: 'destructive',
      })
      return
    }

    const isHospitalSamuel = formClinic.toLowerCase().includes('samuel')

    setSavingAppointment(true)
    try {
      let finalPatientId = formPatientId
      let finalPatientObj: Patient | undefined = patients.find((p) => p.id === formPatientId)

      // Create new patient inline if requested
      if (patientMode === 'new' && !editingAppointment) {
        if (!formNewPatientName.trim()) {
          toast({
            title: 'Dados do paciente incompletos',
            description: 'Nome do paciente é obrigatório.',
            variant: 'destructive',
          })
          setSavingAppointment(false)
          return
        }

        if (isHospitalSamuel) {
          const missingNewPatientFields: string[] = []
          const cleanCpf = formNewPatientCpf.replace(/\D/g, '')
          if (!formNewPatientCpf.trim() || cleanCpf.length !== 11) {
            missingNewPatientFields.push('CPF completo (11 dígitos)')
          }
          if (!formNewPatientSusCard.trim()) {
            missingNewPatientFields.push('Cartão do SUS')
          }
          if (!formNewPatientAddress.trim()) {
            missingNewPatientFields.push('Endereço completo')
          }

          if (missingNewPatientFields.length > 0) {
            toast({
              title: 'Cadastro do paciente incompleto para HM Samuel Marques dos Santos',
              description: `A unidade HM Samuel Marques dos Santos exige: ${missingNewPatientFields.join(', ')}. Complete os campos obrigatórios para confirmar o agendamento.`,
              variant: 'destructive',
            })
            setSavingAppointment(false)
            return
          }
        }

        const newPt = await patientsService.create({
          name: formNewPatientName.trim(),
          document: formNewPatientCpf.trim() || undefined,
          phone: formNewPatientPhone.trim() || undefined,
          sex: formNewPatientSex,
          birth_date: formNewPatientBirthDate || undefined,
          sus_card: formNewPatientSusCard.trim() || undefined,
          address: formNewPatientAddress.trim() || undefined,
        })
        finalPatientId = newPt.id
        finalPatientObj = newPt
        setPatients((prev) => [newPt, ...prev])
      }

      if (!finalPatientId) {
        toast({
          title: 'Selecione o paciente',
          description: 'É necessário vincular um paciente ao agendamento.',
          variant: 'destructive',
        })
        setSavingAppointment(false)
        return
      }

      // Check existing patient when hospital Samuel requires SUS / CPF / Address
      if (isHospitalSamuel && finalPatientObj) {
        const missingFields: string[] = []
        const cleanDoc = (finalPatientObj.document || '').replace(/\D/g, '')
        if (!finalPatientObj.document || cleanDoc.length !== 11) {
          missingFields.push('CPF')
        }
        if (!finalPatientObj.sus_card?.trim()) {
          missingFields.push('Cartão do SUS')
        }
        if (!finalPatientObj.address?.trim()) {
          missingFields.push('Endereço')
        }
        if (missingFields.length > 0) {
          toast({
            title: 'Cadastro do paciente incompleto para HM Samuel Marques dos Santos',
            description: `A unidade HM Samuel Marques dos Santos exige: ${missingFields.join(', ')}. Complete o cadastro na aba Pacientes ou edite a ficha.`,
            variant: 'destructive',
          })
          setSavingAppointment(false)
          return
        }
      }

      // Convert civil Cuiaba date + time to ISO UTC
      const startIso = combineCuiabaDateTimeToISO(formDate, formTime)

      let savedRecord: Appointment | null = null

      if (editingAppointment) {
        savedRecord = await appointmentsService.update(editingAppointment.id, {
          patient_id: finalPatientId,
          start_time: startIso,
          duration_minutes: formDuration,
          exam_type: finalExamType,
          clinic_location: formClinic,
          status: formStatus,
          notes: formNotes,
          referring_physician: formReferring,
          request_images: formRequestFiles.length > 0 ? formRequestFiles : undefined,
        })
        toast({
          title: 'Agendamento atualizado',
          description: 'Os dados da consulta e solicitações foram salvos com sucesso.',
        })
      } else {
        savedRecord = await appointmentsService.create(
          {
            patient_id: finalPatientId,
            start_time: startIso,
            duration_minutes: formDuration,
            exam_type: finalExamType,
            clinic_location: formClinic,
            status: formStatus,
            notes: formNotes,
            referring_physician: formReferring,
            request_images: formRequestFiles.length > 0 ? formRequestFiles : undefined,
          },
          finalPatientObj,
        )

        // Log LGPD action for appointment creation
        import('@/services/accessLogs').then(({ accessLogsService }) => {
          accessLogsService.log({
            action: 'Criação de agendamento',
            resource_type: 'appointment',
            resource_id: savedRecord?.id,
            clinic_location: formClinic,
            patient_id: finalPatientId,
            patient_name: finalPatientObj?.name,
            details: `Exame: ${finalExamType} | Horário: ${formDate} ${formTime}`,
          })
        })
        toast({
          title: 'Agendamento criado',
          description: 'Paciente agendado com fotos da solicitação e MWL DICOM preparados.',
        })
      }

      // Conforme solicitação do proprietário: ao concluir o agendamento, fechar o modal
      // e abrir imediatamente o comprovante A4 com preparo, orientações e dados completos
      if (savedRecord) {
        // Garantir que expand de paciente venha preenchido ou objeto paciente esteja acessível
        const resolvedPatientForVoucher =
          savedRecord.expand?.patient_id ||
          finalPatientObj ||
          patients.find((p) => p.id === finalPatientId)
        if (resolvedPatientForVoucher && !savedRecord.expand?.patient_id) {
          savedRecord = {
            ...savedRecord,
            expand: {
              ...(savedRecord.expand || {}),
              patient_id: resolvedPatientForVoucher,
            },
          }
        }
        setVoucherAppointment(savedRecord)
        setVoucherModalOpen(true)
      }

      setModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: 'Falha ao salvar agendamento.',
        variant: 'destructive',
      })
    } finally {
      setSavingAppointment(false)
    }
  }

  // Delete appointment
  const handleDeleteAppointment = async () => {
    if (!appointmentToDelete) return
    setDeleting(true)
    try {
      await appointmentsService.delete(appointmentToDelete.id)
      toast({
        title: 'Agendamento removido',
        description: 'O horário foi liberado na agenda.',
      })
      setDeleteConfirmOpen(false)
      setAppointmentToDelete(null)
      loadData()
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o agendamento.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // Action: "Iniciar Laudo"
  const handleStartReport = async (appt: Appointment) => {
    try {
      let examId = appt.exam_id

      // If no exam created yet, create one now and link it
      if (!examId) {
        const examDateYmd = formatCuiabaDate(appt.start_time).split('/').reverse().join('-')
        const newExam = await examsService.create({
          patient_id: appt.patient_id,
          type: appt.exam_type,
          exam_date: examDateYmd,
          status: 'Em análise',
          indication: appt.notes || `Consulta agendada em ${appt.clinic_location}`,
          technical_notes: `Accession Number DICOM: ${appt.accession_number}`,
          appointment_id: appt.id,
        })
        examId = newExam.id
        // Link exam to appointment and update appointment status to 'Em atendimento'
        await appointmentsService.update(appt.id, {
          exam_id: examId,
          status: 'Em atendimento',
        })
      } else {
        // Just update status to 'Em atendimento' if it was Agendado/Confirmado
        if (appt.status === 'Agendado' || appt.status === 'Confirmado') {
          await appointmentsService.updateStatus(appt.id, 'Em atendimento')
        }
      }

      // If a report already exists for this exam, open that report directly
      let targetReportId = ''
      try {
        const existingReport = await reportsService.getByExamId(examId)
        if (existingReport) {
          targetReportId = existingReport.id
        }
      } catch (_) {
        /* proceed with query params */
      }

      if (targetReportId) {
        navigate(`/laudos/ultrassom?id=${targetReportId}&agendamento=${appt.id}`)
      } else {
        navigate(
          `/laudos/ultrassom?paciente=${appt.patient_id}&exame=${examId}&agendamento=${appt.id}`,
        )
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao iniciar laudo',
        description: 'Falha ao vincular exame ao agendamento.',
        variant: 'destructive',
      })
    }
  }

  // Filtered appointments for current view
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // Clinic filter
      if (selectedClinicFilter !== 'Todas' && appt.clinic_location !== selectedClinicFilter) {
        return false
      }
      // Status filter
      if (statusFilter !== 'Todos' && appt.status !== statusFilter) {
        return false
      }
      return true
    })
  }, [appointments, selectedClinicFilter, statusFilter])

  // Appointments grouped by date (YYYY-MM-DD in Cuiaba)
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    filteredAppointments.forEach((appt) => {
      // Format to YYYY-MM-DD
      const ptDate = formatCuiabaDate(appt.start_time)
      const parts = ptDate.split('/')
      if (parts.length === 3) {
        const ymd = `${parts[2]}-${parts[1]}-${parts[0]}`
        const arr = map.get(ymd) || []
        arr.push(appt)
        map.set(ymd, arr)
      }
    })
    return map
  }, [filteredAppointments])

  // Appointments for the selected single day, sorted by time
  const dayAppointments = useMemo(() => {
    const list = appointmentsByDate.get(selectedDate) || []
    return [...list].sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [appointmentsByDate, selectedDate])

  // Visual grid interval (configurable in 5/10/15/20/30/60 min), strictly separated from real appointment duration
  const [visualGridInterval, setVisualGridInterval] = useState<number>(30)

  const slotIntervalMinutes = useMemo(() => {
    if ([5, 10, 15, 20, 30, 60].includes(visualGridInterval)) return visualGridInterval
    const dur = user?.default_appointment_duration
    if (dur && [10, 15, 20, 30, 40, 45, 60].includes(dur)) return dur
    return 30
  }, [visualGridInterval, user?.default_appointment_duration])

  // Dynamic day time slots: starts at 07:00 (or earlier if there are earlier appointments)
  // and ends at 19:00 (or later if there are later appointments, ex.: 20h, 21h, 22h).
  // Ensures that NO appointment ever remains hidden outside the grid.
  const scheduleSlots = useMemo(() => {
    const slots: { startMinutes: number; endMinutes: number; timeStr: string }[] = []
    let minMinutes = 7 * 60 // default 07:00
    let maxMinutes = 19 * 60 // default 19:00

    dayAppointments.forEach((appt) => {
      const t = formatCuiabaTime(appt.start_time)
      const [hStr, mStr] = t.split(':')
      const apptStart = parseInt(hStr, 10) * 60 + parseInt(mStr || '0', 10)
      const dur = appt.duration_minutes || slotIntervalMinutes
      const apptEnd = apptStart + dur

      if (apptStart < minMinutes) {
        // Floor to slotIntervalMinutes or whole hour
        const flooredStart = Math.floor(apptStart / slotIntervalMinutes) * slotIntervalMinutes
        if (flooredStart < minMinutes) {
          minMinutes = Math.max(0, flooredStart)
        }
      }

      if (apptEnd > maxMinutes) {
        // Ceil to slotIntervalMinutes
        const ceiledEnd = Math.ceil(apptEnd / slotIntervalMinutes) * slotIntervalMinutes
        if (ceiledEnd > maxMinutes) {
          maxMinutes = Math.min(24 * 60, ceiledEnd)
        }
      }
    })

    for (let cur = minMinutes; cur < maxMinutes; cur += slotIntervalMinutes) {
      slots.push({
        startMinutes: cur,
        endMinutes: cur + slotIntervalMinutes,
        timeStr: formatMinutesToTime(cur),
      })
    }
    return slots
  }, [dayAppointments, slotIntervalMinutes])

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'Agendado':
        return (
          <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-[10px]">
            Agendado
          </Badge>
        )
      case 'Confirmado':
        return (
          <Badge
            variant="outline"
            className="border-purple-300 text-purple-700 bg-purple-50 text-[10px]"
          >
            Confirmado
          </Badge>
        )
      case 'Em atendimento':
        return (
          <Badge
            variant="outline"
            className="border-amber-300 text-amber-700 bg-amber-50 text-[10px] animate-pulse"
          >
            Em atendimento
          </Badge>
        )
      case 'Realizado':
        return (
          <Badge
            variant="outline"
            className="border-emerald-300 text-emerald-700 bg-emerald-50 text-[10px]"
          >
            Realizado
          </Badge>
        )
      case 'Cancelado':
        return (
          <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 text-[10px]">
            Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Display human string for selected date
  const dateHeadingFormatted = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
    return dt.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }, [selectedDate])

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#0C6B58] bg-[#E8F3F0] px-2 py-0.5 rounded uppercase">
              Agenda Individual por Médico
            </span>
            <span className="text-xs text-[#5F6E69]">• Fuso: Cuiabá (UTC-4)</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1F2A27]">Agenda de Consultas e Exames</h1>
          <p className="text-sm text-[#5F6E69] mt-0.5">
            Agendamentos vinculados ao seu CRM e prontos para distribuição na Modality Worklist
            (MWL)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => openNewAppointmentModal(selectedDate, '08:00')}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold text-xs h-9 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Control Toolbar: Date Selector, View Mode (Day/Week), Clinic Filter */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevDay}
            className="h-8 w-8 border-[#E5E9E7]"
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4 text-[#5F6E69]" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-8 text-xs font-medium border-[#E5E9E7] text-[#1F2A27]"
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextDay}
            className="h-8 w-8 border-[#E5E9E7]"
            title="Próximo"
          >
            <ChevronRight className="w-4 h-4 text-[#5F6E69]" />
          </Button>

          <div className="relative ml-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-[#1F2A27] bg-[#F7F9F8] border border-[#E5E9E7] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0C6B58] cursor-pointer"
            />
          </div>

          <span className="text-xs font-semibold text-[#1F2A27] capitalize hidden sm:inline ml-2">
            {dateHeadingFormatted}
          </span>
        </div>

        {/* View Mode & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Clinic filter */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#8A9691]" />
            <Select value={selectedClinicFilter} onValueChange={setSelectedClinicFilter}>
              <SelectTrigger className="h-8 text-xs w-[160px] bg-white border-[#E5E9E7]">
                <SelectValue placeholder="Clínica / Local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas as Unidades</SelectItem>
                {doctorClinics.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px] bg-white border-[#E5E9E7]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Status</SelectItem>
              <SelectItem value="Agendado">Agendado</SelectItem>
              <SelectItem value="Confirmado">Confirmado</SelectItem>
              <SelectItem value="Em atendimento">Em atendimento</SelectItem>
              <SelectItem value="Realizado">Realizado</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          {/* Visual Grid Interval Selector (separated from real duration) */}
          <div className="flex items-center gap-1.5" title="Intervalo visual da grade da agenda">
            <span className="text-[11px] text-[#5F6E69] hidden lg:inline">Grade:</span>
            <Select
              value={String(visualGridInterval)}
              onValueChange={(val) => setVisualGridInterval(Number(val))}
            >
              <SelectTrigger className="h-8 text-xs w-[100px] bg-white border-[#E5E9E7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Grade 5 min</SelectItem>
                <SelectItem value="10">Grade 10 min</SelectItem>
                <SelectItem value="15">Grade 15 min</SelectItem>
                <SelectItem value="20">Grade 20 min</SelectItem>
                <SelectItem value="30">Grade 30 min</SelectItem>
                <SelectItem value="60">Grade 60 min</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mode switch */}
          <div className="flex items-center border border-[#E5E9E7] rounded-lg overflow-hidden bg-[#F7F9F8] p-0.5">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                viewMode === 'day'
                  ? 'bg-white text-[#0C6B58] shadow-xs'
                  : 'text-[#5F6E69] hover:text-[#1F2A27]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Dia
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                viewMode === 'week'
                  ? 'bg-white text-[#0C6B58] shadow-xs'
                  : 'text-[#5F6E69] hover:text-[#1F2A27]'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              Semana
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-[#E5E9E7]">
          <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
          <p className="text-xs text-[#5F6E69]">Carregando agendamentos...</p>
        </div>
      ) : viewMode === 'day' ? (
        /* DAY VIEW */
        <div className="space-y-4">
          {/* Day overview summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-[#E5E9E7] text-xs">
              <span className="text-[#5F6E69] block">Total do dia</span>
              <span className="text-xl font-bold text-[#1F2A27] mt-0.5 block">
                {dayAppointments.length}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-[#E5E9E7] text-xs">
              <span className="text-[#5F6E69] block">Agendados / Confirmados</span>
              <span className="text-xl font-bold text-blue-600 mt-0.5 block">
                {
                  dayAppointments.filter(
                    (a) => a.status === 'Agendado' || a.status === 'Confirmado',
                  ).length
                }
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-[#E5E9E7] text-xs">
              <span className="text-[#5F6E69] block">Em atendimento</span>
              <span className="text-xl font-bold text-amber-600 mt-0.5 block">
                {dayAppointments.filter((a) => a.status === 'Em atendimento').length}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-[#E5E9E7] text-xs">
              <span className="text-[#5F6E69] block">Realizados</span>
              <span className="text-xl font-bold text-emerald-600 mt-0.5 block">
                {dayAppointments.filter((a) => a.status === 'Realizado').length}
              </span>
            </div>
          </div>

          {/* Day Time Schedule Grid */}
          <div className="bg-white rounded-xl border border-[#E5E9E7] shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E5E9E7] bg-[#F7F9F8] flex items-center justify-between">
              <span className="font-bold text-xs text-[#1F2A27] uppercase tracking-wider">
                Grade de Horários • {formatCuiabaDate(combineCuiabaDateTimeToISO(selectedDate))}
              </span>
              <span className="text-[11px] text-[#8A9691]">
                Dica: clique em um horário livre para agendar
              </span>
            </div>

            <div className="divide-y divide-[#E5E9E7]">
              {scheduleSlots.map((slot) => {
                const hourStr = slot.timeStr
                // Find appointments falling into this slot interval
                const slotAppointments = dayAppointments.filter((appt) => {
                  const t = formatCuiabaTime(appt.start_time)
                  const [hStr, mStr] = t.split(':')
                  const apptMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr || '0', 10)
                  return apptMinutes >= slot.startMinutes && apptMinutes < slot.endMinutes
                })

                return (
                  <div
                    key={slot.timeStr}
                    className="flex flex-col sm:flex-row sm:items-start min-h-[64px] hover:bg-[#FAFBFB] transition group"
                  >
                    {/* Hour Column */}
                    <div className="w-28 p-3 sm:border-r border-[#E5E9E7] shrink-0 flex items-center sm:items-start justify-between sm:justify-start bg-[#FAFBFB]/50">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-[#1F2A27] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#0C6B58]" />
                          {hourStr}
                        </span>
                        <span className="text-[10px] text-[#8A9691] block">
                          Slot: {slotIntervalMinutes}m
                        </span>
                      </div>
                      {/* Mobile quick add button */}
                      <button
                        onClick={() => openNewAppointmentModal(selectedDate, hourStr)}
                        className="sm:hidden text-xs text-[#0C6B58] font-medium"
                      >
                        + Agendar
                      </button>
                    </div>

                    {/* Appointment Cards / Empty Slot */}
                    <div className="flex-1 p-2 sm:p-3 min-w-0">
                      {slotAppointments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                          {slotAppointments.map((appt) => {
                            const patient = appt.expand?.patient_id
                            const timeFormatted = formatCuiabaTime(appt.start_time)
                            const reqImgs = Array.isArray(appt.request_images)
                              ? appt.request_images
                              : appt.request_images
                                ? [appt.request_images]
                                : []

                            return (
                              <div
                                key={appt.id}
                                className={`p-3 sm:p-3.5 rounded-lg border transition space-y-2.5 shadow-sm min-w-0 overflow-hidden flex flex-col justify-between ${
                                  appt.status === 'Em atendimento'
                                    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                                    : appt.status === 'Realizado'
                                      ? 'bg-emerald-50/50 border-emerald-200'
                                      : 'bg-white border-[#E5E9E7] hover:border-[#0C6B58]/40'
                                }`}
                              >
                                <div className="space-y-2 min-w-0">
                                  {/* Header: Nome + Status */}
                                  <div className="flex items-start justify-between gap-2 min-w-0">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                        <span
                                          className="font-bold text-sm text-[#1F2A27] truncate max-w-full"
                                          title={patient?.name || 'Paciente sem cadastro'}
                                        >
                                          {patient?.name || 'Paciente sem cadastro'}
                                        </span>
                                        {getStatusBadge(appt.status)}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#5F6E69] mt-0.5">
                                        <span className="font-semibold text-[#0C6B58] shrink-0">
                                          {timeFormatted} ({appt.duration_minutes || 30} min)
                                        </span>
                                        <span className="text-[#8A9691] shrink-0">•</span>
                                        <span
                                          className="flex items-center gap-1 min-w-0 max-w-[200px] truncate"
                                          title={appt.clinic_location}
                                        >
                                          <MapPin className="w-3 h-3 text-[#8A9691] shrink-0" />
                                          <span className="truncate">{appt.clinic_location}</span>
                                        </span>
                                        <span className="text-[#8A9691] shrink-0">•</span>
                                        <span
                                          className="font-mono text-[11px] text-[#8A9691] shrink-0"
                                          title="Accession Number DICOM MWL"
                                        >
                                          AN: {appt.accession_number}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Exame + Médico Solicitante */}
                                  <div className="text-xs text-[#1F2A27] bg-[#F7F9F8] p-2 rounded border border-[#E5E9E7]/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 min-w-0">
                                    <span
                                      className="font-medium truncate flex items-center gap-1.5 min-w-0"
                                      title={appt.exam_type}
                                    >
                                      <Stethoscope className="w-3.5 h-3.5 text-[#0C6B58] shrink-0" />
                                      <span className="truncate">{appt.exam_type}</span>
                                    </span>
                                    {appt.referring_physician && (
                                      <span
                                        className="text-[11px] text-[#8A9691] truncate sm:ml-2 sm:text-right shrink-0 max-w-full sm:max-w-[45%]"
                                        title={`Médico Solicitante: ${appt.referring_physician}`}
                                      >
                                        Sol.: {appt.referring_physician}
                                      </span>
                                    )}
                                  </div>

                                  {/* Observações com tooltip e truncate */}
                                  {appt.notes && (
                                    <p
                                      className="text-[11px] text-[#5F6E69] italic truncate max-w-full"
                                      title={appt.notes}
                                    >
                                      Obs: {appt.notes}
                                    </p>
                                  )}

                                  {/* Badges & Thumbnails of Request Images */}
                                  {reqImgs.length > 0 && (
                                    <div className="pt-0.5 flex items-center gap-2 min-w-0">
                                      <span className="text-[11px] font-semibold text-[#0C6B58] flex items-center gap-1 shrink-0">
                                        <FileText className="w-3.5 h-3.5" />
                                        {reqImgs.length} anexo(s):
                                      </span>
                                      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 min-w-0">
                                        {reqImgs.map((fn, idx) => {
                                          const url = appointmentsService.getRequestImageUrl(
                                            appt,
                                            fn,
                                          )
                                          return (
                                            <button
                                              key={idx}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setPreviewImageModalUrl(url)
                                              }}
                                              className="relative group/thumb w-7 h-7 rounded border border-[#E5E9E7] overflow-hidden bg-white hover:ring-2 hover:ring-[#0C6B58] transition shrink-0"
                                              title="Clique para ampliar solicitação"
                                            >
                                              <img
                                                src={url}
                                                alt={`Solicitação ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                              />
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Action Buttons: organizados de forma responsiva sem sobreposição */}
                                <div className="pt-2 border-t border-[#E5E9E7]/70 flex flex-wrap items-center justify-between gap-1.5 min-w-0">
                                  {/* Botões primários visíveis */}
                                  <div className="flex items-center gap-1 flex-wrap min-w-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditModal(appt)}
                                      className="h-7 text-xs px-2 text-[#5F6E69] hover:text-[#1F2A27] hover:bg-[#F0F3F2]"
                                      title="Editar agendamento"
                                    >
                                      <Edit className="w-3.5 h-3.5 mr-1 shrink-0" />
                                      Editar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedAppointmentForDetail(appt)}
                                      className="h-7 text-xs px-2 text-[#0C6B58] hover:bg-[#E8F3F0]"
                                      title="Ver Detalhes e Solicitações"
                                    >
                                      <FileText className="w-3.5 h-3.5 mr-1 shrink-0" />
                                      Detalhes
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setVoucherAppointment(appt)
                                        setVoucherModalOpen(true)
                                      }}
                                      className="h-7 text-xs px-2 text-[#0C6B58] hover:bg-[#E8F3F0]"
                                      title="Imprimir Comprovante do Paciente com Preparo"
                                    >
                                      <Printer className="w-3.5 h-3.5 mr-1 shrink-0" />
                                      Comprovante
                                    </Button>

                                    {/* Menu suspenso para mais ações (Ficha do paciente e Excluir) */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-[#5F6E69] hover:text-[#1F2A27] hover:bg-[#F0F3F2]"
                                          title="Mais opções do agendamento"
                                        >
                                          <MoreVertical className="w-3.5 h-3.5" />
                                          <span className="sr-only">Mais opções</span>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="w-48 bg-white">
                                        {appt.patient_id && (
                                          <DropdownMenuItem asChild>
                                            <Link
                                              to={`/pacientes/${appt.patient_id}`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="flex items-center gap-2 cursor-pointer text-xs"
                                            >
                                              <User className="w-3.5 h-3.5 text-[#0C6B58]" />
                                              <span>Ficha do paciente ↗</span>
                                            </Link>
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setVoucherAppointment(appt)
                                            setVoucherModalOpen(true)
                                          }}
                                          className="flex items-center gap-2 cursor-pointer text-xs sm:hidden"
                                        >
                                          <Printer className="w-3.5 h-3.5 text-[#0C6B58]" />
                                          <span>Imprimir Comprovante</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setAppointmentToDelete(appt)
                                            setDeleteConfirmOpen(true)
                                          }}
                                          className="flex items-center gap-2 cursor-pointer text-xs text-red-600 focus:text-red-700 focus:bg-red-50"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                          <span>Excluir agendamento</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  {/* Botão de ação clínica principal (Iniciar / Abrir laudo) */}
                                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                    <Button
                                      size="sm"
                                      onClick={() => handleStartReport(appt)}
                                      className={`h-7 text-xs font-semibold px-2.5 shrink-0 ${
                                        appt.status === 'Realizado'
                                          ? 'bg-[#E8F3F0] text-[#0C6B58] hover:bg-[#d5ebe5] border border-[#0C6B58]/30'
                                          : 'bg-[#0C6B58] text-white hover:bg-[#0A5949]'
                                      }`}
                                      title={
                                        appt.status === 'Realizado'
                                          ? 'Ver ou reabrir laudo deste exame'
                                          : 'Iniciar laudo deste exame'
                                      }
                                    >
                                      <Play className="w-3 h-3 mr-1 fill-current shrink-0" />
                                      <span className="whitespace-nowrap">
                                        {appt.status === 'Realizado'
                                          ? 'Ver / Reabrir laudo'
                                          : 'Iniciar laudo'}
                                      </span>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div
                          onClick={() => openNewAppointmentModal(selectedDate, hourStr)}
                          className="h-full min-h-[40px] flex items-center justify-between px-3 rounded-md border border-dashed border-transparent hover:border-[#0C6B58]/40 hover:bg-[#E8F3F0]/20 cursor-pointer text-xs text-[#8A9691] transition"
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition">
                            Horário livre ({slotIntervalMinutes}m) — clique para agendar às{' '}
                            {hourStr}
                          </span>
                          <span className="opacity-0 group-hover:opacity-100 transition text-[#0C6B58] font-semibold text-xs flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Agendar
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* WEEK VIEW */
        <div className="bg-white rounded-xl border border-[#E5E9E7] shadow-sm overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Week Header */}
            <div className="grid grid-cols-6 border-b border-[#E5E9E7] bg-[#F7F9F8] text-center">
              {weekDays.map((w) => {
                const isSelected = w.ymd === selectedDate
                const isToday = w.ymd === getCuiabaTodayYMD()
                const count = appointmentsByDate.get(w.ymd)?.length || 0

                return (
                  <div
                    key={w.ymd}
                    onClick={() => {
                      setSelectedDate(w.ymd)
                      setViewMode('day')
                    }}
                    className={`py-3 px-2 border-r last:border-r-0 border-[#E5E9E7] cursor-pointer transition ${
                      isSelected ? 'bg-[#E8F3F0]/50' : 'hover:bg-[#F0F3F2]'
                    }`}
                  >
                    <span className="text-[11px] font-semibold uppercase text-[#5F6E69] block">
                      {w.label}
                    </span>
                    <span
                      className={`text-sm font-bold block mt-0.5 ${
                        isToday ? 'text-[#0C6B58]' : 'text-[#1F2A27]'
                      }`}
                    >
                      {w.formatted}
                    </span>
                    <span className="text-[10px] text-[#8A9691] block mt-0.5">
                      {count} {count === 1 ? 'paciente' : 'pacientes'}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Week Columns Content */}
            <div className="grid grid-cols-6 min-h-[480px] divide-x divide-[#E5E9E7]">
              {weekDays.map((w) => {
                const dayAppts = (appointmentsByDate.get(w.ymd) || []).sort((a, b) =>
                  a.start_time.localeCompare(b.start_time),
                )

                return (
                  <div key={w.ymd} className="p-2 space-y-2 bg-white">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openNewAppointmentModal(w.ymd, '08:00')}
                      className="w-full text-[11px] h-7 text-[#0C6B58] border border-dashed border-[#0C6B58]/30 hover:bg-[#E8F3F0]"
                    >
                      + Novo
                    </Button>

                    {dayAppts.length === 0 ? (
                      <div className="py-8 text-center text-[11px] text-[#8A9691]">
                        Sem agendamentos
                      </div>
                    ) : (
                      dayAppts.map((appt) => {
                        const patient = appt.expand?.patient_id
                        const timeStr = formatCuiabaTime(appt.start_time)

                        return (
                          <div
                            key={appt.id}
                            onClick={() => openEditModal(appt)}
                            className={`p-2.5 rounded-lg border text-xs space-y-1 cursor-pointer transition hover:shadow-sm min-w-0 overflow-hidden ${
                              appt.status === 'Realizado'
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : appt.status === 'Em atendimento'
                                  ? 'bg-amber-50/60 border-amber-300'
                                  : 'bg-[#FAFBFB] border-[#E5E9E7] hover:border-[#0C6B58]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 min-w-0">
                              <span className="font-bold text-[#0C6B58] shrink-0">{timeStr}</span>
                              <span
                                className="text-[9px] px-1 rounded bg-white border border-[#E5E9E7] font-medium truncate max-w-[90px]"
                                title={appt.clinic_location}
                              >
                                {appt.clinic_location}
                              </span>
                            </div>
                            <span
                              className="font-semibold text-[#1F2A27] block truncate"
                              title={patient?.name || 'Paciente'}
                            >
                              {patient?.name || 'Paciente'}
                            </span>
                            <span
                              className="text-[11px] text-[#5F6E69] block truncate"
                              title={appt.exam_type}
                            >
                              {appt.exam_type}
                            </span>
                            <div className="pt-1 flex items-center justify-between gap-1">
                              <div className="shrink-0">{getStatusBadge(appt.status)}</div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStartReport(appt)
                                }}
                                className="text-[10px] text-[#0C6B58] font-bold hover:underline shrink-0"
                                title="Iniciar ou ver laudo"
                              >
                                Laudo →
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRIAR / EDITAR AGENDAMENTO */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento de Exame'}
            </DialogTitle>
            <DialogDescription>
              Os dados estruturados serão preparados para a Modality Worklist (MWL) do servidor
              DICOM Orthanc local.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAppointment} className="space-y-4 pt-2">
            {/* Paciente Section */}
            {!editingAppointment && (
              <div className="p-3 bg-[#F7F9F8] rounded-xl border border-[#E5E9E7] space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#1F2A27] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#0C6B58]" />
                    Paciente *
                  </Label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPatientMode('existing')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                        patientMode === 'existing'
                          ? 'bg-white shadow-xs text-[#0C6B58] border border-[#E5E9E7]'
                          : 'text-[#5F6E69]'
                      }`}
                    >
                      Selecionar cadastrado
                    </button>
                    <button
                      type="button"
                      onClick={() => setPatientMode('new')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                        patientMode === 'new'
                          ? 'bg-white shadow-xs text-[#0C6B58] border border-[#E5E9E7]'
                          : 'text-[#5F6E69]'
                      }`}
                    >
                      + Cadastrar novo
                    </button>
                  </div>
                </div>

                {patientMode === 'existing' ? (
                  <div className="space-y-1">
                    <Select value={formPatientId} onValueChange={setFormPatientId}>
                      <SelectTrigger className="text-xs bg-white">
                        <SelectValue placeholder="Selecione o paciente cadastrado" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {patients.map((pt) => (
                          <SelectItem key={pt.id} value={pt.id} className="text-xs">
                            {pt.name} — CPF: {maskCPF(pt.document)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Nome Completo do Paciente *</Label>
                      <Input
                        value={formNewPatientName}
                        onChange={(e) => setFormNewPatientName(e.target.value)}
                        placeholder="Ex.: Maria de Oliveira Santos"
                        className="text-xs bg-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        CPF
                        {formClinic.toLowerCase().includes('samuel') && (
                          <span className="text-red-500 font-bold ml-1">*</span>
                        )}
                      </Label>
                      <Input
                        value={formNewPatientCpf}
                        onChange={(e) => setFormNewPatientCpf(maskCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        className="text-xs bg-white"
                        required={formClinic.toLowerCase().includes('samuel')}
                      />
                      {formClinic.toLowerCase().includes('samuel') && (
                        <p className="text-[10px] text-amber-700">
                          Obrigatório para HM Samuel Marques dos Santos
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone / WhatsApp</Label>
                      <Input
                        value={formNewPatientPhone}
                        onChange={(e) => setFormNewPatientPhone(maskPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        className="text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sexo</Label>
                      <Select
                        value={formNewPatientSex}
                        onValueChange={(v: 'Feminino' | 'Masculino' | 'Outro') =>
                          setFormNewPatientSex(v)
                        }
                      >
                        <SelectTrigger className="text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Feminino">Feminino</SelectItem>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={formNewPatientBirthDate}
                        onChange={(e) => setFormNewPatientBirthDate(e.target.value)}
                        className="text-xs bg-white"
                      />
                    </div>
                    {/* Campos SUS e Endereço */}
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Cartão Nacional de Saúde (SUS)
                        {formClinic.toLowerCase().includes('samuel') && (
                          <span className="text-red-500 font-bold ml-1">*</span>
                        )}
                      </Label>
                      <Input
                        value={formNewPatientSusCard}
                        onChange={(e) => setFormNewPatientSusCard(e.target.value)}
                        placeholder="000 0000 0000 0000"
                        className="text-xs bg-white"
                      />
                      {formClinic.toLowerCase().includes('samuel') && (
                        <p className="text-[10px] text-amber-700">
                          Obrigatório para HM Samuel Marques dos Santos
                        </p>
                      )}
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">
                        Endereço Completo
                        {formClinic.toLowerCase().includes('samuel') && (
                          <span className="text-red-500 font-bold ml-1">*</span>
                        )}
                      </Label>
                      <Input
                        value={formNewPatientAddress}
                        onChange={(e) => setFormNewPatientAddress(e.target.value)}
                        placeholder="Rua, número, bairro, cidade - estado"
                        className="text-xs bg-white"
                      />
                      {formClinic.toLowerCase().includes('samuel') && (
                        <p className="text-[10px] text-amber-700">
                          Obrigatório para HM Samuel Marques dos Santos
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If editing, show patient selector */}
            {editingAppointment && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Paciente *</Label>
                <Select value={formPatientId} onValueChange={setFormPatientId}>
                  <SelectTrigger className="text-xs bg-white">
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {patients.map((pt) => (
                      <SelectItem key={pt.id} value={pt.id} className="text-xs">
                        {pt.name} — CPF: {maskCPF(pt.document)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date, Time, Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data da Consulta *</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="text-xs bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Horário Início *</Label>
                <Input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="text-xs bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Duração (minutos)</span>
                  <span className="text-[10px] text-[#0C6B58] font-normal">ajustável</span>
                </Label>
                <Select
                  value={String(formDuration)}
                  onValueChange={(v) => setFormDuration(Number(v))}
                >
                  <SelectTrigger className="text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="20">20 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="40">40 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min (1h)</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                    <SelectItem value="120">120 min (2h)</SelectItem>
                    {![10, 15, 20, 30, 40, 45, 60, 90, 120].includes(formDuration) && (
                      <SelectItem value={String(formDuration)}>
                        {formDuration} min (personalizado)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Exam Type & Clinic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Tipo de Exame *</Label>
                  <span className="text-[10px] text-[#0C6B58] font-medium">
                    Duração e preparo automáticos
                  </span>
                </div>
                <Select value={formExamType} onValueChange={handleExamTypeChange}>
                  <SelectTrigger className="text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {COMMON_EXAM_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                    <SelectItem value="Outro (personalizado)" className="text-xs font-semibold">
                      Outro (personalizado)...
                    </SelectItem>
                  </SelectContent>
                </Select>

                {formExamType === 'Outro (personalizado)' && (
                  <Input
                    value={customExamType}
                    onChange={(e) => {
                      setCustomExamType(e.target.value)
                      handleExamTypeChange('Outro (personalizado)')
                    }}
                    placeholder="Digite o nome do exame"
                    className="text-xs bg-white mt-1.5"
                    required
                  />
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Clínica / Local de Atendimento *</Label>
                <Select value={formClinic} onValueChange={setFormClinic}>
                  <SelectTrigger className="text-xs bg-white">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctorClinics.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-[#8A9691]">
                  Unidades configuráveis em Configurações → Worklist DICOM.
                </p>
              </div>
            </div>

            {/* Status & Referring physician */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status do Agendamento *</Label>
                <Select
                  value={formStatus}
                  onValueChange={(v: AppointmentStatus) => setFormStatus(v)}
                >
                  <SelectTrigger className="text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Agendado">Agendado</SelectItem>
                    <SelectItem value="Confirmado">Confirmado</SelectItem>
                    <SelectItem value="Em atendimento">Em atendimento</SelectItem>
                    <SelectItem value="Realizado">Realizado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Médico Solicitante</Label>
                <Input
                  value={formReferring}
                  onChange={(e) => setFormReferring(e.target.value)}
                  placeholder="Ex.: Dr. Carlos Eduardo / Pediatra"
                  className="text-xs bg-white"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Observações / Preparo Clínico</Label>
              <Textarea
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Ex.: Jejum de 8 horas, bexiga cheia, trazer exames anteriores..."
                className="text-xs bg-white"
              />
            </div>

            {/* Anexos de Solicitação Médica (Xerox / Fotos) e Leitor Inteligente por IA */}
            <div className="p-3 bg-[#F7F9F8] rounded-xl border border-[#E5E9E7] space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label className="text-xs font-semibold text-[#1F2A27] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#0C6B58]" />
                    Fotos da Solicitação Médica / Pedido (Xerox/Foto)
                  </Label>
                  <span className="text-[10px] text-[#8A9691]">JPG, PNG, WebP</span>
                </div>

                {/* Botão de Leitura / Análise por IA */}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={analyzingImage}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setPendingAnalyzedFile(file)
                      setAnalyzingImage(true)
                      setAiErrorMsg(null)
                      try {
                        const result = await requestAnalysisService.analyzeImage(file)
                        if (result.success && result.extracted) {
                          setExtractedData(result.extracted)
                          setAiReviewDialogOpen(true)
                          // Também inclui o arquivo na lista de anexos
                          setFormRequestFiles((prev) => [...prev, file])
                        } else {
                          setAiErrorMsg(
                            result.error ||
                              'Não foi possível extrair dados estruturados desta imagem. O preenchimento manual continua disponível.',
                          )
                          setExtractedData(null)
                          setAiReviewDialogOpen(true)
                        }
                      } catch (err: unknown) {
                        const msg =
                          err instanceof Error
                            ? err.message
                            : 'Falha na conexão com o gateway de IA'
                        setAiErrorMsg(msg)
                        setAiReviewDialogOpen(true)
                      } finally {
                        setAnalyzingImage(false)
                        // Reset input
                        e.target.value = ''
                      }
                    }}
                  />
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs ${
                      analyzingImage
                        ? 'bg-amber-100 text-amber-800 cursor-wait'
                        : 'bg-[#E8F3F0] text-[#0C6B58] hover:bg-[#d5ebe5] border border-[#0C6B58]/30'
                    }`}
                  >
                    {analyzingImage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0C6B58]" />
                        <span>Analisando foto com IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#0C6B58]" />
                        <span>Importar solicitação por foto (IA)</span>
                      </>
                    )}
                  </div>
                </label>
              </div>

              <p className="text-[11px] text-[#5F6E69]">
                Anexe fotos da requisição/encaminhamento do SUS ou convênio. Use o botão{' '}
                <strong className="text-[#0C6B58]">Importar solicitação por foto</strong> para
                preencher automaticamente o paciente, exame e indicação após sua revisão.
              </p>

              {/* Existing images list if editing */}
              {existingRequestImages.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-[#5F6E69] block">
                    Fotos já anexadas anteriormente:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {existingRequestImages.map((imgName, idx) => {
                      const url = editingAppointment
                        ? appointmentsService.getRequestImageUrl(editingAppointment, imgName)
                        : ''
                      return (
                        <div
                          key={idx}
                          className="relative group border rounded-lg overflow-hidden bg-white w-16 h-16 shrink-0 shadow-2xs"
                        >
                          <img
                            src={url}
                            alt="Solicitação médica"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewImageModalUrl(url)}
                            className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[10px] font-medium"
                          >
                            Ver
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Upload input for new photos */}
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setFormRequestFiles((prev) => [...prev, ...files])
                  }}
                  className="text-xs bg-white file:text-xs file:font-medium file:text-[#0C6B58]"
                />

                {formRequestFiles.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-semibold text-[#0C6B58]">
                      {formRequestFiles.length} novo(s) arquivo(s) selecionado(s):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {formRequestFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 bg-white border border-[#E5E9E7] px-2 py-1 rounded text-xs text-[#1F2A27]"
                        >
                          <span className="max-w-[140px] truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setFormRequestFiles((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-red-500 hover:text-red-700 font-bold ml-1"
                            title="Remover anexo"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {editingAppointment?.accession_number && (
              <div className="p-2.5 rounded bg-[#F7F9F8] border border-[#E5E9E7] text-[11px] text-[#5F6E69] flex items-center justify-between">
                <span>Accession Number único:</span>
                <span className="font-mono font-bold text-[#1F2A27]">
                  {editingAppointment.accession_number}
                </span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={savingAppointment}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingAppointment}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
              >
                {savingAppointment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingAppointment ? (
                  'Salvar Alterações'
                ) : (
                  'Confirmar Agendamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALHES DO AGENDAMENTO (INCLUINDO FOTOS DA SOLICITAÇÃO) */}
      <Dialog
        open={Boolean(selectedAppointmentForDetail)}
        onOpenChange={(open) => !open && setSelectedAppointmentForDetail(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedAppointmentForDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#0C6B58]" />
                  {selectedAppointmentForDetail.expand?.patient_id?.name ||
                    'Detalhes do Agendamento'}
                </DialogTitle>
                <DialogDescription>
                  Informações completas do agendamento, preparo e requisição médica anexada.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-sm text-[#1F2A27]">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#F7F9F8] p-3.5 rounded-xl border border-[#E5E9E7]">
                  <div>
                    <span className="text-[11px] text-[#5F6E69] block">Horário e Duração</span>
                    <span className="font-bold text-[#0C6B58]">
                      {formatCuiabaDateTime(selectedAppointmentForDetail.start_time)} (
                      {selectedAppointmentForDetail.duration_minutes || 30} min)
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#5F6E69] block">Status</span>
                    {getStatusBadge(selectedAppointmentForDetail.status)}
                  </div>
                  <div>
                    <span className="text-[11px] text-[#5F6E69] block">Unidade</span>
                    <span className="font-semibold text-xs">
                      {selectedAppointmentForDetail.clinic_location}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#5F6E69] block">Exame</span>
                    <span className="font-semibold text-xs">
                      {selectedAppointmentForDetail.exam_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#5F6E69] block">Médico Solicitante</span>
                    <span className="text-xs">
                      {selectedAppointmentForDetail.referring_physician || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#5F6E69] block">Accession Number</span>
                    <span className="font-mono text-xs font-bold">
                      {selectedAppointmentForDetail.accession_number}
                    </span>
                  </div>
                </div>

                {/* Patient details */}
                {selectedAppointmentForDetail.expand?.patient_id && (
                  <div className="p-3 bg-white rounded-xl border border-[#E5E9E7] text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1F2A27] block">Dados do Paciente:</span>
                      <Link
                        to={`/pacientes/${selectedAppointmentForDetail.expand.patient_id.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#0C6B58] hover:underline font-semibold flex items-center gap-1"
                        title="Abrir ficha do paciente"
                      >
                        <User className="w-3 h-3" />
                        Ficha do paciente ↗
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[#5F6E69]">
                      <div>
                        <span>CPF: </span>
                        <strong className="text-[#1F2A27]">
                          {maskCPF(selectedAppointmentForDetail.expand.patient_id.document)}
                        </strong>
                      </div>
                      <div>
                        <span>Cartão SUS: </span>
                        <strong className="text-[#1F2A27]">
                          {selectedAppointmentForDetail.expand.patient_id.sus_card ||
                            'Não informado'}
                        </strong>
                      </div>
                      <div>
                        <span>Telefone: </span>
                        <strong className="text-[#1F2A27]">
                          {maskPhone(selectedAppointmentForDetail.expand.patient_id.phone || '') ||
                            '—'}
                        </strong>
                      </div>
                      <div>
                        <span>Endereço: </span>
                        <strong
                          className="text-[#1F2A27] truncate block"
                          title={selectedAppointmentForDetail.expand.patient_id.address}
                        >
                          {selectedAppointmentForDetail.expand.patient_id.address || '—'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Request Photos (Xerox / fotos do pedido médico) */}
                <div className="space-y-2 p-3 bg-white rounded-xl border border-[#E5E9E7]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1F2A27] flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#0C6B58]" />
                      Fotos da Solicitação Médica / Encaminhamento
                    </span>
                    <span className="text-[11px] text-[#5F6E69]">
                      {Array.isArray(selectedAppointmentForDetail.request_images)
                        ? selectedAppointmentForDetail.request_images.length
                        : selectedAppointmentForDetail.request_images
                          ? 1
                          : 0}{' '}
                      anexo(s)
                    </span>
                  </div>

                  {(() => {
                    const imgs = Array.isArray(selectedAppointmentForDetail.request_images)
                      ? selectedAppointmentForDetail.request_images
                      : selectedAppointmentForDetail.request_images
                        ? [selectedAppointmentForDetail.request_images]
                        : []

                    if (imgs.length === 0) {
                      return (
                        <p className="text-xs text-[#8A9691] py-3 text-center bg-[#FAFBFB] rounded-lg border border-dashed border-[#E5E9E7]">
                          Nenhuma foto ou xerox da solicitação anexada a este agendamento.
                        </p>
                      )
                    }

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                        {imgs.map((fn, idx) => {
                          const url = appointmentsService.getRequestImageUrl(
                            selectedAppointmentForDetail,
                            fn,
                          )
                          return (
                            <div
                              key={idx}
                              className="group relative border rounded-xl overflow-hidden bg-slate-50 aspect-4/3 flex items-center justify-center shadow-xs hover:border-[#0C6B58] transition"
                            >
                              <img
                                src={url}
                                alt={`Solicitação médica ${idx + 1}`}
                                className="w-full h-full object-contain cursor-pointer"
                                onClick={() => setPreviewImageModalUrl(url)}
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white flex items-center justify-between opacity-0 group-hover:opacity-100 transition">
                                <span className="text-[10px] font-medium">Foto #{idx + 1}</span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPreviewImageModalUrl(url)}
                                  className="h-6 px-2 text-[10px] text-white hover:bg-white/20"
                                >
                                  Ampliar
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>

                {selectedAppointmentForDetail.notes && (
                  <div className="p-3 bg-[#FAFBFB] rounded-lg border border-[#E5E9E7] text-xs">
                    <span className="font-semibold text-[#1F2A27] block mb-0.5">Observações:</span>
                    <p className="text-[#5F6E69]">{selectedAppointmentForDetail.notes}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedAppointmentForDetail(null)}
                >
                  Fechar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const appt = selectedAppointmentForDetail
                    setSelectedAppointmentForDetail(null)
                    handleStartReport(appt)
                  }}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                  Iniciar / Abrir Laudo
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL AMPLIAÇÃO DE IMAGEM */}
      <Dialog
        open={Boolean(previewImageModalUrl)}
        onOpenChange={(open) => !open && setPreviewImageModalUrl(null)}
      >
        <DialogContent className="max-w-4xl max-h-[92vh] p-2 flex flex-col items-center justify-center bg-black/95 border-none">
          {previewImageModalUrl && (
            <div className="relative w-full h-full flex flex-col items-center">
              <img
                src={previewImageModalUrl}
                alt="Solicitação médica ampliada"
                className="max-h-[82vh] max-w-full object-contain rounded-lg"
              />
              <div className="pt-2 text-center text-xs text-white/80">
                <a
                  href={previewImageModalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-white"
                >
                  Abrir imagem em nova aba
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG CONFIRMAR EXCLUSÃO */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o horário da sua agenda e invalidará a entrada correspondente na
              Worklist DICOM. O histórico de laudos já concluídos não é apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAppointment}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ALERT DIALOG CONFIRMAR SUBSTITUIÇÃO DE PREPARO CLÍNICO */}
      <AlertDialog open={prepConfirmDialogOpen} onOpenChange={setPrepConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir texto de preparo do exame?</AlertDialogTitle>
            <AlertDialogDescription>
              O campo de Observações/Preparo já possui orientações digitadas. Deseja substituir pelo
              preparo padrão de <strong>&quot;{pendingPrepReplacement?.newExam}&quot;</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-[#F7F9F8] p-3 rounded-lg border border-[#E5E9E7] text-xs space-y-1">
            <span className="font-semibold text-[#1F2A27]">Novo preparo sugerido:</span>
            <p className="text-[#5F6E69] leading-relaxed">{pendingPrepReplacement?.newText}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingPrepReplacement(null)
                setPrepConfirmDialogOpen(false)
              }}
            >
              Manter meu texto atual
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingPrepReplacement) {
                  setFormNotes(pendingPrepReplacement.newText)
                }
                setPendingPrepReplacement(null)
                setPrepConfirmDialogOpen(false)
              }}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
            >
              Substituir pelo novo preparo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL DE REVISÃO DOS DADOS EXTRAÍDOS PELA IA (VISÃO) */}
      <Dialog open={aiReviewDialogOpen} onOpenChange={setAiReviewDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#1F2A27]">
                  Revisão da Solicitação Médica (Extração IA)
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5F6E69]">
                  Revise atentamente os dados extraídos da foto da guia antes de confirmar o
                  preenchimento.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {aiErrorMsg ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Reconhecimento não concluído ou IA indisponível</span>
              </div>
              <p className="text-amber-800 leading-relaxed">{aiErrorMsg}</p>
              <p className="text-[11px] text-[#5F6E69] pt-1">
                Você pode preencher os campos do formulário manualmente. A foto selecionada
                continuará anexada ao agendamento.
              </p>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAiReviewDialogOpen(false)}
                >
                  Continuar Preenchimento Manual
                </Button>
              </DialogFooter>
            </div>
          ) : extractedData ? (
            <div className="space-y-4 pt-1">
              <div className="p-3 bg-[#E8F3F0]/60 rounded-xl border border-[#0C6B58]/20 text-xs text-[#0C6B58] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Campos identificados pelo modelo de visão. Você pode aprovar para preencher o
                  formulário ou editar qualquer dado diretamente.
                </span>
              </div>

              <div className="space-y-3 bg-[#FAFBFB] p-3.5 rounded-xl border border-[#E5E9E7] text-xs">
                {/* Paciente */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#5F6E69] block">
                    Nome do Paciente
                  </span>
                  {extractedData.patient_name ? (
                    <span className="font-bold text-sm text-[#1F2A27]">
                      {extractedData.patient_name}
                    </span>
                  ) : (
                    <span className="text-amber-700 italic">
                      Campo não identificado — preencher manualmente
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#5F6E69] block">
                      CPF
                    </span>
                    {extractedData.cpf ? (
                      <span className="font-semibold text-[#1F2A27]">
                        {maskCPF(extractedData.cpf)}
                      </span>
                    ) : (
                      <span className="text-amber-700 text-[11px] italic">Não identificado</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#5F6E69] block">
                      Cartão SUS (CNS)
                    </span>
                    {extractedData.sus_card ? (
                      <span className="font-semibold text-[#1F2A27]">{extractedData.sus_card}</span>
                    ) : (
                      <span className="text-amber-700 text-[11px] italic">Não identificado</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#5F6E69] block">
                      Data de Nascimento
                    </span>
                    {extractedData.birth_date ? (
                      <span className="font-semibold text-[#1F2A27]">
                        {extractedData.birth_date}
                      </span>
                    ) : (
                      <span className="text-amber-700 text-[11px] italic">Não identificada</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#5F6E69] block">
                      Telefone
                    </span>
                    {extractedData.phone ? (
                      <span className="font-semibold text-[#1F2A27]">{extractedData.phone}</span>
                    ) : (
                      <span className="text-gray-400 text-[11px] italic">Não consta</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[#5F6E69] block">
                    Endereço
                  </span>
                  {extractedData.address ? (
                    <span className="font-medium text-[#1F2A27]">{extractedData.address}</span>
                  ) : (
                    <span className="text-amber-700 text-[11px] italic">
                      Não identificado — preencher manualmente se unidade for HM Samuel
                    </span>
                  )}
                </div>

                <div className="border-t border-[#E5E9E7] pt-2 space-y-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#5F6E69] block">
                      Exame Solicitado
                    </span>
                    {extractedData.requested_exam ? (
                      <span className="font-bold text-[#0C6B58]">
                        {extractedData.requested_exam}
                      </span>
                    ) : (
                      <span className="text-amber-700 text-[11px] italic">
                        Não identificado claramente
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#5F6E69] block">
                      Médico Solicitante
                    </span>
                    {extractedData.referring_physician ? (
                      <span className="font-medium text-[#1F2A27]">
                        {extractedData.referring_physician}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[11px] italic">Não identificado</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#5F6E69] block">
                      Indicação Clínica / Hipótese
                    </span>
                    {extractedData.clinical_indication ? (
                      <p className="font-normal text-[#1F2A27] leading-relaxed bg-white p-2 rounded border border-[#E5E9E7]">
                        {extractedData.clinical_indication}
                      </p>
                    ) : (
                      <span className="text-gray-400 text-[11px] italic">
                        Nenhuma indicação específica transcrita
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAiReviewDialogOpen(false)}
                >
                  Descartar Proposta
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    // Preencher o formulário explicitamente
                    if (extractedData.patient_name) {
                      setPatientMode('new')
                      setFormNewPatientName(extractedData.patient_name)
                    }
                    if (extractedData.cpf) {
                      setFormNewPatientCpf(maskCPF(extractedData.cpf))
                    }
                    if (extractedData.sus_card) {
                      setFormNewPatientSusCard(extractedData.sus_card)
                    }
                    if (extractedData.phone) {
                      setFormNewPatientPhone(maskPhone(extractedData.phone))
                    }
                    if (extractedData.address) {
                      setFormNewPatientAddress(extractedData.address)
                    }
                    if (extractedData.birth_date) {
                      // Se formato DD/MM/AAAA, converter para YYYY-MM-DD
                      if (extractedData.birth_date.includes('/')) {
                        const parts = extractedData.birth_date.split('/')
                        if (parts.length === 3) {
                          setFormNewPatientBirthDate(`${parts[2]}-${parts[1]}-${parts[0]}`)
                        }
                      } else {
                        setFormNewPatientBirthDate(extractedData.birth_date)
                      }
                    }

                    if (extractedData.referring_physician) {
                      setFormReferring(extractedData.referring_physician)
                    }

                    // Tentar casar requested_exam com a lista conhecida
                    if (extractedData.requested_exam) {
                      const reqLower = extractedData.requested_exam.toLowerCase()
                      const matched = COMMON_EXAM_TYPES.find((t) =>
                        reqLower.includes(t.toLowerCase().replace('ultrassonografia', '').trim()),
                      )
                      if (matched) {
                        handleExamTypeChange(matched)
                      } else {
                        setFormExamType('Outro (personalizado)')
                        setCustomExamType(extractedData.requested_exam)
                        handleExamTypeChange('Outro (personalizado)')
                      }
                    }

                    // Se veio indicação clínica e o campo de notas está vazio ou é só o preparo, acrescentar
                    if (extractedData.clinical_indication) {
                      setFormNotes((prev) => {
                        if (!prev.trim()) {
                          return `Indicação clínica: ${extractedData.clinical_indication}`
                        }
                        return `${prev}\n\nIndicação clínica: ${extractedData.clinical_indication}`
                      })
                    }

                    toast({
                      title: 'Campos preenchidos',
                      description:
                        'Os dados da requisição foram transferidos para o formulário. Você pode editá-los livremente antes de salvar.',
                    })
                    setAiReviewDialogOpen(false)
                  }}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Confirmar e Preencher Formulário
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* COMPROVANTE DE AGENDAMENTO IMPRIMÍVEL DO PACIENTE */}
      <AppointmentVoucherModal
        open={voucherModalOpen}
        onOpenChange={setVoucherModalOpen}
        appointment={voucherAppointment}
        patient={
          voucherAppointment?.expand?.patient_id ||
          patients.find((p) => p.id === voucherAppointment?.patient_id) ||
          null
        }
      />
    </div>
  )
}
