/**
 * MOTOR DE VALIDAÇÃO DE PRESERVAÇÃO CLÍNICA REAL
 *
 * Exigências:
 * 1. Comparação de conteúdo real (não booleano fixo).
 * 2. Detecção e preservação estrita de:
 *    - Medidas numéricas (ex: 12 mm, 3.5 cm, 120 ml, 4 x 3 x 2 cm)
 *    - Negações clínicas ("ausência de", "sem sinais", "não há", "livre de", "sem evidência")
 *    - Lateralidade anatômica ("direito", "esquerdo", "bilateral", "lobo direito", "rim esquerdo")
 * 3. Se a diferença indicar alteração clinicamente significativa, sinalizar bloqueio
 *    de aplicação direta e exigir revisão explícita do médico.
 */

export interface ClinicalPreservationCheckResult {
  isSafe: boolean
  preservesMeasurements: boolean
  preservesNegations: boolean
  preservesLaterality: boolean
  originalMeasurements: string[]
  proposedMeasurements: string[]
  missingMeasurements: string[]
  originalNegations: string[]
  proposedNegations: string[]
  missingNegations: string[]
  originalLateralities: string[]
  proposedLateralities: string[]
  missingLateralities: string[]
  riskSummary: string | null
}

const MEASUREMENT_REGEX =
  /\b\d+([.,]\d+)?\s*(mm|cm|m|ml|l|cc|g|kg|graus?|%|x\s*\d+([.,]\d+)?(\s*x\s*\d+([.,]\d+)?)?)\b/gi

const NEGATION_PATTERNS = [
  /\b(sem|aus[eê]ncia\s+de|n[aã]o\s+h[aá]|n[aã]o\s+se\s+observa|livre\s+de|afastada?|descartada?|sem\s+sinais|sem\s+evid[eê]ncia)\b/gi,
]

const LATERALITY_WORDS = [
  'direito',
  'direita',
  'esquerdo',
  'esquerda',
  'bilateral',
  'bilaterais',
  'medial',
  'lateral',
  'superior',
  'inferior',
  'anterior',
  'posterior',
  'proximal',
  'distal',
]

function normalizeTokens(list: string[]): string[] {
  return list.map((item) => item.toLowerCase().trim().replace(/\s+/g, ' ')).filter(Boolean)
}

function extractMeasurements(text: string): string[] {
  const matches = text.match(MEASUREMENT_REGEX) || []
  return normalizeTokens(matches)
}

function extractNegations(text: string): string[] {
  const results: string[] = []
  for (const pattern of NEGATION_PATTERNS) {
    const found = text.match(pattern) || []
    results.push(...found)
  }
  return normalizeTokens(results)
}

function extractLaterality(text: string): string[] {
  const lower = text.toLowerCase()
  const found: string[] = []
  for (const word of LATERALITY_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    if (regex.test(lower)) {
      found.push(word)
    }
  }
  return normalizeTokens(found)
}

/**
 * Executa a validação clínica profunda comparando o texto original e o proposto.
 */
export function validateClinicalPreservation(
  originalText: string,
  proposedText: string,
): ClinicalPreservationCheckResult {
  const origMeasurements = extractMeasurements(originalText)
  const propMeasurements = extractMeasurements(proposedText)
  const missingMeasurements = origMeasurements.filter(
    (m) => !propMeasurements.some((pm) => pm.replace(/\s+/g, '') === m.replace(/\s+/g, '')),
  )

  const origNegations = extractNegations(originalText)
  const propNegations = extractNegations(proposedText)
  const missingNegations = origNegations.filter(
    (n) => !propNegations.some((pn) => pn.includes(n) || n.includes(pn)),
  )

  const origLateralities = extractLaterality(originalText)
  const propLateralities = extractLaterality(proposedText)
  const missingLateralities = origLateralities.filter((lat) => !propLateralities.includes(lat))

  const preservesMeasurements = missingMeasurements.length === 0
  const preservesNegations = missingNegations.length === 0
  const preservesLaterality = missingLateralities.length === 0

  const issues: string[] = []
  if (!preservesMeasurements) {
    issues.push(`Medidas ausentes ou divergentes: ${missingMeasurements.join(', ')}`)
  }
  if (!preservesNegations) {
    issues.push(`Expressões de negação/ausência alteradas: ${missingNegations.join(', ')}`)
  }
  if (!preservesLaterality) {
    issues.push(`Lateralidade/topografia removida ou alterada: ${missingLateralities.join(', ')}`)
  }

  const isSafe = preservesMeasurements && preservesNegations && preservesLaterality

  return {
    isSafe,
    preservesMeasurements,
    preservesNegations,
    preservesLaterality,
    originalMeasurements: origMeasurements,
    proposedMeasurements: propMeasurements,
    missingMeasurements,
    originalNegations: origNegations,
    proposedNegations: propNegations,
    missingNegations,
    originalLateralities: origLateralities,
    proposedLateralities: propLateralities,
    missingLateralities,
    riskSummary: isSafe ? null : issues.join(' | '),
  }
}
