/**
 * BIBLIOTECA EXTENDIDA DE FRASES CLÍNICAS POR PROCEDIMENTO E ÓRGÃO
 *
 * Frases originais, clinicamente cuidadosas e editáveis.
 * Categorizadas por:
 * - 'achado_normal'
 * - 'achado_patologico'
 * - 'medida'
 * - 'descricao'
 * - 'impressao'
 */

export interface ClinicalPhraseItem {
  id: string
  organ: string
  procedureGroup: string
  category: 'achado_normal' | 'achado_patologico' | 'medida' | 'descricao' | 'impressao'
  title: string
  text: string
  isFavorite?: boolean
}

export const EXTENDED_CLINICAL_PHRASES: ClinicalPhraseItem[] = [
  // FÍGADO
  {
    id: 'ph_fig_esteatose_leve',
    organ: 'Fígado',
    procedureGroup: 'Abdome',
    category: 'achado_patologico',
    title: 'Esteatose Hepática Grau I (Leve)',
    text: 'Aumento discreto e difuso da ecogenicidade do parênquima hepático, com atenuação sutil do feixe acústico e adequada visibilização das veias supra-hepáticas e do diafragma, compatível com esteatose hepática difusa de grau leve (Grau I).',
  },
  {
    id: 'ph_fig_esteatose_mod',
    organ: 'Fígado',
    procedureGroup: 'Abdome',
    category: 'achado_patologico',
    title: 'Esteatose Hepática Grau II (Moderada)',
    text: 'Aumento moderado e difuso da ecogenicidade parenquimatosa hepática, com atenuação acústica nos planos profundos e borramento sutil das paredes vasculares intra-hepáticas, compatível com esteatose hepática de grau moderado (Grau II).',
  },
  {
    id: 'ph_fig_cisto_simples',
    organ: 'Fígado',
    procedureGroup: 'Abdome',
    category: 'achado_patologico',
    title: 'Cisto Hepático Simples',
    text: 'Imagem anecóica, arredondada, de contornos lisos e paredes imperceptíveis, com reforço acústico posterior límpido, localizada no lobo hepático direito, compatível com cisto simples.',
  },
  {
    id: 'ph_fig_hemangioma',
    organ: 'Fígado',
    procedureGroup: 'Abdome',
    category: 'achado_patologico',
    title: 'Hemangioma Hepático Típico',
    text: 'Nódulo hiperecogênico, homogêneo, bem delimitado, sem halo hipoecóico periférico e sem fluxo interno ao Doppler colorido, com características ultrassonográficas típicas de hemangioma capilar.',
  },

  // VESÍCULA BILIAR
  {
    id: 'ph_ves_colelitiase',
    organ: 'Vesícula Biliar',
    procedureGroup: 'Abdome',
    category: 'achado_patologico',
    title: 'Colelitíase',
    text: 'Vesícula biliar com imagem hiperecogênica no seu interior, móvel às mudanças de decúbito, gerando sombra acústica posterior nítida, compatível com cálculo biliar (colelitíase). Paredes com espessura preservada, sem sinais ecográficos de colecistite aguda no momento do exame.',
  },
  {
    id: 'ph_ves_polipo',
    organ: 'Vesícula Biliar',
    procedureGroup: 'Abdome',
    category: 'achado_patologico',
    title: 'Pólipo de Vesícula Biliar',
    text: 'Pequena formação hiperecogênica fixa à parede da vesícula biliar, sem sombra acústica posterior e sem mobilidade ao decúbito, compatível com lesão polipoide (pólipo de colesterol).',
  },

  // RINS E VIAS URINÁRIAS
  {
    id: 'ph_rim_litíase',
    organ: 'Rins',
    procedureGroup: 'Urinário',
    category: 'achado_patologico',
    title: 'Litíase Renal Sem Hidronefrose',
    text: 'Foco hiperecogênico no grupo calicial médio/inferior, associado a discreta sombra acústica posterior e artefato de cintilação (twinkling) ao Doppler colorido, sem dilatação do sistema coletor associada, compatível com cálculo renal.',
  },
  {
    id: 'ph_rim_cisto_simples',
    organ: 'Rins',
    procedureGroup: 'Urinário',
    category: 'achado_patologico',
    title: 'Cisto Renal Simples (Bosniak I)',
    text: 'Formação cística cortical, anecóica, de paredes finas e lisas, com reforço acústico posterior nítido, sem septos, calcificações ou nódulos parietais, preenchendo critérios para cisto renal simples.',
  },
  {
    id: 'ph_rim_hidronefrose_leve',
    organ: 'Rins',
    procedureGroup: 'Urinário',
    category: 'achado_patologico',
    title: 'Dilatação Pielocalicial Leve',
    text: 'Discreta separação do seio renal por ectasia da pelve e cálices maiores, sem afilamento cortical parenquimatoso, compatível com dilatação pielocalicial discreta/leve.',
  },

  // PRÓSTATA
  {
    id: 'ph_prost_hbp_leve',
    organ: 'Próstata',
    procedureGroup: 'Geniturinário',
    category: 'achado_patologico',
    title: 'Hiperplasia Prostática Benigna (Aumento Leve)',
    text: 'Próstata com aumento volumétrico discreto à custa da zona de transição, com contornos lobulados e nódulos estromais com ecotextura heterogênea habitual de aspecto adenomatoso benigno.',
  },
  {
    id: 'ph_prost_residuo',
    organ: 'Bexiga / Próstata',
    procedureGroup: 'Geniturinário',
    category: 'medida',
    title: 'Resíduo Pós-Miccional Significativo',
    text: 'Avaliação pós-miccional evidencia esvaziamento incompleto com resíduo urinário significativo.',
  },

  // TIREOIDE
  {
    id: 'ph_tir_nodulo_coloide',
    organ: 'Tireoide',
    procedureGroup: 'Tireoide',
    category: 'achado_patologico',
    title: 'Nódulo Espongiforme / Coloide (Benigno)',
    text: 'Nódulo com composição predominantemente cística/espongiforme (> 50%), isoecogênico, de margens bem definidas, com focos de cauda de cometa típicos de coloide espesso, sem características ecográficas suspeitas (critérios compatíveis com ACR TI-RADS 2 - Benigno).',
  },
  {
    id: 'ph_tir_tireoidite',
    organ: 'Tireoide',
    procedureGroup: 'Tireoide',
    category: 'achado_patologico',
    title: 'Padrão Ecográfico de Tireoidite Crônica (Hashimoto)',
    text: 'Tireoide com volume preservado ou discretamente aumentado, contornos lobulados e ecotextura difusamente heterogênea com micronodulações pseudonodulares hipoecóicas entremeadas por traves ecogênicas, achados compatíveis com tireoidopatia difusa crônica (tireoidite de Hashimoto em correlação clínica/laboratorial).',
  },

  // MAMAS
  {
    id: 'ph_mam_cisto_simples',
    organ: 'Mamas',
    procedureGroup: 'Mamas',
    category: 'achado_patologico',
    title: 'Cisto Mamário Simples (BI-RADS 2)',
    text: 'Nódulo anecóico, circunscrito, arredondado/oval, de paredes delgadas e imperceptíveis, com reforço acústico posterior límpido e ausência de ecos internos ou fluxo ao Doppler, característico de cisto simples benigno (BI-RADS 2).',
  },
  {
    id: 'ph_mam_fibroadenoma',
    organ: 'Mamas',
    procedureGroup: 'Mamas',
    category: 'achado_patologico',
    title: 'Nódulo Provavelmente Benigno / Fibroadenoma (BI-RADS 3)',
    text: 'Nódulo sólido hipoecogênico, circunscrito, ovalado, de orientação paralela à pele, com diâmetro maior horizontal, margens regulares e ecotextura homogênea, sem sombra acústica posterior (características provavelmente benignas - BI-RADS 3).',
  },

  // GINECOLOGIA / TRANSVAGINAL
  {
    id: 'ph_tv_mioma_intramural',
    organ: 'Útero',
    procedureGroup: 'Ginecologia',
    category: 'achado_patologico',
    title: 'Nódulo Miomatoso Intramural',
    text: 'Nódulo miometrial hipoecóico, de contornos circunscritos e limites regulares, com atenuação sonora em estrias típica, localizado na parede anterior/posterior corporal, compatível com leiomioma intramural (FIGO 4/5).',
  },
  {
    id: 'ph_tv_adenomiose',
    organ: 'Útero',
    procedureGroup: 'Ginecologia',
    category: 'achado_patologico',
    title: 'Sinais Ecográficos Sugestivos de Adenomiose',
    text: 'Assimetria parietal miometrial associada a áreas de heterogeneidade ecotextural com estrias lineares anecóicas e pequenos cistos miometriais subendometriais, achados sugestivos de adenomiose difusa.',
  },
  {
    id: 'ph_tv_cisto_funcional',
    organ: 'Ovários',
    procedureGroup: 'Ginecologia',
    category: 'achado_patologico',
    title: 'Cisto Ovariano Simples / Folicular',
    text: 'Formação cística anecóica, unilocular, de paredes delgadas e lisas, conteúdo límpido, com reforço acústico posterior, sem papilas ou septos, compatível com cisto de natureza funcional.',
  },

  // ARTICULAÇÃO / OMBRO
  {
    id: 'ph_omb_tendinopatia_supra',
    organ: 'Ombro',
    procedureGroup: 'Musculoesquelético',
    category: 'achado_patologico',
    title: 'Tendinopatia do Supraespinal',
    text: 'Tendão supraespinal com espessamento focal e hipoecogenicidade heterogênea em sua porção distal junto à inserção na grande tuberosidade, mantendo continuidade anatômica de suas fibras, compatível com tendinopatia sem sinais de rotura transfixante.',
  },
  {
    id: 'ph_omb_bursite',
    organ: 'Ombro',
    procedureGroup: 'Musculoesquelético',
    category: 'achado_patologico',
    title: 'Bursite Subacromial-Subdeltoidea',
    text: 'Distensão fluida da bursa subacromial-subdeltoidea com espessamento sinovial parietal e lâmina líquida anecóica, achados compatíveis com bursite subacromial-subdeltoidea.',
  },

  // PARTES MOLES
  {
    id: 'ph_pm_lipoma',
    organ: 'Partes Moles',
    procedureGroup: 'Partes Moles',
    category: 'achado_patologico',
    title: 'Lipoma Subcutâneo Típico',
    text: 'Lesão nodular localizada no plano celular subcutâneo, de limites bem definidos, morfologia elíptica paralela à superfície cutânea, ecotextura homogênea discretamente hiperecogênica em relação à gordura adjacente, compressível e sem vascularização significativa ao Doppler, com características ecográficas típicas de lipoma.',
  },
]
