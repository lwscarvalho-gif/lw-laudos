/**
 * SERVIÇO DE LICENCIAMENTO E ATIVAÇÃO DO LW LAUDOS (ESTRUTURA FUNDACIONAL)
 *
 * Suporta dois modelos de licenciamento:
 * 1. LICENÇA PROFISSIONAL:
 *    - Pertence ao médico titular (CRM)
 *    - Até 2 computadores autorizados
 *    - Atuação em múltiplos estabelecimentos
 *    - Laudos sincronizáveis entre seus próprios computadores
 *
 * 2. LICENÇA CLÍNICA:
 *    - Pertence a uma unidade clínica específica (CNPJ/Unidade)
 *    - 3 computadores autorizados inclusos
 *    - Múltiplos médicos sem cobrança individual
 *    - Dados isolados logicamente por clínica
 *
 * REGRA ESTRITA: Nesta etapa, sem bloqueios artificiais que impeçam testes.
 */

export type LicenseTier = 'profissional' | 'clinica' | 'demonstracao' | 'desenvolvimento'

export interface MachineFingerprint {
  deviceId: string
  deviceHostname?: string
  osPlatform: string
  activationDate?: string
}

export interface SystemLicenseInfo {
  tier: LicenseTier
  licenseKey?: string
  licenseeName: string
  licenseeDocument?: string // CPF ou CNPJ
  maxAuthorizedDevices: number
  authorizedDevices: MachineFingerprint[]
  validUntil?: string
  isOfflineActive: boolean
  features: {
    ultrasoundReports: boolean
    bodyMarks: boolean
    dicomPacs: boolean
    localAiAssistant: boolean
    cloudSignature: boolean
    multiDoctor: boolean
    multiClinic: boolean
  }
}

const LOCAL_STORAGE_KEY = 'lw_laudos_license_info'

class LicensingService {
  /**
   * Obtém a licença ativa nesta instalação.
   * Em ambiente local de desenvolvimento ou teste, provê acesso total sem bloqueios.
   */
  getLicense(): SystemLicenseInfo {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      /* ignore */
    }

    // Licença padrão ativa para testes e desenvolvimento
    return {
      tier: 'desenvolvimento',
      licenseeName: 'Instalação Local LW Laudos',
      maxAuthorizedDevices: 3,
      authorizedDevices: [
        {
          deviceId: 'device-local-master',
          deviceHostname: 'LW-LOCAL-PC',
          osPlatform: 'Windows Desktop',
          activationDate: new Date().toISOString(),
        },
      ],
      isOfflineActive: true,
      features: {
        ultrasoundReports: true,
        bodyMarks: true,
        dicomPacs: true,
        localAiAssistant: true,
        cloudSignature: true,
        multiDoctor: true,
        multiClinic: true,
      },
    }
  }

  /**
   * Salva ou atualiza a chave de licença local
   */
  saveLicense(license: SystemLicenseInfo): void {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(license))
  }

  /**
   * Valida se uma chave de ativação offline assinada é válida.
   * (Preparação para validação de licenças digitais assinadas)
   */
  validateOfflineKey(key: string): { valid: boolean; tier?: LicenseTier; message: string } {
    if (!key || key.trim().length < 8) {
      return { valid: false, message: 'Chave de licença inválida ou vazia.' }
    }

    if (key.startsWith('LWP-')) {
      return {
        valid: true,
        tier: 'profissional',
        message: 'Licença Profissional (Médico) ativada com sucesso.',
      }
    }

    if (key.startsWith('LWC-')) {
      return {
        valid: true,
        tier: 'clinica',
        message: 'Licença Clínica ativada com sucesso (3 computadores inclusos).',
      }
    }

    return {
      valid: true,
      tier: 'desenvolvimento',
      message: 'Chave aceita em modo de avaliação técnica.',
    }
  }
}

export const licensingService = new LicensingService()
