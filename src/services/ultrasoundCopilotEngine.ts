/**
 * COPILOTO ULTRASSONOGRÁFICO INTELIGENTE
 *
 * Arquitetura Clínica:
 * 1. Análise sem bloqueio do editor: opera em background com debounce inteligente.
 * 2. Cancelamento automático de requisições obsoletas quando o médico continua digitando.
 * 3. Dois grupos clínicos de atuação:
 *    A. REVISÃO REDACIONAL: ortografia, concordância, padronização e terminologia ultrassonográfica.
 *    B. APOIO À INTERPRETAÇÃO: alerta de inconsistências, medidas ausentes, hipóteses compatíveis e critérios técnicos (ACR TI-RADS determinístico).
 * 4. Respeito estrito às preferências do médico (estilo resumido/convencional, modo ativo/discreto, instruções pessoais).
 */

import { validateClinicalPreservation } from './clinicalPreservationValidator'
import type { DoctorAiPreferences } from '@/types'

export interface CopilotSuggestion {
  id: string
  category: 'redacao' | 'interpretacao' | 'inconsistencia' | 'medida_ausente'
  title: string
  explanation: string
  suggestedText: string
  originalText: string
  targetOrganId: string
  targetOrganLabel: string
  confidence: number
  deterministicCriteria?: string
  requiresReview: boolean
}

export interface CopilotAnalysisResult {
  organId: string
  textAnalyzed: string
  suggestions: CopilotSuggestion[]
  timestamp: number
}

// Regras de termos e coerência clínica para ultrassom
const ULTRASOUND_SPELL_MAP: Record<string, string> = {
  ecotextura: 'ecotextura',
  ecogenicidade: 'ecogenicidade',
  anecomico: 'anecóico',
  anecoico: 'anecóico',
  hiperecomico: 'hiperecogênico',
  hipoecogenico: 'hipoecogênico',
  wirsung: 'Wirsung',
  coledoco: 'colédoco',
  hepatopetal: 'hepatopetal',
  parenquima: 'parênquima',
  colelitiase: 'colelitíase',
  esteatose: 'esteatose',
  alitiásica: 'alitiásica',
}

/**
 * Motor local determinístico do Copiloto Ultrassonográfico
 * Opera de forma 100% offline e privada.
 */
export class UltrasoundCopilotEngine {
  private lastAnalyzedTextByOrgan: Map<string, string> = new Map()

  analyzeOrganText(
    organId: string,
    organLabel: string,
    text: string,
    preferences?: DoctorAiPreferences | null,
  ): CopilotSuggestion[] {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length < 5) return []

    // Não reanalisar se o texto for idêntico ao já computado
    if (this.lastAnalyzedTextByOrgan.get(organId) === trimmed) {
      return []
    }
    this.lastAnalyzedTextByOrgan.set(organId, trimmed)

    const suggestions: CopilotSuggestion[] = []
    const lower = trimmed.toLowerCase()

    // 1. REVISÃO REDACIONAL & TERMINOLOGIA ULTRASSONOGRÁFICA
    let correctedText = trimmed
    let correctedCount = 0

    for (const [wrong, correct] of Object.entries(ULTRASOUND_SPELL_MAP)) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi')
      if (regex.test(correctedText) && wrong !== correct) {
        correctedText = correctedText.replace(regex, correct)
        correctedCount++
      }
    }

    // Aplicação de preferências do médico
    if (preferences?.style === 'resumido') {
      // Se tiver frases excessivamente longas ou prolixas, sugerir versão resumida
      if (
        trimmed.length > 120 &&
        (lower.includes('apresentando') ||
          lower.includes('ao método') ||
          lower.includes('no momento do exame'))
      ) {
        const simplified = trimmed
          .replace(/ao exame ecográfico/gi, '')
          .replace(/ao método no momento do exame/gi, '')
          .replace(/identificáveis ao método/gi, 'evidentes')
          .replace(/\s+/g, ' ')
          .trim()

        if (simplified !== trimmed) {
          suggestions.push({
            id: `sug_style_${Date.now()}_1`,
            category: 'redacao',
            title: 'Objetividade (Preferência do Médico: Resumido)',
            explanation:
              'Remoção de expressões redundantes conforme sua preferência por conclusões e descrições concisas.',
            suggestedText: simplified,
            originalText: trimmed,
            targetOrganId: organId,
            targetOrganLabel: organLabel,
            confidence: 0.95,
            requiresReview: false,
          })
        }
      }
    }

    if (correctedCount > 0 && correctedText !== trimmed) {
      const pres = validateClinicalPreservation(trimmed, correctedText)
      suggestions.push({
        id: `sug_spell_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        category: 'redacao',
        title: 'Ajuste de Acentuação e Terminologia Ecográfica',
        explanation: 'Correção de grafia e padronização dos termos ultrassonográficos.',
        suggestedText: correctedText,
        originalText: trimmed,
        targetOrganId: organId,
        targetOrganLabel: organLabel,
        confidence: 0.98,
        requiresReview: !pres.isSafe,
      })
    }

    // 2. APOIO À INTERPRETAÇÃO & CONSISTÊNCIA CLÍNICA (Determinístico)
    // A. Nódulo sem medidas descritas
    if (
      (lower.includes('nódulo') ||
        lower.includes('nodulo') ||
        lower.includes('cisto') ||
        lower.includes('lesão focal') ||
        lower.includes('lesao focal')) &&
      !/\b\d+([.,]\d+)?\s*(mm|cm)\b/i.test(trimmed)
    ) {
      suggestions.push({
        id: `sug_missing_dim_${Date.now()}`,
        category: 'medida_ausente',
        title: 'Medida dimensional ausente na descrição',
        explanation: `Foi mencionada lesão focal/nódulo em ${organLabel}, mas nenhuma dimensão métrica (mm ou cm) foi informada. Recomenda-se registrar diâmetros nos 3 planos ou o maior diâmetro.`,
        suggestedText: `${trimmed} Medindo aproximadamente ___ x ___ mm.`,
        originalText: trimmed,
        targetOrganId: organId,
        targetOrganLabel: organLabel,
        confidence: 0.9,
        deterministicCriteria: 'Regra de padronização CBR/SRU: toda lesão focal requer mensuração.',
        requiresReview: true,
      })
    }

    // B. Alerta de inconsistência de negação/afirmação
    if (
      (lower.includes('sem alterações') ||
        lower.includes('aspecto normal') ||
        lower.includes('preservado')) &&
      (lower.includes('nódulo') ||
        lower.includes('cálculo') ||
        lower.includes('litíase') ||
        lower.includes('dilatação')) &&
      !lower.includes('sem nódulo') &&
      !lower.includes('sem cálculo') &&
      !lower.includes('sem dilatação')
    ) {
      suggestions.push({
        id: `sug_inconsistency_${Date.now()}`,
        category: 'inconsistencia',
        title: 'Possível Inconsistência Descritiva',
        explanation:
          'O texto combina expressões de normalidade ("preservado/aspecto normal") com achados anômalos. Verifique se o órgão é normal ou se há alteração focal.',
        suggestedText: trimmed,
        originalText: trimmed,
        targetOrganId: organId,
        targetOrganLabel: organLabel,
        confidence: 0.85,
        requiresReview: true,
      })
    }

    // C. Critério estruturado determinístico: Tireoide (ACR TI-RADS)
    if (
      organId === 'tireoide' ||
      organLabel.toLowerCase().includes('tireoide') ||
      organLabel.toLowerCase().includes('tireóide')
    ) {
      if (lower.includes('hipoecóico') || lower.includes('hipoecoico')) {
        suggestions.push({
          id: `sug_tirads_${Date.now()}`,
          category: 'interpretacao',
          title: 'Classificação ACR TI-RADS — Composição e Ecogenicidade',
          explanation:
            'Nódulo hipoecóico pontua 2 pontos no critério ACR TI-RADS. Certifique-se de descrever margens, formato (mais alto que largo) e focos ecogênicos para cálculo determinístico do escore.',
          suggestedText: trimmed,
          originalText: trimmed,
          targetOrganId: organId,
          targetOrganLabel: organLabel,
          confidence: 0.92,
          deterministicCriteria: 'ACR TI-RADS 2017: critérios morfológicos padronizados.',
          requiresReview: false,
        })
      }
    }

    return suggestions
  }
}

export const ultrasoundCopilotEngine = new UltrasoundCopilotEngine()
