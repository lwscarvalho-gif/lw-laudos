/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Add default duration_minutes to exam_preparations if not exists
    try {
      const col = app.findCollectionByNameOrId('exam_preparations')
      if (col && !col.fields.getByName('duration_minutes')) {
        col.fields.add(
          new NumberField({
            name: 'duration_minutes',
            required: false,
            min: 5,
            max: 240,
          }),
        )
        app.save(col)
      }
    } catch (_) {}

    // 2. Set default initial durations for catalog items if duration_minutes is empty
    try {
      const defaultDurations = {
        'Ultrassonografia Abdome Total': 30,
        'Ultrassonografia Abdome Superior': 20,
        'Ultrassonografia Aparelho Urinário': 20,
        'Ultrassonografia Pélvica Ginecológica': 20,
        'Ultrassonografia Transvaginal': 20,
        'Ultrassonografia Mama Bilateral': 30,
        'Ultrassonografia Obstétrica': 30,
        'Ultrassonografia Obstétrica com Doppler': 40,
        'Ultrassonografia Morfológica (1º ou 2º Trimestre)': 45,
        'Ultrassonografia Tireoide com Doppler': 20,
        'Ultrassonografia Articular (Ombro)': 20,
        'Ultrassonografia Doppler de Carótidas e Vertebrais': 30,
        'Ultrassonografia Músculo-esquelética': 20,
        'Ultrassonografia de Próstata Via Abdominal': 10,
      }

      const preps = app.findRecordsByFilter('exam_preparations', '1=1', '', 500)
      for (const prep of preps) {
        const type = prep.getString('exam_type')
        const currentDur = prep.getInt('duration_minutes')
        if (!currentDur && defaultDurations[type]) {
          prep.set('duration_minutes', defaultDurations[type])
          app.save(prep)
        }
      }
    } catch (_) {}

    // 3. Add exam_durations_config (json) to users collection for doctor-specific overrides
    // Maps { [exam_type: string]: number } so each doctor has their own preferred duration
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      if (users && !users.fields.getByName('exam_durations_config')) {
        users.fields.add(
          new JSONField({
            name: 'exam_durations_config',
            required: false,
            maxSize: 524288,
          }),
        )
        app.save(users)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('exam_preparations')
      if (col && col.fields.getByName('duration_minutes')) {
        col.fields.removeByName('duration_minutes')
        app.save(col)
      }
    } catch (_) {}

    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      if (users && users.fields.getByName('exam_durations_config')) {
        users.fields.removeByName('exam_durations_config')
        app.save(users)
      }
    } catch (_) {}
  },
)
