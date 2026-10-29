migrate(
  (app) => {
    // 1. Create medical_specialties collection if it doesn't exist
    let specialties
    try {
      specialties = app.findCollectionByNameOrId('medical_specialties')
    } catch (_) {
      specialties = new Collection({
        name: 'medical_specialties',
        type: 'base',
        // All authenticated users can list and view specialties
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        // Only administrators can create, update, delete specialties
        createRule: "@request.auth.id != '' && @request.auth.role = 'Administrador'",
        updateRule: "@request.auth.id != '' && @request.auth.role = 'Administrador'",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'Administrador'",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'icon', type: 'text', required: false },
          { name: 'sort_order', type: 'number', required: false },
          { name: 'is_active', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_specialties_name ON medical_specialties (name)',
          'CREATE INDEX idx_specialties_sort ON medical_specialties (sort_order)',
        ],
      })
      app.save(specialties)
    }

    const specialtiesColId = app.findCollectionByNameOrId('medical_specialties').id

    // 2. Add specialty_id relation field to templates collection if not present
    const templatesCol = app.findCollectionByNameOrId('templates')
    if (!templatesCol.fields.getByName('specialty_id')) {
      templatesCol.fields.add(
        new RelationField({
          name: 'specialty_id',
          required: false,
          collectionId: specialtiesColId,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
      templatesCol.addIndex('idx_templates_specialty', false, 'specialty_id', '')
      app.save(templatesCol)
    }

    // 3. Seed default medical specialties coherent with exams & body marks
    const defaultSpecialties = [
      {
        name: 'Abdome Geral',
        description: 'Ultrassonografia e exames de abdome total, superior e vias urinárias',
        icon: 'Activity',
        sort_order: 1,
      },
      {
        name: 'Mastologia',
        description: 'Ultrassonografia mamária, axilar e biópsias guiadas',
        icon: 'Heart',
        sort_order: 2,
      },
      {
        name: 'Ginecologia e Obstetrícia',
        description: 'Pélvico transvaginal, rastreamento de DIU, obstétrico morfológico',
        icon: 'Baby',
        sort_order: 3,
      },
      {
        name: 'Musculoesquelético',
        description: 'Ombro, tendões, cotovelo, punho, joelho e articulações',
        icon: 'Bone',
        sort_order: 4,
      },
      {
        name: 'Tireoide e Cervical',
        description: 'Tireoide, paratireoide, glândulas salivares e linfonodomegalias',
        icon: 'Stethoscope',
        sort_order: 5,
      },
      {
        name: 'Radiologia Geral',
        description: 'Radiografias contrastadas e convencionais de tórax, esqueleto e ossos',
        icon: 'Layers',
        sort_order: 6,
      },
    ]

    const seededMap = {}
    for (const spec of defaultSpecialties) {
      let record
      try {
        record = app.findFirstRecordByData('medical_specialties', 'name', spec.name)
      } catch (_) {
        record = new Record(specialties)
        record.set('name', spec.name)
        record.set('description', spec.description)
        record.set('icon', spec.icon)
        record.set('sort_order', spec.sort_order)
        record.set('is_active', true)
        app.save(record)
      }
      seededMap[spec.name] = record.id
    }

    // 4. Link existing seed templates to appropriate specialties (if not already linked)
    try {
      const abdTemplate = app.findFirstRecordByData(
        'templates',
        'title',
        'Ultrassonografia de Abdome Total',
      )
      if (abdTemplate && !abdTemplate.getString('specialty_id') && seededMap['Abdome Geral']) {
        abdTemplate.set('specialty_id', seededMap['Abdome Geral'])
        app.save(abdTemplate)
      }
    } catch (_) {}

    try {
      const rxTemplate = app.findFirstRecordByData(
        'templates',
        'title',
        'Radiografia de Tórax PA e Perfil',
      )
      if (rxTemplate && !rxTemplate.getString('specialty_id') && seededMap['Radiologia Geral']) {
        rxTemplate.set('specialty_id', seededMap['Radiologia Geral'])
        app.save(rxTemplate)
      }
    } catch (_) {}
  },
  (app) => {
    // Revert migration
    try {
      const templatesCol = app.findCollectionByNameOrId('templates')
      if (templatesCol.fields.getByName('specialty_id')) {
        templatesCol.fields.removeByName('specialty_id')
        templatesCol.removeIndex('idx_templates_specialty')
        app.save(templatesCol)
      }
    } catch (_) {}

    try {
      const specialtiesCol = app.findCollectionByNameOrId('medical_specialties')
      app.delete(specialtiesCol)
    } catch (_) {}
  },
)
