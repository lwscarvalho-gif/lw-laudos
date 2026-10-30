import pb from '@/lib/pocketbase/client'

export interface BackendSignatureProviderStatus {
  id: string
  name: string
  configured: boolean
  status: string
  authMethod: string
}

export interface BackendSignatureStatus {
  realSignatureEnabled: boolean
  providers: {
    birdid: BackendSignatureProviderStatus
    vidaas: BackendSignatureProviderStatus
  }
  mode: 'pades_cloud_real' | 'visual_carimbo_preliminar'
  message: string
}

export interface BackendSignRequest {
  reportId: string
  provider: 'birdid' | 'vidaas'
  pdfBase64?: string
  hashSha256?: string
  code?: string
}

export interface BackendSignResponse {
  success: boolean
  provider: string
  providerName: string
  signedPdfBase64?: string
  signatureResponse?: unknown
  signedAt?: string
  padesStatus?: string
  error?: string
  configured?: boolean
  details?: string
}

class BackendRealSignatureService {
  private cachedStatus: BackendSignatureStatus | null = null
  private cacheTimestamp = 0
  private readonly CACHE_TTL_MS = 30_000 // 30 segundos

  /**
   * Consulta o endpoint /backend/v1/assinatura/status
   */
  async getStatus(forceRefresh = false): Promise<BackendSignatureStatus> {
    const now = Date.now()
    if (!forceRefresh && this.cachedStatus && now - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cachedStatus
    }

    try {
      const res = await pb.send<BackendSignatureStatus>('/backend/v1/assinatura/status', {
        method: 'GET',
      })
      this.cachedStatus = res
      this.cacheTimestamp = now
      return res
    } catch (err: unknown) {
      console.warn('[RealSignatureService] Falha ao consultar status da assinatura real:', err)
      const fallback: BackendSignatureStatus = {
        realSignatureEnabled: false,
        providers: {
          birdid: {
            id: 'birdid',
            name: 'Bird ID (Soluti)',
            configured: false,
            status: 'Não disponível no momento',
            authMethod: 'OAuth2 client_credentials',
          },
          vidaas: {
            id: 'vidaas',
            name: 'VIDaaS (Valid)',
            configured: false,
            status: 'Não disponível no momento',
            authMethod: 'IntegraICP API Key Channel',
          },
        },
        mode: 'visual_carimbo_preliminar',
        message: 'Backend sem conexão ou credenciais não configuradas. Modo carimbo visual ativo.',
      }
      this.cachedStatus = fallback
      this.cacheTimestamp = now
      return fallback
    }
  }

  /**
   * Envia requisição de assinatura digital real para o backend.
   */
  async signReportPdf(params: BackendSignRequest): Promise<BackendSignResponse> {
    try {
      const response = await pb.send<BackendSignResponse>('/backend/v1/assinatura/assinar', {
        method: 'POST',
        body: params,
      })
      return response
    } catch (err: unknown) {
      const errorObj = err as {
        status?: number
        data?: { error?: string; details?: string; configured?: boolean }
      }
      const status = errorObj?.status
      const msg =
        errorObj?.data?.error ||
        (err instanceof Error
          ? err.message
          : 'Falha na comunicação com o backend de assinatura digital.')

      return {
        success: false,
        provider: params.provider,
        providerName: params.provider === 'vidaas' ? 'VIDaaS (Valid)' : 'Bird ID (Soluti)',
        configured: errorObj?.data?.configured !== false,
        error: msg,
        details: errorObj?.data?.details || (status ? `HTTP ${status}` : undefined),
      }
    }
  }
}

export const backendRealSignatureService = new BackendRealSignatureService()
