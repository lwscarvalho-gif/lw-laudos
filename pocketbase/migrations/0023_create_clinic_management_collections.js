migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const usersId = users.id

    // 1. Catálogo de Procedimentos e Preços por Clínica
    const proceduresCatalog = new Collection({
      name: 'clinic_procedures',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'Gestor' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'Gestor' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'Gestor' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
      fields: [
        { name: 'clinic_location', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        {
          name: 'category',
          type: 'select',
          values: [
            'abdome',
            'tireoide',
            'articulacoes',
            'partes_moles',
            'doppler',
            'obstetricia',
            'geral',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'internal_code', type: 'text' },
        { name: 'modality', type: 'text' },
        { name: 'default_duration_minutes', type: 'number' },
        { name: 'is_active', type: 'bool' },
        { name: 'price_card_installment', type: 'number' }, // CARTÃO PARCELADO
        { name: 'price_card_cash', type: 'number' }, // CARTÃO À VISTA
        { name: 'price_pix_cash', type: 'number' }, // PIX OU DINHEIRO
        {
          name: 'doctor_payout_type',
          type: 'select',
          values: ['none', 'fixed', 'percentage'],
          maxSelect: 1,
        },
        { name: 'doctor_payout_value', type: 'number' },
        { name: 'price_history', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_proc_clinic ON clinic_procedures (clinic_location)',
        'CREATE INDEX idx_proc_category ON clinic_procedures (category)',
        'CREATE INDEX idx_proc_active ON clinic_procedures (is_active)',
      ],
    })
    app.save(proceduresCatalog)

    // 2. Configurações Financeiras e Margens de Desconto por Clínica
    const clinicFinancialSettings = new Collection({
      name: 'clinic_financial_settings',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'Gestor' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'Gestor' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'Gestor' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
      fields: [
        { name: 'clinic_location', type: 'text', required: true },
        { name: 'preauthorized_discount_pct', type: 'number' }, // Margem pré-autorizada para secretária (ex: 10%)
        { name: 'allow_doctor_payout', type: 'bool' }, // Desativado por padrão
        { name: 'allow_exam_with_pending_payment', type: 'bool' }, // Política: iniciar exame mesmo com pendência
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_fin_settings_clinic ON clinic_financial_settings (clinic_location)',
      ],
    })
    app.save(clinicFinancialSettings)

    // 3. Solicitações de Valor Especial (Descontos e Cortesias)
    const specialPriceRequests = new Collection({
      name: 'special_price_requests',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'Gestor' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'Gestor' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
      fields: [
        { name: 'clinic_location', type: 'text', required: true },
        { name: 'patient_name', type: 'text', required: true },
        { name: 'patient_id', type: 'text' },
        { name: 'appointment_id', type: 'text' },
        { name: 'procedure_name', type: 'text', required: true },
        { name: 'original_price', type: 'number', required: true },
        { name: 'requested_price', type: 'number' }, // 0 se cortesia
        { name: 'difference_amount', type: 'number' },
        { name: 'is_full_courtesy', type: 'bool' },
        { name: 'justification', type: 'text', required: true },
        { name: 'requester_id', type: 'relation', collectionId: usersId, maxSelect: 1 },
        { name: 'requester_name', type: 'text' },
        { name: 'requester_role', type: 'text' },
        { name: 'authorized_by_id', type: 'relation', collectionId: usersId, maxSelect: 1 },
        { name: 'authorized_by_name', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['Pendente', 'Aprovada', 'Recusada'],
          maxSelect: 1,
          required: true,
        },
        { name: 'decision_date', type: 'date' },
        { name: 'decision_notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_spec_req_clinic ON special_price_requests (clinic_location)',
        'CREATE INDEX idx_spec_req_status ON special_price_requests (status)',
      ],
    })
    app.save(specialPriceRequests)

    // 4. Lançamentos e Histórico Financeiro Operacional (Recebimentos, Estornos)
    const financialTransactions = new Collection({
      name: 'financial_transactions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'Gestor' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'Gestor' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
      fields: [
        { name: 'clinic_location', type: 'text', required: true },
        { name: 'appointment_id', type: 'text' },
        { name: 'exam_id', type: 'text' },
        { name: 'patient_id', type: 'text' },
        { name: 'patient_name', type: 'text', required: true },
        { name: 'doctor_id', type: 'text' },
        { name: 'doctor_name', type: 'text' },
        { name: 'procedure_name', type: 'text', required: true },
        { name: 'table_price_used', type: 'number', required: true },
        {
          name: 'modality',
          type: 'select',
          values: [
            'CARTAO_PARCELADO',
            'CARTAO_VISTA',
            'PIX_DINHEIRO',
            'VALOR_ESPECIAL',
            'CONVENIO',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'discount_amount', type: 'number' },
        { name: 'final_charged_amount', type: 'number', required: true },
        { name: 'received_amount', type: 'number', required: true },
        { name: 'pending_balance', type: 'number' },
        {
          name: 'financial_status',
          type: 'select',
          values: [
            'PAGO_INTEGRAL',
            'PAGO_PARCIAL',
            'PENDENTE',
            'CORTESIA_AUTORIZADA',
            'CONVENIO',
            'ESTORNADO',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'payment_method', type: 'text' }, // PIX, Dinheiro, Cartão Débito, Cartão Crédito, Faturado
        { name: 'payment_date', type: 'date' },
        { name: 'arrival_time', type: 'date' },
        { name: 'special_price_request_id', type: 'text' },
        { name: 'doctor_payout_amount', type: 'number' },
        { name: 'is_reversal', type: 'bool' },
        { name: 'reversal_reason', type: 'text' },
        { name: 'reversal_date', type: 'date' },
        { name: 'reversal_user_name', type: 'text' },
        { name: 'operator_id', type: 'relation', collectionId: usersId, maxSelect: 1 },
        { name: 'operator_name', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_fin_tx_clinic ON financial_transactions (clinic_location)',
        'CREATE INDEX idx_fin_tx_appt ON financial_transactions (appointment_id)',
        'CREATE INDEX idx_fin_tx_status ON financial_transactions (financial_status)',
        'CREATE INDEX idx_fin_tx_date ON financial_transactions (payment_date)',
      ],
    })
    app.save(financialTransactions)
  },
  (app) => {
    const c4 = app.findCollectionByNameOrId('financial_transactions')
    if (c4) app.delete(c4)
    const c3 = app.findCollectionByNameOrId('special_price_requests')
    if (c3) app.delete(c3)
    const c2 = app.findCollectionByNameOrId('clinic_financial_settings')
    if (c2) app.delete(c2)
    const c1 = app.findCollectionByNameOrId('clinic_procedures')
    if (c1) app.delete(c1)
  },
)
