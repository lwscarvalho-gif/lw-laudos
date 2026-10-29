migrate(
  (app) => {
    const patients = app.findCollectionByNameOrId('patients')
    if (patients) {
      const docField = patients.fields.getByName('document')
      if (docField) {
        docField.required = false
      }
      app.save(patients)
    }
  },
  (app) => {
    const patients = app.findCollectionByNameOrId('patients')
    if (patients) {
      const docField = patients.fields.getByName('document')
      if (docField) {
        docField.required = true
      }
      app.save(patients)
    }
  },
)
