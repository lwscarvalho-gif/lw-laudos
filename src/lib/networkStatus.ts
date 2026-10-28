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
  status:
    | 'Ativo'
    | 'Instalação local pendente'
    | 'Não configurado'
    | 'Indisponível'
    | 'Opcional desativado'
    | 'Requer internet'
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
      status: 'Instalação local pendente',
      description:
        'Estrutura preparada para implantação local com SQLite embarcado. No ambiente atual de nuvem, a instância é gerenciada pela infraestrutura remota.',
    },
    {
      id: 'local_auth',
      name: 'Autenticação e Sessões Médicas (RBAC)',
      category: 'local_core',
      operatesLocally: true,
      requiresInternet: false,
      status: 'Instalação local pendente',
      description:
        'Isolamento estrito por owner_id compatível com servidor local ou nuvem; serviço de autenticação executando atualmente no backend remoto.',
    },
    {
      id: 'local_pdf',
      name: 'Gerador de PDF Binário Real (%PDF-1.4)',
      category: 'local_core',
      operatesLocally: true,
      requiresInternet: false,
      status: 'Instalação local pendente',
      description:
        'Compilação nativa em memória no cliente/servidor com preparação para ambiente local, sem APIs externas pagas de renderização.',
    },
    {
      id: 'local_print',
      name: 'Impressão e Pré-visualização Médica',
      category: 'local_core',
      operatesLocally: true,
      requiresInternet: false,
      status: 'Instalação local pendente',
      description:
        'Envio para impressoras físicas da clínica via spooler do sistema operacional, pronto para homologação no posto local.',
    },
    {
      id: 'local_storage',
      name: 'Storage de Imagens de Exame e Logotipos',
      category: 'local_core',
      operatesLocally: true,
      requiresInternet: false,
      status: 'Instalação local pendente',
      description:
        'Estrutura de armazenamento de arquivos e fotogramas com suporte a disco local em futura instalação on-premise.',
    },
    {
      id: 'cloud_signature',
      name: 'Assinatura Digital (Estrutura Preparada)',
      category: 'cloud_optional',
      operatesLocally: false,
      requiresInternet: true,
      status: 'Não configurado',
      description:
        'Estrutura preparada para integração com provedores de assinatura digital. Não configurado; sem integração criptográfica homologada ativa.',
    },
    {
      id: 'cloud_ai',
      name: 'Assistente de IA Médica (LLMs Cloud)',
      category: 'cloud_optional',
      operatesLocally: false,
      requiresInternet: true,
      status: 'Opcional desativado',
      description: 'Módulo não conectado por padrão. Mantido sem conexão ativa no ambiente.',
    },
  ]
}
