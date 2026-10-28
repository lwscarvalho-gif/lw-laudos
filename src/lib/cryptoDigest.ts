/**
 * Utilidades criptográficas do navegador (Web Crypto API padrão).
 * Calcula hashes SHA-256 de forma canônica e segura em strings ou Uint8Array/ArrayBuffer.
 * Não armazena chaves privadas, não simula assinatura digital e não depende de bibliotecas externas.
 */

export async function computeSha256Hex(data: string | Uint8Array | ArrayBuffer): Promise<string> {
  const buffer: BufferSource =
    typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array
        ? new Uint8Array(data)
        : data

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function computeSha256Base64(
  data: string | Uint8Array | ArrayBuffer,
): Promise<string> {
  const buffer: BufferSource =
    typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array
        ? new Uint8Array(data)
        : data

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const bytes = new Uint8Array(hashBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Cria uma representação canônica e determinística dos dados do laudo para cálculo de hash.
 * Qualquer alteração de texto, conclusão, autor ou título altera o hash gerado.
 */
export function buildReportCanonicalDigestString(report: {
  id?: string
  title: string
  body: string
  conclusion?: string
  author_name?: string
  author_crm?: string
  author_crm_uf?: string
  exam_type?: string
  signature_date?: string
  structured_data?: unknown
}): string {
  const payload = {
    id: report.id || '',
    title: (report.title || '').trim(),
    body: (report.body || '').trim(),
    conclusion: (report.conclusion || '').trim(),
    author_name: (report.author_name || '').trim(),
    author_crm: (report.author_crm || '').trim(),
    author_crm_uf: (report.author_crm_uf || '').trim(),
    exam_type: (report.exam_type || '').trim(),
    signature_date: (report.signature_date || '').trim(),
    structured_data: report.structured_data ? JSON.stringify(report.structured_data) : '',
  }
  return JSON.stringify(payload)
}
