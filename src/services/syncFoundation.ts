/**
 * FUNDAÇÕES E METADADOS PARA SINCRONIZAÇÃO FUTURA (LW LAUDOS)
 *
 * Princípios do Usuário:
 * 1. Cada computador funciona de forma 100% independente.
 * 2. NUNCA copiar arquivos SQLite entre computadores para sincronizar.
 * 3. Identificadores globais estáveis (UUIDs) para evitar colisão de IDs locais.
 * 4. Rastreamento de origem: origin_device, origin_clinic, version, modified_at.
 * 5. Registro de exclusões lógicas (tombstones).
 * 6. Detecção de conflitos e preservação de versões de laudos.
 *
 * REGRA ESTRITA: Nesta etapa, o mecanismo de sync ativo permanece desabilitado,
 * expondo a interface contratual para futura ativação segura.
 */

export interface SyncMetadata {
  globalUuid: string
  originDevice: string
  originClinicId?: string
  entityType: 'patient' | 'exam' | 'report' | 'appointment' | 'template'
  entityId: string
  version: number
  updatedAt: string
  deletedAt?: string
  lastSyncedAt?: string
}

export interface SyncConflictRecord {
  id: string
  entityType: string
  localVersion: number
  remoteVersion: number
  resolved: boolean
  detectedAt: string
  resolutionStrategy?: 'keep_local' | 'accept_remote' | 'manual_merge'
}

export interface SyncServiceStatus {
  enabled: boolean
  lastSyncAttempt?: string
  lastSyncSuccess?: string
  pendingChangesCount: number
  conflictsCount: number
  statusMessage: string
}

/**
 * Gera um UUID v4 estável compatível com navegadores e ambientes desktop
 */
export function generateGlobalUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // v4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/**
 * Obtém ou inicializa o identificador persistente deste computador
 */
export function getLocalDeviceId(): string {
  const KEY = 'lw_laudos_device_id'
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = `device-${generateGlobalUuid().slice(0, 8)}`
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return 'device-local-unknown'
  }
}

class SynchronizationFoundationService {
  /**
   * Status da sincronização (desabilitada por segurança nesta fase inicial)
   */
  async getStatus(): Promise<SyncServiceStatus> {
    return {
      enabled: false,
      pendingChangesCount: 0,
      conflictsCount: 0,
      statusMessage:
        'Sincronização em nuvem/rede local desabilitada. Operação 100% local ativa e isolada.',
    }
  }

  /**
   * Vincula metadados de sync a uma entidade antes de sua persistência
   */
  attachMetadata(
    entityType: SyncMetadata['entityType'],
    entityId: string,
    existingMetadata?: Partial<SyncMetadata>,
  ): SyncMetadata {
    return {
      globalUuid: existingMetadata?.globalUuid || generateGlobalUuid(),
      originDevice: existingMetadata?.originDevice || getLocalDeviceId(),
      originClinicId: existingMetadata?.originClinicId,
      entityType,
      entityId,
      version: (existingMetadata?.version || 0) + 1,
      updatedAt: new Date().toISOString(),
    }
  }
}

export const syncFoundationService = new SynchronizationFoundationService()
