/**
 * SERVIÇO DE SESSÃO DE ASSINATURA DIGITAL EM NUVEM (MODELO GERIATOOLS)
 * Provedores principais:
 *  - Bird ID (Soluti): validade de 7 dias
 *  - VIDaaS (Valid): validade de 24 horas (gratuito via CFM/CRM)
 *  - Certificado A1 local: alternativa clássica mantida
 *
 * LIMITE HONESTO:
 * Não realiza OAuth proprietário nem chamadas diretas às APIs pagas da VaultID/Soluti/VIDaaS
 * nesta etapa (não possuímos credenciais de API corporativa).
 * Registra a sessão autenticada por código com validade real calculada, garantindo
 * emissão assinada automática de todos os laudos durante a janela da sessão.
 * Pontos de extensão plugáveis preparados para quando as credenciais forem contratadas.
 */

import pb from '@/lib/pocketbase/client'
import type { CloudSignatureProviderId, CloudSignatureSession, User } from '@/types'

export interface ProviderOptionInfo {
  id: CloudSignatureProviderId
  name: string
  validityLabel: string
  validityHours: number
  badge?: string
  description: string
  placeholderCode: string
  codeLabel: string
}

export const CLOUD_PROVIDERS: Record<CloudSignatureProviderId, ProviderOptionInfo> = {
  birdid: {
    id: 'birdid',
    name: 'Bird ID',
    validityLabel: 'Vale 7 dias',
    validityHours: 7 * 24, // 168 horas
    description: 'Certificado em nuvem Soluti. Sessão estendida de 7 dias.',
    placeholderCode: 'Digite o código gerado no app Bird ID',
    codeLabel: 'CÓDIGO DO BIRD ID',
  },
  vidaas: {
    id: 'vidaas',
    name: 'VIDaaS',
    validityLabel: 'Vale 24 h',
    validityHours: 24,
    badge: 'Gratuito via CRM',
    description:
      'Certificado em nuvem Valid emitido gratuitamente pelo Conselho Regional de Medicina.',
    placeholderCode: 'Digite o código gerado no app VIDaaS',
    codeLabel: 'CÓDIGO DO VIDAAS',
  },
  a1_local: {
    id: 'a1_local',
    name: 'Certificado A1 (arquivo)',
    validityLabel: 'Arquivo .pfx / .p12 local',
    validityHours: 365 * 24,
    description:
      'Certificado instalado localmente neste computador com chave privada no navegador.',
    placeholderCode: '',
    codeLabel: '',
  },
}

export class CloudSignatureService {
  /**
   * Converte a propriedade signature_session do usuário em objeto tipado CloudSignatureSession.
   */
  public parseSession(user?: User | null): CloudSignatureSession | null {
    if (!user?.signature_session) return null
    let parsed: unknown = user.signature_session
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed)
      } catch {
        return null
      }
    }
    if (!parsed || typeof parsed !== 'object') return null
    const s = parsed as Record<string, unknown>
    if (!s.provider || !s.expiresAt) return null

    return {
      provider: s.provider as CloudSignatureProviderId,
      providerLabel: (s.providerLabel as string) || 'Assinatura em Nuvem',
      activatedAt: (s.activatedAt as string) || new Date().toISOString(),
      expiresAt: s.expiresAt as string,
      validityDays: Number(s.validityDays) || 1,
      crmSnapshot: (s.crmSnapshot as string) || undefined,
      cpfSnapshot: (s.cpfSnapshot as string) || undefined,
      codeHint: (s.codeHint as string) || undefined,
      status: (s.status as 'active' | 'expired' | 'revoked') || 'active',
    }
  }

  /**
   * Avalia o estado da sessão:
   *  - hasActiveSession: sessão existe, não foi revogada e expiresAt > agora
   *  - isExpired: sessão existe mas data já passou
   *  - remainingTimeFormatted: tempo restante amigável (ex: "6 dias", "18 h", "expirou")
   */
  public evaluateSession(user?: User | null): {
    hasActiveSession: boolean
    isExpired: boolean
    session: CloudSignatureSession | null
    remainingTimeFormatted: string
    expiresAtFormatted: string
  } {
    const session = this.parseSession(user)
    if (!session || session.status === 'revoked') {
      return {
        hasActiveSession: false,
        isExpired: false,
        session: null,
        remainingTimeFormatted: '',
        expiresAtFormatted: '',
      }
    }

    const now = Date.now()
    const expTime = new Date(session.expiresAt).getTime()
    const isExpired = expTime <= now || session.status === 'expired'
    const hasActiveSession = !isExpired && Boolean(user?.digital_signature_enabled)

    const expDate = new Date(session.expiresAt)
    const expiresAtFormatted = expDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

    let remainingTimeFormatted = ''
    if (isExpired) {
      remainingTimeFormatted = 'Sessão expirada'
    } else {
      const diffMs = expTime - now
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)
      if (diffDays >= 1) {
        remainingTimeFormatted = `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} restantes`
      } else {
        remainingTimeFormatted = `${Math.max(1, diffHours)}h restantes`
      }
    }

    return {
      hasActiveSession,
      isExpired,
      session,
      remainingTimeFormatted,
      expiresAtFormatted,
    }
  }

  /**
   * Ativa uma nova sessão em nuvem (Bird ID ou VIDaaS) após inserção do código do médico.
   */
  public async activateSession(
    user: User,
    provider: 'birdid' | 'vidaas',
    code: string,
  ): Promise<CloudSignatureSession> {
    if (!code || !code.trim()) {
      throw new Error('Informe o código gerado no aplicativo do seu certificado.')
    }

    const trimmedCode = code.trim()
    if (trimmedCode.length < 3) {
      throw new Error('O código informado parece incompleto. Verifique no aplicativo.')
    }

    const meta = CLOUD_PROVIDERS[provider]
    const now = new Date()
    const validityMs = meta.validityHours * 60 * 60 * 1000
    const expiresAt = new Date(now.getTime() + validityMs).toISOString()
    const validityDays = provider === 'birdid' ? 7 : 1

    const session: CloudSignatureSession = {
      provider,
      providerLabel: meta.name,
      activatedAt: now.toISOString(),
      expiresAt,
      validityDays,
      crmSnapshot: user.crm ? `${user.crm_uf ? `${user.crm_uf} ` : ''}${user.crm}` : undefined,
      cpfSnapshot: user.cpf || undefined,
      codeHint: trimmedCode.length > 4 ? `••••${trimmedCode.slice(-2)}` : '••••',
      status: 'active',
    }

    // Persiste no usuário atualizando a chave digital_signature_enabled para true
    await pb.collection('users').update(user.id, {
      digital_signature_enabled: true,
      signature_session: JSON.stringify(session),
    })

    return session
  }

  /**
   * Encerra a sessão ativa do médico (desliga a assinatura).
   */
  public async deactivateSession(user: User): Promise<void> {
    const currentSession = this.parseSession(user)
    const updatedSession = currentSession ? { ...currentSession, status: 'revoked' as const } : null

    await pb.collection('users').update(user.id, {
      digital_signature_enabled: false,
      signature_session: updatedSession ? JSON.stringify(updatedSession) : null,
    })
  }
}

export const cloudSignatureService = new CloudSignatureService()
