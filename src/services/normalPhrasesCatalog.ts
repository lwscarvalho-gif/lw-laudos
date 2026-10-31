/**
 * CATÁLOGO DE FRASES DE ULTRASSONOGRAFIA COM 3 NÍVEIS DE PROFUNDIDADE:
 * 1. RESUMIDO (Padrão inicial — texto ultracurto e direto)
 * 2. CONVENCIONAL (Padrão tradicional de laudos ambulatoriais)
 * 3. DETALHADO (Descritivo acadêmico com todos os marcos ecográficos minuciosos)
 */

export type TudoNormalLevel = 'resumido' | 'convencional' | 'detalhado'

export interface OrganNormalLevels {
  id: string
  label: string
  resumido: string
  convencional: string
  detalhado: string
}

export const ABDOME_TOTAL_NORMAL_LEVELS: Record<string, OrganNormalLevels> = {
  figado: {
    id: 'figado',
    label: 'Fígado',
    resumido:
      'Fígado com dimensões, contornos e ecotextura preservados, sem lesões focais evidentes.',
    convencional:
      'Fígado com dimensões normais, contornos regulares e ecotextura homogênea, sem evidência de lesões focais sólidas ou císticas. Veias supra-hepáticas e ramo portal de calibre e trajeto anatômicos.',
    detalhado:
      'Fígado apresentando forma, contornos e dimensões preservadas. Parênquima hepático com ecogenicidade e atenuação sonora normais, ecotextura homogênea, sem lesões nodulares focais identificáveis ao método. Sistema vascular intra-hepático pérvio, com veias supra-hepáticas e ramo principal da veia porta apresentando calibre habitual e fluxo hepatopetal.',
  },
  vias_biliares: {
    id: 'vias_biliares',
    label: 'Vias Biliares',
    resumido: 'Vias biliares intra e extra-hepáticas sem dilatações.',
    convencional:
      'Vias biliares intra e extra-hepáticas de calibre preservado, sem sinais de ectasia ou cálculos.',
    detalhado:
      'Vias biliares intra-hepáticas de calibre anatômico, sem sinais de dilatação. Ducto hepático comum e colédoco com calibre preservado em toda a sua extensão visualizada, sem evidência de coledocolitíase ou espessamentos parietais.',
  },
  vesicula: {
    id: 'vesicula',
    label: 'Vesícula Biliar',
    resumido: 'Vesícula biliar com paredes finas e conteúdo anecóico, alitiásica.',
    convencional:
      'Vesícula biliar tópica, normodistendida, com paredes lisas e finas, apresentando conteúdo anecóico homogêneo, sem cálculos ou pólipos identificáveis.',
    detalhado:
      'Vesícula biliar tópica, bem distendida, com morfologia habitual e paredes regulares, finas e ecogênicas, medindo menos de 3,0 mm de espessura. Luz vesicular preenchida por bile límpida e anecóica, sem ecos internos suspeitos de litíase, barro biliar ou formações polipóides aderidas.',
  },
  pancreas: {
    id: 'pancreas',
    label: 'Pâncreas',
    resumido: 'Pâncreas com dimensões e ecotextura preservadas.',
    convencional:
      'Pâncreas de dimensões anatômicas, contornos regulares e ecotextura homogênea. Ducto de Wirsung não dilatado.',
    detalhado:
      'Pâncreas visualizado em suas porções cefálica, corpórea e caudal, apresentando espessura, contornos e ecogenicidade preservadas para a faixa etária. Ecotextura homogênea, sem massas ou cistos evidentes. Ducto pancreático principal (Wirsung) com calibre preservado, sem sinais de dilatação ou calcificações intraductais.',
  },
  baco: {
    id: 'baco',
    label: 'Baço',
    resumido: 'Baço homogêneo e de dimensões normais.',
    convencional:
      'Baço de contornos regulares, dimensões normais e ecotextura homogênea, sem lesões focais.',
    detalhado:
      'Baço tópico, com índice esplênico e morfologia conservados, contornos regulares e ecotextura finamente granular habitual. Ausência de esplenomegalia ou de lesões focais sólidas/císticas no parênquima esplênico.',
  },
  rins: {
    id: 'rins',
    label: 'Rins',
    resumido:
      'Rins tópicos, com espessura córtico-medular preservada, sem litíase ou hidronefrose.',
    convencional:
      'Rins tópicos, de contornos regulares e dimensões preservadas. Relação córtico-medular mantida. Ausência de cálculos, dilatação do sistema pielocalicial ou lesões sólidas suspeitas.',
    detalhado:
      'Rins em topografia habitual, de contornos regulares e mobilidade respiratória conservada. Dimensões anatômicas e espessura cortical preservada bilateralmente, com adequada diferenciação córtico-medular. Seios renais sem sinais de ectasia pielocalicial ou ecos com sombra acústica posterior sugestivos de litíase. Ausência de massas císticas ou sólidas parênquimatosas.',
  },
  bexiga: {
    id: 'bexiga',
    label: 'Bexiga',
    resumido: 'Bexiga com boa repleção, paredes finas e conteúdo homogêneo.',
    convencional:
      'Bexiga urinária em boa repleção fisiológica, de contornos regulares e paredes finas, com conteúdo anecóico homogêneo, sem cálculos ou massas parietais.',
    detalhado:
      'Bexiga urinária apresentando distensão volumétrica adequada, paredes lisas e regulares, com espessura fina e simétrica. Conteúdo luminal livre de ecos anômalos, sedimento patológico, litíase ou proliferações vegetantes vesicais.',
  },
  aorta_retroperitonio: {
    id: 'aorta_retroperitonio',
    label: 'Aorta e Retroperitônio',
    resumido: 'Aorta abdominal de calibre preservado. Ausência de linfonodomegalias.',
    convencional:
      'Aorta abdominal e veia cava inferior de trajeto e calibres habituais. Ausência de dilatações aneurismáticas ou linfonodomegalias retroperitoneais evidentes.',
    detalhado:
      'Aorta abdominal visualizada em seus segmentos proximal, médio e distal, com diâmetro e trajeto anatômicos, paredes regulares, sem evidência de dilatação aneurismática focal. Veia cava inferior com colapsabilidade respiratória fisiológica. Regiões para-aórticas sem sinais de linfonodomegalias ou massas expansivas.',
  },
  conclusao: {
    id: 'conclusao',
    label: 'Conclusão Diagnóstica',
    resumido: 'Exame de ultrassonografia de abdome total dentro dos padrões da normalidade.',
    convencional:
      'Exame de ultrassonografia do abdome total sem evidência de alterações ecográficas significativas.',
    detalhado:
      'Estudo ecográfico do abdome total sem alterações estruturais patológicas detectáveis ao método no momento do exame. Órgãos abdominais com características anatômicas preservadas.',
  },
}

/**
 * Obtém a frase correspondente ao nível selecionado para um órgão.
 */
export function getNormalPhraseForOrgan(
  organId: string,
  level: TudoNormalLevel = 'resumido',
): string | null {
  const organ = ABDOME_TOTAL_NORMAL_LEVELS[organId]
  if (!organ) return null
  return organ[level] || organ.resumido
}
