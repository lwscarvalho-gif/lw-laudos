/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Add referring_physician and clinic_location fields to reports collection if not already present
    const reportsCol = app.findCollectionByNameOrId('reports')
    if (!reportsCol.fields.getByName('referring_physician')) {
      reportsCol.fields.add(
        new TextField({
          name: 'referring_physician',
          required: false,
        }),
      )
    }
    if (!reportsCol.fields.getByName('clinic_location')) {
      reportsCol.fields.add(
        new TextField({
          name: 'clinic_location',
          required: false,
        }),
      )
    }
    app.save(reportsCol)

    // 2. Seed Guest User ("Dr(a). Convidado") with isolated demonstration data
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    let guestUser = null

    try {
      guestUser = app.findAuthRecordByEmail('_pb_users_auth_', 'convidado@lwlaudos.local')
    } catch (_) {
      // Guest does not exist yet, create
      guestUser = new Record(usersCol)
      guestUser.setEmail('convidado@lwlaudos.local')
      guestUser.setPassword('Convidado123')
      guestUser.setVerified(true)
      guestUser.set('name', 'Dr. Convidado')
      guestUser.set('professional_name', 'Dr. Convidado')
      guestUser.set('professional_title', 'Médico Ultrassonografista')
      guestUser.set('crm', '9999')
      guestUser.set('crm_uf', 'RO')
      guestUser.set('role', 'Médico')
      guestUser.set('active', true)
      guestUser.set('default_appointment_duration', 30)
      guestUser.set(
        'header',
        'Centro de Diagnóstico Médico — Dr. Convidado | CRM RO 9999\nAtendimento Clínico e Ultrassonografia',
      )

      // SVG sample logos (lightweight data URIs) for guest clinics
      const clinic1Logo =
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40"><rect width="120" height="40" rx="6" fill="%230C6B58"/><circle cx="20" cy="20" r="10" fill="white"/><text x="36" y="24" fill="white" font-family="sans-serif" font-weight="bold" font-size="11">CLINICA 1</text></svg>'
      const clinic2Logo =
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40"><rect width="120" height="40" rx="6" fill="%232563EB"/><rect x="12" y="12" width="16" height="16" rx="3" fill="white"/><text x="36" y="24" fill="white" font-family="sans-serif" font-weight="bold" font-size="11">CLINICA 2</text></svg>'

      guestUser.set(
        'clinics_config',
        JSON.stringify([
          { id: 'clinic_exemplo_1', name: 'Clínica Exemplo 1', logo: clinic1Logo },
          { id: 'clinic_exemplo_2', name: 'Clínica Exemplo 2', logo: clinic2Logo },
        ]),
      )

      app.save(guestUser)
    }

    if (!guestUser) return

    const guestId = guestUser.id
    const patientsCol = app.findCollectionByNameOrId('patients')
    const examsCol = app.findCollectionByNameOrId('exams')
    const apptsCol = app.findCollectionByNameOrId('appointments')

    // 3. Check if guest already has sample data to avoid duplicates
    const existingGuestPatients = app.findRecordsByFilter(
      'patients',
      `owner_id = '${guestId}'`,
      '-created',
      10,
    )

    if (existingGuestPatients.length === 0) {
      // Patient 1: Carlos Eduardo Silva (Exemplo)
      const p1 = new Record(patientsCol)
      p1.set('owner_id', guestId)
      p1.set('name', 'Carlos Eduardo Silva (Exemplo)')
      p1.set('document', '123.456.789-00')
      p1.set('birth_date', '1985-04-12 12:00:00.000Z')
      p1.set('sex', 'Masculino')
      p1.set('phone', '(69) 99234-5678')
      p1.set('email', 'carlos.exemplo@lwlaudos.local')
      p1.set('address', 'Rua das Palmeiras, 100, Bairro Jardim, Porto Velho - RO')
      p1.set('sus_card', '700012345678901')
      p1.set('notes', 'Paciente de demonstração da conta convidado.')
      app.save(p1)

      // Patient 2: Ana Paula Ferreira (Exemplo)
      const p2 = new Record(patientsCol)
      p2.set('owner_id', guestId)
      p2.set('name', 'Ana Paula Ferreira (Exemplo)')
      p2.set('document', '987.654.321-99')
      p2.set('birth_date', '1992-09-20 12:00:00.000Z')
      p2.set('sex', 'Feminino')
      p2.set('phone', '(69) 99876-5432')
      p2.set('email', 'ana.exemplo@lwlaudos.local')
      p2.set('address', 'Av. Brasil, 450, Centro, Ji-Paraná - RO')
      p2.set('sus_card', '800098765432100')
      p2.set('notes', 'Paciente de teste para ultrassonografia de mama.')
      app.save(p2)

      // Patient 3: Marcos Vinicius Lima (Exemplo)
      const p3 = new Record(patientsCol)
      p3.set('owner_id', guestId)
      p3.set('name', 'Marcos Vinicius Lima (Exemplo)')
      p3.set('document', '555.444.333-22')
      p3.set('birth_date', '1978-11-05 12:00:00.000Z')
      p3.set('sex', 'Masculino')
      p3.set('phone', '(69) 98111-2233')
      p3.set('notes', 'Paciente para agendamento de rotina na Clínica Exemplo 1.')
      app.save(p3)

      // 4. Sample appointments (1 in Clínica Exemplo 1, 1 in Clínica Exemplo 2)
      const now = new Date()
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      const todayISO = `${y}-${m}-${d}T12:00:00.000Z`
      const ymdStr = `${y}${m}${d}`

      // Appointment 1 - Carlos at Clínica Exemplo 1 (Realizado, has finished report)
      const appt1 = new Record(apptsCol)
      appt1.set('owner_id', guestId)
      appt1.set('patient_id', p1.id)
      appt1.set('start_time', todayISO)
      appt1.set('duration_minutes', 30)
      appt1.set('exam_type', 'Ultrassonografia Abdome Total')
      appt1.set('clinic_location', 'Clínica Exemplo 1')
      appt1.set('status', 'Realizado')
      appt1.set('referring_physician', 'Dra. Juliana Mendes (CRM RO 4321)')
      appt1.set('accession_number', `LW-${ymdStr}-G001`)
      appt1.set('patient_name_dicom', 'SILVA^CARLOS EDUARDO')
      appt1.set('notes', 'Dor abdominal recorrente em hipocôndrio direito.')
      app.save(appt1)

      // Exam 1 linked to Appointment 1
      const exam1 = new Record(examsCol)
      exam1.set('owner_id', guestId)
      exam1.set('patient_id', p1.id)
      exam1.set('type', 'Ultrassonografia Abdome Total')
      exam1.set('exam_date', `${y}-${m}-${d} 12:00:00.000Z`)
      exam1.set('status', 'Concluído')
      exam1.set('indication', 'Dor em hipocôndrio direito a esclarecer')
      exam1.set('appointment_id', appt1.id)
      app.save(exam1)

      // Update appt1 with exam_id
      appt1.set('exam_id', exam1.id)
      app.save(appt1)

      // Report 1 for Carlos: Finalizado with Body Mark
      const rep1 = new Record(reportsCol)
      rep1.set('owner_id', guestId)
      rep1.set('patient_id', p1.id)
      rep1.set('exam_id', exam1.id)
      rep1.set('title', 'Laudo de Ultrassonografia - Ultrassonografia Abdome Total')
      rep1.set('status', 'Finalizado')
      rep1.set('is_draft', false)
      rep1.set('exam_type', 'Ultrassonografia')
      rep1.set('author_name', 'Dr. Convidado')
      rep1.set('author_crm', '9999')
      rep1.set('author_crm_uf', 'RO')
      rep1.set('referring_physician', 'Dra. Juliana Mendes (CRM RO 4321)')
      rep1.set('clinic_location', 'Clínica Exemplo 1')
      rep1.set('signature_date', todayISO)

      const rep1Structured = {
        mode: 'structured',
        sections: [
          {
            id: 'figado',
            label: 'Fígado',
            text: 'Dimensões normais, contornos regulares e ecotextura homogênea. Ausência de lesões focais sólidas ou císticas evidentes. Sistema vascular intra-hepático preservado.',
          },
          {
            id: 'vias_biliares',
            label: 'Vias Biliares',
            text: 'Vias biliares intra e extra-hepáticas de calibre normal, sem sinais de dilatação.',
          },
          {
            id: 'vesicula',
            label: 'Vesícula Biliar',
            text: 'Tópica, normodistendida, paredes finas e regulares. Conteúdo anecóico homogêneo, sem cálculos ou debris.',
          },
          {
            id: 'pancreas',
            label: 'Pâncreas',
            text: 'Forma, dimensões e ecotextura conservadas. Ducto de Wirsung de calibre fisiológico.',
          },
          {
            id: 'rins',
            label: 'Rins',
            text: 'Tópicos, com forma, contornos e dimensões preservadas. Boa diferenciação cortiço-medular. Ausência de ectasia pielocalicial ou imagens sugestivas de cálculos.',
          },
          {
            id: 'baco',
            label: 'Baço',
            text: 'Dimensões anatômicas normais, contornos regulares e parênquima homogêneo.',
          },
        ],
        conclusion:
          'Exame ultrassonográfico do abdome total dentro dos padrões da normalidade para a faixa etária.',
        body_marks: {
          schemeId: 'abdome_fatia',
          points: [
            {
              id: 'pt_1',
              number: 1,
              x: 0.38,
              y: 0.42,
              side: 'Direito',
              description: 'Vesícula biliar fisiológica sem cálculos.',
            },
            {
              id: 'pt_2',
              number: 2,
              x: 0.65,
              y: 0.48,
              side: 'Esquerdo',
              description: 'Baço de aspecto anatômico normal.',
            },
          ],
        },
      }

      rep1.set('structured_data', JSON.stringify(rep1Structured))
      rep1.set('conclusion', rep1Structured.conclusion)
      rep1.set(
        'body',
        '<div class="ultrasound-structured-report">' +
          '<div class="report-organ-block" style="margin-bottom: 12px;"><h3 style="font-family: -apple-system, sans-serif; font-size: 11pt; font-weight: 700; color: #0C6B58; margin: 0 0 4px 0; text-transform: uppercase;">Fígado:</h3><p style="margin: 0; line-height: 1.5; font-size: 11pt; color: #1F2A27;">' +
          rep1Structured.sections[0].text +
          '</p></div>' +
          '<div class="report-organ-block" style="margin-bottom: 12px;"><h3 style="font-family: -apple-system, sans-serif; font-size: 11pt; font-weight: 700; color: #0C6B58; margin: 0 0 4px 0; text-transform: uppercase;">Vesícula Biliar:</h3><p style="margin: 0; line-height: 1.5; font-size: 11pt; color: #1F2A27;">' +
          rep1Structured.sections[2].text +
          '</p></div>' +
          '</div>',
      )
      rep1.set('images_config', JSON.stringify({ imagesPerPage: 4 }))
      app.save(rep1)

      // Appointment 2 - Ana Paula at Clínica Exemplo 2 (Em atendimento, Draft report)
      const appt2 = new Record(apptsCol)
      appt2.set('owner_id', guestId)
      appt2.set('patient_id', p2.id)
      appt2.set('start_time', todayISO)
      appt2.set('duration_minutes', 30)
      appt2.set('exam_type', 'Ultrassonografia Mamária Bilateral')
      appt2.set('clinic_location', 'Clínica Exemplo 2')
      appt2.set('status', 'Em atendimento')
      appt2.set('referring_physician', 'Dr. Roberto Albuquerque (CRM RO 7890)')
      appt2.set('accession_number', `LW-${ymdStr}-G002`)
      appt2.set('patient_name_dicom', 'FERREIRA^ANA PAULA')
      appt2.set('notes', 'Nódulo palpável em QSL de mama direita.')
      app.save(appt2)

      // Exam 2 linked to Appointment 2
      const exam2 = new Record(examsCol)
      exam2.set('owner_id', guestId)
      exam2.set('patient_id', p2.id)
      exam2.set('type', 'Ultrassonografia Mamária Bilateral')
      exam2.set('exam_date', `${y}-${m}-${d} 12:00:00.000Z`)
      exam2.set('status', 'Em análise')
      exam2.set('indication', 'Palpação de nódulo em mama direita')
      exam2.set('appointment_id', appt2.id)
      app.save(exam2)

      appt2.set('exam_id', exam2.id)
      app.save(appt2)

      // Report 2 for Ana Paula: Rascunho
      const rep2 = new Record(reportsCol)
      rep2.set('owner_id', guestId)
      rep2.set('patient_id', p2.id)
      rep2.set('exam_id', exam2.id)
      rep2.set('title', 'Laudo de Ultrassonografia - Ultrassonografia Mamária Bilateral')
      rep2.set('status', 'Rascunho')
      rep2.set('is_draft', true)
      rep2.set('exam_type', 'Ultrassonografia')
      rep2.set('author_name', 'Dr. Convidado')
      rep2.set('author_crm', '9999')
      rep2.set('author_crm_uf', 'RO')
      rep2.set('referring_physician', 'Dr. Roberto Albuquerque (CRM RO 7890)')
      rep2.set('clinic_location', 'Clínica Exemplo 2')

      const rep2Structured = {
        mode: 'structured',
        sections: [
          {
            id: 'mama_direita',
            label: 'Mama Direita',
            text: 'Pele e tecido subcutâneo de aspecto normal. Parênquima fibroglandular com ecotextura habitual. Identificado nódulo circunscrito em quadrante superolateral, às 10 horas, medindo 12 x 8 mm, anecóico com reforço acústico posterior (cisto simples).',
          },
          {
            id: 'mama_esquerda',
            label: 'Mama Esquerda',
            text: 'Pele e tecido celular subcutâneo sem alterações. Parênquima de características habituais, sem imagens nodulares ou císticas suspeitas.',
          },
          {
            id: 'axilas',
            label: 'Regiões Axilares',
            text: 'Linfonodos com morfologia e dimensões preservadas bilateralmente.',
          },
        ],
        conclusion: 'BI-RADS 2 — Achados benignos (cisto simples em mama direita).',
        body_marks: {
          schemeId: 'mama_direita',
          points: [
            {
              id: 'pt_m1',
              number: 1,
              x: 0.32,
              y: 0.3,
              side: 'Direito',
              quadrant: 'Superolateral',
              clockHour: 10,
              distanceFromNippleCm: '3.0 cm',
              description: 'Cisto simples anecóico de 12 x 8 mm.',
            },
          ],
        },
      }

      rep2.set('structured_data', JSON.stringify(rep2Structured))
      rep2.set('conclusion', rep2Structured.conclusion)
      rep2.set(
        'body',
        '<div class="ultrasound-structured-report">' +
          '<div class="report-organ-block" style="margin-bottom: 12px;"><h3 style="font-family: -apple-system, sans-serif; font-size: 11pt; font-weight: 700; color: #0C6B58; margin: 0 0 4px 0; text-transform: uppercase;">Mama Direita:</h3><p style="margin: 0; line-height: 1.5; font-size: 11pt; color: #1F2A27;">' +
          rep2Structured.sections[0].text +
          '</p></div>' +
          '</div>',
      )
      rep2.set('images_config', JSON.stringify({ imagesPerPage: 4 }))
      app.save(rep2)
    }
  },
  (app) => {
    // down migration
    try {
      const reportsCol = app.findCollectionByNameOrId('reports')
      if (reportsCol.fields.getByName('referring_physician')) {
        reportsCol.fields.removeByName('referring_physician')
      }
      if (reportsCol.fields.getByName('clinic_location')) {
        reportsCol.fields.removeByName('clinic_location')
      }
      app.save(reportsCol)
    } catch (_) {}
  },
)
