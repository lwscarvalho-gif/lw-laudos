migrate(
  (app) => {
    // 1. Add fields to existing reports collection: status ('Rascunho' | 'Finalizado'), is_draft (bool), exam_type, structured_data (json), conclusion (text), images_config (json)
    const reports = app.findCollectionByNameOrId('reports')

    if (!reports.fields.getByName('status')) {
      reports.fields.add(
        new SelectField({
          name: 'status',
          required: false,
          values: ['Rascunho', 'Finalizado'],
          maxSelect: 1,
        }),
      )
    }

    if (!reports.fields.getByName('is_draft')) {
      reports.fields.add(
        new BoolField({
          name: 'is_draft',
          required: false,
        }),
      )
    }

    if (!reports.fields.getByName('exam_type')) {
      reports.fields.add(
        new TextField({
          name: 'exam_type',
          required: false,
        }),
      )
    }

    if (!reports.fields.getByName('structured_data')) {
      reports.fields.add(
        new JSONField({
          name: 'structured_data',
          required: false,
        }),
      )
    }

    if (!reports.fields.getByName('conclusion')) {
      reports.fields.add(
        new TextField({
          name: 'conclusion',
          required: false,
        }),
      )
    }

    if (!reports.fields.getByName('images_config')) {
      reports.fields.add(
        new JSONField({
          name: 'images_config',
          required: false,
        }),
      )
    }

    app.save(reports)

    // 2. Collection for Ultrasound Findings / Text Library per organ
    const usersColId = '_pb_users_auth_'
    const ultrasoundFindings = new Collection({
      name: 'ultrasound_findings',
      type: 'base',
      listRule: "@request.auth.id != '' && (is_shared = true || owner_id = @request.auth.id)",
      viewRule: "@request.auth.id != '' && (is_shared = true || owner_id = @request.auth.id)",
      createRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      fields: [
        {
          name: 'owner_id',
          type: 'relation',
          required: true,
          collectionId: usersColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'exam_scope', // ex: 'ABDOME_TOTAL', 'GERAL'
          type: 'text',
          required: true,
        },
        {
          name: 'organ', // ex: 'figado', 'vesicula', 'pancreas', 'baco', 'rim_direito', 'rim_esquerdo', 'bexiga', 'vasos', 'retroperitonio', 'conclusao', 'outros'
          type: 'text',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'finding_type',
          type: 'select',
          required: true,
          values: ['normal', 'patologico'],
          maxSelect: 1,
        },
        {
          name: 'text_content',
          type: 'text',
          required: true,
        },
        {
          name: 'is_default_normal',
          type: 'bool',
          required: false,
        },
        {
          name: 'is_favorite',
          type: 'bool',
          required: false,
        },
        {
          name: 'is_shared',
          type: 'bool',
          required: false,
        },
        {
          name: 'has_variables', // flag indicating if text has editable placeholders
          type: 'bool',
          required: false,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_us_findings_owner ON ultrasound_findings (owner_id)',
        'CREATE INDEX idx_us_findings_organ ON ultrasound_findings (organ)',
        'CREATE INDEX idx_us_findings_scope ON ultrasound_findings (exam_scope)',
      ],
    })
    app.save(ultrasoundFindings)

    // 3. Collection for Exam Images
    const examsCol = app.findCollectionByNameOrId('exams')
    const reportsCol = app.findCollectionByNameOrId('reports')

    const examImages = new Collection({
      name: 'exam_images',
      type: 'base',
      listRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      createRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      fields: [
        {
          name: 'owner_id',
          type: 'relation',
          required: true,
          collectionId: usersColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'exam_id',
          type: 'relation',
          required: false,
          collectionId: examsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'report_id',
          type: 'relation',
          required: false,
          collectionId: reportsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'file',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 15728640, // 15MB
          mimeTypes: ['image/jpeg', 'image/png'],
        },
        {
          name: 'caption',
          type: 'text',
          required: false,
        },
        {
          name: 'sort_order',
          type: 'number',
          required: false,
        },
        {
          name: 'selected_for_print',
          type: 'bool',
          required: false,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_exam_images_owner ON exam_images (owner_id)',
        'CREATE INDEX idx_exam_images_report ON exam_images (report_id)',
        'CREATE INDEX idx_exam_images_exam ON exam_images (exam_id)',
      ],
    })
    app.save(examImages)
  },
  (app) => {
    try {
      const examImages = app.findCollectionByNameOrId('exam_images')
      app.delete(examImages)
    } catch (_) {}

    try {
      const usFindings = app.findCollectionByNameOrId('ultrasound_findings')
      app.delete(usFindings)
    } catch (_) {}
  },
)
