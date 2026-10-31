/**
 * Resolução dinâmica da URL do Backend PocketBase.
 *
 * Suporta:
 * 1. Ambiente Skip Cloud gerenciado (VITE_POCKETBASE_URL definido em build/preview)
 * 2. Auto-hospedagem local ou de clínica (VITE_POCKETBASE_URL=http://localhost:8090 ou IP da rede local)
 * 3. Fallback inteligente quando rodando localmente (se no mesmo host / rede interna)
 *
 * REGRA ESTRITA: Nenhuma URL de nuvem fixa no código.
 */

export function resolvePocketBaseUrl(): string {
  // 1. Detecção de ambiente Desktop Tauri (execução 100% offline local)
  if (typeof window !== 'undefined') {
    const isTauri = Boolean(
      (window as any).__TAURI__ ||
      (window as any).__TAURI_INTERNALS__ ||
      (window as any).__TAURI_METADATA__,
    )
    if (isTauri) {
      const localEnv = import.meta.env.VITE_LOCAL_POCKETBASE_URL
      if (localEnv && typeof localEnv === 'string' && localEnv.trim() !== '') {
        return localEnv.trim()
      }
      return 'http://127.0.0.1:8090'
    }
  }

  // 2. Variável de ambiente configurada explicitamente (Skip Cloud gerenciado ou Web)
  const envUrl = import.meta.env.VITE_POCKETBASE_URL
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim()
  }

  // 3. Se estiver rodando em localhost no navegador sem variável definida, apontar para porta padrão do PocketBase local
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8090'
    }
  }

  // 4. Fallback de emergência caso vazio
  return 'http://127.0.0.1:8090'
}
