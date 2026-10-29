/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase hooks for LW Laudos / Sistema Médico Multiperfil
 *
 * 1. Auto-generate AccessionNumber on appointment creation if not provided
 *    Format: LW-YYYYMMDD-XXXX (unique per exam/appointment)
 * 2. Populate structured DICOM fields if omitted
 * 3. Protected endpoint for DICOM Modality Worklist (MWL) bridge agent
 *    Route: GET /backend/v1/mwl/appointments
 *    Authentication: Authorization header "Bearer <mwl_token>" or query parameter "?token=<mwl_token>"
 *    Query params:
 *      - since: ISO date string for incremental polling
 *      - clinic: filter by clinic_location name (e.g. "Gastroimagem")
 *      - date: filter by civil date (YYYY-MM-DD)
 *
 * NOTE: All helper functions are declared INLINE inside hook callbacks to comply with PocketBase JSVM scoping.
 */

// On Appointment Create Hook
onRecordCreate((e) => {
  // Inline helper: random suffix
  const getSuffix = (len) => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    let res = ''
    for (let i = 0; i < len; i++) {
      const idx = Math.floor(Math.random() * chars.length)
      res += chars.charAt(idx)
    }
    return res
  }

  // Inline helper: format patient name to DICOM PN format
  const formatPN = (rawName) => {
    if (!rawName) return ''
    const trimmed = rawName.trim().toUpperCase()
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0]
    const lastName = parts[parts.length - 1]
    const firstAndMiddle = parts.slice(0, parts.length - 1).join(' ')
    return `${lastName}^${firstAndMiddle}`
  }

  const record = e.record

  // 1. Ensure Accession Number
  let acc = record.getString('accession_number')
  if (!acc || acc.trim() === '') {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const datePrefix = `${y}${m}${d}`

    let uniqueAcc = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `LW-${datePrefix}-${getSuffix(4)}`
      try {
        const existing = e.app.findFirstRecordByData('appointments', 'accession_number', candidate)
        if (!existing) {
          uniqueAcc = candidate
          break
        }
      } catch (_) {
        uniqueAcc = candidate
        break
      }
    }
    if (!uniqueAcc) {
      uniqueAcc = `LW-${datePrefix}-${Date.now().toString(36).toUpperCase()}`
    }
    record.set('accession_number', uniqueAcc)
  }

  // 2. Default modality to 'US' if missing
  if (!record.getString('modality')) {
    record.set('modality', 'US')
  }

  // 3. Set study_description from exam_type if missing
  if (!record.getString('study_description')) {
    record.set('study_description', record.getString('exam_type') || 'Ultrassonografia')
  }

  // 4. Populate DICOM fields from patient record if not already set
  try {
    const patientId = record.getString('patient_id')
    if (patientId) {
      const patient = e.app.findRecordById('patients', patientId)
      if (patient) {
        if (!record.getString('patient_name_dicom')) {
          record.set('patient_name_dicom', formatPN(patient.getString('name')))
        }
        if (!record.getString('patient_id_dicom')) {
          const doc = patient.getString('document') || ''
          const cleanDoc = doc.replace(/\D/g, '')
          record.set('patient_id_dicom', cleanDoc || patient.id)
        }
        if (!record.getString('patient_birth_date')) {
          const bdate = patient.getString('birth_date')
          if (bdate) {
            const bparts = bdate.slice(0, 10).replace(/-/g, '')
            record.set('patient_birth_date', bparts)
          }
        }
        if (!record.getString('patient_sex')) {
          const sex = patient.getString('sex')
          let dicomSex = 'O'
          if (sex === 'Masculino') dicomSex = 'M'
          else if (sex === 'Feminino') dicomSex = 'F'
          record.set('patient_sex', dicomSex)
        }
      }
    }
  } catch (err) {
    console.log('[appointments hook error]', err)
  }

  e.next()
}, 'appointments')

// Custom REST API Endpoint: GET /backend/v1/mwl/appointments
routerAdd('GET', '/backend/v1/mwl/appointments', (c) => {
  // Inline helper: format patient name to DICOM PN format
  const formatPN = (rawName) => {
    if (!rawName) return ''
    const trimmed = rawName.trim().toUpperCase()
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0]
    const lastName = parts[parts.length - 1]
    const firstAndMiddle = parts.slice(0, parts.length - 1).join(' ')
    return `${lastName}^${firstAndMiddle}`
  }

  // Extract token from header or query param
  let token = ''
  const authHeader = c.request.header.get('Authorization') || ''
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim()
  }
  if (!token) {
    token = c.request.url.query().get('token') || ''
  }

  if (!token || token.length < 16) {
    return c.json(401, {
      error:
        'Token MWL inválido ou ausente. Forneça Authorization: Bearer <mwl_token> ou ?token=<token>',
    })
  }

  // Find user by mwl_token
  let doctorRecord = null
  try {
    doctorRecord = c.app.findFirstRecordByData('users', 'mwl_token', token)
  } catch (_) {
    return c.json(403, {
      error: 'Token MWL não reconhecido ou revogado.',
    })
  }

  if (!doctorRecord || !doctorRecord.getBool('active')) {
    return c.json(403, {
      error: 'Conta médica inativa ou não autorizada.',
    })
  }

  const doctorId = doctorRecord.id
  const sinceParam = c.request.url.query().get('since') || ''
  const clinicParam = c.request.url.query().get('clinic') || ''
  const dateParam = c.request.url.query().get('date') || ''
  const statusParam = c.request.url.query().get('status') || ''

  // Build filter condition strictly scoped to this doctor's owner_id
  let filter = `owner_id = '${doctorId}'`

  if (sinceParam) {
    filter += ` && updated >= '${sinceParam}'`
  }
  if (clinicParam) {
    filter += ` && clinic_location = '${clinicParam.replace(/'/g, '')}'`
  }
  if (dateParam) {
    filter += ` && start_time >= '${dateParam} 00:00:00.000Z' && start_time <= '${dateParam} 23:59:59.999Z'`
  }
  if (statusParam) {
    filter += ` && status = '${statusParam.replace(/'/g, '')}'`
  } else {
    // By default, exclude canceled appointments from worklist
    filter += ` && status != 'Cancelado'`
  }

  let appointments = []
  try {
    appointments = c.app.findRecordsByFilter('appointments', filter, 'start_time', 100, 0)
  } catch (err) {
    console.log('[mwl error]', err)
    return c.json(500, { error: 'Falha ao buscar agendamentos.' })
  }

  // Format into DICOM MWL JSON structure compatible with Orthanc Worklists plugin
  const items = appointments.map((appt) => {
    let patientObj = null
    try {
      patientObj = c.app.findRecordById('patients', appt.getString('patient_id'))
    } catch (_) {}

    const startTimeStr = appt.getString('start_time')
    let scheduledDate = ''
    let scheduledTime = ''
    if (startTimeStr) {
      const dt = new Date(startTimeStr)
      if (!isNaN(dt.getTime())) {
        const y = dt.getUTCFullYear()
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
        const d = String(dt.getUTCDate()).padStart(2, '0')
        const hh = String(dt.getUTCHours()).padStart(2, '0')
        const mm = String(dt.getUTCMinutes()).padStart(2, '0')
        const ss = String(dt.getUTCSeconds()).padStart(2, '0')
        scheduledDate = `${y}${m}${d}`
        scheduledTime = `${hh}${mm}${ss}`
      }
    }

    return {
      id: appt.id,
      accessionNumber: appt.getString('accession_number'),
      status: appt.getString('status'),
      clinicLocation: appt.getString('clinic_location'),
      examType: appt.getString('exam_type'),
      durationMinutes: appt.getInt('duration_minutes') || 30,
      notes: appt.getString('notes'),
      startTimeIso: startTimeStr,
      created: appt.getString('created'),
      updated: appt.getString('updated'),

      // DICOM attributes (standard tags)
      dicom: {
        // (0010,0010) Patient's Name
        PatientName:
          appt.getString('patient_name_dicom') ||
          (patientObj ? formatPN(patientObj.getString('name')) : 'DESCONHECIDO^PACIENTE'),
        // (0010,0020) Patient ID
        PatientID:
          appt.getString('patient_id_dicom') ||
          (patientObj
            ? patientObj.getString('document').replace(/\D/g, '') || patientObj.id
            : appt.id),
        // (0010,0030) Patient's Birth Date (YYYYMMDD)
        PatientBirthDate: appt.getString('patient_birth_date') || '',
        // (0010,0040) Patient's Sex (M, F, O)
        PatientSex: appt.getString('patient_sex') || 'O',

        // (0008,0050) Accession Number
        AccessionNumber: appt.getString('accession_number'),
        // (0008,1030) Study Description
        StudyDescription: appt.getString('study_description') || appt.getString('exam_type'),
        // (0008,0060) Modality
        Modality: appt.getString('modality') || 'US',
        // (0008,0090) Referring Physician's Name
        ReferringPhysicianName: appt.getString('referring_physician') || '',

        // (0040,0100) Scheduled Procedure Step Sequence attributes
        ScheduledProcedureStep: {
          ScheduledStationAETitle: appt.getString('scheduled_station_ae') || 'ORTHANC',
          ScheduledProcedureStepStartDate: scheduledDate,
          ScheduledProcedureStepStartTime: scheduledTime,
          Modality: appt.getString('modality') || 'US',
          ScheduledPerformingPhysicianName:
            doctorRecord.getString('professional_name') || doctorRecord.getString('name'),
          ScheduledProcedureStepDescription:
            appt.getString('study_description') || appt.getString('exam_type'),
          ScheduledProcedureStepID: appt.getString('accession_number'),
        },
      },
    }
  })

  return c.json(200, {
    doctor: {
      id: doctorRecord.id,
      name: doctorRecord.getString('name'),
      professional_name: doctorRecord.getString('professional_name'),
      crm: doctorRecord.getString('crm'),
    },
    count: items.length,
    timestamp: new Date().toISOString(),
    items: items,
  })
})
