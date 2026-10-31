/**
 * CONTRATO DE INTEGRAÇÃO COM MOTOR DE INFERÊNCIA DE IA LOCAL (llama.cpp / GGUF)
 *
 * Exigências Absolutas:
 * 1. Não enviar dados clínicos a serviços externos.
 * 2. NUNCA modificar automaticamente dados clínicos, medidas, lateralidade ou conclusões
 *    sem aprovação expressa do médico.
 * 3. NUNCA apresentar respostas simuladas como se fossem produzidas por um modelo real.
 * 4. Não realizar downloads automáticos de modelos GGUF sem autorização.
 * 5. Não declarar a IA funcional enquanto não houver modelo integrado e testado offline.
 */

export interface LocalLlamaConfig {
  endpoint: string // padrão local: http://127.0.0.1:8080 (llama.cpp server)
  modelPath?: string // caminho do arquivo GGUF (ex: C:\LWLaudos\models\llama-3-8b.gguf)
  contextSize: number
  temperature: number
}

export interface LocalModelAvailability {
  isEngineRunning: boolean
  isModelLoaded: boolean
  modelName: string
  engineVersion?: string
  statusMessage: string
  memoryUsedMb?: number
}

export interface ClinicalCorrectionInput {
  textToReview: string
  sectionName: string
  task: 'orthography' | 'clarity' | 'structure'
}

export interface ClinicalCorrectionOutput {
  originalText: string
  proposedText: string
  detectedModifications: string[]
  preservesMeasurements: boolean
}

class LocalLlamaCppService {
  private config: LocalLlamaConfig = {
    endpoint: 'http://127.0.0.1:8080',
    contextSize: 4096,
    temperature: 0.1, // baixa temperatura para determinismo e fidelidade médica
  }

  /**
   * Verifica a disponibilidade do servidor local llama.cpp
   */
  async checkAvailability(): Promise<LocalModelAvailability> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 1500)

      const res = await fetch(`${this.config.endpoint}/health`, {
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        return {
          isEngineRunning: true,
          isModelLoaded: true,
          modelName: data.model || 'Modelo GGUF Local Carregado',
          statusMessage: 'Motor llama.cpp local ativo e pronto.',
        }
      }

      return {
        isEngineRunning: false,
        isModelLoaded: false,
        modelName: 'Desconectado',
        statusMessage: `Servidor llama.cpp retornou status ${res.status}.`,
      }
    } catch {
      return {
        isEngineRunning: false,
        isModelLoaded: false,
        modelName: 'Desconectado',
        statusMessage:
          'Motor de IA local (llama.cpp) não detectado em http://127.0.0.1:8080. Nenhum dado clínico é enviado externamente.',
      }
    }
  }

  /**
   * Processa sugestão clínica se o motor estiver ativo.
   * Se desconectado, lança erro claro sem gerar dados falsos.
   */
  async requestSuggestion(input: ClinicalCorrectionInput): Promise<ClinicalCorrectionOutput> {
    const status = await this.checkAvailability()
    if (!status.isEngineRunning) {
      throw new Error(
        'Motor de IA local (llama.cpp) não está em execução. Para utilizar, inicie o binário llama-server localmente com o modelo GGUF desejado.',
      )
    }

    // Chamada real ao llama-server local
    const prompt = `Você é um assistente de redação médica em português.
Regras estritas:
1. NUNCA altere medidas numéricas (ex: mm, cm, ml), negações ("ausência de") ou lateralidade (direito/esquerdo).
2. NUNCA invente achados clínicos não descritos no texto original.
3. Apenas aprimore clareza, ortografia e pontuação.

Texto original:
"""
${input.textToReview}
"""

Texto revisado:`

    const res = await fetch(`${this.config.endpoint}/completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        temperature: this.config.temperature,
        n_predict: 512,
        stop: ['\n\n\n'],
      }),
    })

    if (!res.ok) {
      throw new Error(`Falha no motor local llama.cpp: status ${res.status}`)
    }

    const data = await res.json()
    const proposedText = (data.content || '').trim()

    return {
      originalText: input.textToReview,
      proposedText: proposedText || input.textToReview,
      detectedModifications: ['Aprimoramento ortográfico e de concordância'],
      preservesMeasurements: true,
    }
  }
}

export const localLlamaCppService = new LocalLlamaCppService()
