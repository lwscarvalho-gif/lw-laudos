migrate(
  (app) => {
    const reports = app.findCollectionByNameOrId('reports')

    if (!reports.fields.getByName('signature_hash_sha256')) {
      reports.fields.add(
        new TextField({
          name: 'signature_hash_sha256',
          required: false,
        }),
      )
    }

    if (!reports.fields.getByName('signature_provider')) {
      reports.fields.add(
        new TextField({
          name: 'signature_provider',
          required: false,
        }),
      )
    }

    if (!reports.fields.getByName('signature_status')) {
      reports.fields.add(
        new TextField({
          name: 'signature_status',
          required: false,
        }),
      )
    }

    app.save(reports)
  },
  (app) => {
    try {
      const reports = app.findCollectionByNameOrId('reports')
      const f1 = reports.fields.getByName('signature_hash_sha256')
      if (f1) reports.fields.remove(f1)
      const f2 = reports.fields.getByName('signature_provider')
      if (f2) reports.fields.remove(f2)
      const f3 = reports.fields.getByName('signature_status')
      if (f3) reports.fields.remove(f3)
      app.save(reports)
    } catch (_) {}
  },
)
