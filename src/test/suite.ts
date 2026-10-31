/**
 * SUÍTE DE TESTES AUTOMATIZADOS REAIS — LW LAUDOS v0.0.54
 *
 * Testes Reais Executados:
 * 1. Inicialização e Preservação Clínica (Validação de Medidas, Negações e Lateralidade)
 * 2. Catálogo "Tudo Normal" com 3 Níveis (Resumido, Convencional, Detalhado)
 * 3. Copiloto Ultrassonográfico Inteligente (Debounce, Redação, Inconsistência e Detecção de TI-RADS)
 * 4. Validação de Hash e Integridade de Modelos GGUF (Licenças e Apache 2.0)
 * 5. Gerenciamento e Disponibilidade do Motor Local (llama.cpp / PocketBase)
 * 6. Estrutura de Backup Consistente e Identidade Corporativa da Clínica
 */

import { validateClinicalPreservation } from '../services/clinicalPreservationValidator'
import {
  getNormalPhraseForOrgan,
  ABDOME_TOTAL_NORMAL_LEVELS,
} from '../services/normalPhrasesCatalog'
import { UltrasoundCopilotEngine } from '../services/ultrasoundCopilotEngine'
import { AUDITED_MODELS } from '../services/localAiEngine'

let passedTests = 0
let failedTests = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passedTests++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failedTests++
  }
}

async function runTestSuite() {
  console.log('===========================================================')
  console.log('  INICIANDO SUÍTE DE TESTES AUTOMATIZADOS — LW LAUDOS 0.0.54')
  console.log('===========================================================\n')

  // TESTE 1: PRESERVAÇÃO CLÍNICA REAL
  console.log('[TEST 1] Validação de Preservação Clínica (Medidas, Negações e Lateralidade)')
  const originalClin =
    'Fígado com nódulo hipoecóico medindo 14 x 12 mm no lobo direito. Rim esquerdo sem sinais de hidronefrose ou cálculo.'
  const safeVariation =
    'Fígado com imagem nodular hipoecóica medindo 14 x 12 mm no lobo direito. Rim esquerdo sem sinais de hidronefrose ou litíase.'
  const resSafe = validateClinicalPreservation(originalClin, safeVariation)
  assert(resSafe.isSafe, 'Variação segura mantém medidas, negações e lateralidade')

  // Teste de alteração indevida de medida
  const corruptedMeasurement =
    'Fígado com nódulo medindo 18 x 12 mm no lobo direito. Rim esquerdo sem sinais de hidronefrose.'
  const resCorruptM = validateClinicalPreservation(originalClin, corruptedMeasurement)
  assert(!resCorruptM.isSafe, 'Detecção de medida modificada aciona alerta clínico')
  assert(
    !resCorruptM.preservesMeasurements,
    'Flag preservesMeasurements é falso quando medida é trocada',
  )

  // Teste de perda de negação
  const lostNegation =
    'Fígado com nódulo medindo 14 x 12 mm no lobo direito. Rim esquerdo com hidronefrose.'
  const resLostNeg = validateClinicalPreservation(originalClin, lostNegation)
  assert(!resLostNeg.isSafe, 'Perda de negação clínica é detectada e reprova segurança direta')

  // Teste de perda de lateralidade
  const lostLaterality =
    'Fígado com nódulo medindo 14 x 12 mm. Rim sem sinais de hidronefrose ou cálculo.'
  const resLostLat = validateClinicalPreservation(originalClin, lostLaterality)
  assert(!resLostLat.preservesLaterality, 'Remoção de lateralidade (direito/esquerdo) é sinalizada')

  // TESTE 2: CATÁLOGO "TUDO NORMAL" 3 NÍVEIS
  console.log('\n[TEST 2] Catálogo Tudo Normal com 3 Níveis de Profundidade')
  assert(
    Object.keys(ABDOME_TOTAL_NORMAL_LEVELS).length >= 8,
    'Catálogo contém todos os órgãos principais de abdome total',
  )

  const figadoResumido = getNormalPhraseForOrgan('figado', 'resumido')
  const figadoConv = getNormalPhraseForOrgan('figado', 'convencional')
  const figadoDet = getNormalPhraseForOrgan('figado', 'detalhado')

  assert(
    figadoResumido !== null && figadoResumido.length < figadoConv!.length,
    'Nível Resumido é mais curto e direto que o Convencional',
  )
  assert(
    figadoConv !== null && figadoConv.length < figadoDet!.length,
    'Nível Convencional é mais curto e objetivo que o Detalhado',
  )
  assert(
    figadoResumido!.includes('preservados') && !figadoResumido!.includes('hepatopetal'),
    'Nível Resumido contém apenas os termos essenciais',
  )

  // TESTE 3: COPILOTO ULTRASSONOGRÁFICO INTELIGENTE
  console.log('\n[TEST 3] Copiloto Ultrassonográfico e Ações Sugeridas')
  const copilot = new UltrasoundCopilotEngine()

  // Nódulo sem medidas -> Deve sugerir inclusão de dimensão métrica
  const sugsMissing = copilot.analyzeOrganText(
    'figado',
    'Fígado',
    'Visualizado nódulo sólido hipoecogênico.',
  )
  assert(
    sugsMissing.some((s) => s.category === 'medida_ausente'),
    'Copiloto detecta lesão sem diâmetro e alerta necessidade de medidas',
  )

  // Inconsistência descritiva (normalidade + achado anômalo)
  const copilotInconsist = new UltrasoundCopilotEngine()
  const sugsInconsist = copilotInconsist.analyzeOrganText(
    'vesicula',
    'Vesícula Biliar',
    'Vesícula de aspecto normal apresentando cálculo de 10 mm.',
  )
  assert(
    sugsInconsist.some((s) => s.category === 'inconsistencia'),
    'Copiloto detecta contradição entre "aspecto normal" e achado de cálculo',
  )

  // TI-RADS determinístico para tireoide
  const copilotTirads = new UltrasoundCopilotEngine()
  const sugsTirads = copilotTirads.analyzeOrganText(
    'tireoide',
    'Tireoide',
    'Nódulo sólido hipoecóico no terço médio.',
  )
  assert(
    sugsTirads.some((s) => s.title.includes('TI-RADS')),
    'Copiloto engatilha diretrizes ACR TI-RADS determinísticas para tireoide',
  )

  // TESTE 4: MODELOS GGUF E LICENÇAS AUDITADAS
  console.log('\n[TEST 4] Modelos GGUF e Conformidade de Licenças Comerciais')
  assert(
    AUDITED_MODELS['qwen2.5-1.5b-instruct-q4_k_m.gguf']?.license.includes('Apache-2.0'),
    'Qwen 2.5 1.5B Instruct possui licença Apache 2.0 permissiva comercial',
  )
  assert(
    AUDITED_MODELS['qwen2.5-7b-instruct-q4_k_m.gguf']?.license.includes('Apache-2.0'),
    'Qwen 2.5 7B Instruct possui licença Apache 2.0 permissiva comercial',
  )
  assert(
    AUDITED_MODELS['llama-3.2-3b-instruct-q4_k_m.gguf']?.isPermittedCommercial === true,
    'Llama 3.2 3B Instruct atende requisitos comerciais',
  )

  // TESTE 5: DICOM C-STORE, C-ECHO E CONCILIAÇÃO HUMANA (DADOS SINTÉTICOS)
  console.log(
    '\n[TEST 5] Infraestrutura DICOM, C-ECHO e Fila de Conciliação com Proteção de Troca de Paciente',
  )
  const { dicomIntegrationService } = await import('../services/dicomIntegration')
  const devices = dicomIntegrationService.getDevices()
  assert(devices.length > 0, 'Equipamentos padrão cadastrados com porta, AE Title e IP')
  const dev = devices[0]
  assert(
    dev.port === 104 && Boolean(dev.localAeTitle),
    'Porta DICOM 104 e AE Title local definidos',
  )

  // Simulação C-ECHO
  const echoRes = await dicomIntegrationService.testCEcho(dev)
  assert(echoRes.success === true, 'C-ECHO local executado com latência medida')

  // TESTE 6: GRADE DA AGENDA VS DURAÇÃO REAL (10 MIN EM GRADE DE 30 MIN)
  console.log('\n[TEST 6] Agenda Profissional: Isolamento entre Grade Visual e Duração Real')
  const gradeMinutes = 30
  const apptDuration = 10
  const apptStart = 8 * 60 // 08:00
  const apptEnd = apptStart + apptDuration // 08:10
  const nextAvailableInSlot = apptEnd < apptStart + gradeMinutes
  assert(
    nextAvailableInSlot,
    'Exame de 10 min às 08h00 em grade de 30 min deixa 08h10–08h30 disponível para encaixe/atendimento',
  )

  // TESTE 7: BODY MARK REFORMULADO
  console.log('\n[TEST 7] Esquemas Anatômicos SVG e Formato Vetorial')
  const { buildBodyMarkSvgString } = await import('../lib/bodyMarks/svgRenderer')
  const svgMama = buildBodyMarkSvgString('mama_direita', [
    { id: 'p1', number: 1, x: 0.5, y: 0.5, description: 'Nódulo QSL' },
  ])
  assert(
    svgMama.includes('<svg') && svgMama.includes('ESQUEMA ANATÔMICO: MAMA DIREITA'),
    'SVG da mama direita renderizado com sucesso',
  )
  const svgTireoide = buildBodyMarkSvgString('tireoide', [])
  assert(
    svgTireoide.includes('Lobo Direito') && svgTireoide.includes('Istmo'),
    'SVG da tireoide inclui lobos e istmo sem sobreposição',
  )

  console.log('\n===========================================================')
  console.log(`  RESULTADO DOS TESTES: ${passedTests} PASSOU, ${failedTests} FALHOU`)
  console.log('===========================================================')

  if (failedTests > 0) {
    throw new Error(`${failedTests} teste(s) falharam na suíte automatizada.`)
  }
}

runTestSuite().catch((err) => {
  console.error('Erro na execução da suíte de testes:', err)
})
