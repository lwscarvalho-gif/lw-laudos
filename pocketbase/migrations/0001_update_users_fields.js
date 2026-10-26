migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          required: false,
          values: ['Administrador', 'Médico'],
          maxSelect: 1,
        }),
      )
    }

    if (!users.fields.getByName('crm')) {
      users.fields.add(
        new TextField({
          name: 'crm',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('crm_uf')) {
      users.fields.add(
        new TextField({
          name: 'crm_uf',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('professional_name')) {
      users.fields.add(
        new TextField({
          name: 'professional_name',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('professional_title')) {
      users.fields.add(
        new TextField({
          name: 'professional_title',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('logo')) {
      users.fields.add(
        new FileField({
          name: 'logo',
          required: false,
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
        }),
      )
    }

    if (!users.fields.getByName('header')) {
      users.fields.add(
        new TextField({
          name: 'header',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('active')) {
      users.fields.add(
        new BoolField({
          name: 'active',
          required: false,
        }),
      )
    }

    // Update access rules:
    // - Admin can list and view all users; users can view/list themselves
    // - Admin can update users or users update their own profile (locking role from self-escalation)
    // - Create rule: allow admin or public (with admin or invite tokens)
    users.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'Administrador' || id = @request.auth.id)"
    users.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'Administrador' || id = @request.auth.id)"
    users.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'Administrador' || (id = @request.auth.id && @request.body.role:changed = false))"
    users.deleteRule = "@request.auth.id != '' && @request.auth.role = 'Administrador'"
    // Create rule remains open for invitation acceptance registration
    users.createRule = ''

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const fieldNames = [
      'role',
      'crm',
      'crm_uf',
      'professional_name',
      'professional_title',
      'logo',
      'header',
      'active',
    ]
    for (const name of fieldNames) {
      const f = users.fields.getByName(name)
      if (f) {
        users.fields.removeByName(name)
      }
    }
    app.save(users)
  },
)
