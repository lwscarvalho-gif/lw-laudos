migrate(
  (app) => {
    // 1. Atualizar campos da coleção 'exams'
    const examsCol = app.findCollectionByNameOrId('exams')
    if (!examsCol.fields.getByName('procedure_id')) {
      examsCol.fields.add(
        new TextField({
          name: 'procedure_id',
          required: false,
        }),
      )
    }
    if (!examsCol.fields.getByName('referring_physician')) {
      examsCol.fields.add(
        new TextField({
          name: 'referring_physician',
          required: false,
        }),
      )
    }
    if (!examsCol.fields.getByName('clinic_location')) {
      examsCol.fields.add(
        new TextField({
          name: 'clinic_location',
          required: false,
        }),
      )
    }
    app.save(examsCol)

    // 2. Cadastrar novos procedimentos ativos essenciais usando as categorias existentes (ex: partes_moles ou geral para mamas)
    const procsCol = app.findCollectionByNameOrId('clinic_procedures')
    const clinics = ['HM Samuel Marques dos Santos', 'Gastroimagem']
    const additionalProcedures = [
      {
        name: 'Ultrassonografia Mamária Bilateral',
        category: 'partes_moles',
        internal_code: 'US-MAM-01',
        modality: 'US',
        default_duration_minutes: 20,
        is_active: true,
        price_card_installment: 230,
        price_card_cash: 210,
        price_pix_cash: 180,
      },
      {
        name: 'Ultrassonografia Mamária Unilateral',
        category: 'partes_moles',
        internal_code: 'US-MAM-02',
        modality: 'US',
        default_duration_minutes: 15,
        is_active: true,
        price_card_installment: 170,
        price_card_cash: 150,
        price_pix_cash: 130,
      },
      {
        name: 'Ultrassonografia de Rins e Vias Urinárias',
        category: 'abdome',
        internal_code: 'US-REN-01',
        modality: 'US',
        default_duration_minutes: 15,
        is_active: true,
        price_card_installment: 200,
        price_card_cash: 180,
        price_pix_cash: 150,
      },
      {
        name: 'Ultrassonografia Pélvica Ginecológica / Transvaginal',
        category: 'obstetricia',
        internal_code: 'US-PEL-01',
        modality: 'US',
        default_duration_minutes: 20,
        is_active: true,
        price_card_installment: 220,
        price_card_cash: 200,
        price_pix_cash: 170,
      },
    ]

    for (const clinic of clinics) {
      for (const p of additionalProcedures) {
        try {
          const found = app.findFirstRecordByFilter(
            'clinic_procedures',
            `clinic_location = "${clinic}" && name = "${p.name}"`,
          )
          if (found) continue
        } catch (_) {}

        const rec = new Record(procsCol)
        rec.set('clinic_location', clinic)
        rec.set('name', p.name)
        rec.set('category', p.category)
        rec.set('internal_code', p.internal_code)
        rec.set('modality', p.modality)
        rec.set('default_duration_minutes', p.default_duration_minutes)
        rec.set('is_active', p.is_active)
        rec.set('price_card_installment', p.price_card_installment)
        rec.set('price_card_cash', p.price_card_cash)
        rec.set('price_pix_cash', p.price_pix_cash)
        rec.set('doctor_payout_type', 'none')
        rec.set('doctor_payout_value', 0)
        rec.set(
          'price_history',
          JSON.stringify([
            {
              date: new Date().toISOString(),
              author: 'Sistema',
              reason: 'Carga clínica padronizada v0.0.60',
            },
          ]),
        )
        app.save(rec)
      }
    }

    // 3. Criar coleção 'daily_closings' para persistência auditada dos fechamentos diários
    try {
      app.findCollectionByNameOrId('daily_closings')
    } catch (_) {
      const dailyClosings = new Collection({
        name: 'daily_closings',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || @request.auth.role = 'Gestor')",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
        fields: [
          { name: 'clinic_location', type: 'text', required: true },
          { name: 'closing_date', type: 'text', required: true },
          {
            name: 'mode',
            type: 'select',
            values: ['completo', 'solicitante', 'sintetico'],
            maxSelect: 1,
            required: true,
          },
          { name: 'total_finalized', type: 'number', required: false },
          { name: 'total_absent', type: 'number', required: false },
          { name: 'data_json', type: 'json', required: false },
          {
            name: 'issued_by_id',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            required: false,
            maxSelect: 1,
          },
          { name: 'issued_by_name', type: 'text', required: false },
          { name: 'issued_by_role', type: 'text', required: false },
          { name: 'issued_at', type: 'date', required: false },
          { name: 'version', type: 'number', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_daily_clos_clinic_date ON daily_closings (clinic_location, closing_date)',
        ],
      })
      app.save(dailyClosings)
    }

    // 4. Criar coleção 'referring_physicians' para catálogo simples com normalização de nome e isolamento por clínica
    try {
      app.findCollectionByNameOrId('referring_physicians')
    } catch (_) {
      const refPhysCol = new Collection({
        name: 'referring_physicians',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'name_normalized', type: 'text', required: true },
          { name: 'clinic_location', type: 'text', required: false },
          {
            name: 'created_by_id',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            required: false,
            maxSelect: 1,
          },
          { name: 'created_by_name', type: 'text', required: false },
          { name: 'notes', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ref_phys_normalized ON referring_physicians (name_normalized)',
          'CREATE INDEX idx_ref_phys_clinic ON referring_physicians (clinic_location)',
        ],
      })
      app.save(refPhysCol)
    }

    // 5. Criar templates estruturados com owner_id resolvido
    let adminOwnerId = ''
    try {
      const admin = app.findFirstRecordByFilter(
        'users',
        "role = 'Administrador Geral' || role = 'Administrador'",
      )
      if (admin) adminOwnerId = admin.id
    } catch (_) {}

    if (adminOwnerId) {
      const templatesCol = app.findCollectionByNameOrId('templates')
      const sampleTemplates = [
        {
          title: 'Ultrassonografia Mamária Bilateral',
          description:
            'Modelo anatômico bilateral para avaliação de parênquima mamário e regiões axilares (BI-RADS).',
          is_general: true,
          body: '<h2>ULTRASSONOGRAFIA MAMÁRIA BILATERAL</h2><p><strong>INDICAÇÃO CLÍNICA:</strong> Rastreamento / Avaliação ecográfica de rotina.</p><p><strong>TÉCNICA:</strong> Exame ecográfico em tempo real com transdutor linear multifrequencial de alta resolução em ambas as mamas e fossas axilares.</p><h3>MAMA DIREITA:</h3><p>Pele e complexo aréolo-papilar com espessura e morfologia preservadas. Tecido adiposo subcutâneo com ecotextura habitual. Parênquima fibroglandular com ecotextura e distribuição fisiológicas para a faixa etária. Ausência de nódulos sólidos ou císticos identificáveis ao método. Região axilar direita livre de linfonodomegalias atípicas.</p><h3>MAMA ESQUERDA:</h3><p>Pele e complexo aréolo-papilar com ecotextura preservada. Tecido adiposo subcutâneo e retromamário sem alterações. Parênquima fibroglandular homogêneo, sem evidências de distorções arquiteturais. Ausência de lesões sólidas ou císticas suspeitas. Região axilar esquerda sem linfonodomegalias atípicas.</p><h3>IMPRESSÃO DIAGNÓSTICA:</h3><p>Exame ultrassonográfico mamário bilateral sem alterações ecográficas estruturais significativas.</p><p><strong>CLASSIFICAÇÃO BI-RADS®: CATEGORIA 1 (Negativa / Achados normais).</strong></p>',
        },
        {
          title: 'Ultrassonografia de Tireoide com Doppler',
          description: 'Modelo estruturado de tireoide com Doppler colorido (ACR TI-RADS).',
          is_general: true,
          body: '<h2>ULTRASSONOGRAFIA DA GLÂNDULA TIREOIDE COM DOPPLER</h2><p><strong>INDICAÇÃO CLÍNICA:</strong> Avaliação cervical e ecográfica de rotina.</p><p><strong>TÉCNICA:</strong> Exame realizado com transdutor linear multifrequencial de alta resolução em escala de cinzas e mapeamento com Doppler Colorido.</p><h3>RELATÓRIO:</h3><p>Glândula tireoide tópica, com contornos regulares e dimensões preservadas. Parênquima tireoidiano exibindo ecotextura homogênea e ecogenicidade fisiológica habitual. Ausência de nódulos ou formações expansivas sólidas ou císticas nos lobos ou istmo. Ao estudo Doppler colorido, apresenta vascularização parenquimatosa simétrica e fisiológica.</p><h3>IMPRESSÃO DIAGNÓSTICA:</h3><p>Estudo ecográfico e Doppler da glândula tireoide dentro dos padrões normais de ecotextura e dimensões.</p><p><strong>ACR TI-RADS 1 (Tireoide Normal / Benigna).</strong></p>',
        },
        {
          title: 'Ultrassonografia de Partes Moles',
          description:
            'Modelo para investigação de parede abdominal, tecido subcutâneo e partes moles.',
          is_general: true,
          body: '<h2>ULTRASSONOGRAFIA DE PARTES MOLES</h2><p><strong>INDICAÇÃO CLÍNICA:</strong> Investigação de abaulamento / desconforto local.</p><p><strong>TÉCNICA:</strong> Exame realizado com transdutor linear de alta frequência sobre a região de queixa informada.</p><h3>RELATÓRIO:</h3><p>Planos cutâneo, subcutâneo e fáscia muscular de espessura e ecotextura conservadas na região examinada. Ausência de coleções líquidas, hematomas ou massas expansivas sólidas ou císticas. Planos musculares subjacentes com padrão fibrilar habitual e sem roturas estruturais identificáveis.</p><h3>IMPRESSÃO DIAGNÓSTICA:</h3><p>Exame ecográfico de partes moles sem alterações patológicas detectáveis ao método no local de queixa clínica.</p>',
        },
        {
          title: 'Doppler Colorido de Carótidas e Vertebrais',
          description: 'Modelo com análise espectral de carótidas e artérias vertebrais.',
          is_general: true,
          body: '<h2>DOPPLER COLORIDO DAS ARTÉRIAS CARÓTIDAS E VERTEBRAIS</h2><p><strong>INDICAÇÃO CLÍNICA:</strong> Avaliação hemodinâmica e estenose de vasos cervicais.</p><p><strong>TÉCNICA:</strong> Estudo ecográfico com transdutor linear em escala de cinzas acoplado ao Doppler Colorido e Pulsado.</p><h3>RELATÓRIO:</h3><p>Artérias carótidas comuns, internas e externas pérvias bilateralmente, com calibre preservado e paredes lisas, apresentando complexo íntima-média de espessura conservada. Ausência de placas ateromatosas significativas ou estenoses hemodinamicamente relevantes. Fluxo arterial laminar e espectro velocimétrico dentro dos parâmetros fisiológicos para a faixa etária. Artérias vertebrais pérvias, com fluxo anterógrado e curvas espectrais habituais bilateralmente.</p><h3>IMPRESSÃO DIAGNÓSTICA:</h3><p>Estudo hemodinâmico por Doppler das artérias carótidas e vertebrais dentro dos limites da normalidade.</p>',
        },
      ]

      for (const t of sampleTemplates) {
        try {
          const existing = app.findFirstRecordByFilter('templates', `title = "${t.title}"`)
          if (existing) continue
        } catch (_) {}

        const rec = new Record(templatesCol)
        rec.set('owner_id', adminOwnerId)
        rec.set('title', t.title)
        rec.set('description', t.description)
        rec.set('body', t.body)
        rec.set('is_general', t.is_general)
        app.save(rec)
      }
    }
  },
  (app) => {
    // down: noop
  },
)
