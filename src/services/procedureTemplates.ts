import { normalizePhysicianName } from '@/services/referringPhysicians'

export interface StructuredTemplateDefinition {
  matchKeywords: string[]
  title: string
  sections?: Array<{ id: string; label: string; defaultText?: string }>
  freeTextFallback?: boolean
  schemeId?: string
}

export const KNOWN_PROCEDURE_TEMPLATES: StructuredTemplateDefinition[] = [
  {
    matchKeywords: ['mamaria bilateral', 'mama bilateral', 'mamas bilaterais', 'mamaria'],
    title: 'Ultrassonografia Mamária Bilateral',
    schemeId: 'breast',
    sections: [
      {
        id: 'mama_direita',
        label: 'Mama Direita',
        defaultText:
          'Pele e complexo aréolo-papilar preservados. Parênquima fibroglandular de ecotextura e distribuição habituais para a faixa etária. Ausência de nódulos sólidos ou císticos detectáveis. Fossa axilar direita sem linfonodomegalias atípicas.',
      },
      {
        id: 'mama_esquerda',
        label: 'Mama Esquerda',
        defaultText:
          'Pele e complexo aréolo-papilar íntegros. Tecido subcutâneo e retromamário normais. Parênquima glandular homogêneo, sem distorções arquiteturais ou lesões sólidas/císticas. Fossa axilar esquerda livre de linfonodomegalias.',
      },
      {
        id: 'conclusao_birads',
        label: 'Impressão Diagnóstica / BI-RADS',
        defaultText:
          'Achados ultrassonográficos mamários bilaterais normais.\nCLASSIFICAÇÃO BI-RADS®: CATEGORIA 1 (Negativa / Normal).',
      },
    ],
  },
  {
    matchKeywords: ['tireoide', 'tireoide com doppler', 'cervical tireoide'],
    title: 'Ultrassonografia de Tireoide com Doppler',
    sections: [
      {
        id: 'lobo_direito',
        label: 'Lobo Direito',
        defaultText:
          'Tópico, com contornos regulares e dimensões anatômicas preservadas. Parênquima com ecotextura homogênea e ecogenicidade normal. Ausência de nódulos sólidos ou císticos.',
      },
      {
        id: 'istmo',
        label: 'Istmo',
        defaultText: 'Espessura e contornos preservados, ecotextura homogênea, sem lesões focais.',
      },
      {
        id: 'lobo_esquerdo',
        label: 'Lobo Esquerdo',
        defaultText:
          'Tópico, contornos lisos e volume habitual. Ecotextura parenquimatosa preservada, sem nódulos identificáveis ao método.',
      },
      {
        id: 'estudo_doppler',
        label: 'Mapeamento com Doppler Colorido',
        defaultText:
          'Padrão vascular parenquimatoso fisiológico, sem hipervascularização focal ou difusa.',
      },
      {
        id: 'conclusao_tirads',
        label: 'Impressão Diagnóstica / TI-RADS',
        defaultText:
          'Glândula tireoide de dimensões normais e ecotextura homogênea ao modo B e Doppler.\nACR TI-RADS: 1 (Normal).',
      },
    ],
  },
  {
    matchKeywords: ['partes moles', 'parede abdominal', 'subcutaneo'],
    title: 'Ultrassonografia de Partes Moles',
    sections: [
      {
        id: 'planos_superficiais',
        label: 'Planos Cutâneo e Subcutâneo',
        defaultText:
          'Espessura e ecotextura conservadas na região examinada. Sem evidências de coleções líquidas, hematomas ou massas expansivas.',
      },
      {
        id: 'plano_muscular',
        label: 'Plano Fáscio-Muscular',
        defaultText:
          'Padrão fibrilar preservado, sem roturas, hérnias ou descontinuidades estruturais.',
      },
      {
        id: 'conclusao_partes_moles',
        label: 'Impressão Diagnóstica',
        defaultText:
          'Exame ultrassonográfico de partes moles sem alterações patológicas detectáveis na topografia avaliada.',
      },
    ],
  },
  {
    matchKeywords: [
      'carotidas',
      'carotidas e vertebrais',
      'doppler de carotidas',
      'doppler carotideo',
    ],
    title: 'Doppler Colorido de Carótidas e Vertebrais',
    sections: [
      {
        id: 'carotida_direita',
        label: 'Sistema Carotídeo Direito (Comum, Interna e Externa)',
        defaultText:
          'Artérias pérvias, de calibre e trajeto anatômicos. Complexo íntima-média de espessura conservada. Ausência de placas de ateroma com repercussão hemodinâmica. Fluxo anterógrado com curvas espectrais normais.',
      },
      {
        id: 'carotida_esquerda',
        label: 'Sistema Carotídeo Esquerdo (Comum, Interna e Externa)',
        defaultText:
          'Perviedade arterial preservada bilateralmente. Paredes arteriais lisas e regulares, sem estenoses significativas. Curvas de velocidade sistólica e diastólica fisiológicas.',
      },
      {
        id: 'arterias_vertebrais',
        label: 'Artérias Vertebrais Bilaterais',
        defaultText:
          'Pérvias, com fluxo laminar e anterógrado e espectro velocimétrico dentro dos parâmetros de normalidade.',
      },
      {
        id: 'conclusao_doppler',
        label: 'Impressão Diagnóstica',
        defaultText:
          'Estudo Doppler colorido e espectral das artérias carótidas e vertebrais sem evidência de estenoses hemodinamicamente relevantes.',
      },
    ],
  },
  {
    matchKeywords: ['abdome total', 'abdominal total', 'ultrassonografia de abdome total'],
    title: 'Ultrassonografia de Abdome Total',
    sections: [
      { id: 'figado', label: 'Fígado' },
      { id: 'vias_biliares', label: 'Vias Biliares' },
      { id: 'vesicula', label: 'Vesícula Biliar' },
      { id: 'pancreas', label: 'Pâncreas' },
      { id: 'baco', label: 'Baço' },
      { id: 'rim_direito', label: 'Rim Direito' },
      { id: 'rim_esquerdo', label: 'Rim Esquerdo' },
      { id: 'bexiga', label: 'Bexiga' },
      { id: 'vasos', label: 'Grandes Vasos (Aorta e Cava)' },
      { id: 'retroperitonio', label: 'Retroperitônio e Cavidade' },
      { id: 'observacoes', label: 'Observações Técnicas e Preparo' },
    ],
  },
]

export function resolveProcedureTemplate(procedureName: string): {
  matched: boolean
  definition: StructuredTemplateDefinition | null
  suggestedTitle: string
  mode: 'structured' | 'freetext'
  sections: Array<{ id: string; label: string; text: string }>
  initialFreeText: string
  schemeId: string
} {
  const norm = normalizePhysicianName(procedureName)

  for (const tpl of KNOWN_PROCEDURE_TEMPLATES) {
    const match = tpl.matchKeywords.some((kw) => {
      const normKw = normalizePhysicianName(kw)
      return norm.includes(normKw) || normKw.includes(norm)
    })

    if (match) {
      return {
        matched: true,
        definition: tpl,
        suggestedTitle: `Laudo de ${tpl.title}`,
        mode: 'structured',
        sections: (tpl.sections || []).map((s) => ({
          id: s.id,
          label: s.label,
          text: s.defaultText || '',
        })),
        initialFreeText: '',
        schemeId: tpl.schemeId || 'none',
      }
    }
  }

  // Sem correspondência: NUNCA abrir abdome total por padrão!
  // Abrir editor de texto livre com o título correto do procedimento.
  const cleanTitle = procedureName.trim() || 'Ultrassonografia'
  return {
    matched: false,
    definition: null,
    suggestedTitle: `Laudo de ${cleanTitle}`,
    mode: 'freetext',
    sections: [],
    initialFreeText: `<h2>LAUDO DE ${cleanTitle.toUpperCase()}</h2>\n<p><strong>INDICAÇÃO CLÍNICA:</strong> Avaliação diagnóstica especializada.</p>\n<p><strong>TÉCNICA:</strong> Exame ultrassonográfico realizado em tempo real com transdutor apropriado à região anatômica.</p>\n<h3>RELATÓRIO:</h3>\n<p>Descreva aqui os achados ecográficos observados...</p>\n<h3>IMPRESSÃO DIAGNÓSTICA:</h3>\n<p>Conclusão diagnóstica do exame.</p>`,
    schemeId: 'none',
  }
}
