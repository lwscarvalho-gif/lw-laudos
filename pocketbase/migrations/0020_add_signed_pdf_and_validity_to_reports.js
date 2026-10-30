migrate(
  (app) => {
    const reports = app.findCollectionByNameOrId('reports')

    if (!reports.fields.getByName('signed_pdf_file')) {
      reports.fields.add(
        new FileField({
          name: 'signed_pdf_file',
          maxSelect: 1,
          maxSize: 31457280, // 30MB
          mimeTypes: ['application/pdf'],
          protected: false,
        }),
      )
    }

    if (!reports.fields.getByName('validity_days')) {
      reports.fields.add(
        new NumberField({
          name: 'validity_days',
          min: 0,
          max: 3650,
        }),
      )
    }

    if (!reports.fields.getByName('signature_metadata')) {
      reports.fields.add(
        new JSONField({
          name: 'signature_metadata',
          maxSize: 1048576, // 1MB
        }),
      )
    }

    app.save(reports)
  },
  (app) => {
    const reports = app.findCollectionByNameOrId('reports')
    try {
      reports.fields.removeByName('signed_pdf_file')
    } catch (_) {}
    try {
      reports.fields.removeByName('validity_days')
    } catch (_) {}
    try {
      reports.fields.removeByName('signature_metadata')
    } catch (_) {}
    app.save(reports)
  },
)
