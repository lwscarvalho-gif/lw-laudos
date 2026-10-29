import pb from '@/lib/pocketbase/client'
import type { Appointment, Patient } from '@/types'
import { formatDicomPatientName } from '@/lib/formatters'

export interface CreateAppointmentInput {
  patient_id: string
  owner_id?: string // doctor assigned
  start_time: string // ISO string
  duration_minutes: number
  exam_type: string
  clinic_location: string
  status?: Appointment['status']
  notes?: string
  referring_physician?: string
  modality?: string
  scheduled_station_ae?: string
  created_by?: string
  created_by_name?: string
  created_by_role?: string
  request_images?: File[]
}

export interface UpdateAppointmentInput {
  patient_id?: string
  owner_id?: string
  start_time?: string
  duration_minutes?: number
  exam_type?: string
  clinic_location?: string
  status?: Appointment['status']
  notes?: string
  referring_physician?: string
  modality?: string
  exam_id?: string
  patient_name_dicom?: string
  patient_id_dicom?: string
  patient_birth_date?: string
  patient_sex?: string
  study_description?: string
  scheduled_station_ae?: string
  updated_by?: string
  updated_by_name?: string
  updated_by_role?: string
  request_images?: File[]
}

// Generate unique accession number prefix LW-YYYYMMDD-XXXX
function generateClientAccession(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `LW-${y}${m}${d}-${suffix}`
}

export const appointmentsService = {
  /**
   * List all appointments belonging to current authenticated user
   */
  async getAll(filter?: string, sort = 'start_time'): Promise<Appointment[]> {
    const user = pb.authStore.model
    const isMultiClinicUser =
      user?.role === 'Secretaria' ||
      user?.role === 'Gestor' ||
      user?.role === 'Contabilidade' ||
      user?.role === 'Administrador' ||
      user?.role === 'Administrador Geral'

    let fullFilter = filter || ''
    if (!isMultiClinicUser && user?.id) {
      const ownerFilter = `owner_id = '${user.id}'`
      fullFilter = filter ? `${ownerFilter} && (${filter})` : ownerFilter
    }

    const records = await pb.collection('appointments').getFullList<Appointment>({
      filter: fullFilter || undefined,
      sort,
      expand: 'patient_id,created_by,owner_id',
    })
    return records
  },

  /**
   * List appointments for a specific date range (startIso to endIso)
   */
  async getByDateRange(startIso: string, endIso: string, clinic?: string): Promise<Appointment[]> {
    let filter = `start_time >= '${startIso}' && start_time <= '${endIso}'`
    if (clinic && clinic !== 'Todas') {
      filter += ` && clinic_location = '${clinic.replace(/'/g, '')}'`
    }
    return this.getAll(filter, 'start_time')
  },

  /**
   * Get single appointment by ID
   */
  async getById(id: string): Promise<Appointment> {
    return pb.collection('appointments').getOne<Appointment>(id, {
      expand: 'patient_id,created_by,owner_id,updated_by',
    })
  },

  /**
   * Helper to get full URL of an uploaded request image file
   */
  getRequestImageUrl(appointment: Appointment, filename: string): string {
    return pb.files.getURL(appointment, filename)
  },

  /**
   * Create an appointment with automatic AccessionNumber and DICOM tags
   */
  async create(data: CreateAppointmentInput, patientObj?: Patient): Promise<Appointment> {
    const currentUser = pb.authStore.model
    if (!currentUser?.id) throw new Error('Usuário não autenticado.')

    // If an owner_id (assigned doctor) was provided use it; otherwise default to currentUser
    const ownerId = data.owner_id || currentUser.id

    // Prepare DICOM fields from patient data
    let patientNameDicom = ''
    let patientIdDicom = ''
    let patientBirthDate = ''
    let patientSex = 'O'

    if (patientObj) {
      patientNameDicom = formatDicomPatientName(patientObj.name)
      patientIdDicom = patientObj.document ? patientObj.document.replace(/\D/g, '') : patientObj.id
      if (patientObj.birth_date) {
        patientBirthDate = patientObj.birth_date.slice(0, 10).replace(/-/g, '')
      }
      if (patientObj.sex === 'Masculino') patientSex = 'M'
      else if (patientObj.sex === 'Feminino') patientSex = 'F'
    }

    const accessionNumber = generateClientAccession()

    const creatorName =
      (currentUser as any).professional_name || currentUser.name || currentUser.email || 'Usuário'
    const creatorRole = currentUser.role || 'Médico'

    const payload: any = {
      owner_id: ownerId,
      patient_id: data.patient_id,
      start_time: data.start_time,
      duration_minutes: data.duration_minutes || 30,
      exam_type: data.exam_type || 'Ultrassonografia Abdome Total',
      clinic_location: data.clinic_location,
      status: data.status || 'Agendado',
      notes: data.notes || '',
      referring_physician: data.referring_physician || '',
      accession_number: accessionNumber,
      modality: data.modality || 'US',
      study_description: data.exam_type || 'Ultrassonografia Abdome Total',
      scheduled_station_ae: data.scheduled_station_ae || 'ORTHANC',
      patient_name_dicom: patientNameDicom,
      patient_id_dicom: patientIdDicom,
      patient_birth_date: patientBirthDate,
      patient_sex: patientSex,
      created_by: currentUser.id,
      created_by_name: creatorName,
      created_by_role: creatorRole,
    }

    if (data.request_images && data.request_images.length > 0) {
      const formData = new FormData()
      for (const [k, v] of Object.entries(payload)) {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      }
      data.request_images.forEach((file) => {
        formData.append('request_images', file)
      })
      return pb.collection('appointments').create<Appointment>(formData, {
        expand: 'patient_id,created_by,owner_id',
      })
    }

    const record = await pb.collection('appointments').create<Appointment>(payload, {
      expand: 'patient_id,created_by,owner_id',
    })

    return record
  },

  /**
   * Update an existing appointment
   */
  async update(id: string, data: UpdateAppointmentInput): Promise<Appointment> {
    const currentUser = pb.authStore.model
    const updaterName = currentUser
      ? (currentUser as any).professional_name || currentUser.name || currentUser.email || 'Usuário'
      : ''
    const updaterRole = currentUser?.role || ''

    const payload: any = {
      ...data,
      updated_by: currentUser?.id,
      updated_by_name: updaterName,
      updated_by_role: updaterRole,
    }

    if (data.request_images && data.request_images.length > 0) {
      const formData = new FormData()
      for (const [k, v] of Object.entries(payload)) {
        if (k !== 'request_images' && v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      }
      data.request_images.forEach((file) => {
        formData.append('request_images', file)
      })
      return pb.collection('appointments').update<Appointment>(id, formData, {
        expand: 'patient_id,created_by,owner_id,updated_by',
      })
    }

    delete payload.request_images
    const updated = await pb.collection('appointments').update<Appointment>(id, payload, {
      expand: 'patient_id,created_by,owner_id,updated_by',
    })
    return updated
  },

  /**
   * Update appointment status (Agendado, Confirmado, Em atendimento, Realizado, Cancelado)
   */
  async updateStatus(id: string, status: Appointment['status']): Promise<Appointment> {
    return this.update(id, { status })
  },

  /**
   * Delete an appointment
   */
  async delete(id: string): Promise<boolean> {
    return pb.collection('appointments').delete(id)
  },

  /**
   * Link an appointment to an exam
   */
  async linkExam(appointmentId: string, examId: string): Promise<Appointment> {
    return this.update(appointmentId, { exam_id: examId })
  },

  /**
   * Find appointment by linked exam_id
   */
  async getByExamId(examId: string): Promise<Appointment | null> {
    try {
      const list = await pb.collection('appointments').getList<Appointment>(1, 1, {
        filter: `exam_id = '${examId}'`,
        expand: 'patient_id',
      })
      return list.items[0] || null
    } catch {
      return null
    }
  },
}
