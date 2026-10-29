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

/**
 * Endpoint de Análise de Solicitação Médica por Foto / Imagem (IA Gateway com Visão)
 * POST /backend/v1/ai/analyze-request-image
 * Autenticação: Token de sessão de usuário logado ($apis.requireAuth())
 * Aceita:
 *   - JSON com { imageBase64: "data:image/jpeg;base64,...", mimeType: "image/jpeg" }
 *   - OU multipart/form-data com campo "file" ou "image"
 * Retorna dados estruturados em JSON:
 *   patient_name, birth_date, cpf, sus_card, address, referring_physician,
 *   requesting_unit, requested_exam, request_date, clinical_indication, notes
 */
routerAdd(
  'POST',
  '/backend/v1/ai/analyze-request-image',
  (c) => {
    // 1. Identificar autenticação do usuário logado
    const authRecord = c.authRecord
    if (!authRecord) {
      return c.json(401, { error: 'Autenticação necessária.' })
    }

    // 2. Extrair dados da imagem (JSON com dataUrl ou multipart)
    let base64Data = ''
    let mimeType = 'image/jpeg'

    try {
      const body = c.requestInfo().body || {}
      if (body.imageBase64) {
        let raw = String(body.imageBase64).trim()
        if (raw.startsWith('data:')) {
          const parts = raw.split(',')
          const meta = parts[0]
          raw = parts[1] || ''
          const m = meta.match(/data:([^;]+);base64/)
          if (m && m[1]) mimeType = m[1]
        }
        base64Data = raw
      } else if (body.image) {
        base64Data = String(body.image).trim()
      }
    } catch (_) {}

    // Fallback para multipart file upload se base64 não veio no body
    if (!base64Data) {
      try {
        const files = c.findUploadedFiles('file') || c.findUploadedFiles('image')
        if (files && files.length > 0) {
          const f = files[0]
          // Em goja PocketBase, se findUploadedFiles não disponibiliza bytes base64 diretos,
          // preferimos envio em base64 pelo cliente
          return c.json(400, {
            error:
              'Envie a imagem preferencialmente codificada em base64 no formato { imageBase64: "data:image/jpeg;base64,..." }',
          })
        }
      } catch (_) {}
    }

    if (!base64Data || base64Data.length < 50) {
      return c.json(400, {
        error: 'Nenhuma imagem válida recebida para análise. Envie a foto da solicitação médica.',
      })
    }

    // 3. Montar a requisição para o Gateway de IA com Visão
    // Verifica credenciais do gateway
    const gatewayUrl =
      $os.getenv('SKIP_AI_GATEWAY_URL') ||
      $os.getenv('SKIP_AI_CHAT_URL') ||
      'https://ai-gateway.goskip.dev'
    const apiKey = $os.getenv('SKIP_AI_GATEWAY_API_KEY') || $os.getenv('SKIP_AI_CHAT_API_KEY') || ''

    if (!apiKey) {
      return c.json(503, {
        error:
          'Gateway de IA não provisionado ou indisponível nesta instância. O preenchimento manual continua funcionando normalmente.',
      })
    }

    const systemPrompt =
      'Você é um assistente médico especialista em extração e leitura de guias de encaminhamento, pedidos médicos de exames e requisições do SUS (Sistema Único de Saúde, formulários do PEC/e-SUS, SISREG, prontuários impressos e receitas manuscritas). ' +
      'Sua missão é extrair estritamente as informações presentes na foto ou xerox da guia médica com precisão clínica absoluta.\n' +
      'REGRAS ESTRITAS:\n' +
      '1. NUNCA INVENTE OU SUPONHA DADOS. Se um campo não estiver legível, rasurado ou ausente, retorne string vazia ("").\n' +
      '2. Nome do paciente deve ser mantido em maiúsculas ou formato nominal padrão.\n' +
      '3. CPF deve ser mantido se legível (formatado ou apenas dígitos).\n' +
      '4. Cartão do SUS (CNS): exatamente os 15 dígitos se legíveis.\n' +
      '5. Data de nascimento e data da solicitação no formato DD/MM/AAAA ou AAAA-MM-DD.\n' +
      '6. Sexo: "Feminino", "Masculino" ou "".\n' +
      '7. Exame solicitado: nome exato do exame pedido (ex.: Ultrassonografia de Abdome Total, US Pélvica Transvaginal, Ultrassom de Rins e Vias Urinárias, etc.).\n' +
      '8. Indicação clínica / justificativa / hipótese diagnóstica: transcreva o motivo do exame conforme escrito pelo médico solicitante.\n' +
      '9. Médico solicitante: nome e CRM se constar no carimbo ou assinatura.\n' +
      '10. Responda ESTRITAMENTE em formato JSON puro, sem crases de código (markdown), no seguinte formato:\n' +
      '{\n' +
      '  "patient_name": "",\n' +
      '  "birth_date": "",\n' +
      '  "sex": "",\n' +
      '  "cpf": "",\n' +
      '  "sus_card": "",\n' +
      '  "phone": "",\n' +
      '  "address": "",\n' +
      '  "referring_physician": "",\n' +
      '  "requesting_unit": "",\n' +
      '  "requested_exam": "",\n' +
      '  "request_date": "",\n' +
      '  "clinical_indication": "",\n' +
      '  "confidence_notes": ""\n' +
      '}'

    const userImageUrl = base64Data.startsWith('data:')
      ? base64Data
      : `data:${mimeType};base64,${base64Data}`

    const payload = {
      model: 'fast',
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extraia os dados desta solicitação/requisição médica para o agendamento de exame. Retorne apenas o JSON.',
            },
            {
              type: 'image_url',
              image_url: {
                url: userImageUrl,
              },
            },
          ],
        },
      ],
    }

    try {
      // Chamada HTTP ao gateway de IA Skip
      let targetEndpoint = gatewayUrl
      if (!targetEndpoint.endsWith('/chat/completions')) {
        targetEndpoint = targetEndpoint.replace(/\/+$/, '') + '/chat/completions'
      }

      const res = $http.send({
        url: targetEndpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        timeout: 45, // 45 segundos para processamento de visão
      })

      if (res.statusCode >= 400) {
        console.log('[AI Vision Request Error Status]', res.statusCode, res.raw)
        return c.json(502, {
          error:
            'O serviço de reconhecimento visual não pôde processar a foto no momento (' +
            res.statusCode +
            '). Prossiga com o preenchimento manual.',
        })
      }

      const data = res.json || JSON.parse(res.raw)
      const assistantMessage =
        data.choices && data.choices[0] && data.choices[0].message
          ? data.choices[0].message.content
          : ''

      if (!assistantMessage) {
        return c.json(502, {
          error: 'A IA não retornou resposta estruturada para esta imagem.',
        })
      }

      // Parse JSON do resultado (limpando eventuais blocos ```json ... ```)
      let cleaned = assistantMessage.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```json/i, '').replace(/^```/, '')
        const lastIndex = cleaned.lastIndexOf('```')
        if (lastIndex !== -1) {
          cleaned = cleaned.substring(0, lastIndex)
        }
        cleaned = cleaned.trim()
      }

      let parsedData = null
      try {
        parsedData = JSON.parse(cleaned)
      } catch (parseErr) {
        console.log('[AI JSON parse error]', parseErr, 'Raw was:', assistantMessage)
        // Fallback: tentar regex para achar o bloco { ... }
        const start = assistantMessage.indexOf('{')
        const end = assistantMessage.lastIndexOf('}')
        if (start !== -1 && end > start) {
          try {
            parsedData = JSON.parse(assistantMessage.substring(start, end + 1))
          } catch (_) {}
        }
      }

      if (!parsedData || typeof parsedData !== 'object') {
        return c.json(200, {
          success: false,
          error:
            'A imagem foi analisada, mas não foi possível estruturar os campos com clareza. Preencha manualmente.',
          raw_text: assistantMessage,
        })
      }

      return c.json(200, {
        success: true,
        extracted: {
          patient_name: String(parsedData.patient_name || '').trim(),
          birth_date: String(parsedData.birth_date || '').trim(),
          sex: String(parsedData.sex || '').trim(),
          cpf: String(parsedData.cpf || '').trim(),
          sus_card: String(parsedData.sus_card || '').trim(),
          phone: String(parsedData.phone || '').trim(),
          address: String(parsedData.address || '').trim(),
          referring_physician: String(parsedData.referring_physician || '').trim(),
          requesting_unit: String(parsedData.requesting_unit || '').trim(),
          requested_exam: String(parsedData.requested_exam || '').trim(),
          request_date: String(parsedData.request_date || '').trim(),
          clinical_indication: String(parsedData.clinical_indication || '').trim(),
          confidence_notes: String(parsedData.confidence_notes || '').trim(),
        },
      })
    } catch (err) {
      console.log('[AI Vision Exception]', err)
      return c.json(500, {
        error:
          'Falha na comunicação com o serviço de visão computacional: ' +
          (err.message || 'Erro desconhecido'),
      })
    }
  },
  $apis.requireAuth(),
)
