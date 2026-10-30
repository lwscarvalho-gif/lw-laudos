migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users) {
      // 1. Campo CPF no perfil do médico (opcional, para identificação profissional e exibição na ativação)
      if (!users.fields.getByName('cpf')) {
        users.fields.add(
          new TextField({
            name: 'cpf',
            required: false,
          }),
        )
      }

      // 2. Campo signature_session (JSON estruturado com provider, activated_at, expires_at, status, code_hint)
      if (!users.fields.getByName('signature_session')) {
        users.fields.add(
          new JSONField({
            name: 'signature_session',
            required: false,
            maxSize: 65536,
          }),
        )
      }

      app.save(users)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users) {
      const cpfField = users.fields.getByName('cpf')
      if (cpfField) {
        users.fields.remove(cpfField)
      }
      const sessionField = users.fields.getByName('signature_session')
      if (sessionField) {
        users.fields.remove(sessionField)
      }
      app.save(users)
    }
  },
)
