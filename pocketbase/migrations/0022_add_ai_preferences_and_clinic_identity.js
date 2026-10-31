migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Campo doctor_ai_preferences: armazena preferências de IA do médico
    // { mode: 'active' | 'discrete' | 'manual', style: 'resumido' | 'convencional' | 'detalhado', customInstructions?: string, preferences?: Record<string, any> }
    if (!users.fields.getByName('doctor_ai_preferences')) {
      users.fields.add(
        new JSONField({
          name: 'doctor_ai_preferences',
          maxSize: 65536,
        }),
      )
    }

    // 2. Campo clinic_corporate_identity: identidade corporativa da clínica
    // { fantasyName, corporateReason, cnpj, address, phone, headerText, footerText, logoDataUrl }
    if (!users.fields.getByName('clinic_corporate_identity')) {
      users.fields.add(
        new JSONField({
          name: 'clinic_corporate_identity',
          maxSize: 262144,
        }),
      )
    }

    app.save(users)

    // 3. Reforçar regras de auditoria e acesso a laudos (reports)
    // Garantir que secretária e operador NÃO acessem livremente conteúdo de laudos clínicos
    try {
      const reports = app.findCollectionByNameOrId('reports')
      if (reports) {
        reports.listRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && @request.auth.role != 'Secretaria' && (owner_id = @request.auth.id || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        reports.viewRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && @request.auth.role != 'Secretaria' && (owner_id = @request.auth.id || @request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')"
        reports.createRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && @request.auth.role != 'Secretaria' && owner_id = @request.auth.id"
        reports.updateRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && @request.auth.role != 'Secretaria' && owner_id = @request.auth.id"
        reports.deleteRule =
          "@request.auth.id != '' && @request.auth.role != 'Operador' && @request.auth.role != 'Secretaria' && owner_id = @request.auth.id"
        app.save(reports)
      }
    } catch (_) {}
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const field1 = users.fields.getByName('doctor_ai_preferences')
    if (field1) users.fields.removeById(field1.id)
    const field2 = users.fields.getByName('clinic_corporate_identity')
    if (field2) users.fields.removeById(field2.id)
    app.save(users)
  },
)
