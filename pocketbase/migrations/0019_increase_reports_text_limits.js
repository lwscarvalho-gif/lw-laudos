migrate(
  (app) => {
    // 1. Elevar limites de texto longo da coleção 'reports'
    const reports = app.findCollectionByNameOrId('reports')
    if (reports) {
      const bodyField = reports.fields.getByName('body')
      if (bodyField) {
        bodyField.max = 100000 // 100.000 caracteres (laudos ultrassonográficos completos com HTML)
      }

      const conclusionField = reports.fields.getByName('conclusion')
      if (conclusionField) {
        conclusionField.max = 50000 // 50.000 caracteres
      }

      app.save(reports)
    }

    // 2. Elevar limites de texto longo da coleção 'templates'
    const templates = app.findCollectionByNameOrId('templates')
    if (templates) {
      const bodyField = templates.fields.getByName('body')
      if (bodyField) {
        bodyField.max = 100000
      }
      const descField = templates.fields.getByName('description')
      if (descField) {
        descField.max = 20000
      }
      app.save(templates)
    }

    // 3. Elevar limites de texto longo da coleção 'ultrasound_findings'
    try {
      const findings = app.findCollectionByNameOrId('ultrasound_findings')
      if (findings) {
        const textContent = findings.fields.getByName('text_content')
        if (textContent) {
          textContent.max = 50000
        }
        app.save(findings)
      }
    } catch (_) {}

    // 4. Elevar limites de notas de exames e pacientes
    try {
      const exams = app.findCollectionByNameOrId('exams')
      if (exams) {
        const indField = exams.fields.getByName('indication')
        if (indField) indField.max = 10000
        const techNotes = exams.fields.getByName('technical_notes')
        if (techNotes) techNotes.max = 20000
        app.save(exams)
      }
    } catch (_) {}

    try {
      const patients = app.findCollectionByNameOrId('patients')
      if (patients) {
        const notesField = patients.fields.getByName('notes')
        if (notesField) notesField.max = 20000
        app.save(patients)
      }
    } catch (_) {}
  },
  (app) => {
    const reports = app.findCollectionByNameOrId('reports')
    if (reports) {
      const bodyField = reports.fields.getByName('body')
      if (bodyField) bodyField.max = 0 // reverte para default do PB (5000)
      const conclusionField = reports.fields.getByName('conclusion')
      if (conclusionField) conclusionField.max = 0
      app.save(reports)
    }

    const templates = app.findCollectionByNameOrId('templates')
    if (templates) {
      const bodyField = templates.fields.getByName('body')
      if (bodyField) bodyField.max = 0
      const descField = templates.fields.getByName('description')
      if (descField) descField.max = 0
      app.save(templates)
    }
  },
)
