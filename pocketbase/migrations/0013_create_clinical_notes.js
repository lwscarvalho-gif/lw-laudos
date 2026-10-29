migrate(
  (app) => {
    const patientsCol = app.findCollectionByNameOrId('patients')
    const patientsColId = patientsCol.id

    // Check if clinical_notes already exists
    try {
      const existing = app.findCollectionByNameOrId('clinical_notes')
      if (existing) {
        return
      }
    } catch (_) {}

    const clinicalNotes = new Collection({
      name: 'clinical_notes',
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
          name: 'content',
          type: 'text',
          required: true,
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
          name: 'note_date',
          type: 'date',
          required: false,
        },
        {
          name: 'note_type',
          type: 'select',
          required: false,
          values: ['Evolução', 'Anamnese', 'Retorno', 'Intercorrência', 'Geral'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_clinical_notes_owner ON clinical_notes (owner_id)',
        'CREATE INDEX idx_clinical_notes_patient ON clinical_notes (patient_id)',
        'CREATE INDEX idx_clinical_notes_created ON clinical_notes (created DESC)',
      ],
    })

    app.save(clinicalNotes)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('clinical_notes')
      if (col) {
        app.delete(col)
      }
    } catch (_) {}
  },
)
