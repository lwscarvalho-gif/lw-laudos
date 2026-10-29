migrate(
  (app) => {
    // 1. Update users collection: add default_appointment_duration, expand roles
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
        ]
      }

      if (!users.fields.getByName('default_appointment_duration')) {
        users.fields.add(
          new NumberField({
            name: 'default_appointment_duration',
            required: false,
            min: 5,
            max: 240,
          }),
        )
      }

      // Update users list/view rules so Secretaria/Gestor can list doctors for appointments
      users.listRule =
        "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || @request.auth.role = 'Secretaria' || @request.auth.role = 'Gestor' || id = @request.auth.id)"
      users.viewRule =
        "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || @request.auth.role = 'Secretaria' || @request.auth.role = 'Gestor' || id = @request.auth.id)"

      app.save(users)
    }

    // 2. Update invitations collection: expand role values
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
          ]
        }
        invitations.listRule =
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        invitations.viewRule =
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        invitations.createRule =
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        invitations.updateRule =
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        invitations.deleteRule =
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        app.save(invitations)
      }
    } catch (_) {}

    // 3. Update patients collection: add sus_card and update access rules for Secretaria/Gestor
    try {
      const patients = app.findCollectionByNameOrId('patients')
      if (patients) {
        if (!patients.fields.getByName('sus_card')) {
          patients.fields.add(
            new TextField({
              name: 'sus_card',
              required: false,
            }),
          )
        }

        // Secretaria can list, view, create, update patients. Gestor can list, view.
        // Doctors still see their own patients (owner_id = @request.auth.id).
        patients.listRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Gestor' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        patients.viewRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Gestor' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        patients.createRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        patients.updateRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        // delete is restricted to owner or admin
        patients.deleteRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"

        app.save(patients)
      }
    } catch (_) {}

    // 4. Update appointments collection:
    // Add created_by, created_by_name, created_by_role, updated_by, updated_by_name, updated_by_role, request_images
    // Update access rules: Secretaria/Gestor/Contabilidade have permission according to matrix
    try {
      const appointments = app.findCollectionByNameOrId('appointments')
      if (appointments) {
        if (!appointments.fields.getByName('created_by')) {
          appointments.fields.add(
            new RelationField({
              name: 'created_by',
              collectionId: '_pb_users_auth_',
              required: false,
              maxSelect: 1,
            }),
          )
        }
        if (!appointments.fields.getByName('created_by_name')) {
          appointments.fields.add(
            new TextField({
              name: 'created_by_name',
              required: false,
            }),
          )
        }
        if (!appointments.fields.getByName('created_by_role')) {
          appointments.fields.add(
            new TextField({
              name: 'created_by_role',
              required: false,
            }),
          )
        }
        if (!appointments.fields.getByName('updated_by')) {
          appointments.fields.add(
            new RelationField({
              name: 'updated_by',
              collectionId: '_pb_users_auth_',
              required: false,
              maxSelect: 1,
            }),
          )
        }
        if (!appointments.fields.getByName('updated_by_name')) {
          appointments.fields.add(
            new TextField({
              name: 'updated_by_name',
              required: false,
            }),
          )
        }
        if (!appointments.fields.getByName('updated_by_role')) {
          appointments.fields.add(
            new TextField({
              name: 'updated_by_role',
              required: false,
            }),
          )
        }
        if (!appointments.fields.getByName('request_images')) {
          appointments.fields.add(
            new FileField({
              name: 'request_images',
              required: false,
              maxSelect: 10,
              maxSize: 10485760, // 10MB
              mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
            }),
          )
        }

        // Rules:
        // list/view: owner_id = @request.auth.id || Secretaria || Gestor || Contabilidade || Administrador || Administrador Geral
        // create: owner_id = @request.auth.id || Secretaria || Administrador || Administrador Geral
        // update: owner_id = @request.auth.id || Secretaria || Administrador || Administrador Geral
        // delete: owner_id = @request.auth.id || Administrador || Administrador Geral
        appointments.listRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Gestor' || @request.auth.role = 'Contabilidade' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        appointments.viewRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Gestor' || @request.auth.role = 'Contabilidade' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        appointments.createRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        appointments.updateRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Secretaria' || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        appointments.deleteRule =
          "@request.auth.id != '' && (owner_id = @request.auth.id || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"

        app.save(appointments)
      }
    } catch (_) {}

    // 5. Update user_permissions collection rule to include 'Administrador Geral'
    try {
      const userPermissions = app.findCollectionByNameOrId('user_permissions')
      if (userPermissions) {
        userPermissions.listRule =
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || user = @request.auth.id)"
        userPermissions.viewRule =
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral' || user = @request.auth.id)"
        userPermissions.createRule =
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        userPermissions.updateRule =
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        userPermissions.deleteRule =
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        app.save(userPermissions)
      }
    } catch (_) {}

    // 6. Data migration: Rename "Clínica Principal" to "HM Samuel Marques dos Santos"
    try {
      // In users.clinics_config
      const userRecords = app.findRecordsByFilter('users', '1=1', '', 500)
      for (const u of userRecords) {
        let changed = false
        const conf = u.get('clinics_config')
        if (conf) {
          let list = []
          if (Array.isArray(conf)) list = conf
          else {
            try {
              list = JSON.parse(conf)
            } catch (_) {}
          }
          if (Array.isArray(list)) {
            const updatedList = list.map((c) =>
              c === 'Clínica Principal' || c === 'Principal' ? 'HM Samuel Marques dos Santos' : c,
            )
            if (JSON.stringify(list) !== JSON.stringify(updatedList)) {
              u.set('clinics_config', updatedList)
              changed = true
            }
          }
        }
        // If default_appointment_duration is not set, set default to 20 or 30
        if (!u.get('default_appointment_duration')) {
          u.set('default_appointment_duration', 30)
          changed = true
        }
        if (changed) {
          app.save(u)
        }
      }

      // In appointments.clinic_location
      const apptRecords = app.findRecordsByFilter(
        'appointments',
        "clinic_location = 'Clínica Principal' || clinic_location = 'Principal'",
        '',
        500,
      )
      for (const a of apptRecords) {
        a.set('clinic_location', 'HM Samuel Marques dos Santos')
        app.save(a)
      }
    } catch (_) {}
  },
  (app) => {
    // Revert logic if needed
  },
)
