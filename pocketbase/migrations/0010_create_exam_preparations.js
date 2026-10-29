/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Create exam_preparations collection if not exists
    let col
    try {
      col = app.findCollectionByNameOrId('exam_preparations')
    } catch (_) {
      col = new Collection({
        name: 'exam_preparations',
        type: 'base',
        // All authenticated users can read instructions
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        // Admins can create, update, delete; Secretaria can create/update if needed
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'Administrador' || @request.auth.role = 'Administrador Geral')",
        fields: [
          { name: 'exam_type', type: 'text', required: true },
          { name: 'specialty', type: 'text', required: false },
          { name: 'instructions', type: 'text', required: true },
          { name: 'general_notice', type: 'text', required: false },
          { name: 'is_active', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_exam_prep_type ON exam_preparations (exam_type)'],
      })
      app.save(col)
    }

    // 2. Default preparations seed data
    const defaultPreparations = [
      {
        exam_type: 'Ultrassonografia Abdome Total',
        specialty: 'Ultrassonografia Geral',
        instructions:
          'Jejum absoluto de 8 horas (inclusive líquidos e chimarrão). Bexiga confortavelmente cheia (tomar 4 a 5 copos de água 1 hora antes do exame e não urinar). Evitar alimentos que formam gases no dia anterior (refrigerantes, leite, feijão, frituras). Não fumar na manhã do exame.',
        general_notice:
          'Trazer exames anteriores, documentos pessoais, cartão SUS e chegar 15 minutos antes do horário agendado.',
      },
      {
        exam_type: 'Ultrassonografia Abdome Superior',
        specialty: 'Ultrassonografia Geral',
        instructions:
          'Jejum absoluto de 8 horas de alimentos sólidos e gordurosos. Tomar medicamentos de uso contínuo apenas com pequenos goles de água. Não é necessário encher a bexiga.',
        general_notice:
          'Trazer exames anteriores, documentos e chegar com 15 minutos de antecedência.',
      },
      {
        exam_type: 'Ultrassonografia Aparelho Urinário',
        specialty: 'Urologia / Nefrologia',
        instructions:
          'Não necessita de jejum alimentar. Bexiga bem cheia: beber 4 a 6 copos de água de 1h a 1h30 antes do exame e reter a urina até a realização do procedimento.',
        general_notice: 'Trazer exames de urina e ultrassons anteriores, se houver.',
      },
      {
        exam_type: 'Ultrassonografia Pélvica Ginecológica',
        specialty: 'Ginecologia',
        instructions:
          'Bexiga cheia: ingerir 1 litro de água (4 a 5 copos) 1 hora antes do exame e não urinar. O exame requer repleção vesical para boa janela acústica.',
        general_notice: 'Trazer exames ginecológicos anteriores e cartão do SUS.',
      },
      {
        exam_type: 'Ultrassonografia Transvaginal',
        specialty: 'Ginecologia',
        instructions:
          'Esvaziar completamente a bexiga imediatamente antes de entrar na sala de exame. Não requer jejum nem bexiga cheia.',
        general_notice:
          'Trazer exames anteriores ginecológicos/obstétricos e comparecer com roupas confortáveis de duas peças.',
      },
      {
        exam_type: 'Ultrassonografia Mama Bilateral',
        specialty: 'Mastologia',
        instructions:
          'Melhor período para realização: semana seguinte ao término da menstruação (mamas menos densas e doloridas). No dia do exame, não utilizar cremes, desodorantes, talcos ou pomadas na região das mamas e axilas.',
        general_notice: 'Fundamental trazer mamografias anteriores e biópsias, caso possua.',
      },
      {
        exam_type: 'Ultrassonografia Obstétrica',
        specialty: 'Obstetrícia',
        instructions:
          'Até 12 semanas de gestação: bexiga confortavelmente cheia (beber 2 a 3 copos de água 40 minutos antes). Acima de 12 semanas: não é necessário encher a bexiga nem fazer jejum.',
        general_notice:
          'Obrigatório trazer caderneta da gestante / cartão de pré-natal e ultrassonografias anteriores.',
      },
      {
        exam_type: 'Ultrassonografia Obstétrica com Doppler',
        specialty: 'Obstetrícia',
        instructions:
          'Alimentar-se normalmente 1 a 2 horas antes do exame (o feto costuma movimentar-se melhor após alimentação materna leve). Não necessita bexiga cheia.',
        general_notice:
          'Trazer caderneta da gestante, exames de pré-natal e ultrassons anteriores.',
      },
      {
        exam_type: 'Ultrassonografia Morfológica (1º ou 2º Trimestre)',
        specialty: 'Obstetrícia',
        instructions:
          'Não necessita jejum. Recomenda-se ingestão de um lanche leve ou chocolate cerca de 30 minutos antes caso orientada. Não aplicar hidratantes ou óleos na barriga no dia do exame.',
        general_notice: 'Trazer toda a documentação da gestação e caderneta do pré-natal.',
      },
      {
        exam_type: 'Ultrassonografia Tireoide com Doppler',
        specialty: 'Endocrinologia / Cabeça e Pescoço',
        instructions:
          'Não requer jejum alimentar nem preparo de bexiga. Evitar o uso de colares, gargantilhas e roupas de gola alta no dia do exame.',
        general_notice:
          'Trazer exames anteriores de tireoide (ultrassons, dosagens hormonais TSH/T4L e punções prévias se houver).',
      },
      {
        exam_type: 'Ultrassonografia Articular (Ombro)',
        specialty: 'Ortopedia / Reumatologia',
        instructions:
          'Não requer jejum nem preparo especial. Vestir camisa de mangas curtas, regata ou de fácil remoção na região do ombro a ser avaliado.',
        general_notice:
          'Trazer exames anteriores da articulação (raios-X, ressonâncias ou ultrassons prévios).',
      },
      {
        exam_type: 'Ultrassonografia Doppler de Carótidas e Vertebrais',
        specialty: 'Angiologia / Cirurgia Vascular',
        instructions:
          'Não requer jejum alimentar. Evitar camisas ou blusas de gola alta e colares no pescoço.',
        general_notice: 'Trazer exames vasculares prévios e lista de medicações em uso.',
      },
      {
        exam_type: 'Ultrassonografia Músculo-esquelética',
        specialty: 'Ortopedia',
        instructions:
          'Sem necessidade de jejum. Usar roupas confortáveis que facilitem o acesso à região anatômica solicitada.',
        general_notice: 'Trazer exames de imagem anteriores da mesma área avaliada.',
      },
      {
        exam_type: 'Ultrassonografia de Próstata Via Abdominal',
        specialty: 'Urologia',
        instructions:
          'Bexiga cheia: beber 4 a 6 copos de água de 1h a 1h30 antes do exame e não urinar. O exame inclui avaliação da bexiga cheia e após micção completa.',
        general_notice: 'Trazer exames anteriores de próstata e PSA recente se possuir.',
      },
    ]

    for (const prep of defaultPreparations) {
      let record = null
      try {
        record = app.findFirstRecordByData('exam_preparations', 'exam_type', prep.exam_type)
      } catch (_) {}

      if (!record) {
        record = new Record(col)
        record.set('exam_type', prep.exam_type)
        record.set('specialty', prep.specialty)
        record.set('instructions', prep.instructions)
        record.set('general_notice', prep.general_notice)
        record.set('is_active', true)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('exam_preparations')
      app.delete(col)
    } catch (_) {}
  },
)
