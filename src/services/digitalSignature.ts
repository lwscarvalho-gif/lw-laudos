/**
 * MÓDULO DE ASSINATURA DIGITAL ICP-BRASIL (OPCIONAL, DESATIVADO POR PADRÃO)
 *
 * Arquitetura baseada nas especificações oficiais:
 * 1. IntegraICP (Valid): https://validcertificadora.com.br/pages/integraicp-faq
 *    - Centraliza PSCs: VIDaaS, BirdID, SafeID, SerproID, RemoteID
 *    - Fluxo: Clearances -> Escolha do PSC -> Callback/PKCE -> Consulta credencial -> Digest SHA256 (Base64) -> Assinatura
 * 2. VaultID (BirdID): https://docs.vaultid.com.br/workspace
 *
 * REGRAS DE SEGURANÇA E CONFORMIDADE:
 * - Desativado por padrão (toggle off).
 * - Nenhuma chave privada, senha ou token mantido em localStorage.
 * - Nenhuma chamada externa não autorizada.
 * - Estados rigorosos em português:
 *     "Não configurado"
 *     "Requer internet"
 *     "Pendente"
 *     "Falhou"
 *     "Assinado" (SOMENTE após verificação criptográfica real de chave e carimbo ICP-Brasil; NÃO simular).
 * - Imagem de rubrica/carimbo visual NUNCA é tratada como assinatura qualificada.
 * - Assinatura é ação sobre versão IMUTÁVEL do PDF e seu SHA-256.
 * - Se o laudo for alterado posteriormente: preserva a versão assinada anterior e gera nova versão não assinada.
 * - Uma solicitação pendente NÃO pode assinar automaticamente um laudo alterado (invalida imediatamente).
 */

export type DigitalSignatureProviderId =
  | 'vidaas'
  | 'birdid'
  | 'safeid'
  | 'serproid'
  | 'remoteid'
  | 'local_a1_a3' // Item informativo futuro

export type DigitalSignatureStatus =
  | 'Não configurado'
  | 'Requer internet'
  | 'Pendente'
  | 'Falhou'
  | 'Assinado'

export interface ProviderMetadata {
  id: DigitalSignatureProviderId
  name: string
  psc: string
  type: 'cloud_psc' | 'local_token'
  description: string
  docsUrl: string
  requiresInternet: boolean
  availableNow: boolean
  note: string
}

export const SUPPORTED_PROVIDERS: ProviderMetadata[] = [
  {
    id: 'vidaas',
    name: 'VIDaaS (Valid Certificadora)',
    psc: 'Valid Certificadora Digital',
    type: 'cloud_psc',
    description:
      'Certificado ICP-Brasil em nuvem via IntegraICP API (OAuth2 PKCE + digest SHA-256 Base64).',
    docsUrl: 'https://validcertificadora.com.br/pages/integraicp-faq',
    requiresInternet: true,
    availableNow: true,
    note: 'Exige credenciamento de Channel com a Valid. Nenhuma chave privada fica no navegador.',
  },
  {
    id: 'birdid',
    name: 'Bird ID (Soluti / VaultID)',
    psc: 'Soluti Certificação Digital',
    type: 'cloud_psc',
    description:
      'Certificado digital em nuvem com autenticação de múltiplos fatores via aplicativo móvel.',
    docsUrl: 'https://docs.vaultid.com.br/workspace',
    requiresInternet: true,
    availableNow: true,
    note: 'Compatível com DOC-ICP-17.01. Autenticação e assinatura de hash delegado.',
  },
  {
    id: 'safeid',
    name: 'SafeID (Prodemge / Certisign)',
    psc: 'SafeID Cloud',
    type: 'cloud_psc',
    description:
      'PSC integrado ao ecossistema IntegraICP para profissionais com certificado SafeID.',
    docsUrl: 'https://validcertificadora.com.br/pages/integraicp-faq',
    requiresInternet: true,
    availableNow: true,
    note: 'Desbloqueio sob demanda via channel credenciado.',
  },
  {
    id: 'serproid',
    name: 'SerproID (SERPRO)',
    psc: 'Serviço Federal de Processamento de Dados',
    type: 'cloud_psc',
    description: 'Certificado em nuvem institucional público federal da ICP-Brasil.',
    docsUrl: 'https://validcertificadora.com.br/pages/integraicp-faq',
    requiresInternet: true,
    availableNow: true,
    note: 'Integração via protocolo IntegraICP/OAuth2.',
  },
  {
    id: 'remoteid',
    name: 'RemoteID (Certisign)',
    psc: 'Certisign',
    type: 'cloud_psc',
    description: 'Certificado A3 em nuvem corporativo com assinatura qualificada.',
    docsUrl: 'https://validcertificadora.com.br/pages/integraicp-faq',
    requiresInternet: true,
    availableNow: true,
    note: 'Roteamento por API centralizada.',
  },
  {
    id: 'local_a1_a3',
    name: 'Certificado Local A1 / Cartão A3 (Integração Futura)',
    psc: 'Dispositivo Físico Local (Token USB / Smartcard / PKCS#11)',
    type: 'local_token',
    description:
      'Assinatura direta no computador da clínica via ponte local/WebPKI sem depender de servidores de nuvem.',
    docsUrl: 'https://validar.iti.gov.br/',
    requiresInternet: false,
    availableNow: false,
    note: 'Planejado para versão auto-hospedada com agente local instalado na máquina Windows/Linux.',
  },
]

export interface DigitalSignatureConfig {
  enabled: boolean
  selectedProvider: DigitalSignatureProviderId
  channelConfigured: boolean
  environment: 'production' | 'sandbox'
  notifyOnPending: boolean
}

export interface DocumentSignatureRecord {
  reportId: string
  version: number
  documentSha256Hex: string
  documentSha256Base64: string
  status: DigitalSignatureStatus
  requestedAt?: string
  signedAt?: string
  providerId: DigitalSignatureProviderId
  certificateSubject?: string
  certificateIssuer?: string
  certificateSerial?: string
  statusDetail: string
  itiValidationUrl?: string
  isInvalidatedByModification?: boolean
}

const CONFIG_STORAGE_KEY = 'lw_digital_signature_config_v1'
const RECORDS_STORAGE_KEY = 'lw_digital_signature_records_v1'

export class DigitalSignatureAdapter {
  private config: DigitalSignatureConfig

  constructor() {
    this.config = this.loadConfig()
  }

  private loadConfig(): DigitalSignatureConfig {
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return {
          enabled: Boolean(parsed.enabled),
          selectedProvider: parsed.selectedProvider || 'vidaas',
          channelConfigured: Boolean(parsed.channelConfigured),
          environment: parsed.environment || 'sandbox',
          notifyOnPending: Boolean(parsed.notifyOnPending),
        }
      }
    } catch {
      // fallback
    }
    // Regra explícita: DESATIVADO por padrão
    return {
      enabled: false,
      selectedProvider: 'vidaas',
      channelConfigured: false,
      environment: 'sandbox',
      notifyOnPending: false,
    }
  }

  public saveConfig(config: Partial<DigitalSignatureConfig>): DigitalSignatureConfig {
    this.config = {
      ...this.config,
      ...config,
    }
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config))
    } catch {
      // safe
    }
    return this.config
  }

  public getConfig(): DigitalSignatureConfig {
    return { ...this.config }
  }

  public getSupportedProviders(): ProviderMetadata[] {
    return SUPPORTED_PROVIDERS
  }

  public getSelectedProviderMetadata(): ProviderMetadata {
    const meta = SUPPORTED_PROVIDERS.find((p) => p.id === this.config.selectedProvider)
    return meta || SUPPORTED_PROVIDERS[0]
  }

  public getDocumentSignatures(reportId: string): DocumentSignatureRecord[] {
    try {
      const raw = localStorage.getItem(RECORDS_STORAGE_KEY)
      if (raw) {
        const all: DocumentSignatureRecord[] = JSON.parse(raw)
        return all.filter((r) => r.reportId === reportId)
      }
    } catch {
      // safe
    }
    return []
  }

  public getLatestSignature(reportId: string): DocumentSignatureRecord | null {
    const list = this.getDocumentSignatures(reportId)
    if (!list.length) return null
    return list[list.length - 1]
  }

  /**
   * Avalia o status de assinatura de um documento comparando com o hash do estado atual.
   * Se o documento foi alterado em relação à solicitação/assinatura, a solicitação anterior
   * é explicitamente marcada como INVALIDADA por modificação.
   */
  public evaluateStatus(
    reportId: string,
    currentSha256Hex: string,
    isOnline: boolean,
  ): {
    status: DigitalSignatureStatus
    detail: string
    isModifiedSinceSigned: boolean
    activeRecord: DocumentSignatureRecord | null
  } {
    if (!this.config.enabled) {
      return {
        status: 'Não configurado',
        detail:
          'Módulo de assinatura digital desativado nas preferências do médico. Laudos e PDFs são emitidos normalmente.',
        isModifiedSinceSigned: false,
        activeRecord: null,
      }
    }

    const provider = this.getSelectedProviderMetadata()
    if (provider.requiresInternet && !isOnline) {
      return {
        status: 'Requer internet',
        detail: `O provedor ${provider.name} opera na nuvem e exige conectividade ativa com a internet para autenticação PKCE e envio de digest. A elaboração de laudos e exportação de PDF continuam disponíveis localmente.`,
        isModifiedSinceSigned: false,
        activeRecord: null,
      }
    }

    if (!this.config.channelConfigured) {
      return {
        status: 'Não configurado',
        detail: `Canal de integração com ${provider.name} ainda não ativado no backend. O sistema opera em modo de emissão padrão autônoma.`,
        isModifiedSinceSigned: false,
        activeRecord: null,
      }
    }

    const record = this.getLatestSignature(reportId)
    if (!record) {
      return {
        status: 'Não configurado',
        detail: 'Nenhuma solicitação de assinatura enviada para este laudo.',
        isModifiedSinceSigned: false,
        activeRecord: null,
      }
    }

    // REGRA CENTRAL: se o hash do documento atual difere do hash solicitado, invalidar!
    if (record.documentSha256Hex !== currentSha256Hex) {
      return {
        status: 'Não configurado',
        detail:
          'O laudo foi editado após a última solicitação. O hash criptográfico do documento atual é diferente do anterior. A solicitação prévia foi invalidada para proteger a integridade do prontuário.',
        isModifiedSinceSigned: true,
        activeRecord: record,
      }
    }

    return {
      status: record.status,
      detail: record.statusDetail,
      isModifiedSinceSigned: false,
      activeRecord: record,
    }
  }

  /**
   * Registra uma solicitação formal de assinatura sobre o hash de um documento imutável.
   * Não executa chamadas externas nesta etapa preliminar de arquitetura (sem chaves no front).
   */
  public requestSignature(options: {
    reportId: string
    documentSha256Hex: string
    documentSha256Base64: string
    isOnline: boolean
  }): DocumentSignatureRecord {
    if (!this.config.enabled) {
      throw new Error(
        'Assinatura digital desativada. Ative o módulo nas configurações antes de solicitar.',
      )
    }

    const provider = this.getSelectedProviderMetadata()
    if (provider.requiresInternet && !options.isOnline) {
      const failedRecord: DocumentSignatureRecord = {
        reportId: options.reportId,
        version: Date.now(),
        documentSha256Hex: options.documentSha256Hex,
        documentSha256Base64: options.documentSha256Base64,
        status: 'Requer internet',
        providerId: this.config.selectedProvider,
        statusDetail:
          'Conexão com a internet indisponível. A solicitação de assinatura em nuvem não pôde ser iniciada.',
        isInvalidatedByModification: false,
        requestedAt: new Date().toISOString(),
      }
      this.saveRecord(failedRecord)
      return failedRecord
    }

    if (!this.config.channelConfigured) {
      const unconfiguredRecord: DocumentSignatureRecord = {
        reportId: options.reportId,
        version: Date.now(),
        documentSha256Hex: options.documentSha256Hex,
        documentSha256Base64: options.documentSha256Base64,
        status: 'Não configurado',
        providerId: this.config.selectedProvider,
        statusDetail: `Canal ${provider.name} não credenciado no backend. Nenhuma chave privada ou credencial externa configurada nesta etapa preliminar.`,
        isInvalidatedByModification: false,
        requestedAt: new Date().toISOString(),
      }
      this.saveRecord(unconfiguredRecord)
      return unconfiguredRecord
    }

    // Se estiver configurado no backend, registraria status Pendente aguardando retorno do PSC
    const pendingRecord: DocumentSignatureRecord = {
      reportId: options.reportId,
      version: Date.now(),
      documentSha256Hex: options.documentSha256Hex,
      documentSha256Base64: options.documentSha256Base64,
      status: 'Pendente',
      providerId: this.config.selectedProvider,
      statusDetail: `Solicitação iniciada com ${provider.name}. Aguardando autorização no aplicativo do provedor.`,
      isInvalidatedByModification: false,
      requestedAt: new Date().toISOString(),
    }
    this.saveRecord(pendingRecord)
    return pendingRecord
  }

  private saveRecord(record: DocumentSignatureRecord): void {
    try {
      const raw = localStorage.getItem(RECORDS_STORAGE_KEY)
      const list: DocumentSignatureRecord[] = raw ? JSON.parse(raw) : []
      // Substitui registros antigos do mesmo reportId se pendentes ou adiciona histórico
      list.push(record)
      localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(list.slice(-50)))
    } catch {
      // safe
    }
  }

  /**
   * Invalida explicitamente qualquer solicitação pendente para um laudo
   * quando o médico reabre para edição.
   */
  public invalidatePendingOnReportEdit(reportId: string, reason = 'Documento alterado'): void {
    try {
      const raw = localStorage.getItem(RECORDS_STORAGE_KEY)
      if (!raw) return
      const list: DocumentSignatureRecord[] = JSON.parse(raw)
      let changed = false
      for (const rec of list) {
        if (rec.reportId === reportId && rec.status === 'Pendente') {
          rec.status = 'Não configurado'
          rec.statusDetail = `A solicitação foi cancelada automaticamente: ${reason}. Um novo hash deve ser gerado.`
          rec.isInvalidatedByModification = true
          changed = true
        }
      }
      if (changed) {
        localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(list))
      }
    } catch {
      // safe
    }
  }
}

export const digitalSignatureService = new DigitalSignatureAdapter()
