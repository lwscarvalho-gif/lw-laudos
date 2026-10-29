migrate(
  (app) => {
    // 1. Add fields to users: mwl_token (text) and clinics (json/text for configurable clinic locations)
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('mwl_token')) {
      usersCol.fields.add(
        new TextField({
          name: 'mwl_token',
          required: false,
        }),
      )
    }
    if (!usersCol.fields.getByName('clinics_config')) {
      usersCol.fields.add(
        new JSONField({
          name: 'clinics_config',
          required: false,
        }),
      )
    }
    app.save(usersCol)

    // 2. Add appointment reference to exams (optional relation)
    // Note: we will link exams -> appointments after creating appointments collection
    const patientsColId = app.findCollectionByNameOrId('patients').id

    // 3. Create appointments collection
    const appointments = new Collection({
      name: 'appointments',
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
          cascadeDelete: false,
          maxSelect: 1,
        },
        // Scheduling info
        { name: 'start_time', type: 'date', required: true },
        { name: 'duration_minutes', type: 'number', required: true, min: 5, max: 240 },
        { name: 'exam_type', type: 'text', required: true },
        { name: 'clinic_location', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Agendado', 'Confirmado', 'Em atendimento', 'Realizado', 'Cancelado'],
          maxSelect: 1,
        },
        { name: 'notes', type: 'text', required: false },
        { name: 'referring_physician', type: 'text', required: false },

        // Structured DICOM Modality Worklist fields
        { name: 'accession_number', type: 'text', required: true },
        { name: 'patient_name_dicom', type: 'text', required: false }, // Format: SOBRENOME^NOME
        { name: 'patient_id_dicom', type: 'text', required: false }, // CPF or internal ID
        { name: 'patient_birth_date', type: 'text', required: false }, // YYYYMMDD
        { name: 'patient_sex', type: 'text', required: false }, // M, F, O
        { name: 'modality', type: 'text', required: false }, // US, etc.
        { name: 'study_description', type: 'text', required: false },
        { name: 'scheduled_station_ae', type: 'text', required: false },

        // Exam link once report/exam is started
        { name: 'exam_id', type: 'text', required: false },

        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_appointments_owner ON appointments (owner_id)',
        'CREATE INDEX idx_appointments_patient ON appointments (patient_id)',
        'CREATE INDEX idx_appointments_start ON appointments (start_time)',
        'CREATE INDEX idx_appointments_status ON appointments (status)',
        'CREATE UNIQUE INDEX idx_appointments_accession ON appointments (accession_number)',
      ],
    })
    app.save(appointments)

    // 4. Add appointment_id to exams collection for cross-reference
    const appointmentsColId = app.findCollectionByNameOrId('appointments').id
    const examsCol = app.findCollectionByNameOrId('exams')
    if (!examsCol.fields.getByName('appointment_id')) {
      examsCol.fields.add(
        new RelationField({
          name: 'appointment_id',
          required: false,
          collectionId: appointmentsColId,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
      app.save(examsCol)
    }
  },
  (app) => {
    try {
      const examsCol = app.findCollectionByNameOrId('exams')
      const apptField = examsCol.fields.getByName('appointment_id')
      if (apptField) {
        examsCol.fields.remove(apptField)
        app.save(examsCol)
      }
    } catch (_) {}

    try {
      const col = app.findCollectionByNameOrId('appointments')
      app.delete(col)
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const f1 = usersCol.fields.getByName('mwl_token')
      if (f1) usersCol.fields.remove(f1)
      const f2 = usersCol.fields.getByName('clinics_config')
      if (f2) usersCol.fields.remove(f2)
      app.save(usersCol)
    } catch (_) {}
  },
)
