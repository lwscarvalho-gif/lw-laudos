migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users) {
      if (!users.fields.getByName('digital_signature_enabled')) {
        users.fields.add(
          new BoolField({
            name: 'digital_signature_enabled',
            required: false,
          }),
        )
        app.save(users)
      }
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users) {
      const f = users.fields.getByName('digital_signature_enabled')
      if (f) {
        users.fields.remove(f)
        app.save(users)
      }
    }
  },
)
