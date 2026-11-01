/**
 * ESQUEMA UNIVERSAL DE MÁSCARAS CLÍNICAS E CATÁLOGO REFERENCIAL DE PROCEDIMENTOS
 *
 * LW Laudos - Arquitetura de 3 Camadas:
 * CAMADA 1: Catálogo Único de Procedimentos (clinic_procedures)
 * CAMADA 2: Biblioteca de Máscaras Clínicas Estruturadas e Versionadas
 * CAMADA 3: Editor Universal Dinâmico e Interpretador
 *
 * Estados de Máscara:
 * - 'ESTRUTURADA_E_TESTADA'
 * - 'ESTRUTURADA_AGUARDANDO_REVISAO_CLINICA'
 * - 'PARCIAL'
 * - 'TEXTO_LIVRE_SEGURO'
 * - 'BLOQUEADA'
 */

export type ClinicalMaskStatus =
  | 'ESTRUTURADA_E_TESTADA'
  | 'ESTRUTURADA_AGUARDANDO_REVISAO_CLINICA'
  | 'PARCIAL'
  | 'TEXTO_LIVRE_SEGURO'
  | 'BLOQUEADA'

export interface ClinicalFieldDefinition {
  id: string
  label: string
  placeholder?: string
  required?: boolean
  unit?: string
  decimals?: number
  helpText?: string
}

export interface ClinicalSectionDefinition {
  id: string
  label: string
  anatomicalStructure: string
  order: number
  fieldType: 'textarea' | 'measurement' | 'findings_selector' | 'structured_composite'
  required?: boolean
  conditionalVisibility?: string
  laterality?: 'D' | 'E' | 'bilateral' | 'none'
  defaultNormalText?: string
  normalPhraseResumida?: string
  normalPhraseConvencional?: string
  normalPhraseDetalhada?: string
  selectablePhrases?: string[]
  fields?: ClinicalFieldDefinition[]
}

export interface ClinicalMaskDefinition {
  id: string
  code: string
  name: string
  version: string
  compatibleProcedures: string[]
  category:
    | 'abdome'
    | 'geniturinario'
    | 'ginecologia'
    | 'obstetricia'
    | 'tireoide_cervical'
    | 'mamas'
    | 'vascular_doppler'
    | 'musculoesqueletico'
    | 'partes_moles'
    | 'geral'
  technique: string
  status: ClinicalMaskStatus
  sections: ClinicalSectionDefinition[]
  conclusionSuggestions?: string[]
  bodyMarkCompatible?: string
  disallowAutomaticConclusion?: boolean
}

/**
 * BIBLIOTECA DE MÁSCARAS CLÍNICAS VERSIONADAS
 */
export const CLINICAL_MASKS_REGISTRY: Record<string, ClinicalMaskDefinition> = {
  // 1. ABDOME TOTAL
  mask_abdome_total: {
    id: 'mask_abdome_total',
    code: 'US-MASK-ABD-01',
    name: 'Máscara Estruturada de Abdome Total',
    version: '1.0.0',
    category: 'abdome',
    technique:
      'Exame ultrassonográfico do abdome total realizado com transdutor convexo multifrequencial.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia de Abdome Total',
      'Ultrassonografia do Abdome Total',
      'USG Abdome Total',
    ],
    sections: [
      {
        id: 'figado',
        label: 'Fígado',
        anatomicalStructure: 'Fígado',
        order: 1,
        fieldType: 'textarea',
        normalPhraseResumida:
          'Fígado com dimensões, contornos e ecotextura normais. Ausência de lesões focais.',
        normalPhraseConvencional:
          'Fígado com dimensões normais, contornos regulares e bordos afilados. Parênquima homogêneo com ecogenicidade habitual, sem nódulos ou cistos.',
        normalPhraseDetalhada:
          'Fígado tópico, com dimensões normais, contornos anatômicos regulares e bordas afiladas. Ecotextura parenquimatosa homogênea, sem evidências de esteatose ou lesões focais sólidas/císticas. Veias supra-hepáticas e ramo portal pérvios e de calibre fisiológico.',
      },
      {
        id: 'vias_biliares',
        label: 'Vias Biliares',
        anatomicalStructure: 'Vias Biliares',
        order: 2,
        fieldType: 'textarea',
        normalPhraseResumida: 'Vias biliares intra e extra-hepáticas sem dilatações.',
        normalPhraseConvencional:
          'Vias biliares intra e extra-hepáticas de calibre preservado, sem sinais de dilatação ou cálculos.',
        normalPhraseDetalhada:
          'Vias biliares intra e extra-hepáticas com calibre fisiológico preservado. Colédoco de diâmetro luminal normal em toda a sua extensão visualizada, sem imagens sugestivas de litíase ou obstrução.',
      },
      {
        id: 'vesicula',
        label: 'Vesícula Biliar',
        anatomicalStructure: 'Vesícula Biliar',
        order: 3,
        fieldType: 'textarea',
        normalPhraseResumida: 'Vesícula biliar normodistendida, alitiásica.',
        normalPhraseConvencional:
          'Vesícula biliar tópica, normodistendida, com paredes finas e regulares, conteúdo anecóico homogêneo, sem cálculos ou pólipos.',
        normalPhraseDetalhada:
          'Vesícula biliar com morfologia e repleção habituais, paredes finas e regulares (espessura menor que 3 mm), conteúdo límpido anecóico, sem cálculos, espessamentos ou lesões polipoides parietais.',
      },
      {
        id: 'pancreas',
        label: 'Pâncreas',
        anatomicalStructure: 'Pâncreas',
        order: 4,
        fieldType: 'textarea',
        normalPhraseResumida: 'Pâncreas com dimensões e ecotextura normais.',
        normalPhraseConvencional:
          'Pâncreas visualizado em seus segmentos anatômicos, com espessura e ecotextura conservadas, ducto pancreático principal não dilatado.',
        normalPhraseDetalhada:
          'Pâncreas com topografia e dimensões preservadas na cabeça, corpo e cauda visualizada. Ecotextura homogênea, compatível com a faixa etária. Ducto de Wirsung de calibre anatômico, sem dilatações ou calcificações.',
      },
      {
        id: 'baco',
        label: 'Baço',
        anatomicalStructure: 'Baço',
        order: 5,
        fieldType: 'textarea',
        normalPhraseResumida: 'Baço com dimensões preservadas e ecotextura homogênea.',
        normalPhraseConvencional:
          'Baço de contornos regulares, dimensões normais e ecotextura homogênea, sem esplenomegalia ou lesões focais.',
        normalPhraseDetalhada:
          'Baço com localização anatômica habitual, contornos regulares e dimensões normais (diâmetro longitudinal menor que 12 cm). Ecotextura parenquimatosa homogênea, sem nódulos ou coleções periesplênicas.',
      },
      {
        id: 'rim_direito',
        label: 'Rim Direito',
        anatomicalStructure: 'Rim Direito',
        order: 6,
        fieldType: 'textarea',
        laterality: 'D',
        normalPhraseResumida: 'Rim direito tópico, dimensões normais, sem hidronefrose ou cálculo.',
        normalPhraseConvencional:
          'Rim direito tópico, contornos regulares, boa diferenciação corticomedular. Ausência de cálculos, cistos significativos ou dilatação do sistema pielocalicial.',
        normalPhraseDetalhada:
          'Rim direito com topografia, mobilidade e contornos normais. Espessura e ecogenicidade corticais preservadas com nítida diferenciação corticomedular. Sistema coletor sem ectasias ou imagens de litíase.',
      },
      {
        id: 'rim_esquerdo',
        label: 'Rim Esquerdo',
        anatomicalStructure: 'Rim Esquerdo',
        order: 7,
        fieldType: 'textarea',
        laterality: 'E',
        normalPhraseResumida:
          'Rim esquerdo tópico, dimensões normais, sem hidronefrose ou cálculo.',
        normalPhraseConvencional:
          'Rim esquerdo tópico, contornos regulares, boa diferenciação corticomedular. Ausência de cálculos, cistos significativos ou dilatação do sistema pielocalicial.',
        normalPhraseDetalhada:
          'Rim esquerdo com topografia, mobilidade e contornos normais. Parênquima com espessura conservada e adequada diferenciação corticomedular. Sistema coletor sem dilatação ou cálculos ecograficamente identificáveis.',
      },
      {
        id: 'bexiga',
        label: 'Bexiga',
        anatomicalStructure: 'Bexiga',
        order: 8,
        fieldType: 'textarea',
        normalPhraseResumida: 'Bexiga com boa repleção e paredes lisas.',
        normalPhraseConvencional:
          'Bexiga urinária com repleção adequada, paredes finas e regulares, conteúdo anecóico homogêneo, sem lesões vegetantes ou cálculos.',
        normalPhraseDetalhada:
          'Bexiga urinária com repleção adequada, contornos regulares, paredes de espessura conservada, conteúdo límpido anecóico, sem litíase vesical ou massas parietais.',
      },
      {
        id: 'vasos_retroperitonio',
        label: 'Grandes Vasos e Retroperitônio',
        anatomicalStructure: 'Retroperitônio',
        order: 9,
        fieldType: 'textarea',
        normalPhraseResumida:
          'Aorta e veia cava inferior de calibre normal. Sem linfonodomegalias.',
        normalPhraseConvencional:
          'Aorta abdominal e veia cava inferior de trajeto e calibre normais. Ausência de massas ou linfonodomegalias retroperitoneais visualizáveis.',
        normalPhraseDetalhada:
          'Aorta abdominal e veia cava inferior com trajeto e calibres fisiológicos preservados. Não foram evidenciadas massas expansivas, aneurismas ou linfonodomegalias retroperitoneais nos limites do método.',
      },
      {
        id: 'cavidade_peritoneal',
        label: 'Cavidade Peritoneal',
        anatomicalStructure: 'Cavidade Peritoneal',
        order: 10,
        fieldType: 'textarea',
        normalPhraseResumida: 'Ausência de líquido livre na cavidade peritoneal.',
        normalPhraseConvencional:
          'Ausência de líquido livre intracavitário ou coleções em espaços subfrênicos, peri-hepático, periesplênico e pelve.',
        normalPhraseDetalhada:
          'Ausência de líquido livre nos recessos abdominais avaliados (espaço hepatorrenal de Morison, esplenorrenal e escavação pélvica). Sem coleções identificáveis.',
      },
    ],
  },

  // 2. PRÓSTATA VIA ABDOMINAL
  mask_prostata_abdominal: {
    id: 'mask_prostata_abdominal',
    code: 'US-MASK-PROST-ABD-01',
    name: 'Máscara de Próstata via Abdominal (Suprapúbica)',
    version: '1.0.0',
    category: 'geniturinario',
    technique:
      'Exame ultrassonográfico da próstata e bexiga por via suprapúbica abdominal, realizado com transdutor convexo.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia de Próstata via Abdominal',
      'Ultrassonografia da Próstata (via abdominal)',
      'Ultrassonografia de Próstata e Bexiga',
    ],
    sections: [
      {
        id: 'tecnica_replecao',
        label: 'Técnica e Repleção Vesical',
        anatomicalStructure: 'Repleção Vesical',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Exame realizado por via suprapúbica com bexiga sob repleção fisiológica adequada, permitindo boa janela acústica.',
        normalPhraseResumida: 'Exame suprapúbico com adequada repleção vesical.',
      },
      {
        id: 'bexiga_pre',
        label: 'Bexiga Urinária (Pré-Miccional)',
        anatomicalStructure: 'Bexiga',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Bexiga urinária com repleção satisfatória, contornos regulares, paredes de espessura conservada, conteúdo límpido anecóico, sem cálculos ou lesões vegetantes.',
        normalPhraseResumida: 'Bexiga bem repleta, paredes finas, sem litíase ou lesões.',
      },
      {
        id: 'prostata_morfologia',
        label: 'Próstata — Morfologia e Parênquima',
        anatomicalStructure: 'Próstata',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Próstata tópica, com contornos regulares e limites precisos. Parênquima de ecotextura homogênea, sem nódulos dominantes ou calcificações grosseiras.',
        normalPhraseResumida: 'Próstata com contornos regulares e ecotextura homogênea.',
      },
      {
        id: 'prostata_medidas',
        label: 'Dimensões e Volume Prostático',
        anatomicalStructure: 'Biometria Prostática',
        order: 4,
        fieldType: 'measurement',
        normalPhraseConvencional:
          'Diâmetros prostáticos dentro dos limites fisiológicos para a faixa etária. Volume prostático estimado sem critérios de hiperplasia.',
        normalPhraseResumida: 'Dimensões e volume prostático conservados.',
      },
      {
        id: 'vesiculas_seminais',
        label: 'Vesículas Seminais',
        anatomicalStructure: 'Vesículas Seminais',
        order: 5,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Vesículas seminais simétricas, de calibre e ecotextura preservados nos segmentos visualizados.',
        normalPhraseResumida: 'Vesículas seminais simétricas e sem dilatações.',
      },
      {
        id: 'residuo_pos_miccional',
        label: 'Resíduo Pós-Miccional (Apenas se avaliado)',
        anatomicalStructure: 'Resíduo Miccional',
        order: 6,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Após micção espontânea, constatou-se esvaziamento vesical satisfatório com resíduo pós-miccional não significativo (< 10%).',
        normalPhraseResumida: 'Resíduo pós-miccional fisiológico / insignificante.',
      },
    ],
  },

  // 3. PRÓSTATA TRANSRETAL
  mask_prostata_transretal: {
    id: 'mask_prostata_transretal',
    code: 'US-MASK-PROST-TR-01',
    name: 'Máscara de Próstata Transretal',
    version: '1.0.0',
    category: 'geniturinario',
    technique:
      'Exame ultrassonográfico da próstata por via endocavitária transretal com transdutor de alta resolução biplanar/microconvexo.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia de Próstata Transretal',
      'Ultrassonografia da Próstata (via transretal)',
    ],
    sections: [
      {
        id: 'tecnica_endocavitaria',
        label: 'Técnica e Condições de Exame',
        anatomicalStructure: 'Técnica',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Exame realizado por via transretal com transdutor de alta frequência, sob preparo e proteção estéril. Paciente colaborativo, tolerando adequadamente o procedimento.',
      },
      {
        id: 'capsula_e_zonas',
        label: 'Cápsula e Zonas Prostáticas (Transição e Periférica)',
        anatomicalStructure: 'Zonas Prostáticas',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Cápsula prostática íntegra e contínua. Zona periférica homogênea, sem nódulos hipoecogênicos suspeitos. Zona de transição com ecotextura preservada, sem nódulos estromais proeminentes.',
      },
      {
        id: 'biometria_transretal',
        label: 'Dimensões e Volume Transretal',
        anatomicalStructure: 'Biometria',
        order: 3,
        fieldType: 'measurement',
        normalPhraseConvencional:
          'Medidas nos eixos longitudinal, transversal e ântero-posterior. Volume prostático dentro dos padrões anatômicos habituais.',
      },
      {
        id: 'feixes_vesiculas',
        label: 'Vesículas Seminais e Feixes Neurovasculares',
        anatomicalStructure: 'Feixes e Vesículas',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Vesículas seminais tópicas, simétricas, de aspecto habitual. Feixes neurovasculares preservados nos ângulos prostáticos.',
      },
    ],
  },

  // 4. RINS E VIAS URINÁRIAS
  mask_rins_vias_urinarias: {
    id: 'mask_rins_vias_urinarias',
    code: 'US-MASK-REN-01',
    name: 'Máscara de Rins e Vias Urinárias',
    version: '1.0.0',
    category: 'geniturinario',
    technique:
      'Exame ultrassonográfico do aparelho urinário realizado com transdutor convexo multifrequencial.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia de Rins e Vias Urinárias',
      'Ultrassonografia do Aparelho Urinário',
      'USG Renal e Vias',
    ],
    sections: [
      {
        id: 'rim_direito',
        label: 'Rim Direito (Dimensões, Parênquima e Coletor)',
        anatomicalStructure: 'Rim Direito',
        order: 1,
        fieldType: 'textarea',
        laterality: 'D',
        normalPhraseConvencional:
          'Rim direito tópico, de contornos regulares e dimensões normais. Parênquima com espessura e ecogenicidade normais, nítida diferenciação corticomedular. Seio renal preservado, sem imagens de cálculos ou ectasia do sistema pielocalicial.',
        normalPhraseResumida:
          'Rim direito com dimensões e diferenciação normais, sem litíase ou dilatação.',
      },
      {
        id: 'rim_esquerdo',
        label: 'Rim Esquerdo (Dimensões, Parênquima e Coletor)',
        anatomicalStructure: 'Rim Esquerdo',
        order: 2,
        fieldType: 'textarea',
        laterality: 'E',
        normalPhraseConvencional:
          'Rim esquerdo tópico, de contornos regulares e dimensões normais. Parênquima com espessura preservada e ecogenicidade habitual. Sistema pielocalicial sem sinais de hidronefrose, litíase ou lesões focais sólidas/císticas.',
        normalPhraseResumida: 'Rim esquerdo com dimensões normais, sem litíase ou hidronefrose.',
      },
      {
        id: 'ureteres',
        label: 'Ureteres (Segmentos visualizáveis)',
        anatomicalStructure: 'Ureteres',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Ureteres não visualizáveis em seus trajetos lombares e pélvicos, sem dilatações detectáveis (achado habitual ao método).',
      },
      {
        id: 'bexiga_urinaria',
        label: 'Bexiga Urinária e Jatos Ureterais',
        anatomicalStructure: 'Bexiga',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Bexiga urinária com boa repleção, paredes finas e regulares, conteúdo anecóico límpido, sem cálculos ou massas vegetantes endoluminais.',
      },
    ],
  },

  // 5. TIREOIDE
  mask_tireoide: {
    id: 'mask_tireoide',
    code: 'US-MASK-TIR-01',
    name: 'Máscara de Tireoide com Doppler',
    version: '1.0.0',
    category: 'tireoide_cervical',
    technique:
      'Exame ultrassonográfico cervical e da tireoide realizado com transdutor linear de alta frequência (7,5 a 14 MHz), complementado por estudo Doppler colorido.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'tireoide',
    compatibleProcedures: [
      'Ultrassonografia de Tireoide com Doppler',
      'Ultrassonografia da Tireoide',
      'USG Tireoide',
    ],
    sections: [
      {
        id: 'lobo_direito',
        label: 'Lobo Direito',
        anatomicalStructure: 'Lobo Direito da Tireoide',
        order: 1,
        fieldType: 'textarea',
        laterality: 'D',
        normalPhraseConvencional:
          'Tópico, de contornos regulares e dimensões preservadas. Parênquima de ecotextura homogênea e ecogenicidade normal. Ausência de nódulos sólidos ou císticos.',
        normalPhraseResumida: 'Lobo direito tópico, dimensões normais, sem nódulos.',
      },
      {
        id: 'istmo',
        label: 'Istmo',
        anatomicalStructure: 'Istmo Tireoidiano',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Espessura e contornos preservados. Ecotextura homogênea, sem lesões focais ou nódulos.',
        normalPhraseResumida: 'Istmo com espessura preservada, sem nódulos.',
      },
      {
        id: 'lobo_esquerdo',
        label: 'Lobo Esquerdo',
        anatomicalStructure: 'Lobo Esquerdo da Tireoide',
        order: 3,
        fieldType: 'textarea',
        laterality: 'E',
        normalPhraseConvencional:
          'Tópico, de contornos lisos e volume habitual. Parênquima com ecotextura preservada, sem nódulos identificáveis ao método.',
        normalPhraseResumida: 'Lobo esquerdo tópico, dimensões normais, sem nódulos.',
      },
      {
        id: 'volumes_tireoidianos',
        label: 'Biometria e Volume Total',
        anatomicalStructure: 'Volume Tireoidiano',
        order: 4,
        fieldType: 'measurement',
        normalPhraseConvencional:
          'Volume glandular total estimado dentro dos limites de normalidade para adultos (referência: 6 a 15 cm³).',
      },
      {
        id: 'doppler_vascularizacao',
        label: 'Mapeamento com Doppler Colorido',
        anatomicalStructure: 'Vascularização',
        order: 5,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Padrão vascular parenquimatoso fisiológico bilateralmente, sem hipervascularização difusa ou focal.',
        normalPhraseResumida: 'Vascularização ao Doppler habitual.',
      },
      {
        id: 'linfonodos_cervicais',
        label: 'Cadeias Linfonodais Cervicais (Quando avaliadas)',
        anatomicalStructure: 'Linfonodos Cervicais',
        order: 6,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Cadeias linfonodais cervicais exploradas sem linfonodomegalias atípicas. Linfonodos visíveis de aspecto reacional benigno habitual.',
      },
    ],
  },

  // 6. MAMAS
  mask_mamas: {
    id: 'mask_mamas',
    code: 'US-MASK-MAM-01',
    name: 'Máscara Mamária Bilateral com Axilas',
    version: '1.0.0',
    category: 'mamas',
    technique:
      'Exame ultrassonográfico das mamas e fossas axilares realizado com transdutor linear de alta frequência (7,5 a 14 MHz), com varredura radial e antirradial sistemática.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'mama_bilateral',
    compatibleProcedures: [
      'Ultrassonografia Mamária Bilateral',
      'Ultrassonografia de Mamas',
      'Ultrassonografia Mamária',
    ],
    sections: [
      {
        id: 'mama_direita',
        label: 'Mama Direita',
        anatomicalStructure: 'Mama Direita',
        order: 1,
        fieldType: 'textarea',
        laterality: 'D',
        normalPhraseConvencional:
          'Pele e complexo aréolo-papilar preservados. Parênquima fibroglandular de ecotextura e distribuição habituais para a faixa etária. Ausência de nódulos sólidos ou císticos detectáveis. Planos retromamários livres.',
        normalPhraseResumida: 'Mama direita normal, sem nódulos ou cistos.',
      },
      {
        id: 'mama_esquerda',
        label: 'Mama Esquerda',
        anatomicalStructure: 'Mama Esquerda',
        order: 2,
        fieldType: 'textarea',
        laterality: 'E',
        normalPhraseConvencional:
          'Pele e complexo aréolo-papilar íntegros. Tecido subcutâneo normal. Parênquima glandular homogêneo, sem distorções arquiteturais ou lesões sólidas/císticas. Planos profundos conservados.',
        normalPhraseResumida: 'Mama esquerda normal, sem nódulos ou cistos.',
      },
      {
        id: 'axilas',
        label: 'Fossas Axilares Bilaterais',
        anatomicalStructure: 'Axilas',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Fossas axilares direita e esquerda livres de linfonodomegalias com características morfológicas suspeitas. Linfonodos com hilo gorduroso preservado quando identificados.',
        normalPhraseResumida: 'Axilas sem linfonodomegalias suspeitas.',
      },
    ],
  },

  // 7. TRANSVAGINAL / PÉLVICA GINECOLÓGICA
  mask_transvaginal: {
    id: 'mask_transvaginal',
    code: 'US-MASK-TV-01',
    name: 'Máscara Ginecológica / Transvaginal',
    version: '1.0.0',
    category: 'ginecologia',
    technique:
      'Exame ultrassonográfico pélvico por via endocavitária transvaginal realizado com transdutor microconvexo de alta frequência.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'utero_transvaginal',
    compatibleProcedures: [
      'Ultrassonografia Pélvica Ginecológica / Transvaginal',
      'Ultrassonografia Transvaginal',
      'Ultrassonografia Pélvica Transvaginal',
    ],
    sections: [
      {
        id: 'utero',
        label: 'Útero (Posição, Contornos, Miométrio e Volume)',
        anatomicalStructure: 'Útero',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Útero em anteversoflexão (AVF), de contornos regulares e dimensões anatômicas normais. Miométrio de ecotextura homogênea, sem sinais de miomatose ou adenomiose focais.',
        normalPhraseResumida: 'Útero em AVF, contornos regulares, miométrio homogêneo.',
      },
      {
        id: 'endometrio',
        label: 'Endométrio e Cavidade Uterina',
        anatomicalStructure: 'Endométrio',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Endométrio centrado, homogêneo, com espessura e ecogenicidade compatíveis com a fase do ciclo menstrual ou status hormonal. Cavidade endometrial virtual, sem imagens polipoides ou coleções hemáticas.',
        normalPhraseResumida: 'Endométrio centrado, homogêneo e espessura preservada.',
      },
      {
        id: 'ovario_direito',
        label: 'Ovário Direito',
        anatomicalStructure: 'Ovário Direito',
        order: 3,
        fieldType: 'textarea',
        laterality: 'D',
        normalPhraseConvencional:
          'Ovário direito tópico, com dimensões normais e distribuição folicular habitual para a idade reprodutiva. Ausência de formações císticas atípicas ou massas sólidas.',
        normalPhraseResumida: 'Ovário direito de aspecto e volume normais.',
      },
      {
        id: 'ovario_esquerdo',
        label: 'Ovário Esquerdo',
        anatomicalStructure: 'Ovário Esquerdo',
        order: 4,
        fieldType: 'textarea',
        laterality: 'E',
        normalPhraseConvencional:
          'Ovário esquerdo tópico, com morfologia e volume preservados, estroma homogêneo e folículos periféricos de aspecto fisiológico. Sem lesões expansivas anexiais.',
        normalPhraseResumida: 'Ovário esquerdo de aspecto e volume normais.',
      },
      {
        id: 'fundo_de_saco',
        label: 'Fundo de Saco Posterior e Anexos',
        anatomicalStructure: 'Fundo de Saco',
        order: 5,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Fundo de saco posterior de Douglas livre de líquido patológico ou coleções. Regiões anexiais livres.',
        normalPhraseResumida: 'Fundo de saco de Douglas livre, sem coleções.',
      },
    ],
  },

  // 8. OBSTÉTRICA 1º TRIMESTRE
  mask_obstetrica_1tri: {
    id: 'mask_obstetrica_1tri',
    code: 'US-MASK-OBS-1TRI-01',
    name: 'Máscara Obstétrica Inicial / 1º Trimestre',
    version: '1.0.0',
    category: 'obstetricia',
    technique:
      'Exame ultrassonográfico obstétrico inicial realizado por via transvaginal e/ou suprapúbica abdominal.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia Obstétrica Inicial',
      'Ultrassonografia Obstétrica de 1º Trimestre',
      'Ultrassonografia Obstétrica Transvaginal Inicial',
    ],
    sections: [
      {
        id: 'localizacao_saco',
        label: 'Localização Gestacional e Saco Gestacional',
        anatomicalStructure: 'Saco Gestacional',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Gestação tópica intrauterina. Saco gestacional único, implantado no corpo uterino, com contornos regulares e reação coriododecidual adequada.',
      },
      {
        id: 'embriao_vitalidade',
        label: 'Embrião e Vitalidade (CCR e FCF observados)',
        anatomicalStructure: 'Embrião',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Embrião único identificado com batimentos cardíacos presentes e rítmicos. Comprimento cabeça-nádega (CCN) compatível com a idade gestacional cronológica.',
      },
      {
        id: 'vesicula_vitelinica',
        label: 'Vesícula Vitelínica',
        anatomicalStructure: 'Vesícula Vitelínica',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Vesícula vitelínica tópica, esférica, com paredes finas e diâmetro médio fisiológico (menor que 6 mm).',
      },
      {
        id: 'colecoes_anexos',
        label: 'Espaço Corial, Colo e Anexos',
        anatomicalStructure: 'Anexos e Colo',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Ausência de hematomas subcoriais ou coleções retrocoriais. Colo uterino longo e fechado. Regiões anexiais sem anormalidades.',
      },
    ],
  },

  // 9. OBSTÉTRICA BÁSICA 2º/3º TRIMESTRE
  mask_obstetrica_basica: {
    id: 'mask_obstetrica_basica',
    code: 'US-MASK-OBS-BAS-01',
    name: 'Máscara Obstétrica Básica (2º e 3º Trimestres)',
    version: '1.0.0',
    category: 'obstetricia',
    technique:
      'Exame ultrassonográfico obstétrico básico via transabdominal com transdutor convexo multifrequencial.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia Obstétrica Básica',
      'Ultrassonografia Obstétrica',
      'USG Obstétrica',
    ],
    sections: [
      {
        id: 'apresentacao_dorso',
        label: 'Situação, Apresentação e Dorso Fetal',
        anatomicalStructure: 'Estática Fetal',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Feto único, vivo, em situação longitudinal, apresentação cefálica, dorso fetal à esquerda/direita. Movimentos fetais ativos observados durante o exame.',
      },
      {
        id: 'vitalidade_cardio',
        label: 'Frequência Cardíaca Fetal e Movimentação',
        anatomicalStructure: 'Vitalidade Fetal',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Batimentos cardíacos fetais presentes e rítmicos. Frequência cardíaca fetal dentro dos limites fisiológicos da gestação.',
      },
      {
        id: 'biometria_basica',
        label: 'Biometria Fetal (DBP, CC, CA, CF) e Estimativa de Peso',
        anatomicalStructure: 'Biometria Fetal',
        order: 3,
        fieldType: 'measurement',
        normalPhraseConvencional:
          'Parâmetros biométricos compatíveis entre si e coerentes com a idade gestacional. Peso fetal estimado dentro da curva habitual.',
      },
      {
        id: 'placenta_liquido',
        label: 'Placenta e Líquido Amniótico',
        anatomicalStructure: 'Anexos Fetais',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Placenta corporal/fúndica, com ecotextura e grau de maturação compatíveis com a idade gestacional. Sem sinais de descolamento. Volume de líquido amniótico normal.',
      },
    ],
  },

  // 10. MORFOLÓGICA 2º TRIMESTRE (MÁSCARA PRÓPRIA, MUITO MAIS DETALHADA QUE A BÁSICA)
  mask_morfologica_2tri: {
    id: 'mask_morfologica_2tri',
    code: 'US-MASK-OBS-MORF2-01',
    name: 'Máscara Obstétrica Morfológica de 2º Trimestre',
    version: '1.0.0',
    category: 'obstetricia',
    technique:
      'Exame ultrassonográfico morfológico fetal detalhado de 2º trimestre segundo diretrizes ISUOG/Febrasgo, com avaliação sistemática dos segmentos anatômicos.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia Obstétrica Morfológica de 2º Trimestre',
      'Ultrassonografia Morfológica de 2º Trimestre',
      'Ultrassonografia Morfológica',
    ],
    sections: [
      {
        id: 'cranio_snc',
        label: 'Pólo Cefálico e Sistema Nervoso Central',
        anatomicalStructure: 'SNC Fetal',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Calota craniana íntegra, linha média centrada. Ventrículos laterais, plexos coroides, cavo do septo pelúcido, tálamos, cerebelo e cisterna magna com aspecto anatômico normal nos planos examinados.',
      },
      {
        id: 'face_pescoco',
        label: 'Face e Pescoço Fetal',
        anatomicalStructure: 'Face Fetal',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Órbitas simétricas com cristalinos visíveis, osso nasal presente, lábio superior íntegro sem evidência de fissura labial aparente. Perfil facial anatômico. Ausência de massas cervicais.',
      },
      {
        id: 'torax_coracao',
        label: 'Tórax e Coração Fetal (Planos Fundamentais)',
        anatomicalStructure: 'Coração e Tórax',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Campos pulmonares de ecogenicidade homogênea. Eixo cardíaco em levocárdia. Corte de quatro câmaras cardíacas equilibrado, com forame oval e septos visualizados. Vias de saída dos ventrículos esquerdo e direito cruzadas e pérvias.',
      },
      {
        id: 'abdome_trato_digestivo',
        label: 'Abdome Fetal, Parede e TGI',
        anatomicalStructure: 'Abdome Fetal',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Estômago visível à esquerda no abdome superior. Parede abdominal anterior íntegra com inserção normal do cordão umbilical. Fígado, vesícula biliar e alças intestinais sem alterações evidentes.',
      },
      {
        id: 'aparelho_urinario_fetal',
        label: 'Rins e Bexiga Fetal',
        anatomicalStructure: 'Rins Fetais',
        order: 5,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Ambos os rins identificados nas fossas renais, com ecotextura habitual e sem dilatação pielocalicial significativa. Bexiga urinária preenchida e de dimensões normais.',
      },
      {
        id: 'coluna_vertebral',
        label: 'Coluna Vertebral Fetal',
        anatomicalStructure: 'Coluna Fetal',
        order: 6,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Coluna vertebral com alinhamento anatômico dos centros de ossificação nos cortes sagital e coronal, recoberta por tegumento íntegro em toda a extensão.',
      },
      {
        id: 'membros_fetais',
        label: 'Membros Superiores e Inferiores',
        anatomicalStructure: 'Membros Fetais',
        order: 7,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Três segmentos ósseos identificados nos quatro membros (braço/antebraço/mão; coxa/perna/pé), com movimentação adequada e posição anatômica preservada.',
      },
      {
        id: 'cordao_placenta_liquido',
        label: 'Cordão Umbilical, Placenta e Líquido Amniótico',
        anatomicalStructure: 'Anexos Fetais',
        order: 8,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Cordão umbilical com 3 vasos (2 artérias e 1 veia). Placenta de localização e espessura habituais. Volume de líquido amniótico adequado.',
      },
    ],
  },

  // 11. CARÓTIDAS E VERTEBRAIS
  mask_carotidas_vertebrais: {
    id: 'mask_carotidas_vertebrais',
    code: 'US-MASK-DOPP-CAR-01',
    name: 'Máscara de Doppler Colorido de Carótidas e Vertebrais',
    version: '1.0.0',
    category: 'vascular_doppler',
    technique:
      'Estudo hemodinâmico por mapeamento duplex/triplex com transdutor linear vascular de alta frequência.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Doppler Colorido de Carótidas e Vertebrais',
      'Doppler de Carótidas e Vertebrais',
      'Doppler Carotídeo',
    ],
    sections: [
      {
        id: 'sistema_carotideo_direito',
        label: 'Sistema Carotídeo Direito (Comum, Bulbo, Interna e Externa)',
        anatomicalStructure: 'Carótida Direita',
        order: 1,
        fieldType: 'textarea',
        laterality: 'D',
        normalPhraseConvencional:
          'Artérias carótidas comum, bulbo, interna e externa pérvias, com trajeto e calibres anatômicos. Complexo médio-intimal preservado. Ausência de placas ateromatosas causadoras de estenose hemodinâmica. Fluxo laminar anterógrado com velocidades sistólicas e diastólicas normais.',
      },
      {
        id: 'sistema_carotideo_esquerdo',
        label: 'Sistema Carotídeo Esquerdo (Comum, Bulbo, Interna e Externa)',
        anatomicalStructure: 'Carótida Esquerda',
        order: 2,
        fieldType: 'textarea',
        laterality: 'E',
        normalPhraseConvencional:
          'Perviedade arterial preservada. Paredes luminais lisas e regulares, sem placas parietais significativas. Curvas velocimétricas e índices de resistência dentro dos padrões de normalidade.',
      },
      {
        id: 'arterias_vertebrais',
        label: 'Artérias Vertebrais Bilaterais',
        anatomicalStructure: 'Artérias Vertebrais',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Artérias vertebrais pérvias bilateralmente, com trajeto anatômico entre os processos transversos. Fluxo ortodrômico (anterógrado/cefálico) com espectro e velocidades normais.',
      },
    ],
  },

  // 12. DOPPLER DAS ARTÉRIAS RENAIS (DISTINTO DO MORFOLÓGICO RENAL)
  mask_doppler_arterias_renais: {
    id: 'mask_doppler_arterias_renais',
    code: 'US-MASK-DOPP-REN-01',
    name: 'Máscara de Doppler das Artérias Renais',
    version: '1.0.0',
    category: 'vascular_doppler',
    technique:
      'Estudo hemodinâmico das artérias renais principais e do leito intrarrenal realizado com transdutor convexo de baixa frequência.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Doppler das Artérias Renais',
      'Doppler de Artérias Renais',
      'Doppler Renal Hemodinâmico',
    ],
    sections: [
      {
        id: 'aorta_abdominal_referencia',
        label: 'Aorta Abdominal (Ponto de Referência Hemodinâmica)',
        anatomicalStructure: 'Aorta Abdominal',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Aorta abdominal supra e justarrenal com calibre preservado e fluxo trifásico. Pico de velocidade sistólica aórtico usado como referência para cálculo da relação renal/aórtica (RAR).',
      },
      {
        id: 'arteria_renal_direita',
        label: 'Artéria Renal Direita (Óstio, Segmento Médio e Distal)',
        anatomicalStructure: 'Artéria Renal Direita',
        order: 2,
        fieldType: 'textarea',
        laterality: 'D',
        normalPhraseConvencional:
          'Artéria renal direita identificada desde o óstio aórtico até o hilo renal. Fluxo anterógrado com aceleração sistólica rápida, sem aliasing ou turbulência. Pico de velocidade sistólica < 180 cm/s e relação renal/aórtica < 3,5, afastando estenose hemodinamicamente significativa.',
      },
      {
        id: 'arteria_renal_esquerda',
        label: 'Artéria Renal Esquerda (Óstio, Segmento Médio e Distal)',
        anatomicalStructure: 'Artéria Renal Esquerda',
        order: 3,
        fieldType: 'textarea',
        laterality: 'E',
        normalPhraseConvencional:
          'Artéria renal esquerda pérvia, sem evidência de aceleração focal ao Doppler colorido ou espectral. Velocidades sistólicas e diastólicas dentro dos parâmetros normais.',
      },
      {
        id: 'indices_intrarrenais',
        label: 'Fluxo Intrarrenal e Índices de Resistência (Segmentares e Interlobares)',
        anatomicalStructure: 'Leito Intrarrenal',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Curvas de velocidade nas artérias interlobares dos pólos superior, médio e inferior com tempo de aceleração sistólica preservado (< 70 ms) e índice de resistência (IR) fisiológico bilateralmente (entre 0,55 e 0,70). Ausência de padrão tardus-parvus.',
      },
    ],
  },

  // 13. BOLSA ESCROTAL / TESTÍCULOS (CONVENCIONAL E DOPPLER)
  mask_bolsa_escrotal: {
    id: 'mask_bolsa_escrotal',
    code: 'US-MASK-ESCROT-01',
    name: 'Máscara de Ultrassonografia da Bolsa Escrotal (com Doppler)',
    version: '1.0.0',
    category: 'geniturinario',
    technique:
      'Exame ultrassonográfico do conteúdo escrotal realizado com transdutor linear de alta frequência complementado por Doppler colorido e espectral.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia da Bolsa Escrotal com Doppler',
      'Ultrassonografia da Bolsa Escrotal',
      'Ultrassonografia de Testículos',
    ],
    sections: [
      {
        id: 'testiculo_direito',
        label: 'Testículo Direito (Morfologia, Dimensões e Ecotextura)',
        anatomicalStructure: 'Testículo Direito',
        order: 1,
        fieldType: 'textarea',
        laterality: 'D',
        normalPhraseConvencional:
          'Testículo direito tópico na bolsa escrotal, de contornos regulares e dimensões preservadas. Parênquima de ecotextura homogênea, sem nódulos ou microcalcificações patológicas.',
      },
      {
        id: 'epididimo_direito',
        label: 'Epidídimo Direito e Túnicas Vaginais',
        anatomicalStructure: 'Epidídimo Direito',
        order: 2,
        fieldType: 'textarea',
        laterality: 'D',
        normalPhraseConvencional:
          'Cabeça, corpo e cauda do epidídimo direito de espessura e ecotextura habituais, sem espessamentos ou cistos. Túnicas vaginais sem hidrocele.',
      },
      {
        id: 'testiculo_esquerdo',
        label: 'Testículo Esquerdo (Morfologia, Dimensões e Ecotextura)',
        anatomicalStructure: 'Testículo Esquerdo',
        order: 3,
        fieldType: 'textarea',
        laterality: 'E',
        normalPhraseConvencional:
          'Testículo esquerdo tópico, com contornos lisos, dimensões normais e ecotextura homogênea. Ausência de lesões focais sólidas ou císticas.',
      },
      {
        id: 'epididimo_esquerdo',
        label: 'Epidídimo Esquerdo e Túnicas Vaginais',
        anatomicalStructure: 'Epidídimo Esquerdo',
        order: 4,
        fieldType: 'textarea',
        laterality: 'E',
        normalPhraseConvencional:
          'Epidídimo esquerdo sem alterações ecográficas. Ausência de hidrocele ou coleções extratesticulares.',
      },
      {
        id: 'plexo_pampiniforme_doppler',
        label: 'Plexo Pampiniforme e Vascularização ao Doppler',
        anatomicalStructure: 'Plexo Venoso e Doppler',
        order: 5,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Vascularização testicular simétrica e habitual bilateralmente ao Doppler colorido e pulsado. Veias do plexo pampiniforme com calibres normais em repouso e sem refluxo patológico à manobra de Valsalva (sem varicocele).',
      },
    ],
  },

  // 14. OMBRO (ARTICULAÇÃO)
  mask_ombro: {
    id: 'mask_ombro',
    code: 'US-MASK-ART-OMB-01',
    name: 'Máscara Articular de Ombro',
    version: '1.0.0',
    category: 'musculoesqueletico',
    technique:
      'Exame ultrassonográfico do ombro realizado com transdutor linear multifrequencial de alta resolução em planos anatômicos dinâmicos.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'ombro_articular',
    compatibleProcedures: [
      'Ultrassonografia de Ombro',
      'Ultrassonografia do Ombro Direito',
      'Ultrassonografia do Ombro Esquerdo',
      'Ultrassonografia Articular (Ombro)',
    ],
    sections: [
      {
        id: 'tendao_biceps',
        label: 'Tendão da Cabeça Longa do Bíceps',
        anatomicalStructure: 'Bíceps Braquial',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Tendão da cabeça longa do bíceps normoposicionado na goteira bicipital, com espessura e padrão fibrilar preservados. Bainha sinovial sem distensão líquida ou sinais de tenossinovite.',
      },
      {
        id: 'tendao_subescapular',
        label: 'Tendão do Músculo Subescapular',
        anatomicalStructure: 'Subescapular',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Tendão subescapular íntegro em sua inserção no troquim, com ecotextura fibrilar homogênea, sem roturas parciais ou transfixantes.',
      },
      {
        id: 'tendao_supraespinal',
        label: 'Tendão do Músculo Supraespinal',
        anatomicalStructure: 'Supraespinal',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Tendão supraespinal íntegro em toda a sua extensão e na inserção na grande tuberosidade umeral. Espessura conservada, sem roturas, calcificações ou sinais de tendinopatia.',
      },
      {
        id: 'tendao_infraespinal',
        label: 'Tendão do Músculo Infraespinal e Redondo Menor',
        anatomicalStructure: 'Infraespinal',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Tendão infraespinal e redondo menor com contornos e ecotextura anatômicos preservados, sem descontinuidades.',
      },
      {
        id: 'bursa_subacromial',
        label: 'Bursa Subacromial-Subdeltoidea',
        anatomicalStructure: 'Bursa Subacromial',
        order: 5,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Bursa subacromial-subdeltoidea com espessura fisiológica normal, sem espessamento parietal ou derrame bursal (ausência de bursite).',
      },
      {
        id: 'articulacao_acromioclavicular',
        label: 'Articulação Acromioclavicular e Recesso Articular',
        anatomicalStructure: 'Articulação Acromioclavicular',
        order: 6,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Articulação acromioclavicular de aspecto anatômico conservado para a faixa etária, sem osteófitos proeminentes ou derrame articular significativo.',
      },
    ],
  },

  // 15. JOELHO (ARTICULAÇÃO)
  mask_joelho: {
    id: 'mask_joelho',
    code: 'US-MASK-ART-JOE-01',
    name: 'Máscara Articular de Joelho',
    version: '1.0.0',
    category: 'musculoesqueletico',
    technique:
      'Exame ultrassonográfico do joelho realizado com transdutor linear multifrequencial de alta resolução nos compartimentos anterior, medial, lateral e posterior.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia de Joelho',
      'Ultrassonografia do Joelho Direito',
      'Ultrassonografia do Joelho Esquerdo',
      'Ultrassonografia Articular (Joelho)',
    ],
    sections: [
      {
        id: 'aparelho_extensor',
        label: 'Aparelho Extensor (Tendões Quadríceps e Patelar)',
        anatomicalStructure: 'Aparelho Extensor',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Tendão do quadríceps e tendão patelar com espessura, contornos e padrão fibrilar preservados em toda a sua extensão, sem áreas de rotura ou tendinopatia.',
      },
      {
        id: 'recesso_suprapatelar',
        label: 'Recessos Articulares e Bursa Suprapatelar',
        anatomicalStructure: 'Recessos e Bursa',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Recessos suprapatelar e parapatelares sem derrame articular detectável ou proliferação sinovial significativa.',
      },
      {
        id: 'compartimento_medial',
        label: 'Compartimento Medial (Ligamento Colateral Medial e Menisco)',
        anatomicalStructure: 'Compartimento Medial',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Ligamento colateral medial íntegro, com espessura e trajeto preservados. Borda externa do menisco medial sem extrusão ou cistos parameniscais.',
      },
      {
        id: 'compartimento_lateral',
        label: 'Compartimento Lateral (Trato Iliotibial e Ligamento Colateral Lateral)',
        anatomicalStructure: 'Compartimento Lateral',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Trato iliotibial e ligamento colateral lateral com aspectos anatômicos conservados. Borda externa do menisco lateral sem alterações.',
      },
      {
        id: 'fossa_poplitea',
        label: 'Fossa Poplítea',
        anatomicalStructure: 'Fossa Poplítea',
        order: 5,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Fossa poplítea livre de coleções líquidas, sem evidência de cisto de Baker (cisto sinovial poplíteo). Feixe vascular poplíteo pérvio.',
      },
    ],
  },

  // 16. PARTES MOLES / TECIDO SUBCUTÂNEO
  mask_partes_moles: {
    id: 'mask_partes_moles',
    code: 'US-MASK-PM-01',
    name: 'Máscara de Partes Moles / Tecido Subcutâneo',
    version: '1.0.0',
    category: 'partes_moles',
    technique:
      'Exame ultrassonográfico de partes moles realizado com transdutor linear de alta frequência na região indicada.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia de Partes Moles',
      'Ultrassonografia do Tecido Subcutâneo',
      'Ultrassonografia de Lesão Palpável de Partes Moles',
    ],
    sections: [
      {
        id: 'pele_subcutaneo',
        label: 'Planos Cutâneo e Subcutâneo',
        anatomicalStructure: 'Subcutâneo',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Pele e tecido celular subcutâneo da região examinada com espessura e ecotextura normais. Ausência de nódulos, massas sólidas, lipomas ou coleções líquidas.',
      },
      {
        id: 'plano_fasciomuscular',
        label: 'Plano Fáscio-Muscular e Tecidos Adjacentes',
        anatomicalStructure: 'Músculos e Fáscias',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Fáscias e planos musculares com padrão fibrilar anatômico conservado. Ausência de descontinuidades, hematomas ou sinais de rotura muscular na topografia examinada.',
      },
      {
        id: 'vascularizacao_local',
        label: 'Estudo com Doppler Colorido',
        anatomicalStructure: 'Vascularização',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Ausência de hipervascularização focal ou fluxo patológico nos planos teciduais avaliados.',
      },
    ],
  },
}

/**
 * RESOLVEDOR UNIVERSAL DE PROCEDIMENTO PARA MÁSCARA CLÍNICA
 *
 * Regra de Ouro:
 * - NUNCA usar Abdome Total como modelo padrão para outros exames!
 * - Procedimento sem máscara específica abre modo 'TEXTO_LIVRE_SEGURO' com o título correto do procedimento.
 */
export function resolveProcedureMask(procedureName: string): {
  mask: ClinicalMaskDefinition | null
  mode: 'structured' | 'freetext'
  title: string
  sections: Array<{ id: string; label: string; text: string }>
  initialFreeText: string
  bodyMarkSchemeId: string
  hasValidatedNormalPhrases: boolean
  status: ClinicalMaskStatus
} {
  const norm = (procedureName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  // 1. Procura match exato ou por palavra-chave nas máscaras registradas
  for (const mask of Object.values(CLINICAL_MASKS_REGISTRY)) {
    const match = mask.compatibleProcedures.some((proc) => {
      const normProc = proc
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
      return norm.includes(normProc) || normProc.includes(norm)
    })

    if (match) {
      return {
        mask,
        mode: 'structured',
        title: `Laudo de ${mask.compatibleProcedures[0]}`,
        sections: mask.sections.map((s) => ({
          id: s.id,
          label: s.label,
          text: '',
        })),
        initialFreeText: '',
        bodyMarkSchemeId: mask.bodyMarkCompatible || 'none',
        hasValidatedNormalPhrases: mask.sections.some((s) =>
          Boolean(s.normalPhraseConvencional || s.normalPhraseResumida),
        ),
        status: mask.status,
      }
    }
  }

  // Mapeamentos específicos por termos clínicos essenciais
  if (norm.includes('prostata') && (norm.includes('transretal') || norm.includes('tr'))) {
    const mask = CLINICAL_MASKS_REGISTRY.mask_prostata_transretal
    return {
      mask,
      mode: 'structured',
      title: 'Laudo de Ultrassonografia de Próstata Transretal',
      sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
      initialFreeText: '',
      bodyMarkSchemeId: 'none',
      hasValidatedNormalPhrases: true,
      status: mask.status,
    }
  }

  if (norm.includes('prostata') || norm.includes('prostat')) {
    const mask = CLINICAL_MASKS_REGISTRY.mask_prostata_abdominal
    return {
      mask,
      mode: 'structured',
      title: 'Laudo de Ultrassonografia de Próstata via Abdominal',
      sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
      initialFreeText: '',
      bodyMarkSchemeId: 'none',
      hasValidatedNormalPhrases: true,
      status: mask.status,
    }
  }

  if (norm.includes('rim') || norm.includes('renais') || norm.includes('urinari')) {
    if (norm.includes('doppler')) {
      const mask = CLINICAL_MASKS_REGISTRY.mask_doppler_arterias_renais
      return {
        mask,
        mode: 'structured',
        title: 'Laudo de Doppler das Artérias Renais',
        sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
        initialFreeText: '',
        bodyMarkSchemeId: 'none',
        hasValidatedNormalPhrases: true,
        status: mask.status,
      }
    }
    const mask = CLINICAL_MASKS_REGISTRY.mask_rins_vias_urinarias
    return {
      mask,
      mode: 'structured',
      title: 'Laudo de Ultrassonografia de Rins e Vias Urinárias',
      sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
      initialFreeText: '',
      bodyMarkSchemeId: 'none',
      hasValidatedNormalPhrases: true,
      status: mask.status,
    }
  }

  if (norm.includes('tireoide') || norm.includes('tireoid')) {
    const mask = CLINICAL_MASKS_REGISTRY.mask_tireoide
    return {
      mask,
      mode: 'structured',
      title: 'Laudo de Ultrassonografia de Tireoide com Doppler',
      sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
      initialFreeText: '',
      bodyMarkSchemeId: 'tireoide',
      hasValidatedNormalPhrases: true,
      status: mask.status,
    }
  }

  if (norm.includes('mama') || norm.includes('mamaria')) {
    const mask = CLINICAL_MASKS_REGISTRY.mask_mamas
    return {
      mask,
      mode: 'structured',
      title: 'Laudo de Ultrassonografia Mamária Bilateral',
      sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
      initialFreeText: '',
      bodyMarkSchemeId: norm.includes('direita')
        ? 'mama_direita'
        : norm.includes('esquerda')
          ? 'mama_esquerda'
          : 'mama_bilateral',
      hasValidatedNormalPhrases: true,
      status: mask.status,
    }
  }

  if (norm.includes('transvaginal') || norm.includes('endovaginal') || norm.includes('pelvica')) {
    const mask = CLINICAL_MASKS_REGISTRY.mask_transvaginal
    return {
      mask,
      mode: 'structured',
      title: 'Laudo de Ultrassonografia Pélvica Ginecológica / Transvaginal',
      sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
      initialFreeText: '',
      bodyMarkSchemeId: 'utero_transvaginal',
      hasValidatedNormalPhrases: true,
      status: mask.status,
    }
  }

  if (norm.includes('morfologic') || norm.includes('morfo')) {
    const mask = CLINICAL_MASKS_REGISTRY.mask_morfologica_2tri
    return {
      mask,
      mode: 'structured',
      title: 'Laudo de Ultrassonografia Obstétrica Morfológica de 2º Trimestre',
      sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
      initialFreeText: '',
      bodyMarkSchemeId: 'none',
      hasValidatedNormalPhrases: true,
      status: mask.status,
    }
  }

  if (norm.includes('obstetric') || norm.includes('gestac')) {
    if (norm.includes('1') || norm.includes('inicial') || norm.includes('primeiro')) {
      const mask = CLINICAL_MASKS_REGISTRY.mask_obstetrica_1tri
      return {
        mask,
        mode: 'structured',
        title: 'Laudo de Ultrassonografia Obstétrica Inicial / 1º Trimestre',
        sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
        initialFreeText: '',
        bodyMarkSchemeId: 'none',
        hasValidatedNormalPhrases: true,
        status: mask.status,
      }
    }
    const mask = CLINICAL_MASKS_REGISTRY.mask_obstetrica_basica
    return {
      mask,
      mode: 'structured',
      title: 'Laudo de Ultrassonografia Obstétrica Básica',
      sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
      initialFreeText: '',
      bodyMarkSchemeId: 'none',
      hasValidatedNormalPhrases: true,
      status: mask.status,
    }
  }

  if (norm.includes('carotida') || norm.includes('vertebral')) {
    const mask = CLINICAL_MASKS_REGISTRY.mask_carotidas_vertebrais
    return {
      mask,
      mode: 'structured',
      title: 'Laudo de Doppler Colorido de Carótidas e Vertebrais',
      sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
      initialFreeText: '',
      bodyMarkSchemeId: 'none',
      hasValidatedNormalPhrases: true,
      status: mask.status,
    }
  }

  if (norm.includes('escrot') || norm.includes('testicul')) {
    const mask = CLINICAL_MASKS_REGISTRY.mask_bolsa_escrotal
    return {
      mask,
      mode: 'structured',
      title: 'Laudo de Ultrassonografia da Bolsa Escrotal com Doppler',
      sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
      initialFreeText: '',
      bodyMarkSchemeId: 'none',
      hasValidatedNormalPhrases: true,
      status: mask.status,
    }
  }

  if (norm.includes('ombro')) {
    const mask = CLINICAL_MASKS_REGISTRY.mask_ombro
    return {
      mask,
      mode: 'structured',
      title: 'Laudo de Ultrassonografia de Ombro',
      sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
      initialFreeText: '',
      bodyMarkSchemeId: 'ombro_articular',
      hasValidatedNormalPhrases: true,
      status: mask.status,
    }
  }

  if (norm.includes('joelho')) {
    const mask = CLINICAL_MASKS_REGISTRY.mask_joelho
    return {
      mask,
      mode: 'structured',
      title: 'Laudo de Ultrassonografia de Joelho',
      sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
      initialFreeText: '',
      bodyMarkSchemeId: 'none',
      hasValidatedNormalPhrases: true,
      status: mask.status,
    }
  }

  if (norm.includes('partes moles') || norm.includes('subcutaneo') || norm.includes('muscul')) {
    const mask = CLINICAL_MASKS_REGISTRY.mask_partes_moles
    return {
      mask,
      mode: 'structured',
      title: 'Laudo de Ultrassonografia de Partes Moles',
      sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
      initialFreeText: '',
      bodyMarkSchemeId: 'none',
      hasValidatedNormalPhrases: true,
      status: mask.status,
    }
  }

  if (norm.includes('abdome') || norm.includes('abdominal')) {
    const mask = CLINICAL_MASKS_REGISTRY.mask_abdome_total
    return {
      mask,
      mode: 'structured',
      title: 'Laudo de Ultrassonografia de Abdome Total',
      sections: mask.sections.map((s) => ({ id: s.id, label: s.label, text: '' })),
      initialFreeText: '',
      bodyMarkSchemeId: 'none',
      hasValidatedNormalPhrases: true,
      status: mask.status,
    }
  }

  // FALLBACK OBRIGATÓRIO: TEXTO LIVRE SEGURO com título correto do procedimento (NUNCA Abdome Total)
  const cleanTitle = procedureName ? procedureName.trim() : 'Ultrassonografia'
  return {
    mask: null,
    mode: 'freetext',
    title: `Laudo de ${cleanTitle}`,
    sections: [],
    initialFreeText: `<h2>LAUDO DE ${cleanTitle.toUpperCase()}</h2>\n<p><strong>INDICAÇÃO CLÍNICA:</strong> Avaliação diagnóstica especializada.</p>\n<p><strong>TÉCNICA:</strong> Exame ultrassonográfico realizado em tempo real com transdutor apropriado à região anatômica.</p>\n<h3>RELATÓRIO:</h3>\n<p>Descreva aqui os achados ecográficos observados...</p>\n<h3>IMPRESSÃO DIAGNÓSTICA:</h3>\n<p>Conclusão diagnóstica do exame.</p>`,
    bodyMarkSchemeId: 'none',
    hasValidatedNormalPhrases: false,
    status: 'TEXTO_LIVRE_SEGURO',
  }
}
