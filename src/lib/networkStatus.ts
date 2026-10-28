/**
 * Monitor de conectividade e separação entre serviços Cloud e Locais.
 *
 * Princípio técnico:
 * - navigator.onLine indica apenas interface de rede ativa (ex.: Wi-Fi ou cabo), NÃO garante
 *   acesso à internet pública e NÃO define se o app é 'offline'.
 * - O app médico roda de forma autônoma: banco local (PocketBase), autenticação, storage,
 *   geração de PDF binário e impressão funcionam em rede local (LAN ou localhost).
 * - Serviços Cloud (VIDaaS, BirdID, OpenAI/Claude) são OPCIONAIS e exigem internet pública real.
 */

import { useState, useEffect } from 'react'

export interface ServiceAvailability {
  id: string
  name: string
  category: 'local_core' | 'cloud_optional'
  operatesLocally: boolean
  requiresInternet: boolean
  status: 'Ativo' | 'Indisponível' | 'Opcional desativado' | 'Requer internet'
  description: string
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  })

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}

export function getSystemServicesList(
  isOnline: boolean,
  signatureEnabled = false,
): ServiceAvailability[] {
  return [
    {
      id: 'local_database',
      name: 'Banco de Dados Clínico (PocketBase / SQLite)',
      category: 'local_core',
      operatesLocally: true,
      requiresInternet: false,
      status: 'Ativo',
      description:
        'Prontuários, laudos, frases, pacientes e auditoria armazenados localmente em SQLite embarcado.',
    },
    {
      id: 'local_auth',
      name: 'Autenticação e Sessões Médicas (RBAC)',
      category: 'local_core',
      operatesLocally: true,
      requiresInternet: false,
      status: 'Ativo',
      description:
        'Isolamento estrito por owner_id gerenciado pelo servidor local, sem necessidade de login remoto.',
    },
    {
      id: 'local_pdf',
      name: 'Gerador de PDF Binário Real (%PDF-1.4)',
      category: 'local_core',
      operatesLocally: true,
      requiresInternet: false,
      status: 'Ativo',
      description:
        'Compilação nativa em memória no navegador/servidor sem chamadas a APIs externas de renderização.',
    },
    {
      id: 'local_print',
      name: 'Impressão e Pré-visualização Médica',
      category: 'local_core',
      operatesLocally: true,
      requiresInternet: false,
      status: 'Ativo',
      description:
        'Envio direto para impressoras físicas da clínica via spooler do sistema operacional.',
    },
    {
      id: 'local_storage',
      name: 'Storage de Imagens de Exame e Logotipos',
      category: 'local_core',
      operatesLocally: true,
      requiresInternet: false,
      status: 'Ativo',
      description:
        'Armazenamento de fotogramas em disco rígido local (/pb_data/storage) preservando alta resolução.',
    },
    {
      id: 'cloud_signature',
      name: 'Assinatura Digital em Nuvem (VIDaaS / BirdID / PSCs)',
      category: 'cloud_optional',
      operatesLocally: false,
      requiresInternet: true,
      status: !signatureEnabled ? 'Opcional desativado' : isOnline ? 'Ativo' : 'Requer internet',
      description:
        'Comunicação criptográfica com Prestadores de Serviços de Confiança (PSCs) para certificados em nuvem.',
    },
    {
      id: 'cloud_ai',
      name: 'Assistente de IA Médica (LLMs Cloud)',
      category: 'cloud_optional',
      operatesLocally: false,
      requiresInternet: true,
      status: 'Opcional desativado',
      description:
        'Módulo desconectado por padrão. Chaves de API no backend; desativado para operação autônoma.',
    },
  ]
}
