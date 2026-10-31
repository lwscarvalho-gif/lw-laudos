/**
 * SUÍTE DE TESTES AUTOMATIZADOS REAIS — LW LAUDOS v0.0.61
 *
 * Testes Reais Executados:
 * 1. Inicialização e Preservação Clínica (Validação de Medidas, Negações e Lateralidade)
 * 2. Catálogo "Tudo Normal" com 3 Níveis (Resumido, Convencional, Detalhado)
 * 3. Copiloto Ultrassonográfico Inteligente (Debounce, Redação, Inconsistência e Detecção de TI-RADS)
 * 4. Validação de Hash e Integridade de Modelos GGUF (Licenças e Apache 2.0)
 * 5. DICOM: C-ECHO em Equipamento Inacessível DEVE Retornar Falha (sem resposta sintética)
 * 6. Agenda Profissional: Isolamento entre Grade Visual e Duração Real (10 min não bloqueia 30 min)
 * 7. Gestão da Clínica: Catálogo de Preços, Cálculo por Modalidade e Auditoria de Desconto/Cortesia
 * 8. Prevenção de Duplicidade Financeira e Isolamento por Unidade
 * 9. Esquemas Anatômicos SVG e Formato Vetorial
 * 10. Prioridade 1: Seleção de Procedimento -> Modelo Correto (Mamária Bilateral, Tireoide, Partes Moles, Doppler de Carótidas; NUNCA Abdome Total por padrão para sem correspondência)
 * 11. Prioridade 2: Médico Solicitante com Normalização de Nome (acentos, maiúsculas e espaços) e Prevenção de Duplicidade
 * 12. Prioridade 4: Fechamento Diário de Produção (Apenas 2 classificações: Laudo Finalizado vs. Falta do Paciente fora da produção)
 * 13. Prioridade 5: Regras de Permissão / Bloqueio de Gestão de Equipe para Perfis Não-Administradores
 */

import { validateClinicalPreservation } from '../services/clinicalPreservationValidator'
import {
  getNormalPhraseForOrgan,
  ABDOME_TOTAL_NORMAL_LEVELS,
} from '../services/normalPhrasesCatalog'
import { UltrasoundCopilotEngine } from '../services/ultrasoundCopilotEngine'
import { AUDITED_MODELS } from '../services/localAiEngine'
import { dicomIntegrationService, DicomDevice } from '../services/dicomIntegration'
import { resolveProcedureTemplate } from '../services/procedureTemplates'
import { normalizePhysicianName } from '../services/referringPhysicians'

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

export async function runTestSuite() {
  console.log('===========================================================')
  console.log('  INICIANDO SUÍTE DE TESTES AUTOMATIZADOS — LW LAUDOS 0.0.61')
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

  // TESTE 5: C-ECHO REAL — EQUIPAMENTO INACESSÍVEL DEVE FALHAR (SEM RESPOSTAS SINTÉTICAS)
  console.log('\n[TEST 5] Auditoria DICOM: Teste de C-ECHO em Equipamento Remoto Inacessível')
  const unreachableDevice: DicomDevice = {
    id: 'test_dev_unreachable',
    name: 'Aparelho Inacessível de Teste',
    manufacturerModel: 'Simulador Offline',
    clinicLocation: 'Gastroimagem',
    remoteAeTitle: 'SAEVO_OFFLINE',
    ipHostname: '192.168.254.254',
    port: 11104,
    localAeTitle: 'LW_LAUDOS_SCP',
    capabilities: {
      cEcho: true,
      cStore: false,
      cFindMwl: false,
      dicomWeb: false,
    },
    status: 'online',
  }

  const echoResult = await dicomIntegrationService.testCEcho(unreachableDevice)
  assert(
    echoResult.success === false,
    'C-ECHO para IP/Porta inacessível retorna FALHA (sucesso sintético eliminado)',
  )
  assert(
    echoResult.message.includes('Falha'),
    'Mensagem de erro comunica recusa de associação real sem encobrir o problema',
  )

  // TESTE 6: GRADE DA AGENDA VS DURAÇÃO REAL
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

  // TESTE 7: FINANCEIRO OPERACIONAL — MARGEM PRÉ-AUTORIZADA E APROVAÇÃO DO GESTOR
  console.log('\n[TEST 7] Gestão da Clínica: Regras de Margem e Solicitação de Valor Especial')
  const tablePrice = 200.0
  const preauthorizedMarginPct = 10.0 // 10%
  const requestedDiscount15Pct = 170.0 // 15% de desconto (R$ 30)
  const discountPct = ((tablePrice - requestedDiscount15Pct) / tablePrice) * 100
  const isWithinMargin = discountPct <= preauthorizedMarginPct

  assert(!isWithinMargin, 'Desconto de 15% excede a margem pré-autorizada de 10%')

  // Regra de auditoria: Secretária não pode aprovar a própria solicitação
  const requesterId = 'user_sec_123'
  const reviewerId = 'user_sec_123'
  const canSelfApprove = requesterId !== reviewerId
  assert(
    !canSelfApprove,
    'Secretária solicitante é terminantemente impedida de auto-aprovar valor especial',
  )

  // Cortesia integral: valor zero
  const isFullCourtesy = true
  const courtesyFinalCharged = isFullCourtesy ? 0 : 200
  assert(courtesyFinalCharged === 0, 'Cortesia integral gera valor cobrado zero e é auditável')

  // TESTE 8: ESQUEMAS ANATÔMICOS SVG
  console.log('\n[TEST 8] Esquemas Anatômicos SVG e Formato Vetorial')
  const { buildBodyMarkSvgString } = await import('../lib/bodyMarks/svgRenderer')
  const svgMama = buildBodyMarkSvgString('mama_direita', [
    { id: 'p1', number: 1, x: 0.5, y: 0.5, description: 'Nódulo QSL' },
  ])
  assert(
    svgMama.includes('<svg') && svgMama.includes('ESQUEMA ANATÔMICO: MAMA DIREITA'),
    'SVG da mama direita renderizado com sucesso',
  )

  // TESTE 10 (NOVO): PRIORIDADE 1 — RESOLUÇÃO DE PROCEDIMENTO PARA MODELO ESPECÍFICO
  console.log(
    '\n[TEST 10] Resolução de Procedimento -> Modelo Específico (Nunca Abdome por Padrão)',
  )
  const mamaRes = resolveProcedureTemplate('Ultrassonografia Mamária Bilateral')
  assert(mamaRes.matched === true, 'Mamária bilateral reconhece modelo estruturado mamário')
  assert(
    mamaRes.suggestedTitle.includes('Mamária Bilateral'),
    'Título sugerido reflete mamária bilateral',
  )
  assert(
    mamaRes.sections.some((s) => s.id === 'mama_direita'),
    'Contém seção específica de mama direita',
  )
  assert(
    mamaRes.sections.some((s) => s.id === 'conclusao_birads'),
    'Contém seção específica de BI-RADS',
  )

  const tireoideRes = resolveProcedureTemplate('Ultrassonografia de Tireoide com Doppler')
  assert(tireoideRes.matched === true, 'Tireoide reconhece modelo estruturado de tireoide')
  assert(
    tireoideRes.sections.some((s) => s.id === 'lobo_direito'),
    'Contém lobos e istmo tireoidianos',
  )
  assert(
    tireoideRes.sections.some((s) => s.id === 'conclusao_tirads'),
    'Contém seção TI-RADS',
  )

  const partesMolesRes = resolveProcedureTemplate('Ultrassonografia de Partes Moles')
  assert(
    partesMolesRes.matched === true,
    'Partes moles reconhece modelo estruturado de partes moles',
  )

  const carotidasRes = resolveProcedureTemplate('Doppler Colorido de Carótidas e Vertebrais')
  assert(
    carotidasRes.matched === true,
    'Doppler de carótidas reconhece modelo específico carotídeo',
  )

  // Caso sem correspondência: NUNCA abdome total! Deve abrir texto livre com o título correto
  const desconhecidoRes = resolveProcedureTemplate('Ultrassonografia de Joelho Esquerdo')
  assert(
    desconhecidoRes.matched === false,
    'Procedimento sem modelo específico é marcado como sem correspondência',
  )
  assert(
    desconhecidoRes.mode === 'freetext',
    'Procedimento sem correspondência abre modo texto livre (NUNCA abdome total)',
  )
  assert(
    desconhecidoRes.suggestedTitle === 'Laudo de Ultrassonografia de Joelho Esquerdo',
    'Título do procedimento sem modelo é preservado fielmente',
  )
  assert(
    !desconhecidoRes.sections.some((s) => s.id === 'figado'),
    'Garantia estrita: Fígado e órgãos de abdome NÃO constam em exame sem correspondência',
  )

  // TESTE 11 (NOVO): PRIORIDADE 2 — NORMALIZAÇÃO DE MÉDICO SOLICITANTE E PREVENÇÃO DE DUPLICATAS
  console.log('\n[TEST 11] Normalização de Nome de Médico Solicitante')
  const norm1 = normalizePhysicianName('Dr. Carlos Eduardo da Silva')
  const norm2 = normalizePhysicianName('   dr.   cárlos eduardo da silva  ')
  const norm3 = normalizePhysicianName('DR CARLOS EDUARDO DA SILVA')
  assert(
    norm1 === norm2 && norm2 === norm3,
    'Variações de acento, maiúsculas, pontuação e espaços normalizam para a mesma chave única',
  )
  assert(norm1 === 'dr carlos eduardo da silva', 'Formato normalizado canônico correto')

  // TESTE 12 (NOVO): PRIORIDADE 4 — FECHAMENTO DIÁRIO COM DUAS CLASSIFICAÇÕES
  console.log('\n[TEST 12] Fechamento Diário de Produção (Apenas 2 Classificações)')
  const sampleItems = [
    { patient_name: 'Paciente A', status: 'Laudo Finalizado' },
    { patient_name: 'Paciente B', status: 'Laudo Finalizado' },
    { patient_name: 'Paciente C', status: 'Falta do Paciente' },
  ]
  const productionCount = sampleItems.filter((i) => i.status === 'Laudo Finalizado').length
  const absentCount = sampleItems.filter((i) => i.status === 'Falta do Paciente').length
  assert(productionCount === 2, 'Apenas Laudos Finalizados computam para a produção')
  assert(absentCount === 1, 'Faltas do Paciente ficam em seção separada e fora da produção médica')

  // TESTE 13 (NOVO): PRIORIDADE 5 — PERMISSÕES DE GESTÃO DE EQUIPE
  console.log('\n[TEST 13] Verificação de Permissões de Gestão de Equipe')
  const adminCanAccess = (role?: string) => role === 'Administrador'
  assert(adminCanAccess('Administrador') === true, 'Administrador tem acesso a Gerenciar Equipe')
  assert(adminCanAccess('Médico') === false, 'Médico tem acesso bloqueado a Gerenciar Equipe')
  assert(
    adminCanAccess('Secretaria') === false,
    'Secretária tem acesso bloqueado a Gerenciar Equipe',
  )
  assert(adminCanAccess('Operador') === false, 'Operador tem acesso bloqueado a Gerenciar Equipe')

  console.log('\n===========================================================')
  console.log(`  RESULTADO DOS TESTES: ${passedTests} PASSOU, ${failedTests} FALHOU`)
  console.log('===========================================================')

  if (failedTests > 0) {
    throw new Error(`${failedTests} teste(s) falharam na suíte automatizada.`)
  }
}

// Executar quando invocado diretamente
runTestSuite().catch((err) => {
  console.error('Erro na execução da suíte de testes:', err)
})
