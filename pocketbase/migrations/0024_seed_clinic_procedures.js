migrate(
  (app) => {
    const procs = app.findCollectionByNameOrId('clinic_procedures')

    const sampleProcedures = [
      {
        name: 'Ultrassonografia de Abdome Total',
        category: 'abdome',
        internal_code: 'US-ABD-01',
        modality: 'US',
        default_duration_minutes: 20,
        is_active: true,
        price_card_installment: 250,
        price_card_cash: 230,
        price_pix_cash: 200,
        doctor_payout_type: 'none',
        doctor_payout_value: 0,
      },
      {
        name: 'Ultrassonografia de Tireoide com Doppler',
        category: 'tireoide',
        internal_code: 'US-TIR-01',
        modality: 'US',
        default_duration_minutes: 15,
        is_active: true,
        price_card_installment: 200,
        price_card_cash: 180,
        price_pix_cash: 160,
        doctor_payout_type: 'none',
        doctor_payout_value: 0,
      },
      {
        name: 'Ultrassonografia Articular (Ombro/Joelho)',
        category: 'articulacoes',
        internal_code: 'US-ART-01',
        modality: 'US',
        default_duration_minutes: 20,
        is_active: true,
        price_card_installment: 240,
        price_card_cash: 220,
        price_pix_cash: 190,
        doctor_payout_type: 'none',
        doctor_payout_value: 0,
      },
      {
        name: 'Ultrassonografia de Partes Moles',
        category: 'partes_moles',
        internal_code: 'US-PM-01',
        modality: 'US',
        default_duration_minutes: 15,
        is_active: true,
        price_card_installment: 180,
        price_card_cash: 160,
        price_pix_cash: 140,
        doctor_payout_type: 'none',
        doctor_payout_value: 0,
      },
      {
        name: 'Doppler Colorido de Carótidas e Vertebrais',
        category: 'doppler',
        internal_code: 'US-DOP-01',
        modality: 'US',
        default_duration_minutes: 30,
        is_active: true,
        price_card_installment: 380,
        price_card_cash: 350,
        price_pix_cash: 300,
        doctor_payout_type: 'none',
        doctor_payout_value: 0,
      },
      {
        name: 'Ultrassonografia Obstétrica com Doppler',
        category: 'obstetricia',
        internal_code: 'US-OBS-01',
        modality: 'US',
        default_duration_minutes: 25,
        is_active: true,
        price_card_installment: 300,
        price_card_cash: 270,
        price_pix_cash: 240,
        doctor_payout_type: 'none',
        doctor_payout_value: 0,
      },
    ]

    const clinics = ['HM Samuel Marques dos Santos', 'Gastroimagem']

    for (const clinic of clinics) {
      for (const p of sampleProcedures) {
        try {
          const existing = app.findFirstRecordByFilter(
            'clinic_procedures',
            `clinic_location = "${clinic}" && name = "${p.name}"`,
          )
          if (existing) continue
        } catch (_) {}

        const rec = new Record(procs)
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
        rec.set('doctor_payout_type', p.doctor_payout_type)
        rec.set('doctor_payout_value', p.doctor_payout_value)
        rec.set(
          'price_history',
          JSON.stringify([
            {
              date: new Date().toISOString(),
              author: 'Sistema',
              reason: 'Carga inicial estruturada',
            },
          ]),
        )
        app.save(rec)
      }
    }

    // Configurações iniciais
    const settingsCol = app.findCollectionByNameOrId('clinic_financial_settings')
    for (const clinic of clinics) {
      try {
        app.findFirstRecordByFilter('clinic_financial_settings', `clinic_location = "${clinic}"`)
      } catch (_) {
        const sRec = new Record(settingsCol)
        sRec.set('clinic_location', clinic)
        sRec.set('preauthorized_discount_pct', 10) // Margem pré-autorizada de 10%
        sRec.set('allow_doctor_payout', false) // Desativado por padrão
        sRec.set('allow_exam_with_pending_payment', true) // Atendimento permitido com pendência
        sRec.set('notes', 'Configuração operacional inicial da clínica')
        app.save(sRec)
      }
    }
  },
  (app) => {
    // down: noop
  },
)
