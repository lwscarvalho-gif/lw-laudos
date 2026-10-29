import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { appointmentsService } from '@/services/appointments'
import { patientsService } from '@/services/patients'
import { examsService } from '@/services/exams'
import type { Appointment, Patient, AppointmentStatus } from '@/types'
import {
  getCuiabaTodayYMD,
  formatCuiabaDate,
  formatCuiabaTime,
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

// Day hour slots from 07:00 to 19:00
const DAY_HOURS = Array.from({ length: 13 }, (_, i) => i + 7)

export default function Agenda() {
  const { user } = useAuth()
  const navigate = useNavigate()
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

  const [formDate, setFormDate] = useState<string>(selectedDate)
  const [formTime, setFormTime] = useState<string>('08:00')
  const [formDuration, setFormDuration] = useState<number>(30)
  const [formExamType, setFormExamType] = useState<string>('Ultrassonografia Abdome Total')
  const [customExamType, setCustomExamType] = useState<string>('')
  const [formClinic, setFormClinic] = useState<string>('')
  const [formStatus, setFormStatus] = useState<AppointmentStatus>('Agendado')
  const [formNotes, setFormNotes] = useState<string>('')
  const [formReferring, setFormReferring] = useState<string>('')
  const [savingAppointment, setSavingAppointment] = useState(false)

  // Delete modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Doctor's configured clinics
  const doctorClinics = useMemo(() => {
    if (!user?.clinics_config) {
      return ['Gastroimagem', 'Clínica Principal']
    }
    if (Array.isArray(user.clinics_config)) {
      return user.clinics_config.length
        ? user.clinics_config
        : ['Gastroimagem', 'Clínica Principal']
    }
    try {
      const parsed = JSON.parse(user.clinics_config)
      if (Array.isArray(parsed) && parsed.length) return parsed
    } catch {
      /* intentionally ignored */
    }
    return ['Gastroimagem', 'Clínica Principal']
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
    setFormDate(dateStr)
    setFormTime(timeStr)
    setFormDuration(30)
    setFormExamType('Ultrassonografia Abdome Total')
    setCustomExamType('')
    setFormClinic(doctorClinics[0] || 'Gastroimagem')
    setFormStatus('Agendado')
    setFormNotes('')
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

    setFormClinic(appt.clinic_location || doctorClinics[0] || 'Gastroimagem')
    setFormStatus(appt.status)
    setFormNotes(appt.notes || '')
    setFormReferring(appt.referring_physician || '')
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

    setSavingAppointment(true)
    try {
      let finalPatientId = formPatientId
      let finalPatientObj: Patient | undefined = patients.find((p) => p.id === formPatientId)

      // Create new patient inline if requested
      if (patientMode === 'new' && !editingAppointment) {
        if (!formNewPatientName.trim() || !formNewPatientCpf.trim()) {
          toast({
            title: 'Dados do paciente incompletos',
            description: 'Nome e CPF são obrigatórios para novo paciente.',
            variant: 'destructive',
          })
          setSavingAppointment(false)
          return
        }

        const newPt = await patientsService.create({
          name: formNewPatientName.trim(),
          document: formNewPatientCpf.trim(),
          phone: formNewPatientPhone.trim(),
          sex: formNewPatientSex,
          birth_date: formNewPatientBirthDate || undefined,
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

      // Convert civil Cuiaba date + time to ISO UTC
      const startIso = combineCuiabaDateTimeToISO(formDate, formTime)

      if (editingAppointment) {
        await appointmentsService.update(editingAppointment.id, {
          patient_id: finalPatientId,
          start_time: startIso,
          duration_minutes: formDuration,
          exam_type: finalExamType,
          clinic_location: formClinic,
          status: formStatus,
          notes: formNotes,
          referring_physician: formReferring,
        })
        toast({
          title: 'Agendamento atualizado',
          description: 'Os dados da consulta foram salvos com sucesso.',
        })
      } else {
        await appointmentsService.create(
          {
            patient_id: finalPatientId,
            start_time: startIso,
            duration_minutes: formDuration,
            exam_type: finalExamType,
            clinic_location: formClinic,
            status: formStatus,
            notes: formNotes,
            referring_physician: formReferring,
          },
          finalPatientObj,
        )
        toast({
          title: 'Agendamento criado',
          description: 'Paciente agendado com identificadores DICOM MWL gerados.',
        })
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

      // Navigate to UltrasoundReportEditor with prefilled exam and appointment
      navigate(
        `/laudos/ultrassom?paciente=${appt.patient_id}&exame=${examId}&agendamento=${appt.id}`,
      )
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
              {DAY_HOURS.map((hour) => {
                const hourStr = `${String(hour).padStart(2, '0')}:00`
                // Find appointments falling in this hour slot
                const slotAppointments = dayAppointments.filter((appt) => {
                  const t = formatCuiabaTime(appt.start_time)
                  const apptHour = parseInt(t.split(':')[0], 10)
                  return apptHour === hour
                })

                return (
                  <div
                    key={hour}
                    className="flex flex-col sm:flex-row sm:items-start min-h-[72px] hover:bg-[#FAFBFB] transition group"
                  >
                    {/* Hour Column */}
                    <div className="w-24 p-3.5 sm:border-r border-[#E5E9E7] shrink-0 flex items-center sm:items-start justify-between sm:justify-start">
                      <span className="font-bold text-xs text-[#1F2A27] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#0C6B58]" />
                        {hourStr}
                      </span>
                      {/* Mobile quick add button */}
                      <button
                        onClick={() => openNewAppointmentModal(selectedDate, hourStr)}
                        className="sm:hidden text-xs text-[#0C6B58] font-medium"
                      >
                        + Agendar
                      </button>
                    </div>

                    {/* Appointment Cards / Empty Slot */}
                    <div className="flex-1 p-2 sm:p-3">
                      {slotAppointments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {slotAppointments.map((appt) => {
                            const patient = appt.expand?.patient_id
                            const timeFormatted = formatCuiabaTime(appt.start_time)

                            return (
                              <div
                                key={appt.id}
                                className={`p-3.5 rounded-lg border transition space-y-2.5 shadow-xs ${
                                  appt.status === 'Em atendimento'
                                    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                                    : appt.status === 'Realizado'
                                      ? 'bg-emerald-50/50 border-emerald-200'
                                      : 'bg-white border-[#E5E9E7] hover:border-[#0C6B58]/40'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-[#1F2A27]">
                                        {patient?.name || 'Paciente sem cadastro'}
                                      </span>
                                      {getStatusBadge(appt.status)}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#5F6E69]">
                                      <span className="font-semibold text-[#0C6B58]">
                                        {timeFormatted} ({appt.duration_minutes || 30} min)
                                      </span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-[#8A9691]" />
                                        {appt.clinic_location}
                                      </span>
                                      <span>•</span>
                                      <span
                                        className="font-mono text-[11px] text-[#8A9691]"
                                        title="Accession Number DICOM MWL"
                                      >
                                        AN: {appt.accession_number}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-xs text-[#1F2A27] bg-[#F7F9F8] p-2 rounded border border-[#E5E9E7]/80 flex items-center justify-between">
                                  <span className="font-medium truncate flex items-center gap-1.5">
                                    <Stethoscope className="w-3.5 h-3.5 text-[#0C6B58] shrink-0" />
                                    {appt.exam_type}
                                  </span>
                                  {appt.referring_physician && (
                                    <span className="text-[11px] text-[#8A9691] truncate ml-2">
                                      Sol.: {appt.referring_physician}
                                    </span>
                                  )}
                                </div>

                                {appt.notes && (
                                  <p className="text-[11px] text-[#5F6E69] italic truncate">
                                    Obs: {appt.notes}
                                  </p>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center justify-between pt-1 border-t border-[#E5E9E7]/60">
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditModal(appt)}
                                      className="h-7 text-xs px-2 text-[#5F6E69] hover:text-[#1F2A27]"
                                      title="Editar agendamento"
                                    >
                                      <Edit className="w-3.5 h-3.5 mr-1" />
                                      Editar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setAppointmentToDelete(appt)
                                        setDeleteConfirmOpen(true)
                                      }}
                                      className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      title="Remover"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>

                                  {/* "Iniciar laudo" primary button */}
                                  <Button
                                    size="sm"
                                    onClick={() => handleStartReport(appt)}
                                    className={`h-7 text-xs font-semibold ${
                                      appt.status === 'Realizado'
                                        ? 'bg-[#E8F3F0] text-[#0C6B58] hover:bg-[#d5ebe5] border border-[#0C6B58]/30'
                                        : 'bg-[#0C6B58] text-white hover:bg-[#0A5949]'
                                    }`}
                                  >
                                    <Play className="w-3 h-3 mr-1 fill-current" />
                                    {appt.status === 'Realizado'
                                      ? 'Ver / Reabrir laudo'
                                      : 'Iniciar laudo'}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div
                          onClick={() => openNewAppointmentModal(selectedDate, hourStr)}
                          className="h-full min-h-[44px] flex items-center justify-between px-3 rounded-md border border-dashed border-transparent hover:border-[#0C6B58]/40 hover:bg-[#E8F3F0]/20 cursor-pointer text-xs text-[#8A9691] transition"
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition">
                            Horário livre — clique para agendar às {hourStr}
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
                            className={`p-2.5 rounded-lg border text-xs space-y-1 cursor-pointer transition hover:shadow-xs ${
                              appt.status === 'Realizado'
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : appt.status === 'Em atendimento'
                                  ? 'bg-amber-50/60 border-amber-300'
                                  : 'bg-[#FAFBFB] border-[#E5E9E7] hover:border-[#0C6B58]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-[#0C6B58]">{timeStr}</span>
                              <span className="text-[9px] px-1 rounded bg-white border border-[#E5E9E7] font-medium">
                                {appt.clinic_location.slice(0, 10)}
                              </span>
                            </div>
                            <span className="font-semibold text-[#1F2A27] block truncate">
                              {patient?.name || 'Paciente'}
                            </span>
                            <span className="text-[11px] text-[#5F6E69] block truncate">
                              {appt.exam_type}
                            </span>
                            <div className="pt-1 flex items-center justify-between">
                              {getStatusBadge(appt.status)}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStartReport(appt)
                                }}
                                className="text-[10px] text-[#0C6B58] font-bold hover:underline"
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
                      <Label className="text-xs">CPF *</Label>
                      <Input
                        value={formNewPatientCpf}
                        onChange={(e) => setFormNewPatientCpf(maskCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        className="text-xs bg-white"
                        required
                      />
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
                <Label className="text-xs font-semibold">Duração (minutos)</Label>
                <Select
                  value={String(formDuration)}
                  onValueChange={(v) => setFormDuration(Number(v))}
                >
                  <SelectTrigger className="text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="20">20 min</SelectItem>
                    <SelectItem value="30">30 min (padrão)</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Exam Type & Clinic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo de Exame *</Label>
                <Select value={formExamType} onValueChange={setFormExamType}>
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
                    onChange={(e) => setCustomExamType(e.target.value)}
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
    </div>
  )
}
