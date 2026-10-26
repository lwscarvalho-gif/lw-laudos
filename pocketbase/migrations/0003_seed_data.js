migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const patients = app.findCollectionByNameOrId('patients')
    const exams = app.findCollectionByNameOrId('exams')
    const templates = app.findCollectionByNameOrId('templates')
    const reports = app.findCollectionByNameOrId('reports')
    const userPerms = app.findCollectionByNameOrId('user_permissions')

    // 1. Seed admin: Dr. Lucas Willian da Silva
    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'lwscarvalho@gmail.com')
    } catch (_) {
      adminUser = new Record(users)
      adminUser.setEmail('lwscarvalho@gmail.com')
      adminUser.setPassword('Skip@Pass')
      adminUser.setVerified(true)
      adminUser.set('name', 'Lucas Willian da Silva')
      adminUser.set('professional_name', 'Dr. Lucas Willian da Silva')
      adminUser.set('role', 'Administrador')
      adminUser.set('crm', '6955')
      adminUser.set('crm_uf', 'RO')
      adminUser.set('professional_title', 'Médico Radiologista')
      adminUser.set(
        'header',
        'Clínica de Diagnóstico por Imagem — Dr. Lucas Willian da Silva | CRM RO 6955',
      )
      adminUser.set('active', true)
      app.save(adminUser)
    }

    // 2. Seed sample physician: Dra. Mariana Costa
    let samplePhysician
    try {
      samplePhysician = app.findAuthRecordByEmail('_pb_users_auth_', 'mariana.costa@medico.com')
    } catch (_) {
      samplePhysician = new Record(users)
      samplePhysician.setEmail('mariana.costa@medico.com')
      samplePhysician.setPassword('Skip@Pass')
      samplePhysician.setVerified(true)
      samplePhysician.set('name', 'Mariana Costa Silveira')
      samplePhysician.set('professional_name', 'Dra. Mariana Costa')
      samplePhysician.set('role', 'Médico')
      samplePhysician.set('crm', '12480')
      samplePhysician.set('crm_uf', 'RO')
      samplePhysician.set('professional_title', 'Médica Cardiologista')
      samplePhysician.set(
        'header',
        'Cardiologia Clínica e Diagnóstica — Dra. Mariana Costa | CRM RO 12480',
      )
      samplePhysician.set('active', true)
      app.save(samplePhysician)
    }

    // Permissions for users
    try {
      app.findFirstRecordByData('user_permissions', 'user', adminUser.id)
    } catch (_) {
      const perm = new Record(userPerms)
      perm.set('user', adminUser.id)
      perm.set('can_create_patients', true)
      perm.set('can_read_patients', true)
      perm.set('can_update_patients', true)
      perm.set('can_delete_patients', true)
      perm.set('can_create_exams', true)
      perm.set('can_read_exams', true)
      perm.set('can_update_exams', true)
      perm.set('can_delete_exams', true)
      perm.set('can_create_reports', true)
      perm.set('can_read_reports', true)
      perm.set('can_update_reports', true)
      perm.set('can_delete_reports', true)
      perm.set('can_create_templates', true)
      perm.set('can_read_templates', true)
      perm.set('can_update_templates', true)
      perm.set('can_delete_templates', true)
      app.save(perm)
    }

    try {
      app.findFirstRecordByData('user_permissions', 'user', samplePhysician.id)
    } catch (_) {
      const perm = new Record(userPerms)
      perm.set('user', samplePhysician.id)
      perm.set('can_create_patients', true)
      perm.set('can_read_patients', true)
      perm.set('can_update_patients', true)
      perm.set('can_delete_patients', true)
      perm.set('can_create_exams', true)
      perm.set('can_read_exams', true)
      perm.set('can_update_exams', true)
      perm.set('can_delete_exams', true)
      perm.set('can_create_reports', true)
      perm.set('can_read_reports', true)
      perm.set('can_update_reports', true)
      perm.set('can_delete_reports', true)
      perm.set('can_create_templates', true)
      perm.set('can_read_templates', true)
      perm.set('can_update_templates', true)
      perm.set('can_delete_templates', true)
      app.save(perm)
    }

    // 3. Seed general templates (admin owned)
    let generalTemplate
    try {
      generalTemplate = app.findFirstRecordByData(
        'templates',
        'title',
        'Ultrassonografia de Abdome Total',
      )
    } catch (_) {
      generalTemplate = new Record(templates)
      generalTemplate.set('owner_id', adminUser.id)
      generalTemplate.set('title', 'Ultrassonografia de Abdome Total')
      generalTemplate.set(
        'description',
        'Modelo geral padrão para avaliação de fígado, vesícula biliar, pâncreas, baço e rins.',
      )
      generalTemplate.set('is_general', true)
      generalTemplate.set(
        'body',
        `<h2>ULTRASSONOGRAFIA DE ABDOME TOTAL</h2>
<p><strong>INDICAÇÃO CLÍNICA:</strong> Dor abdominal e avaliação de rotina.</p>
<p><strong>TÉCNICA:</strong> Exame ultrassonográfico realizado com transdutor convexo multifrequencial, via transabdominal com bexiga em repleção.</p>
<h3>ANÁLISE DESCRITIVA:</h3>
<p><strong>FÍGADO:</strong> Dimensões normais, contornos regulares, ecotextura homogênea, sem evidência de lesões focais sólidas ou císticas. Calibre normal das veias supra-hepáticas e do ramo portal.</p>
<p><strong>VESÍCULA BILIAR:</strong> Normodistendida, paredes finas e regulares, conteúdo anecóico, sem cálculos ou espessamentos parietais.</p>
<p><strong>VIAS BILIARES:</strong> Intra e extra-hepáticas de calibre preservado. Colédoco proximal de calibre normal.</p>
<p><strong>PÂNCREAS:</strong> Visualizado em seus segmentos principais, com dimensões normais, contornos regulares e ecotextura habitual.</p>
<p><strong>BAÇO:</strong> Tópico, dimensões normais, contornos regulares e ecotextura homogênea.</p>
<p><strong>RINS:</strong> Tópicos, dimensões conservadas, contornos regulares, espessura e ecogenicidade córtico-medular normais. Ausência de cálculos ou hidronefrose.</p>
<p><strong>BEXIGA:</strong> Repleção adequada, paredes regulares, conteúdo homogêneo.</p>
<p><strong>AORTA ABDOMINAL:</strong> Trajeto e calibre normais.</p>
<h3>IMPRESSÃO DIAGNÓSTICA:</h3>
<p>Exame ultrassonográfico do abdome total dentro dos limites da normalidade.</p>`,
      )
      app.save(generalTemplate)
    }

    // Another template: Radiografia de Tórax (geral)
    try {
      app.findFirstRecordByData('templates', 'title', 'Radiografia de Tórax PA e Perfil')
    } catch (_) {
      const t2 = new Record(templates)
      t2.set('owner_id', adminUser.id)
      t2.set('title', 'Radiografia de Tórax PA e Perfil')
      t2.set('description', 'Modelo geral para radiografia padrão do tórax.')
      t2.set('is_general', true)
      t2.set(
        'body',
        `<h2>RADIOGRAFIA DE TÓRAX (PA E PERFIL)</h2>
<p><strong>INDICAÇÃO CLÍNICA:</strong> Avaliação respiratória.</p>
<h3>RELATÓRIO:</h3>
<p>- Campos pleuropulmonares com transparência radiológica preservada, sem evidência de infiltrados consolidações ou nódulos suspeitos.</p>
<p>- Seios costofrênicos e cardiofrênicos livres e pérvios.</p>
<p>- Área cardíaca dentro dos limites da normalidade para a idade e biotipo.</p>
<p>- Hilos pulmonares de aspecto habitual.</p>
<p>- Cúpulas diafragmáticas com conformação e limites normais.</p>
<p>- Estruturas ósseas da caixa torácica íntegras, sem lesões líticas ou blásticas.</p>
<h3>CONCLUSÃO:</h3>
<p>Radiografia de tórax sem alterações pleuropulmonares agudas.</p>`,
      )
      app.save(t2)
    }

    // 4. Seed Patients for admin (Lucas)
    let p1
    try {
      p1 = app.findFirstRecordByData('patients', 'document', '123.456.789-00')
    } catch (_) {
      p1 = new Record(patients)
      p1.set('owner_id', adminUser.id)
      p1.set('name', 'Ana Carolina Fernandes Mendonça')
      p1.set('document', '123.456.789-00')
      p1.set('birth_date', '1988-04-14 00:00:00.000Z')
      p1.set('sex', 'Feminino')
      p1.set('phone', '(69) 98412-3344')
      p1.set('email', 'ana.mendonca@email.com')
      p1.set('address', 'Av. Presidente Dutra, 1420 - Porto Velho, RO')
      p1.set('notes', 'Paciente relata desconforto em hipocôndrio direito após ingestão gordurosa.')
      app.save(p1)
    }

    let p2
    try {
      p2 = app.findFirstRecordByData('patients', 'document', '987.654.321-11')
    } catch (_) {
      p2 = new Record(patients)
      p2.set('owner_id', adminUser.id)
      p2.set('name', 'Carlos Eduardo Ribeiro de Souza')
      p2.set('document', '987.654.321-11')
      p2.set('birth_date', '1975-11-23 00:00:00.000Z')
      p2.set('sex', 'Masculino')
      p2.set('phone', '(69) 99234-5566')
      p2.set('email', 'carlos.ribeiro@email.com')
      p2.set('address', 'Rua José Bonifácio, 580 - Olaria, Porto Velho, RO')
      p2.set('notes', 'Acompanhamento preventivo anual.')
      app.save(p2)
    }

    // 5. Seed Exams for admin
    let exam1
    try {
      exam1 = app.findFirstRecordByData(
        'exams',
        'indication',
        'Dor epigástrica recorrente e intolerância alimentar.',
      )
    } catch (_) {
      exam1 = new Record(exams)
      exam1.set('owner_id', adminUser.id)
      exam1.set('patient_id', p1.id)
      exam1.set('type', 'Ultrassom')
      exam1.set('exam_date', '2025-05-10 14:00:00.000Z')
      exam1.set('status', 'Concluído')
      exam1.set('indication', 'Dor epigástrica recorrente e intolerância alimentar.')
      exam1.set('technical_notes', 'Aparelho GE Logic S8. Boa janela acústica.')
      app.save(exam1)
    }

    let exam2
    try {
      exam2 = app.findFirstRecordByData(
        'exams',
        'indication',
        'Avaliação de dor lombar e triagem de nefrolitíase.',
      )
    } catch (_) {
      exam2 = new Record(exams)
      exam2.set('owner_id', adminUser.id)
      exam2.set('patient_id', p2.id)
      exam2.set('type', 'Tomografia Computadorizada')
      exam2.set('exam_date', '2025-05-12 09:30:00.000Z')
      exam2.set('status', 'Pendente')
      exam2.set('indication', 'Avaliação de dor lombar e triagem de nefrolitíase.')
      exam2.set('technical_notes', 'TC de abdome total com protocolo sem contraste intravenoso.')
      app.save(exam2)
    }

    // 6. Seed Report for admin (Concluído)
    try {
      app.findFirstRecordByData(
        'reports',
        'title',
        'Laudo de Ultrassonografia de Abdome - Ana Carolina',
      )
    } catch (_) {
      const report = new Record(reports)
      report.set('owner_id', adminUser.id)
      report.set('patient_id', p1.id)
      report.set('exam_id', exam1.id)
      report.set('template_id', generalTemplate.id)
      report.set('title', 'Laudo de Ultrassonografia de Abdome - Ana Carolina')
      report.set(
        'body',
        `<h2>LAUDO DE ULTRASSONOGRAFIA DE ABDOME TOTAL</h2>
<p><strong>PACIENTE:</strong> Ana Carolina Fernandes Mendonça</p>
<p><strong>DOCUMENTO:</strong> 123.456.789-00</p>
<p><strong>DATA DO EXAME:</strong> 10/05/2025</p>
<hr/>
<p><strong>ACHADOS:</strong></p>
<p>Fígado com dimensões normais, ecotextura homogênea, sem nódulos ou cistos identificáveis. Vias biliares normais. Vesícula biliar fisiologicamente distendida, paredes regulares, sem microlitíase ou espessamentos anormais. Pâncreas e baço de aspecto habitual. Rins tópicos, com espessura parenquimatosa preservada, sem sinais de uropatia obstrutiva ou cálculos.</p>
<h3>CONCLUSÃO:</h3>
<p>Estudo ultrassonográfico de abdome total sem anormalidades morfológicas detectáveis ao método no momento do exame.</p>`,
      )
      report.set('author_name', 'Dr. Lucas Willian da Silva')
      report.set('author_crm', '6955')
      report.set('author_crm_uf', 'RO')
      report.set('signature_date', '2025-05-10 16:30:00.000Z')
      app.save(report)
    }
  },
  (app) => {
    // rollback
  },
)
