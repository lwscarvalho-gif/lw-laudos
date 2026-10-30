migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'

    // 1. Criar coleção text_masks
    // RLS:
    // list/view: usuário autenticado e não Operador; pode ler se is_system = true OU owner_id = @request.auth.id
    // create: usuário autenticado e não Operador; cria com owner_id = @request.auth.id e is_system = false
    // update: usuário autenticado e não Operador; apenas dono pode alterar (owner_id = @request.auth.id && is_system = false)
    // delete: usuário autenticado e não Operador; apenas dono pode excluir (owner_id = @request.auth.id && is_system = false)
    const textMasks = new Collection({
      name: 'text_masks',
      type: 'base',
      listRule:
        "@request.auth.id != '' && @request.auth.role != 'Operador' && (is_system = true || owner_id = @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && @request.auth.role != 'Operador' && (is_system = true || owner_id = @request.auth.id)",
      createRule:
        "@request.auth.id != '' && @request.auth.role != 'Operador' && owner_id = @request.auth.id",
      updateRule:
        "@request.auth.id != '' && @request.auth.role != 'Operador' && owner_id = @request.auth.id && is_system = false",
      deleteRule:
        "@request.auth.id != '' && @request.auth.role != 'Operador' && owner_id = @request.auth.id && is_system = false",
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
          name: 'name',
          type: 'text',
          required: true,
          min: 1,
          max: 200,
        },
        {
          name: 'description',
          type: 'text',
          required: false,
          max: 500,
        },
        {
          name: 'exam_type', // ex: 'Ultrassonografia', 'Abdome total', 'Geral'
          type: 'text',
          required: false,
          max: 100,
        },
        {
          name: 'body',
          type: 'text',
          required: true,
          min: 1,
          max: 100000,
        },
        {
          name: 'is_system',
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
        'CREATE INDEX idx_text_masks_owner ON text_masks (owner_id)',
        'CREATE INDEX idx_text_masks_system ON text_masks (is_system)',
        'CREATE INDEX idx_text_masks_type ON text_masks (exam_type)',
      ],
    })
    app.save(textMasks)

    // 2. Localizar usuário de sistema / admin para atribuir como owner_id das máscaras de sistema
    let systemUser
    try {
      systemUser = app.findFirstRecordByData('_pb_users_auth_', 'email', 'lwscarvalho@gmail.com')
    } catch (_) {
      try {
        const users = app.findRecordsByFilter('_pb_users_auth_', '', '-created', 1, 0)
        if (users && users.length > 0) systemUser = users[0]
      } catch (_) {}
    }

    if (!systemUser) return

    const initialMasks = [
      {
        name: 'Abdome total — Normal completo',
        description:
          'Laudo completo padrão com todos os órgãos abdominais sem alterações ecográficas.',
        exam_type: 'Ultrassonografia de abdome total',
        body: `FÍGADO:
Dimensões anatômicas normais, contornos regulares e bordas afiladas. Ecotextura homogênea, sem evidência de lesões focais sólidas ou císticas suspeitas. Veias hepáticas e ramos portais com calibre e trajeto preservados.

VESÍCULA BILIAR:
Tópica habitual, formato e dimensões normais, de paredes finas e lisas. Conteúdo anecoico e homogêneo, sem cálculos ou espessamentos parietais detectáveis.

VIAS BILIARES:
Vias biliares intra e extra-hepáticas de calibre preservado. Colédoco com diâmetro dentro dos limites da normalidade (calibre usual de até 6 mm).

PÂNCREAS:
Visualizado em seus segmentos acessíveis (cabeça e corpo), com contornos regulares, espessura anatômica preservada e ecotextura habitual. Ducto pancreático principal (Wirsung) não dilatado.

BAÇO:
Contornos regulares, dimensões normais, índice esplênico preservado e ecotextura homogênea, sem lesões focais ou sinais de esplenomegalia.

RINS (DIREITO E ESQUERDO):
Rins de situação, contornos e mobilidade respiratória habituais. Dimensões anatômicas preservadas, espessura e ecogenicidade corticais adequadas com boa diferenciação cortiço-medular. Ausência de cálculos, dilatação do sistema pielocalicinal ou massas sólidas parenquimatosas.

BEXIGA:
Repleção satisfatória, paredes finas e regulares, conteúdo anecoico homogêneo, sem imagens sugestivas de litíase ou lesões parietais vegetantes.

AORTA E RETROPERITÔNIO:
Aorta abdominal e veia cava inferior com calibre anatômico nos segmentos visualizados. Ausência de linfonodomegalias retroperitoneais acessíveis ao método. Ausência de líquido livre na cavidade peritoneal.

CONCLUSÃO:
Exame ultrassonográfico do abdome total dentro dos limites da normalidade no presente estudo.`,
      },
      {
        name: 'Abdome total — Litíase biliar (Colelitíase)',
        description:
          'Cálculo biliar móvel com sombra acústica posterior sem sinais de colecistite aguda.',
        exam_type: 'Ultrassonografia de abdome total',
        body: `FÍGADO:
Dimensões normais, contornos regulares e ecotextura homogênea, sem lesões focais suspeitas. Veias hepáticas e ramos portais pérvios e anatômicos.

VESÍCULA BILIAR:
Normodistendida, observando-se imagem hiperecogênica no seu interior móvel às mudanças de decúbito, com sombra acústica posterior nítida, medindo cerca de [DIMENSOES_MM] mm, compatível com cálculo biliar (colelitíase). Paredes com espessura preservada (inferior a 3 mm), sem líquido perivesicular ou sinal de Murphy ultrassonográfico (ausência de sinais de colecistite aguda).

VIAS BILIARES:
Vias biliares intra e extra-hepáticas sem dilatações. Colédoco de calibre normal.

PÂNCREAS:
Visualização de contornos e espessura habituais, ecotextura homogênea. Ducto de Wirsung não dilatado.

BAÇO:
Morfologia e dimensões normais, ecotextura preservada.

RINS:
Rins tópicos, dimensões anatômicas preservadas, boa diferenciação cortiço-medular. Ausência de cálculos ou hidronefrose bilateralmente.

BEXIGA E CAVIDADE:
Bexiga anecoica, de paredes regulares. Ausência de líquido livre na cavidade abdominal.

CONCLUSÃO:
1. Colelitíase sem sinais ecográficos de colecistite aguda ao exame no momento.
2. Demais órgãos do abdome total avaliados dentro dos padrões normais.`,
      },
      {
        name: 'Abdome total — Esteatose hepática moderada (Grau II)',
        description:
          'Infiltração gordurosa hepática difusa grau II com atenuação acústica posterior.',
        exam_type: 'Ultrassonografia de abdome total',
        body: `FÍGADO:
Dimensões discretamente aumentadas, bordas rombas e contornos regulares. Observa-se aumento difuso da ecogenicidade parenquimatosa com moderada atenuação acústica posterior e atenuação na visualização dos ramos portais periféricos e diafragma, achados compatíveis com infiltração gordurosa difusa (esteatose hepática moderada - grau II). Ausência de lesões focais expansivas sólidas ou císticas.

VESÍCULA BILIAR:
Tópica, dimensões preservadas, paredes finas e regulares, conteúdo anecoico homogêneo, sem litíase.

VIAS BILIARES:
Calibre preservado intra e extra-hepático.

PÂNCREAS:
Dimensões e ecotextura preservadas nos segmentos visibilizados.

BAÇO:
Dimensões anatômicas preservadas, ecotextura homogênea.

RINS:
Rins tópicos com dimensões, ecogenicidade cortical e diferenciação cortiço-medular preservadas. Ausência de litíase ou ectasia pielocalicinal.

BEXIGA E CAVIDADE:
Bexiga bem replecionada, de paredes finas. Sem líquido livre na cavidade peritoneal examinada.

CONCLUSÃO:
1. Sinais ecográficos de infiltração gordurosa no parênquima hepático (esteatose hepática moderada / grau II).
2. Demais órgãos do abdome total sem alterações ecográficas significativas.`,
      },
      {
        name: 'Abdome total — Nefrolitíase (Cálculo renal)',
        description: 'Cálculo renal em grupo calicinal com sombra acústica posterior.',
        exam_type: 'Ultrassonografia de abdome total',
        body: `FÍGADO:
Dimensões anatômicas normais, contornos regulares, ecotextura homogênea, sem lesões focais.

VESÍCULA E VIAS BILIARES:
Vesícula biliar normodistendida de paredes finas, sem cálculos. Vias biliares sem ectasia.

PÂNCREAS E BAÇO:
Pâncreas e baço com morfologia e ecotextura preservadas, sem lesões nodulares ou aumento volumétrico.

RINS:
Rim direito: Tópico, com dimensões normais. Identifica-se imagem hiperecogênica no grupo calicinal [médio/inferior/superior], medindo aproximadamente [DIMENSOES_MM] mm, associada a sombra acústica posterior, compatível com cálculo renal (nefrolitíase), sem sinais de dilatação pielocalicinal ou adelgaçamento cortical.
Rim esquerdo: Tópico, dimensões e contornos preservados, relação cortiço-medular mantida. Ausência de litíase ou hidronefrose.

BEXIGA:
Repleção adequada, paredes lisas e conteúdo anecoico homogêneo. Jatos ureterais presentes ao Doppler colorido.

CAVIDADE:
Ausência de líquido livre intraperitoneal.

CONCLUSÃO:
1. Nefrolitíase à direita [ou esquerda], sem sinais de nefropatia obstrutiva (ausência de hidronefrose).
2. Demais estruturas abdominais examinadas dentro dos limites da normalidade.`,
      },
      {
        name: 'Abdome total — Ascite / Líquido livre na cavidade',
        description:
          'Líquido livre intraperitoneal (recessos hepatorrenal, esplenorrenal e escavação pélvica).',
        exam_type: 'Ultrassonografia de abdome total',
        body: `FÍGADO:
Dimensões normais a discretamente reduzidas, contornos discretamente irregulares/serrilhados, ecotextura heterogênea. Veia porta com calibre medindo [CALIBRE_MM] mm e fluxo hepatopetal.

VESÍCULA BILIAR:
Dimensões preservadas, observando-se discreto espessamento parietal difuso e reacional, sem cálculo no interior.

PÂNCREAS E BAÇO:
Pâncreas com visualização parcialmente limitada pela interposição gasosa e líquido. Baço de dimensões aumentadas (esplenomegalia discreta a moderada), ecotextura homogênea.

RINS:
Rins tópicos de dimensões anatômicas preservadas, espessura parenquimatosa adequada bilateralmente, sem litíase ou dilatação do sistema coletor.

CAVIDADE ABDOMINAL E PÉLVICA:
Presença de líquido livre intraperitoneal em moderada [ou grande] quantidade, distribuído nos recessos hepatorrenal (espaço de Morrison), goteiras parietocólicas e na escavação pélvica (fundo de saco de Douglas), de aspecto anecoico.

BEXIGA:
Paredes finas, conteúdo homogêneo.

CONCLUSÃO:
1. Líquido livre na cavidade peritoneal (ascite) em moderada quantidade.
2. Alterações parenquimatosas hepáticas e esplenomegalia conforme descrito acima.`,
      },
    ]

    for (const item of initialMasks) {
      try {
        const record = new Record(textMasks)
        record.set('owner_id', systemUser.id)
        record.set('name', item.name)
        record.set('description', item.description)
        record.set('exam_type', item.exam_type)
        record.set('body', item.body)
        record.set('is_system', true)
        app.save(record)
      } catch (e) {
        console.log('Error seeding text mask: ' + e)
      }
    }
  },
  (app) => {
    try {
      const textMasks = app.findCollectionByNameOrId('text_masks')
      app.delete(textMasks)
    } catch (_) {}
  },
)
