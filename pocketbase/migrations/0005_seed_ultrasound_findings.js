migrate(
  (app) => {
    // Find admin/doctor user
    let user
    try {
      user = app.findFirstRecordByData('_pb_users_auth_', 'email', 'lwscarvalho@gmail.com')
    } catch (_) {
      try {
        const users = app.findRecordsByFilter('_pb_users_auth_', '', '-created', 1, 0)
        if (users && users.length > 0) user = users[0]
      } catch (_) {}
    }

    if (!user) return

    const usFindings = app.findCollectionByNameOrId('ultrasound_findings')

    const initialFindings = [
      // FÍGADO
      {
        organ: 'figado',
        title: 'Fígado normal',
        finding_type: 'normal',
        is_default_normal: true,
        text_content:
          'Fígado com dimensões normais, contornos regulares, bordas afiladas e ecotextura homogênea, sem evidência de lesões focais sólidas ou císticas suspeitas. Veias hepáticas e ramos portais com calibre e trajeto preservados.',
      },
      {
        organ: 'figado',
        title: 'Esteatose hepática moderada (Grau II) - Exemplo',
        finding_type: 'patologico',
        is_default_normal: false,
        has_variables: true,
        text_content:
          'Fígado com dimensões discretamente aumentadas, exibindo aumento difuso da ecogenicidade parenquimatosa com atenuação acústica posterior moderada e atenuação na visualização dos ramos portais periféricos, compatível com infiltração gordurosa (esteatose hepática grau II).',
      },
      {
        organ: 'figado',
        title: 'Cisto hepático simples - Exemplo editável',
        finding_type: 'patologico',
        is_default_normal: false,
        has_variables: true,
        text_content:
          'Imagem anecoica, arredondada, de paredes finas e reforço acústico posterior, medindo aproximadamente [DIMENSOES_MM] mm, localizada no segmento [SEGMENTO], compatível com cisto hepático simples.',
      },

      // VESÍCULA BILIAR
      {
        organ: 'vesicula',
        title: 'Vesícula biliar normal',
        finding_type: 'normal',
        is_default_normal: true,
        text_content:
          'Vesícula biliar com formato, dimensões e tópica habituais, de paredes finas e lisas, conteúdo anecoico e homogêneo, sem cálculos ou espessamentos parietais detectáveis.',
      },
      {
        organ: 'vesicula',
        title: 'Colelitíase com cálculo móvel - Exemplo editável',
        finding_type: 'patologico',
        is_default_normal: false,
        has_variables: true,
        text_content:
          'Vesícula biliar normodistendida, observando-se imagem hiperecogênica no seu interior móvel às mudanças de decúbito, com sombra acústica posterior nítida, medindo cerca de [DIMENSOES_MM] mm, compatível com cálculo biliar (colelitíase). Paredes com espessura preservada e sem sinais de colecistite aguda.',
      },
      {
        organ: 'vesicula',
        title: 'Pólipo de vesícula biliar - Exemplo editável',
        finding_type: 'patologico',
        is_default_normal: false,
        has_variables: true,
        text_content:
          'Pequena formação polipoide fixa à parede, hiperecogênica, sem sombra acústica posterior, medindo cerca de [DIMENSOES_MM] mm, compatível com pólipo de colesterol/adenomioma.',
      },

      // VIAS BILIARES
      {
        organ: 'vias_biliares',
        title: 'Vias biliares normais',
        finding_type: 'normal',
        is_default_normal: true,
        text_content:
          'Vias biliares intra e extra-hepáticas com calibre preservado. Colédoco com diâmetro dentro dos limites da normalidade (calibre usual de até 6 mm).',
      },
      {
        organ: 'vias_biliares',
        title: 'Ectasia de vias biliares - Exemplo editável',
        finding_type: 'patologico',
        is_default_normal: false,
        has_variables: true,
        text_content:
          'Ectasia de vias biliares intra e extra-hepáticas, com colédoco medindo cerca de [DIMENSOES_MM] mm de calibre.',
      },

      // PÂNCREAS
      {
        organ: 'pancreas',
        title: 'Pâncreas normal',
        finding_type: 'normal',
        is_default_normal: true,
        text_content:
          'Pâncreas visualizado em seus segmentos acessíveis (cabeça e corpo), com contornos regulares, espessura anatômica preservada e ecotextura habitual. Ducto pancreático principal (Wirsung) não dilatado.',
      },
      {
        organ: 'pancreas',
        title: 'Pâncreas com interposição gasosa parcial',
        finding_type: 'normal',
        is_default_normal: false,
        text_content:
          'Pâncreas com visualização parcialmente limitada por interposição de gás gastrointestinal, identificando-se contornos e ecotextura aparentes preservados na cabeça e no corpo.',
      },

      // BAÇO
      {
        organ: 'baco',
        title: 'Baço normal',
        finding_type: 'normal',
        is_default_normal: true,
        text_content:
          'Baço de contornos regulares, dimensões normais, índice esplênico preservado e ecotextura homogênea, sem lesões focais ou sinais de esplenomegalia.',
      },
      {
        organ: 'baco',
        title: 'Esplenomegalia homogênea - Exemplo editável',
        finding_type: 'patologico',
        is_default_normal: false,
        has_variables: true,
        text_content:
          'Baço com aumento volumétrico global, mantendo contornos regulares e ecotextura homogênea, com diâmetro longitudinal medindo cerca de [DIMENSOES_MM] mm (esplenomegalia).',
      },

      // RIM DIREITO
      {
        organ: 'rim_direito',
        title: 'Rim direito normal',
        finding_type: 'normal',
        is_default_normal: true,
        text_content:
          'Rim direito de situação, contornos e mobilidade respiratória habituais. Dimensões anatômicas preservadas, espessura e ecogenicidade corticais adequadas com boa diferenciação cortiço-medular. Ausência de cálculos, dilatação do sistema pielocalicinal ou massas sólidas.',
      },
      {
        organ: 'rim_direito',
        title: 'Nefrolitíase rim direito - Exemplo editável',
        finding_type: 'patologico',
        is_default_normal: false,
        has_variables: true,
        text_content:
          'Rim direito com imagem hiperecogênica no grupo calicinal [LOCALIZACAO], medindo cerca de [DIMENSOES_MM] mm, com sombra acústica posterior, compatível com cálculo renal (nefrolitíase), sem sinais de hidronefrose associada.',
      },

      // RIM ESQUERDO
      {
        organ: 'rim_esquerdo',
        title: 'Rim esquerdo normal',
        finding_type: 'normal',
        is_default_normal: true,
        text_content:
          'Rim esquerdo de situação, contornos e dimensões anatômicas preservadas. Espessura cortical e ecogenicidade normais, sem evidência de litíase, hidronefrose ou lesões expansivas focais.',
      },
      {
        organ: 'rim_esquerdo',
        title: 'Cisto cortical simples rim esquerdo - Exemplo editável',
        finding_type: 'patologico',
        is_default_normal: false,
        has_variables: true,
        text_content:
          'Rim esquerdo apresentando cisto cortical simples, de conteúdo anecoico e paredes finas, medindo aproximadamente [DIMENSOES_MM] mm, sem septos ou nódulos parietais (Bosniak I).',
      },

      // BEXIGA
      {
        organ: 'bexiga',
        title: 'Bexiga normal',
        finding_type: 'normal',
        is_default_normal: true,
        text_content:
          'Bexiga com repleção satisfatória, paredes finas e regulares, conteúdo anecoico homogêneo, sem imagens sugestivas de litíase ou lesões parietais vegetantes.',
      },
      {
        organ: 'bexiga',
        title: 'Bexiga com repleção parcial',
        finding_type: 'normal',
        is_default_normal: false,
        text_content:
          'Bexiga examinada com repleção urinária apenas parcial, com conteúdo anecoico e paredes sem espessamentos grosseiros detectáveis.',
      },

      // VASOS (AORTA E CAVA)
      {
        organ: 'vasos',
        title: 'Grandes vasos abdominais normais',
        finding_type: 'normal',
        is_default_normal: true,
        text_content:
          'Aorta abdominal e veia cava inferior com trajeto e calibre anatômicos nos segmentos visualizados, sem evidência de ectasias, aneurismas ou tromboses ao método.',
      },

      // RETROPERITÔNIO
      {
        organ: 'retroperitonio',
        title: 'Retroperitônio normal',
        finding_type: 'normal',
        is_default_normal: true,
        text_content:
          'Retroperitônio sem evidência de linfonodomegalias nas cadeias acessíveis ao método. Ausência de líquido livre na cavidade peritoneal examinada.',
      },

      // OBSERVAÇÕES
      {
        organ: 'observacoes',
        title: 'Preparo e condições técnicas satisfatórias',
        finding_type: 'normal',
        is_default_normal: true,
        text_content:
          'Exame realizado após período de jejum e repleção vesical adequada, propiciando boa janela acústica.',
      },

      // CONCLUSÃO
      {
        organ: 'conclusao',
        title: 'Estudo ultrassonográfico de abdome total dentro da normalidade',
        finding_type: 'normal',
        is_default_normal: true,
        text_content:
          'Exame ultrassonográfico do abdome total sem alterações ecográficas significativas no presente estudo.',
      },
      {
        organ: 'conclusao',
        title: 'Esteatose hepática moderada - Exemplo editável',
        finding_type: 'patologico',
        is_default_normal: false,
        text_content:
          '1. Sinais ecográficos de infiltração gordurosa no parênquima hepático (esteatose hepática grau II).\n2. Demais órgãos do abdome total sem alterações ecográficas significativas.',
      },
      {
        organ: 'conclusao',
        title: 'Colelitíase sem sinais inflamatórios agudos - Exemplo editável',
        finding_type: 'patologico',
        is_default_normal: false,
        text_content:
          '1. Colelitíase sem sinais ecográficos de colecistite aguda no momento do exame.\n2. Demais órgãos avaliados do abdome total dentro dos limites da normalidade.',
      },
    ]

    for (const item of initialFindings) {
      try {
        const record = new Record(usFindings)
        record.set('owner_id', user.id)
        record.set('exam_scope', 'ABDOME_TOTAL')
        record.set('organ', item.organ)
        record.set('title', item.title)
        record.set('finding_type', item.finding_type)
        record.set('text_content', item.text_content)
        record.set('is_default_normal', !!item.is_default_normal)
        record.set('is_favorite', item.finding_type === 'normal')
        record.set('is_shared', true)
        record.set('has_variables', !!item.has_variables)
        app.save(record)
      } catch (e) {
        console.log('Error seeding finding: ' + e)
      }
    }
  },
  (app) => {
    // Revert seed
    try {
      const records = app.findRecordsByFilter('ultrasound_findings', 'is_shared = true', '', 100, 0)
      for (const r of records) {
        app.delete(r)
      }
    } catch (_) {}
  },
)
