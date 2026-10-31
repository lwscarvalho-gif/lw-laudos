/**
 * Serviço de Gerenciamento do Ambiente Desktop (Tauri 2)
 *
 * Responsabilidades:
 * 1. Detectar se o aplicativo está rodando como desktop Tauri ou navegador Web padrão.
 * 2. Gerenciar porta e ciclo de vida do backend PocketBase local (sidecar).
 * 3. Prover informações de diagnóstico de rede, modo offline e saúde do processo.
 */

export interface DesktopEnvironmentInfo {
  isTauri: boolean
  isWindows: boolean
  platform: string
  backendUrl: string
  isLocalBackend: boolean
}

/**
 * Detecta se a aplicação está rodando embutida no runtime do Tauri 2
 */
export function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(
    (window as any).__TAURI__ ||
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI_METADATA__,
  )
}

/**
 * Retorna as informações do ambiente de execução do LW Laudos
 */
export function getDesktopEnvironmentInfo(): DesktopEnvironmentInfo {
  const isTauri = isTauriEnvironment()
  const isWindows = typeof navigator !== 'undefined' && /win/i.test(navigator.userAgent)

  // Em Tauri Desktop offline, aponta preferencialmente para o PocketBase local
  const backendUrl = isTauri
    ? import.meta.env.VITE_LOCAL_POCKETBASE_URL || 'http://127.0.0.1:8090'
    : import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090'

  return {
    isTauri,
    isWindows,
    platform: isTauri ? (isWindows ? 'windows' : 'desktop') : 'web',
    backendUrl,
    isLocalBackend: backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1'),
  }
}

/**
 * Consulta status real do sidecar via invoke Tauri se disponível
 */
export async function getTauriPocketBaseStatus(): Promise<{
  running: boolean
  port: number
  url: string
} | null> {
  if (!isTauriEnvironment()) return null
  try {
    const tauri = (window as any).__TAURI__
    if (tauri?.core?.invoke) {
      return await tauri.core.invoke('get_pocketbase_status')
    }
    return null
  } catch {
    return null
  }
}

/**
 * Testa conectividade com a instância local do PocketBase
 */
export async function checkLocalPocketBaseHealth(
  url = 'http://127.0.0.1:8090',
): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)

    const res = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const latencyMs = Date.now() - start
    if (res.ok) {
      return {
        ok: true,
        message: 'Backend PocketBase local respondendo perfeitamente.',
        latencyMs,
      }
    }
    return {
      ok: false,
      message: `PocketBase local respondeu com status HTTP ${res.status}.`,
      latencyMs,
    }
  } catch (err: any) {
    return {
      ok: false,
      message:
        err?.name === 'AbortError'
          ? 'Tempo limite excedido ao conectar ao PocketBase local.'
          : 'Não foi possível conectar ao PocketBase local. Verifique se o serviço está ativo.',
    }
  }
}
