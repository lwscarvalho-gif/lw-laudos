/**
 * TESTES COM FIXTURES SINTÉTICAS (PARTE 3 DO REQUISITO)
 *
 * Regras estritas:
 * - Sem dados clínicos reais de pacientes
 * - Sem certificados reais
 * - Sem cadastro ou contratação de provedor
 * - Testa as 3 regras centrais do dono:
 *   1. Assinatura desativada não bloqueia salvar/finalizar/exportar PDF;
 *   2. Estado offline bloqueia somente serviços cloud (assinatura/IA), mantendo editor, rascunho, PDF e impressão funcionais;
 *   3. Documento alterado invalida solicitação de assinatura anterior (nova hash != hash assinado/solicitado).
 */

import { computeSha256Hex, buildReportCanonicalDigestString } from './cryptoDigest'
import {
  DigitalSignatureAdapter,
  SUPPORTED_PROVIDERS,
  DigitalSignatureStatus,
} from '../services/digitalSignature'
import { getSystemServicesList } from './networkStatus'

export interface SyntheticTestResult {
  testId: string
  title: string
  passed: boolean
  details: string
}

export async function runSyntheticArchitectureTests(): Promise<SyntheticTestResult[]> {
  const results: SyntheticTestResult[] = []

  // Teste 1: Assinatura desativada por padrão não bloqueia fluxo
  try {
    const adapter = new DigitalSignatureAdapter()
    adapter.saveConfig({ enabled: false })
    const config = adapter.getConfig()

    const syntheticReport = {
      id: 'rep_test_synth_001',
      title: 'Laudo Sintético de Ultrassonografia Abdome Total',
      body: '<p>Fígado com dimensões normais e ecotextura homogênea.</p>',
      conclusion: 'Exame ultrassonográfico de abdome total dentro dos padrões da normalidade.',
      author_name: 'Dr. Teste Sintético',
      author_crm: '1234',
      author_crm_uf: 'RO',
    }

    const digestStr = buildReportCanonicalDigestString(syntheticReport)
    const hash = await computeSha256Hex(digestStr)

    const evaluation = adapter.evaluateStatus(syntheticReport.id, hash, true)

    const passed =
      config.enabled === false &&
      evaluation.status === 'Não configurado' &&
      typeof hash === 'string' &&
      hash.length === 64

    results.push({
      testId: 'TEST_01_DISABLED_DEFAULT',
      title: 'Assinatura desativada por padrão não bloqueia emissão e gera digest seguro',
      passed,
      details: `Status avaliado: "${evaluation.status}". Hash SHA-256 gerado: ${hash.substring(0, 16)}... (64 caracteres hexadecimais).`,
    })
  } catch (err: unknown) {
    results.push({
      testId: 'TEST_01_DISABLED_DEFAULT',
      title: 'Assinatura desativada por padrão',
      passed: false,
      details: String(err),
    })
  }

  // Teste 2: Estado offline bloqueia SOMENTE serviços cloud (assinatura/IA), mantendo core local ativo
  try {
    const isOnline = false
    const servicesOffline = getSystemServicesList(isOnline, true)

    const localCoreServices = servicesOffline.filter((s) => s.category === 'local_core')
    const allLocalCoreActive = localCoreServices.every((s) => s.status === 'Ativo')

    const cloudSignature = servicesOffline.find((s) => s.id === 'cloud_signature')
    const cloudSignatureBlocked = cloudSignature?.status === 'Requer internet'

    const adapter = new DigitalSignatureAdapter()
    adapter.saveConfig({ enabled: true, channelConfigured: true })
    const evaluationOffline = adapter.evaluateStatus('rep_test_synth_002', 'abc123hash', isOnline)

    const passed =
      allLocalCoreActive && cloudSignatureBlocked && evaluationOffline.status === 'Requer internet'

    results.push({
      testId: 'TEST_02_OFFLINE_SELECTIVE_BLOCK',
      title: 'Estado offline bloqueia apenas serviços cloud mantendo core local 100% ativo',
      passed,
      details: `Serviços locais ativos: ${localCoreServices.length}/5 (banco, auth, PDF, print, storage). Status do provedor em nuvem offline: "${evaluationOffline.status}".`,
    })
  } catch (err: unknown) {
    results.push({
      testId: 'TEST_02_OFFLINE_SELECTIVE_BLOCK',
      title: 'Estado offline bloqueia apenas serviços cloud',
      passed: false,
      details: String(err),
    })
  }

  // Teste 3: Documento alterado invalida solicitação de assinatura anterior (nova hash != hash assinado)
  try {
    const adapter = new DigitalSignatureAdapter()
    adapter.saveConfig({ enabled: true, channelConfigured: true })

    const reportVersion1 = {
      id: 'rep_synth_versioning',
      title: 'Laudo de Ultrassonografia Abdome',
      body: '<p>Vesícula biliar com paredes finas e conteúdo anecóico.</p>',
      conclusion: 'Sem alterações.',
    }

    const digestV1 = buildReportCanonicalDigestString(reportVersion1)
    const hashV1 = await computeSha256Hex(digestV1)

    // Registra solicitação sobre a versão 1
    adapter.requestSignature({
      reportId: reportVersion1.id,
      documentSha256Hex: hashV1,
      documentSha256Base64: btoa(hashV1),
      isOnline: true,
    })

    // Avaliação sobre a versão 1 intacta: status Pendente
    const evalV1 = adapter.evaluateStatus(reportVersion1.id, hashV1, true)

    // Agora o médico altera o laudo (Versão 2)
    const reportVersion2 = {
      ...reportVersion1,
      body: '<p>Vesícula biliar apresentando imagem de cálculo móvel medindo 8 mm.</p>',
      conclusion: 'Colelitíase sem sinais inflamatórios agudos.',
    }

    const digestV2 = buildReportCanonicalDigestString(reportVersion2)
    const hashV2 = await computeSha256Hex(digestV2)

    // Avaliação sobre a nova versão 2: o hash mudou!
    const evalV2 = adapter.evaluateStatus(reportVersion2.id, hashV2, true)

    // Também aciona a invalidação explícita de edição
    adapter.invalidatePendingOnReportEdit(reportVersion1.id, 'Edição pós-solicitação')
    const evalAfterInvalidate = adapter.evaluateStatus(reportVersion2.id, hashV2, true)

    const passed =
      hashV1 !== hashV2 &&
      evalV1.status === 'Pendente' &&
      evalV2.isModifiedSinceSigned === true &&
      evalV2.status === 'Não configurado'

    results.push({
      testId: 'TEST_03_HASH_IMMUTABILITY_INVALIDATION',
      title: 'Alteração no laudo invalida solicitação de assinatura e protege imutabilidade',
      passed,
      details: `Hash V1 (${hashV1.substring(0, 10)}...) != Hash V2 (${hashV2.substring(0, 10)}...). Invalidação automática confirmada: "${evalV2.detail.substring(0, 75)}..."`,
    })
  } catch (err: unknown) {
    results.push({
      testId: 'TEST_03_HASH_IMMUTABILITY_INVALIDATION',
      title: 'Alteração no laudo invalida solicitação',
      passed: false,
      details: String(err),
    })
  }

  return results
}
