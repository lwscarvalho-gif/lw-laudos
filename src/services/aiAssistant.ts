/**
 * CONTRATO DA INTERFACE DO ASSISTENTE DE IA PARA LAUDOS MÉDICOS
 *
 * Regras estritas:
 * 1. Chaves de API NUNCA devem estar no frontend.
 * 2. Envio de conteúdo clínico SOMENTE mediante ação explícita do usuário médico.
 * 3. O adaptador NÃO deve inferir achados patológicos não informados, NÃO deve inventar nem
 *    alterar medidas numéricas, negações clínicas ("ausência de", "sem sinais") ou lateralidade (direito/esquerdo).
 * 4. Nesta versão preliminar, nenhum provedor externo é chamado. Status exibido é "Não conectado".
 */

export type AiActionType = 'corrigir_ortografia' | 'melhorar_redacao' | 'estruturar_descricao'

export interface AiRequestOptions {
  action: AiActionType
  targetField: string // ex.: 'figado', 'conclusao', 'corpo'
  originalText: string
  context?: {
    examType?: string
    patientAge?: number
    patientSex?: string
  }
}

export interface AiSuggestionResult {
  originalText: string
  suggestedText: string
  action: AiActionType
  targetField: string
  explanation?: string
}

export interface AiAssistantStatus {
  connected: boolean
  providerName: string
  modelName: string
  statusMessage: string
  ready: boolean
}

export interface AiAssistantAdapter {
  getStatus(): Promise<AiAssistantStatus>
  processText(options: AiRequestOptions): Promise<AiSuggestionResult>
}

class MockOrUnconnectedAiAdapter implements AiAssistantAdapter {
  async getStatus(): Promise<AiAssistantStatus> {
    return {
      connected: false,
      providerName: 'Nenhum provedor configurado',
      modelName: 'Desconectado',
      statusMessage:
        'O módulo de IA não possui chave de API associada nesta instalação. Nenhuma requisição externa é efetuada.',
      ready: false,
    }
  }

  async processText(options: AiRequestOptions): Promise<AiSuggestionResult> {
    // Regra estrita: NÃO gerar texto simulado nem falsificar respostas de IA
    throw new Error(
      'Assistente de IA não conectado. Configure o provedor backend para habilitar sugestões.',
    )
  }
}

export const aiAssistantService: AiAssistantAdapter = new MockOrUnconnectedAiAdapter()
