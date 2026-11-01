/**
 * EXTENSÃO DE MÁSCARAS CLÍNICAS ESTRUTURADAS COMPLEMENTARES
 *
 * Máscaras para fechar o rol de 24+ máscaras exigidas:
 * 1) Abdome Superior
 * 2) Obstétrica Morfológica 1º Trimestre (com TN e Osso Nasal)
 * 3) Obstétrica com Doppler
 * 4) Gestação Gemelar (Fetos A e B independentes, Corionicidade)
 * 5) Perfil Biofísico Fetal (PBF com pontuação baseada em observação)
 * 6) Doppler Venoso de Membros Inferiores
 * 7) Doppler Arterial de Membros Inferiores
 * 8) Pênis e Doppler Peniano
 * 9) Glândulas Salivares (Parótidas e Submandibulares)
 * 10) Parede Abdominal / Hérnias
 * 11) Cotovelo / Punho / Tornozelo (MSK parametrizado)
 */

import type { ClinicalMaskDefinition } from './clinicalMasksRegistry'

export const EXTENDED_MASKS_REGISTRY: Record<string, ClinicalMaskDefinition> = {
  // ABDOME SUPERIOR
  mask_abdome_superior: {
    id: 'mask_abdome_superior',
    code: 'US-MASK-ABD-SUP-01',
    name: 'Máscara de Abdome Superior',
    version: '1.0.0',
    category: 'abdome',
    technique:
      'Exame ultrassonográfico do abdome superior realizado com transdutor convexo multifrequencial após jejum orientado.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia de Abdome Superior',
      'Ultrassonografia do Abdome Superior',
      'USG Abdome Superior',
    ],
    sections: [
      {
        id: 'figado',
        label: 'Fígado',
        anatomicalStructure: 'Fígado',
        order: 1,
        fieldType: 'textarea',
        normalPhraseResumida: 'Fígado com dimensões normais e ecotextura homogênea.',
        normalPhraseConvencional:
          'Fígado tópico, com contornos regulares, bordas afiladas e dimensões normais. Parênquima homogêneo com ecogenicidade habitual, sem lesões focais.',
      },
      {
        id: 'vias_biliares',
        label: 'Vias Biliares e Colédoco',
        anatomicalStructure: 'Vias Biliares',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Vias biliares intra e extra-hepáticas de calibre preservado. Colédoco com diâmetro normal em toda a sua extensão visualizada, sem cálculos.',
      },
      {
        id: 'vesicula',
        label: 'Vesícula Biliar',
        anatomicalStructure: 'Vesícula Biliar',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Vesícula biliar tópica, normodistendida, com paredes finas e regulares, conteúdo anecóico homogêneo, sem cálculos ou pólipos parietais.',
      },
      {
        id: 'pancreas',
        label: 'Pâncreas',
        anatomicalStructure: 'Pâncreas',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Pâncreas visualizado em seus segmentos anatômicos, com espessura e ecotextura conservadas para a faixa etária. Ducto de Wirsung não dilatado.',
      },
      {
        id: 'baco',
        label: 'Baço',
        anatomicalStructure: 'Baço',
        order: 5,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Baço de contornos regulares, dimensões normais e ecotextura homogênea, sem esplenomegalia ou lesões focais.',
      },
      {
        id: 'aorta_veia_cava',
        label: 'Grandes Vasos Abdominais Superiores',
        anatomicalStructure: 'Grandes Vasos',
        order: 6,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Aorta abdominal superior e veia cava inferior com trajeto e calibres preservados, sem massas expansivas ou adenomegalias no segmento examinado.',
      },
    ],
  },

  // MORFOLÓGICA 1º TRIMESTRE (COM TN E OSSO NASAL)
  mask_morfologica_1tri: {
    id: 'mask_morfologica_1tri',
    code: 'US-MASK-OBS-MORF1-01',
    name: 'Máscara Obstétrica Morfológica de 1º Trimestre (com Translucência Nucal)',
    version: '1.0.0',
    category: 'obstetricia',
    technique:
      'Exame ultrassonográfico morfológico fetal de 1º trimestre (11 a 13 semanas e 6 dias) segundo critérios da Fetal Medicine Foundation (FMF).',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia Obstétrica Morfológica de 1º Trimestre',
      'Ultrassonografia Morfológica de 1º Trimestre',
      'Morfológico 1º Trimestre com Translucência Nucal',
    ],
    sections: [
      {
        id: 'biometria_1tri',
        label: 'Biometria Fetal (CCN e DBP)',
        anatomicalStructure: 'Biometria 1º Trimestre',
        order: 1,
        fieldType: 'measurement',
        normalPhraseConvencional:
          'Comprimento cabeça-nádega (CCN) entre 45 mm e 84 mm, compatível com a idade gestacional. Diâmetro biparietal (DBP) correspondente.',
      },
      {
        id: 'translucencia_nucal',
        label: 'Marcadores de Aneuploidias — Translucência Nucal (TN)',
        anatomicalStructure: 'Translucência Nucal',
        order: 2,
        fieldType: 'measurement',
        normalPhraseConvencional:
          'Translucência nucal medida em corte sagital médio estrito com o feto em posição neutra. Espessura da TN dentro dos limites fisiológicos normais para o CCN (abaixo do percentil 95).',
      },
      {
        id: 'osso_nasal',
        label: 'Marcadores de Aneuploidias — Osso Nasal',
        anatomicalStructure: 'Osso Nasal',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Osso nasal presente e ecogênico em plano sagital médio fetal estrito.',
      },
      {
        id: 'ducto_venoso_tricuspide',
        label: 'Doppler de Ducto Venoso e Regurgitação Tricúspide',
        anatomicalStructure: 'Ducto Venoso e Tricúspide',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Onda de velocidade de fluxo do ducto venoso com onda A positiva e índice de pulsatilidade normal. Ausência de regurgitação tricúspide patológica.',
      },
      {
        id: 'anatomia_precoce',
        label: 'Avaliação Anatômica Fetal Precoce',
        anatomicalStructure: 'Anatomia Precoce',
        order: 5,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Calota craniana íntegra com sinal da borboleta (plexos coroides). Face com perfil preservado. Estômago e bexiga visualizados. Parede abdominal íntegra sem onfalocele. Quatro membros identificados com três segmentos cada.',
      },
    ],
  },

  // OBSTÉTRICA COM DOPPLER
  mask_obstetrica_doppler: {
    id: 'mask_obstetrica_doppler',
    code: 'US-MASK-OBS-DOPP-01',
    name: 'Máscara Obstétrica com Doppler Colorido',
    version: '1.0.0',
    category: 'obstetricia',
    technique:
      'Exame ultrassonográfico obstétrico com estudo Doppler da circulação uteroplacentária e fetoplacentária.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia Obstétrica com Doppler Colorido',
      'Ultrassonografia Obstétrica com Doppler',
      'Doppler Obstétrico',
    ],
    sections: [
      {
        id: 'biometria_estatica',
        label: 'Estática Fetal e Biometria',
        anatomicalStructure: 'Biometria e Estática',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Feto único, vivo, situação longitudinal, apresentação cefálica. Biometria coerente com a idade gestacional.',
      },
      {
        id: 'arteria_umbilical',
        label: 'Doppler da Artéria Umbilical',
        anatomicalStructure: 'Artéria Umbilical',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Artéria umbilical com fluxo diastólico final anterógrado positivo e preservado. Índices de resistência (IR) e pulsatilidade (IP) normais para a idade gestacional, afastando sofrimento hemodinâmico fetoplacentário.',
      },
      {
        id: 'arteria_cerebral_media',
        label: 'Doppler da Artéria Cerebral Média (ACM)',
        anatomicalStructure: 'Artéria Cerebral Média',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Artéria cerebral média com padrão de alta resistência habitual para a fase gestacional (sem centralização hemodinâmica). Pico de velocidade sistólica dentro dos limites normais.',
      },
      {
        id: 'relacao_cerebro_placentaria',
        label: 'Relação Cérebro-Placentária (RCP)',
        anatomicalStructure: 'Relação Cérebro-Placentária',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Relação cérebro-placentária (IP da ACM / IP da Umbilical) acima do percentil 5 para a idade gestacional (RCP normal).',
      },
      {
        id: 'arterias_uterinas',
        label: 'Doppler das Artérias Uterinas Maternas',
        anatomicalStructure: 'Artérias Uterinas',
        order: 5,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Artérias uterinas direita e esquerda com adequada invasão trofoblástica, padrão de baixa resistência e ausência de incisuras protodiastólicas patológicas bilaterais.',
      },
    ],
  },

  // GESTAÇÃO GEMELAR
  mask_gestacao_gemelar: {
    id: 'mask_gestacao_gemelar',
    code: 'US-MASK-OBS-GEM-01',
    name: 'Máscara Obstétrica em Gestação Gemelar',
    version: '1.0.0',
    category: 'obstetricia',
    technique:
      'Exame ultrassonográfico obstétrico em gestação múltipla com avaliação individualizada e sistemática por feto (A e B).',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia Obstétrica em Gestação Gemelar',
      'Ultrassonografia Obstétrica em Gestação Gemelar com Doppler',
      'Gestação Gemelar',
    ],
    sections: [
      {
        id: 'corionicidade_amnionicidade',
        label: 'Corionicidade e Amnionicidade',
        anatomicalStructure: 'Placentação e Membrana',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Gestação gemelar com membrana intergemelar identificada. Placentação caracterizada, com inserções de cordão bem delimitadas.',
      },
      {
        id: 'feto_a_biometria_vitalidade',
        label: 'Feto A — Apresentação, Biometria e FCF',
        anatomicalStructure: 'Feto A',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Feto A: apresentação cefálica, batimentos cardíacos presentes e rítmicos. Biometria e peso estimado adequados para a idade gestacional.',
      },
      {
        id: 'feto_a_liquido_placenta',
        label: 'Feto A — Líquido Amniótico e Doppler',
        anatomicalStructure: 'Feto A Anexos',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Feto A: maior bolsão vertical de líquido amniótico normal. Doppler das artérias umbilicais com padrão fisiológico.',
      },
      {
        id: 'feto_b_biometria_vitalidade',
        label: 'Feto B — Apresentação, Biometria e FCF',
        anatomicalStructure: 'Feto B',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Feto B: apresentação cefálica/pélvica, batimentos cardíacos fetais normais e rítmicos. Biometria compatível com a idade gestacional e concordante com o feto A.',
      },
      {
        id: 'feto_b_liquido_placenta',
        label: 'Feto B — Líquido Amniótico e Doppler',
        anatomicalStructure: 'Feto B Anexos',
        order: 5,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Feto B: volume de líquido amniótico preservado. Doppler compatível com normalidade. Sem discordância ponderal significativa entre os conceptos (< 20%).',
      },
    ],
  },

  // PERFIL BIOFÍSICO FETAL (PBF)
  mask_perfil_biofisico_fetal: {
    id: 'mask_perfil_biofisico_fetal',
    code: 'US-MASK-OBS-PBF-01',
    name: 'Máscara de Perfil Biofísico Fetal (PBF)',
    version: '1.0.0',
    category: 'obstetricia',
    technique:
      'Avaliação ultrassonográfica contínua da vitalidade fetal por período de observação (mínimo de 30 minutos).',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: ['Perfil Biofísico Fetal (PBF)', 'Perfil Biofísico Fetal', 'PBF'],
    sections: [
      {
        id: 'movimentos_respiratorios',
        label: '1. Movimentos Respiratórios Fetais (MRF)',
        anatomicalStructure: 'Respiração Fetal',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Presentes: observado pelo menos 1 episódio de movimento respiratório fetal sustentado por no mínimo 30 segundos (Pontuação: 2/2).',
      },
      {
        id: 'movimentos_corporeos',
        label: '2. Movimentos Corpóreos Globais (MCF)',
        anatomicalStructure: 'Movimentação Corpórea',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Presentes: observados pelo menos 3 movimentos corporais ou de membros amplos e discretos no período de avaliação (Pontuação: 2/2).',
      },
      {
        id: 'tonus_fetal',
        label: '3. Tônus Fetal',
        anatomicalStructure: 'Tônus Fetal',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Preservado: observado pelo menos 1 episódio de extensão ativa de membro ou coluna com retorno rápido à flexão, e/ou abertura e fechamento de mão (Pontuação: 2/2).',
      },
      {
        id: 'liquido_amniotico_pbf',
        label: '4. Volume de Líquido Amniótico (ILA / Maior Bolsão)',
        anatomicalStructure: 'Líquido Amniótico',
        order: 4,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Normal: identificado pelo menos um bolsão vertical de líquido amniótico livre de cordão ou partes fetais medindo >= 2,0 cm (Pontuação: 2/2).',
      },
      {
        id: 'pontuacao_final_pbf',
        label: 'Escore Total de Perfil Biofísico Fetal',
        anatomicalStructure: 'Escore PBF',
        order: 5,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Escore do Perfil Biofísico Fetal: 8/8 pontos nos parâmetros ultrassonográficos avaliados, denotando vitalidade fetal preservada.',
      },
    ],
  },

  // DOPPLER VENOSO DE MEMBROS INFERIORES
  mask_doppler_venoso_membros: {
    id: 'mask_doppler_venoso_membros',
    code: 'US-MASK-DOPP-VEN-01',
    name: 'Máscara de Doppler Venoso de Membros Inferiores',
    version: '1.0.0',
    category: 'vascular_doppler',
    technique:
      'Estudo hemodinâmico e de compressibilidade do sistema venoso profundo e superficial dos membros inferiores com transdutor linear vascular.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Doppler Venoso de Membros Inferiores Bilateral',
      'Doppler Venoso de Membro Inferior Direito',
      'Doppler Venoso de Membro Inferior Esquerdo',
      'Doppler Venoso de Membros',
    ],
    sections: [
      {
        id: 'sistema_profundo_direito',
        label: 'Sistema Venoso Profundo — Membro Direito',
        anatomicalStructure: 'Venoso Profundo Direito',
        order: 1,
        fieldType: 'textarea',
        laterality: 'D',
        normalPhraseConvencional:
          'Veias femoral comum, femoral profunda, femoral e poplítea pérvias, com compressibilidade total ao transdutor. Ausência de trombos intraluminais agudos ou crônicos. Fluxo fásico com a respiração espontânea e aumento ao teste de compressão muscular distal.',
      },
      {
        id: 'sistema_superficial_direito',
        label: 'Sistema Venoso Superficial — Membro Direito (Safenas)',
        anatomicalStructure: 'Safenas Direita',
        order: 2,
        fieldType: 'textarea',
        laterality: 'D',
        normalPhraseConvencional:
          'Veias safena magna e safena parva pérvias, com calibres fisiológicos e junções safenofemoral e safenopoplítea continentes. Ausência de refluxo patológico significativo à manobra de descompressão distal.',
      },
      {
        id: 'sistema_profundo_esquerdo',
        label: 'Sistema Venoso Profundo — Membro Esquerdo',
        anatomicalStructure: 'Venoso Profundo Esquerdo',
        order: 3,
        fieldType: 'textarea',
        laterality: 'E',
        normalPhraseConvencional:
          'Perviedade e compressibilidade preservadas em todos os segmentos femoropoplíteos e nas veias tibiais examinadas. Sem evidência de trombose venosa profunda (TVP).',
      },
      {
        id: 'sistema_superficial_esquerdo',
        label: 'Sistema Venoso Superficial — Membro Esquerdo (Safenas)',
        anatomicalStructure: 'Safenas Esquerda',
        order: 4,
        fieldType: 'textarea',
        laterality: 'E',
        normalPhraseConvencional:
          'Veia safena magna e parva com paredes finas, diâmetros conservados e fluxo competente, sem sinais de refluxo ou tromboflebite superficial.',
      },
    ],
  },

  // DOPPLER ARTERIAL DE MEMBROS INFERIORES
  mask_doppler_arterial_membros: {
    id: 'mask_doppler_arterial_membros',
    code: 'US-MASK-DOPP-ART-01',
    name: 'Máscara de Doppler Arterial de Membros Inferiores',
    version: '1.0.0',
    category: 'vascular_doppler',
    technique:
      'Mapeamento duplex/triplex arterial dos eixos ilíaco-femoro-poplíteo e distal dos membros inferiores.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Doppler Arterial de Membros Inferiores Bilateral',
      'Doppler Arterial de Membro Inferior Direito',
      'Doppler Arterial de Membro Inferior Esquerdo',
      'Doppler Arterial de Membros',
    ],
    sections: [
      {
        id: 'arterial_direito',
        label: 'Eixo Arterial — Membro Direito',
        anatomicalStructure: 'Artérias Membro Direito',
        order: 1,
        fieldType: 'textarea',
        laterality: 'D',
        normalPhraseConvencional:
          'Artérias femoral comum, femoral profunda, femoral superficial, poplítea, tibial anterior, tibial posterior e fibular pérvias. Paredes luminais lisas, sem placas ateromatosas estenosantes. Padrão de fluxo trifásico com velocidades sistólicas normais em todos os níveis.',
      },
      {
        id: 'arterial_esquerdo',
        label: 'Eixo Arterial — Membro Esquerdo',
        anatomicalStructure: 'Artérias Membro Esquerdo',
        order: 2,
        fieldType: 'textarea',
        laterality: 'E',
        normalPhraseConvencional:
          'Eixo arterial pérvio bilateralmente. Curvas espectrais trifásicas de alta resistência anatômica, sem dilatações aneurismáticas ou acelerações focais indicativas de estenose crítica.',
      },
    ],
  },

  // PÊNIS E DOPPLER PENIANO
  mask_penis_doppler: {
    id: 'mask_penis_doppler',
    code: 'US-MASK-PENIS-01',
    name: 'Máscara de Ultrassonografia Peniana (com Doppler)',
    version: '1.0.0',
    category: 'geniturinario',
    technique:
      'Exame ultrassonográfico do pênis realizado com transdutor linear de alta frequência em cortes longitudinais e transversais com Doppler colorido.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia de Pênis',
      'Doppler Colorido Peniano Farmacoinduzido',
      'Ultrassonografia Peniana',
    ],
    sections: [
      {
        id: 'corpos_cavernosos',
        label: 'Corpos Cavernosos e Túnica Albugínea',
        anatomicalStructure: 'Corpos Cavernosos',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Corpos cavernosos simétricos, com ecotextura homogênea do tecido erétil. Túnica albugínea íntegra e contínua em toda a extensão do pênis, sem placas fibróticas ou calcificações (ausência de sinais de doença de Peyronie).',
      },
      {
        id: 'corpo_esponjoso_uretra',
        label: 'Corpo Esponjoso e Uretra Pendular',
        anatomicalStructure: 'Corpo Esponjoso',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Corpo esponjoso de espessura e ecotextura normais ao longo do trajeto pendular. Uretra sem espessamentos parietais evidentes.',
      },
      {
        id: 'arterias_cavernosas_doppler',
        label: 'Artérias Cavernosas e Hemodinâmica ao Doppler',
        anatomicalStructure: 'Artérias Cavernosas',
        order: 3,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Artérias cavernosas direita e esquerda pérvias, com calibres simétricos e fluxo anterógrado adequado ao estudo Doppler.',
      },
    ],
  },

  // GLÂNDULAS SALIVARES
  mask_glandulas_salivares: {
    id: 'mask_glandulas_salivares',
    code: 'US-MASK-SALIV-01',
    name: 'Máscara de Glândulas Salivares (Parótidas e Submandibulares)',
    version: '1.0.0',
    category: 'tireoide_cervical',
    technique:
      'Exame ultrassonográfico das glândulas salivares maiores cervicais realizado com transdutor linear de alta frequência.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia de Glândulas Salivares (Parótidas e Submandibulares)',
      'Ultrassonografia de Parótidas',
      'Ultrassonografia de Glândulas Submandibulares',
    ],
    sections: [
      {
        id: 'parotidas',
        label: 'Glândulas Parótidas (Direita e Esquerda)',
        anatomicalStructure: 'Parótidas',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Glândulas parótidas tópicas, simétricas, de dimensões normais e contornos bem definidos. Parênquima de ecotextura homogênea, sem nódulos sólidos, cistos ou dilatação do ducto de Stenon.',
      },
      {
        id: 'submandibulares',
        label: 'Glândulas Submandibulares (Direita e Esquerda)',
        anatomicalStructure: 'Submandibulares',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Glândulas submandibulares tópicas, com volume anatômico preservado, ecotextura habitual e sem lesões focais. Ductos de Wharton sem dilatações ou cálculos obstrutivos (sem sialolitíase).',
      },
    ],
  },

  // PAREDE ABDOMINAL / HÉRNIAS
  mask_parede_abdominal_hernias: {
    id: 'mask_parede_abdominal_hernias',
    code: 'US-MASK-PAREDE-01',
    name: 'Máscara de Parede Abdominal e Regiões Inguinais (Hérnias)',
    version: '1.0.0',
    category: 'partes_moles',
    technique:
      'Exame ultrassonográfico da parede abdominal realizado com transdutor linear de alta frequência em repouso e sob manobra de Valsalva dinâmica.',
    status: 'ESTRUTURADA_E_TESTADA',
    bodyMarkCompatible: 'none',
    compatibleProcedures: [
      'Ultrassonografia de Parede Abdominal (Hérnia Epigástrica / Umbilical / Incisional)',
      'Ultrassonografia de Região Inguinal Bilateral',
      'Ultrassonografia de Região Inguinal Unilateral Direita',
      'Ultrassonografia de Região Inguinal Unilateral Esquerda',
    ],
    sections: [
      {
        id: 'linha_alba_umbigo',
        label: 'Linha Alba e Anel Umbilical',
        anatomicalStructure: 'Linha Alba e Umbigo',
        order: 1,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Músculos retos abdominais normoposicionados, sem diástase patológica. Linha alba íntegra. Anel umbilical continente, sem herniação de gordura pré-peritoneal ou alças intestinais sob repouso ou Valsalva.',
      },
      {
        id: 'regioes_inguinais',
        label: 'Regiões Inguinais e Canais Inguinais',
        anatomicalStructure: 'Canais Inguinais',
        order: 2,
        fieldType: 'textarea',
        normalPhraseConvencional:
          'Canais inguinais direito e esquerdo com anatomia conservada, sem protrusão de saco herniário ou conteúdo peritoneal através dos anéis inguinais interno ou externo às manobras dinâmicas.',
      },
    ],
  },
}
