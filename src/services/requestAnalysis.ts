import pb from '@/lib/pocketbase/client'

export interface ExtractedRequestData {
  patient_name: string
  birth_date: string
  sex: string
  cpf: string
  sus_card: string
  phone: string
  address: string
  referring_physician: string
  requesting_unit: string
  requested_exam: string
  request_date: string
  clinical_indication: string
  confidence_notes?: string
}

export interface AnalyzeRequestImageResponse {
  success: boolean
  extracted?: ExtractedRequestData
  error?: string
  raw_text?: string
}

export const requestAnalysisService = {
  /**
   * Converte arquivo File para data URL Base64
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Falha ao codificar arquivo.'))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  },

  /**
   * Envia imagem para análise via IA no backend
   */
  async analyzeImage(file: File): Promise<AnalyzeRequestImageResponse> {
    try {
      const base64Url = await this.fileToBase64(file)
      const res = await pb.send<AnalyzeRequestImageResponse>(
        '/backend/v1/ai/analyze-request-image',
        {
          method: 'POST',
          body: JSON.stringify({
            imageBase64: base64Url,
            mimeType: file.type || 'image/jpeg',
          }),
        },
      )
      return res
    } catch (err: unknown) {
      console.warn('Falha na chamada ao backend de IA para solicitação:', err)
      const message =
        err instanceof Error
          ? err.message
          : 'Não foi possível conectar ao assistente de IA no servidor.'
      return {
        success: false,
        error: message,
      }
    }
  },
}
