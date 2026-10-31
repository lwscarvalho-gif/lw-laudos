migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const usersId = users.id

    const recCol = new Collection({
      name: 'dicom_reconciliation_queue',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'study_instance_uid', type: 'text' },
        { name: 'series_instance_uid', type: 'text' },
        { name: 'sop_instance_uid', type: 'text' },
        { name: 'accession_number', type: 'text' },
        { name: 'patient_id_dicom', type: 'text' },
        { name: 'patient_name_dicom', type: 'text' },
        { name: 'modality', type: 'text' },
        { name: 'study_description', type: 'text' },
        { name: 'file_name', type: 'text', required: true },
        { name: 'file_size', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['unidentified', 'ambiguous', 'reconciled', 'dismissed'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'confidence',
          type: 'select',
          values: ['high', 'medium', 'low', 'none'],
          maxSelect: 1,
        },
        { name: 'match_reason', type: 'text' },
        { name: 'matched_patient_id', type: 'text' },
        { name: 'matched_patient_name', type: 'text' },
        { name: 'matched_exam_id', type: 'text' },
        { name: 'matched_appointment_id', type: 'text' },
        { name: 'frames_count', type: 'number' },
        { name: 'dicom_file', type: 'file', maxSelect: 1, maxSize: 104857600 },
        { name: 'preview_image', type: 'file', maxSelect: 1, maxSize: 10485760 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_dicom_rec_status ON dicom_reconciliation_queue (status)',
        'CREATE INDEX idx_dicom_rec_accession ON dicom_reconciliation_queue (accession_number)',
      ],
    })
    app.save(recCol)

    const logsCol = new Collection({
      name: 'dicom_transfer_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'device_ae', type: 'text' },
        { name: 'calling_ip', type: 'text' },
        { name: 'action', type: 'text', required: true }, // C-ECHO, C-STORE, MANUAL-IMPORT
        {
          name: 'status',
          type: 'select',
          values: ['SUCCESS', 'FAILED', 'WARNING'],
          maxSelect: 1,
          required: true,
        },
        { name: 'details', type: 'text' },
        { name: 'sop_uid', type: 'text' },
        { name: 'accession_number', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_dicom_log_action ON dicom_transfer_logs (action)',
        'CREATE INDEX idx_dicom_log_created ON dicom_transfer_logs (created DESC)',
      ],
    })
    app.save(logsCol)
  },
  (app) => {
    const l = app.findCollectionByNameOrId('dicom_transfer_logs')
    if (l) app.delete(l)
    const r = app.findCollectionByNameOrId('dicom_reconciliation_queue')
    if (r) app.delete(r)
  },
)
