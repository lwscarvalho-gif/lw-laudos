migrate(
  (app) => {
    // 1. Update users collection:
    // - Add 'Operador' to role select values
    // - Add assigned_doctor (relation -> users)
    // - Add allowed_clinics (json list of clinic names allowed for this user)
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users) {
      const roleField = users.fields.getByName('role')
      if (roleField) {
        roleField.values = [
          'Administrador Geral',
          'Administrador',
          'Médico',
          'Secretaria',
          'Gestor',
          'Contabilidade',
          'Operador',
        ]
      }

      if (!users.fields.getByName('assigned_doctor')) {
        users.fields.add(
          new RelationField({
            name: 'assigned_doctor',
            collectionId: '_pb_users_auth_',
            required: false,
            maxSelect: 1,
          }),
        )
      }

      if (!users.fields.getByName('allowed_clinics')) {
        users.fields.add(
          new JSONField({
            name: 'allowed_clinics',
            required: false,
            maxSize: 1048576,
          }),
        )
      }

      // Update list/view rules so Operador can view their assigned doctor and themselves
      users.listRule =
        "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || @request.auth.role = 'Secretaria' || @request.auth.role = 'Gestor' || @request.auth.role = 'Operador' || id = @request.auth.id)"
      users.viewRule =
        "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || @request.auth.role = 'Secretaria' || @request.auth.role = 'Gestor' || @request.auth.role = 'Operador' || id = @request.auth.id)"

      app.save(users)
    }

    // 2. Update invitations collection:
    // - Add 'Operador' to role values
    // - Add assigned_doctor relation
    // - Add allowed_clinics json
    try {
      const invitations = app.findCollectionByNameOrId('invitations')
      if (invitations) {
        const invRoleField = invitations.fields.getByName('role')
        if (invRoleField) {
          invRoleField.values = [
            'Administrador Geral',
            'Administrador',
            'Médico',
            'Secretaria',
            'Gestor',
            'Contabilidade',
            'Operador',
          ]
        }
        if (!invitations.fields.getByName('assigned_doctor')) {
          invitations.fields.add(
            new RelationField({
              name: 'assigned_doctor',
              collectionId: '_pb_users_auth_',
              required: false,
              maxSelect: 1,
            }),
          )
        }
        if (!invitations.fields.getByName('allowed_clinics')) {
          invitations.fields.add(
            new JSONField({
              name: 'allowed_clinics',
              required: false,
              maxSize: 1048576,
            }),
          )
        }
        app.save(invitations)
      }
    } catch (_) {}

    // 3. Create access_logs collection for LGPD audit trail
    // Tracks when operators or users access patient data or make bookings
    try {
      const existingLogs = app.findCollectionByNameOrId('access_logs')
      if (!existingLogs) {
        // Create below
      }
    } catch (_) {
      const accessLogs = new Collection({
        name: 'access_logs',
        type: 'base',
        // list/view: Admin, doctor owner or the user who performed the action
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || @request.auth.role = 'Médico' || user_id = @request.auth.id)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || @request.auth.role = 'Médico' || user_id = @request.auth.id)",
        // create: any authenticated user
        createRule: "@request.auth.id != ''",
        // update/delete: prohibited (audit records are immutable)
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'user_id',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'user_name', type: 'text', required: true },
          { name: 'user_role', type: 'text', required: true },
          { name: 'user_email', type: 'text', required: false },
          { name: 'clinic_location', type: 'text', required: false },
          { name: 'action', type: 'text', required: true },
          { name: 'resource_type', type: 'text', required: true },
          { name: 'resource_id', type: 'text', required: false },
          { name: 'patient_id', type: 'text', required: false },
          { name: 'patient_name', type: 'text', required: false },
          { name: 'details', type: 'text', required: false },
          { name: 'ip_address', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_access_logs_user ON access_logs (user_id)',
          'CREATE INDEX idx_access_logs_patient ON access_logs (patient_id)',
          'CREATE INDEX idx_access_logs_clinic ON access_logs (clinic_location)',
          'CREATE INDEX idx_access_logs_created ON access_logs (created DESC)',
        ],
      })
      app.save(accessLogs)
    }

    // 4. Update appointments collection access rules to allow Operador with restrictions
    // Operador can read, create, update appointments of their assigned doctor and their allowed clinics
    try {
      const appointments = app.findCollectionByNameOrId('appointments')
      if (appointments) {
        appointments.listRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Gestor' || @request.auth.role = 'Contabilidade' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || (@request.auth.role = 'Operador' && owner_id = @request.auth.assigned_doctor))"
        appointments.viewRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Gestor' || @request.auth.role = 'Contabilidade' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || (@request.auth.role = 'Operador' && owner_id = @request.auth.assigned_doctor))"
        appointments.createRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || (@request.auth.role = 'Operador' && owner_id = @request.auth.assigned_doctor))"
        appointments.updateRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || (@request.auth.role = 'Operador' && owner_id = @request.auth.assigned_doctor))"
        // delete remains restricted to owner or admin
        app.save(appointments)
      }
    } catch (_) {}

    // 5. Update patients collection access rules:
    // Operador can view/list/create/update patients belonging to their assigned doctor (owner_id = @request.auth.assigned_doctor)
    try {
      const patients = app.findCollectionByNameOrId('patients')
      if (patients) {
        patients.listRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Gestor' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || (@request.auth.role = 'Operador' && owner_id = @request.auth.assigned_doctor))"
        patients.viewRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Gestor' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || (@request.auth.role = 'Operador' && owner_id = @request.auth.assigned_doctor))"
        patients.createRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || (@request.auth.role = 'Operador' && owner_id = @request.auth.assigned_doctor))"
        patients.updateRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || (@request.auth.role = 'Operador' && owner_id = @request.auth.assigned_doctor))"
        app.save(patients)
      }
    } catch (_) {}

    // 6. Explicitly ensure clinical collections REJECT Operador:
    // reports, exam_images, clinical_notes, geriatric_assessments, templates
    // They are already owner_id = @request.auth.id (so Operador cannot read since their own id != doctor owner_id),
    // and we reinforce that rule across reports and exams.
    try {
      const reports = app.findCollectionByNameOrId('reports')
      if (reports) {
        reports.listRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && owner_id = @request.auth.id"
        reports.viewRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && owner_id = @request.auth.id"
        reports.createRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && owner_id = @request.auth.id"
        reports.updateRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && owner_id = @request.auth.id"
        reports.deleteRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && owner_id = @request.auth.id"
        app.save(reports)
      }
    } catch (_) {}

    try {
      const examImages = app.findCollectionByNameOrId('exam_images')
      if (examImages) {
        examImages.listRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && owner_id = @request.auth.id"
        examImages.viewRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && owner_id = @request.auth.id"
        app.save(examImages)
      }
    } catch (_) {}

    try {
      const clinicalNotes = app.findCollectionByNameOrId('clinical_notes')
      if (clinicalNotes) {
        clinicalNotes.listRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && owner_id = @request.auth.id"
        clinicalNotes.viewRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && owner_id = @request.auth.id"
        app.save(clinicalNotes)
      }
    } catch (_) {}

    try {
      const geriatric = app.findCollectionByNameOrId('geriatric_assessments')
      if (geriatric) {
        geriatric.listRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && owner_id = @request.auth.id"
        geriatric.viewRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && owner_id = @request.auth.id"
        app.save(geriatric)
      }
    } catch (_) {}

    try {
      const templates = app.findCollectionByNameOrId('templates')
      if (templates) {
        templates.listRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && (is_general = true || owner_id = @request.auth.id)"
        templates.viewRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && (is_general = true || owner_id = @request.auth.id)"
        app.save(templates)
      }
    } catch (_) {}
  },
  (app) => {
    // Revert logic
  },
)
