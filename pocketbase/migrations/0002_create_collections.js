migrate(
  (app) => {
    // 1. patients collection
    const patients = new Collection({
      name: 'patients',
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
        { name: 'name', type: 'text', required: true },
        { name: 'document', type: 'text', required: true },
        { name: 'birth_date', type: 'date', required: false },
        {
          name: 'sex',
          type: 'select',
          required: false,
          values: ['Feminino', 'Masculino', 'Outro'],
          maxSelect: 1,
        },
        { name: 'phone', type: 'text', required: false },
        { name: 'email', type: 'email', required: false },
        { name: 'address', type: 'text', required: false },
        { name: 'notes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_patients_owner ON patients (owner_id)',
        'CREATE INDEX idx_patients_name ON patients (name)',
      ],
    })
    app.save(patients)

    const patientsColId = app.findCollectionByNameOrId('patients').id

    // 2. exams collection
    const exams = new Collection({
      name: 'exams',
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
        { name: 'type', type: 'text', required: true },
        { name: 'exam_date', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Pendente', 'Em análise', 'Concluído'],
          maxSelect: 1,
        },
        { name: 'indication', type: 'text', required: false },
        { name: 'technical_notes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_exams_owner ON exams (owner_id)',
        'CREATE INDEX idx_exams_patient ON exams (patient_id)',
        'CREATE INDEX idx_exams_status ON exams (status)',
      ],
    })
    app.save(exams)

    const examsColId = app.findCollectionByNameOrId('exams').id

    // 3. templates collection
    const templates = new Collection({
      name: 'templates',
      type: 'base',
      listRule: "@request.auth.id != '' && (is_general = true || owner_id = @request.auth.id)",
      viewRule: "@request.auth.id != '' && (is_general = true || owner_id = @request.auth.id)",
      createRule:
        "@request.auth.id != '' && ((is_general = true && @request.auth.role = 'Administrador') || (is_general = false && owner_id = @request.auth.id))",
      updateRule:
        "@request.auth.id != '' && ((is_general = true && @request.auth.role = 'Administrador') || (is_general = false && owner_id = @request.auth.id))",
      deleteRule:
        "@request.auth.id != '' && ((is_general = true && @request.auth.role = 'Administrador') || (is_general = false && owner_id = @request.auth.id))",
      fields: [
        {
          name: 'owner_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text', required: false },
        { name: 'body', type: 'text', required: true },
        { name: 'is_general', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_templates_owner ON templates (owner_id)',
        'CREATE INDEX idx_templates_general ON templates (is_general)',
      ],
    })
    app.save(templates)

    const templatesColId = app.findCollectionByNameOrId('templates').id

    // 4. reports collection
    const reports = new Collection({
      name: 'reports',
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
          name: 'exam_id',
          type: 'relation',
          required: false,
          collectionId: examsColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'template_id',
          type: 'relation',
          required: false,
          collectionId: templatesColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'text', required: true },
        { name: 'author_name', type: 'text', required: false },
        { name: 'author_crm', type: 'text', required: false },
        { name: 'author_crm_uf', type: 'text', required: false },
        {
          name: 'author_logo',
          type: 'file',
          required: false,
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
        },
        { name: 'signature_date', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_reports_owner ON reports (owner_id)',
        'CREATE INDEX idx_reports_patient ON reports (patient_id)',
        'CREATE INDEX idx_reports_exam ON reports (exam_id)',
        'CREATE INDEX idx_reports_created ON reports (created DESC)',
      ],
    })
    app.save(reports)

    // 5. invitations collection
    const invitations = new Collection({
      name: 'invitations',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'Administrador'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'Administrador'",
      createRule: "@request.auth.id != '' && @request.auth.role = 'Administrador'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'Administrador'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'Administrador'",
      fields: [
        { name: 'email', type: 'email', required: true },
        { name: 'name', type: 'text', required: true },
        {
          name: 'role',
          type: 'select',
          required: true,
          values: ['Administrador', 'Médico'],
          maxSelect: 1,
        },
        { name: 'token', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Pendente', 'Aceito', 'Expirado'],
          maxSelect: 1,
        },
        { name: 'expires_at', type: 'date', required: false },
        {
          name: 'created_by',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_invitations_email ON invitations (email)',
        'CREATE UNIQUE INDEX idx_invitations_token ON invitations (token)',
        'CREATE INDEX idx_invitations_status ON invitations (status)',
      ],
    })
    app.save(invitations)

    // 6. user_permissions collection
    const userPermissions = new Collection({
      name: 'user_permissions',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'Administrador' || user = @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'Administrador' || user = @request.auth.id)",
      createRule: "@request.auth.id != '' && @request.auth.role = 'Administrador'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'Administrador'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'Administrador'",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'can_create_patients', type: 'bool', required: false },
        { name: 'can_read_patients', type: 'bool', required: false },
        { name: 'can_update_patients', type: 'bool', required: false },
        { name: 'can_delete_patients', type: 'bool', required: false },
        { name: 'can_create_exams', type: 'bool', required: false },
        { name: 'can_read_exams', type: 'bool', required: false },
        { name: 'can_update_exams', type: 'bool', required: false },
        { name: 'can_delete_exams', type: 'bool', required: false },
        { name: 'can_create_reports', type: 'bool', required: false },
        { name: 'can_read_reports', type: 'bool', required: false },
        { name: 'can_update_reports', type: 'bool', required: false },
        { name: 'can_delete_reports', type: 'bool', required: false },
        { name: 'can_create_templates', type: 'bool', required: false },
        { name: 'can_read_templates', type: 'bool', required: false },
        { name: 'can_update_templates', type: 'bool', required: false },
        { name: 'can_delete_templates', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_user_perms_user ON user_permissions (user)'],
    })
    app.save(userPermissions)
  },
  (app) => {
    const toDelete = [
      'user_permissions',
      'invitations',
      'reports',
      'templates',
      'exams',
      'patients',
    ]
    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
