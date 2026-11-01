/**
 * MÁSCARAS MUSCULOESQUELÉTICAS PARAMETRIZADAS (COTOVELO, PUNHO, MÃO, QUADRIL, TORNOZELO, PÉ, TENDÃO DE AQUILES)
 *
 * REGRA DO CONTRATO:
 * NÃO aplicar o modelo de ombro em outra articulação!
 * Cada articulação possui suas estruturas anatômicas próprias e descritores clínicos específicos.
 */

import type { ClinicalMaskDefinition } from './clinicalMasksRegistry'

export const MSK_SPECIFIC_MASKS_REGISTRY: Record<string, ClinicalMaskDefinition> = {
  // COTOVELO
  mask_cotovelo: {
    id: 'mask_cotovelo',
    code: 'US-MASK-MSK-COT-01',
    name: 'Máscara Articular de Cotovelo',
    version: '1.0.0',
    category: 'musculoesqueletico',
    technique:
      'Exame ultrassonográfico do cotovelo com transdutor linear de alta frequência nos compartimentos anterior, medial, lateral e posterior.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia de Cotovelo Direito',
      'Ultrassonografia de Cotovelo Esquerdo',
      'Ultrassonografia de Cotovelos Bilateral',
      'Ultrassonografia de Cotovelo',
    ],
    sections: [
      {
        id: 'tendao_biceps_distal',
        label: 'Compartimento Anterior (Tendão Distal do Bíceps e Braquial)',
        anatomicalStructure: 'Bíceps Distal',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Tendão distal do bíceps braquial íntegro até a tuberosidade do rádio, sem descontinuidades, espessamento ou derrame na bursa bicipitorradial. Músculo braquial anatômico.',
      },
      {
        id: 'tendao_extensor_comum',
        label: 'Compartimento Lateral (Tendão Extensor Comum / Epicôndilo Lateral)',
        anatomicalStructure: 'Extensor Comum',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Tendão extensor comum dos dedos íntegro na sua inserção no epicôndilo lateral, com padrão fibrilar conservado, sem microrroturas, calcificações ou sinais de epicondilite lateral.',
      },
      {
        id: 'tendao_flexor_comum',
        label: 'Compartimento Medial (Tendão Flexor Comum e Ligamento Colateral Ulnar)',
        anatomicalStructure: 'Flexor Comum',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Tendão flexor comum com espessura e ecotextura normais no epicôndilo medial, sem sinais de epicondilite medial (cotovelo do golfista). Ligamento colateral ulnar íntegro.',
      },
      {
        id: 'tendao_triceps_olecrano',
        label: 'Compartimento Posterior (Tendão Tricipital, Fossa Olecraniana e Nervo Ulnar)',
        anatomicalStructure: 'Tríceps e Nervo Ulnar',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Tendão tricipital íntegro na inserção no olécrano. Bursa olecraniana sem derrame ou espessamento. Recesso posterior sem derrame articular. Nervo ulnar normoposicionado no túnel cubital, sem subluxação ou espessamento à flexão dinâmica.',
      },
    ],
  },

  // PUNHO
  mask_punho: {
    id: 'mask_punho',
    code: 'US-MASK-MSK-PUN-01',
    name: 'Máscara Articular de Punho',
    version: '1.0.0',
    category: 'musculoesqueletico',
    technique:
      'Exame ultrassonográfico do punho com transdutor linear multifrequencial de alta resolução nos compartimentos dorsal e volar.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia de Punho Direito',
      'Ultrassonografia de Punho Esquerdo',
      'Ultrassonografia de Punhos Bilateral',
      'Ultrassonografia de Punho',
    ],
    sections: [
      {
        id: 'tunel_do_carpo_nervo_mediano',
        label: 'Túnel do Carpo e Nervo Mediano',
        anatomicalStructure: 'Túnel do Carpo',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Nervo mediano com área de secção transversa preservada na entrada do túnel do carpo (área <= 10 mm²), sem achatamento patológico ou hipoecogenicidade fascicular (sem evidência de síndrome do túnel do carpo). Retináculo dos flexores com espessura normal.',
      },
      {
        id: 'tendoes_flexores',
        label: 'Tendões Flexores dos Dedos e Bainhas Sinoviais',
        anatomicalStructure: 'Tendões Flexores',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Tendões flexores superficiais e profundos dos dedos com ecotextura fibrilar e deslizamento dinâmico preservados, sem líquido nas bainhas tenossinoviais.',
      },
      {
        id: 'compartimentos_extensores_dorsais',
        label: 'Compartimentos Extensores Dorsais (I a VI) / De Quervain',
        anatomicalStructure: 'Extensores Dorsais',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Primeiro compartimento extensor dorsal (abdutor longo e extensor curto do polegar) com espessura normal, sem espessamento retinacular ou tenossinovite de De Quervain. Demais compartimentos extensores dorsais preservados.',
      },
      {
        id: 'recessos_articulares_radiocarpico',
        label: 'Recessos Articulares Radiocárpico e Intercárpico',
        anatomicalStructure: 'Recessos Articulares',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Recessos articulares radiocárpico, mediocárpico e radioulnar distal sem derrame articular ou proliferação sinovial. Ausência de cistos sinoviais dorsais ou volares.',
      },
    ],
  },

  // TORNOZELO
  mask_tornozelo: {
    id: 'mask_tornozelo',
    code: 'US-MASK-MSK-TOR-01',
    name: 'Máscara Articular de Tornozelo',
    version: '1.0.0',
    category: 'musculoesqueletico',
    technique:
      'Exame ultrassonográfico do tornozelo com transdutor linear de alta frequência nos compartimentos lateral, medial, anterior e posterior.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia de Tornozelo Direito',
      'Ultrassonografia de Tornozelo Esquerdo',
      'Ultrassonografia de Tornozelos Bilateral',
      'Ultrassonografia de Tornozelo',
    ],
    sections: [
      {
        id: 'ligamentos_laterais',
        label: 'Compartimento Lateral (Ligamentos Talofibular Anterior e Calcaneofibular)',
        anatomicalStructure: 'Ligamentos Laterais',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Ligamento talofibular anterior (LTFA) e ligamento calcaneofibular (LCF) contínuos, com espessura e tensão normais, sem descontinuidades, espessamentos ou sinais de entorse prévia/aguda. Tendões fibulares longo e curto íntegros em sua goteira retromaleolar.',
      },
      {
        id: 'compartimento_medial_deltoide',
        label: 'Compartimento Medial (Ligamento Deltóide e Tendão Tibial Posterior)',
        anatomicalStructure: 'Compartimento Medial',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Tendão tibial posterior, flexor longo dos dedos e flexor longo do hálux íntegros no túnel do tarso, com bainhas sinoviais sem distensão líquida. Ligamento deltóide contínuo e bem caracterizado.',
      },
      {
        id: 'compartimento_anterior',
        label: 'Compartimento Anterior (Tendão Tibial Anterior e Extensores)',
        anatomicalStructure: 'Compartimento Anterior',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Tendão tibial anterior, extensor longo do hálux e extensor longo dos dedos preservados. Recesso articular tíbio-talar anterior sem derrame ou sinovite.',
      },
      {
        id: 'recesso_posterior',
        label: 'Recesso Articular Posterior',
        anatomicalStructure: 'Recesso Posterior',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Recesso articular tíbio-talar posterior sem acúmulo patológico de líquido. Gordura de Kager preservada.',
      },
    ],
  },

  // TENDÃO DE AQUILES (CALCÂNEO)
  mask_tendao_aquiles: {
    id: 'mask_tendao_aquiles',
    code: 'US-MASK-MSK-AQUI-01',
    name: 'Máscara de Tendão de Aquiles (Tendão Calcâneo)',
    version: '1.0.0',
    category: 'musculoesqueletico',
    technique:
      'Exame ultrassonográfico do tendão calcâneo (Aquiles) e fáscia plantar realizado com transdutor linear de alta frequência em cortes longitudinais e transversais.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia de Tendão de Aquiles Direito (Calcâneo)',
      'Ultrassonografia de Tendão de Aquiles Esquerdo (Calcâneo)',
      'Ultrassonografia de Tendão de Aquiles',
    ],
    sections: [
      {
        id: 'corpo_tendineo_aquiles',
        label: 'Corpo Tendíneo do Tendão de Aquiles e Transição Miotendínea',
        anatomicalStructure: 'Corpo do Aquiles',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Tendão de Aquiles contínuo desde a junção miotendínea até a inserção no calcâneo. Espessura ântero-posterior uniforme e conservada (menor que 6 mm), padrão fibrilar homogêneo e paralelo, sem roturas parciais, áreas de tendinose ou calcificações intratendíneas.',
      },
      {
        id: 'insercao_calcanea_bursas',
        label: 'Entese Calcânea e Bursas Retrocalcânea / Retroaquiléia',
        anatomicalStructure: 'Entese e Bursas',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Inserção na tuberosidade posterior do calcâneo regular, sem entesófitos ou erosões ósseas. Bursa retrocalcânea profunda e bursa subcutânea retroaquiléia normais, sem derrame ou bursite.',
      },
      {
        id: 'gordura_de_kager',
        label: 'Espaço Gorduroso Pré-Aquileano (Trígono de Kager)',
        anatomicalStructure: 'Trígono de Kager',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Coxim gorduroso de Kager homogêneo e preservado, sem herniações ou coleções associadas.',
      },
    ],
  },
}
