migrate(
  (app) => {
    const patientsCol = app.findCollectionByNameOrId('patients')
    const patientsColId = patientsCol.id

    // Check if geriatric_assessments already exists
    try {
      const existing = app.findCollectionByNameOrId('geriatric_assessments')
      if (existing) {
        return
      }
    } catch (_) {}

    const assessments = new Collection({
      name: 'geriatric_assessments',
      type: 'base',
      listRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      createRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      fields: [
        {
          name: 'owner_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'patient_id',
          type: 'relation',
          required: true,
          collectionId: patientsColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'instrument_type',
          type: 'select',
          required: true,
          values: ['katz', 'lawton', 'g8', 'fried', 'fall_risk'],
          maxSelect: 1,
        },
        {
          name: 'instrument_title',
          type: 'text',
          required: true,
        },
        {
          name: 'score_number',
          type: 'number',
          required: false,
        },
        {
          name: 'score_display',
          type: 'text',
          required: false,
        },
        {
          name: 'classification',
          type: 'text',
          required: true,
        },
        {
          name: 'summary_markdown',
          type: 'text',
          required: false,
        },
        {
          name: 'answers_json',
          type: 'json',
          required: false,
        },
        {
          name: 'clinical_notes',
          type: 'text',
          required: false,
        },
        {
          name: 'author_name',
          type: 'text',
          required: false,
        },
        {
          name: 'author_crm',
          type: 'text',
          required: false,
        },
        {
          name: 'author_crm_uf',
          type: 'text',
          required: false,
        },
        {
          name: 'assessment_date',
          type: 'date',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_geriatric_assess_owner ON geriatric_assessments (owner_id)',
        'CREATE INDEX idx_geriatric_assess_patient ON geriatric_assessments (patient_id)',
        'CREATE INDEX idx_geriatric_assess_date ON geriatric_assessments (created DESC)',
        'CREATE INDEX idx_geriatric_assess_type ON geriatric_assessments (instrument_type)',
      ],
    })

    app.save(assessments)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('geriatric_assessments')
      if (col) {
        app.delete(col)
      }
    } catch (_) {}
  },
)
