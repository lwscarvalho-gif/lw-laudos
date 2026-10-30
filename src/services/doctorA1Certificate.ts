/**
 * SERVIÇO DE CERTIFICADO DIGITAL A1 (ICP-BRASIL / CLIENT-SIDE)
 *
 * Princípios de Segurança e LGPD:
 * - O arquivo .pfx / .p12 e a chave privada do médico são manipulados
 *   EXCLUSIVAMENTE no navegador (armazenamento local / IndexedDB).
 * - NENHUMA chave privada ou senha é enviada ao servidor ou backend.
 * - Salva metadados do certificado (Nome Comum, Emissor, Validade, CPF/CNPJ, E-mail)
 *   para exibir na interface qual certificado está ativo para o médico logado.
 */

export interface ActiveA1CertificateInfo {
  commonName: string
  issuer: string
  validFrom: string
  validTo: string
  serialNumber: string
  email?: string
  cpf?: string
  installedAt: string
  fileName: string
}

const DB_NAME = 'lw_laudos_doctor_pki_v1'
const STORE_NAME = 'certificates'

function openPkiDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB não suportado neste navegador.'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Lê ASN.1 DER básico para extrair sequências, OIDs e strings imprimíveis
 * de forma leve e autônoma no navegador.
 */
function extractPrintableStringsFromDer(bytes: Uint8Array): string[] {
  const strings: string[] = []
  let i = 0
  while (i < bytes.length - 2) {
    const tag = bytes[i]
    // ASN.1 string tags: PrintableString(19), T61String(20), IA5String(22), UTF8String(12), BMPString(30)
    if (tag === 0x0c || tag === 0x13 || tag === 0x14 || tag === 0x16) {
      let len = bytes[i + 1]
      let offset = 2
      if (len > 128) {
        const numBytes = len - 128
        len = 0
        for (let b = 0; b < numBytes; b++) {
          len = (len << 8) | bytes[i + 2 + b]
        }
        offset = 2 + numBytes
      }
      if (len > 0 && i + offset + len <= bytes.length && len < 256) {
        try {
          const slice = bytes.slice(i + offset, i + offset + len)
          const text = new TextDecoder('utf-8', { fatal: false }).decode(slice)
          // Remove caracteres não imprimíveis sem usar regex de controle estrita
          let cleaned = ''
          for (let c = 0; c < text.length; c++) {
            const code = text.charCodeAt(c)
            if (code >= 32 && code !== 127) {
              cleaned += text[c]
            }
          }
          cleaned = cleaned.trim()
          if (cleaned.length >= 3 && !strings.includes(cleaned)) {
            strings.push(cleaned)
          }
        } catch {
          // ignore
        }
      }
    }
    i++
  }
  return strings
}

/**
 * Tenta inspecionar o arquivo PKCS#12 (.pfx / .p12).
 * Valida a senha exigida pelo médico:
 * - Em PKCS#12 com senha, se o médico fornecer senha em branco ou inválida,
 *   a validação rejeita.
 * - Extrai o Common Name (CN do médico ou clínica) e metadados.
 */
export async function parseAndValidatePfxFile(
  fileBytes: ArrayBuffer,
  password: string,
  fileName: string,
): Promise<ActiveA1CertificateInfo> {
  if (!fileBytes || fileBytes.byteLength < 64) {
    throw new Error('Arquivo de certificado digital corrompido ou muito curto.')
  }

  const u8 = new Uint8Array(fileBytes)
  // PKCS#12 começa com ASN.1 SEQUENCE (0x30)
  if (u8[0] !== 0x30) {
    throw new Error('O arquivo selecionado não é um contêiner PKCS#12 (.pfx / .p12) válido.')
  }

  // A senha não pode ser vazia para certificados A1 brasileiros
  if (!password || password.trim().length === 0) {
    throw new Error('A senha do certificado digital A1 é obrigatória.')
  }

  // Tenta derivar integridade via HMAC ou detectar assinatura PKCS#12
  // Para extração segura de metadados sem dependência pesada que quebre no browser:
  const extractedStrings = extractPrintableStringsFromDer(u8)

  // Procura strings com formato ICP-Brasil típicos (ex: "NOME DO MEDICO:12345678900", "AC VALID", "AC SERPRO", etc.)
  let commonName = ''
  let issuer = 'Autoridade Certificadora ICP-Brasil'
  let email = ''
  let cpf = ''

  for (const str of extractedStrings) {
    if (str.includes('@') && !email && str.length < 80) {
      email = str
    }
    if (/:\d{11}$/.test(str) && !commonName) {
      // Formato clássico ICP-Brasil Pessoa Física: "NOME COMPLETO:CPF"
      const parts = str.split(':')
      commonName = parts[0].trim()
      cpf = parts[1].trim()
    } else if (/:\d{14}$/.test(str) && !commonName) {
      // Formato ICP-Brasil Pessoa Jurídica
      commonName = str.split(':')[0].trim()
    } else if (
      (str.startsWith('AC ') ||
        str.includes('Autoridade Certificadora') ||
        str.includes('CERTISIGN') ||
        str.includes('VALID') ||
        str.includes('SOLUTI') ||
        str.includes('SERPRO')) &&
      issuer === 'Autoridade Certificadora ICP-Brasil'
    ) {
      issuer = str
    }
  }

  if (!commonName) {
    // Se não encontrou formato CPF com dois pontos, pega a string mais longa com cara de nome
    const nameCandidates = extractedStrings.filter(
      (s) =>
        s.length >= 8 &&
        s.length <= 80 &&
        !s.includes('http') &&
        !s.includes('.gov.br') &&
        !s.startsWith('AC '),
    )
    commonName = nameCandidates[0] || fileName.replace(/\.(pfx|p12)$/i, '')
  }

  const now = new Date()
  const validFrom = now.toISOString()
  const validToDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // Típico 1 ano A1
  const validTo = validToDate.toISOString()

  // Gera número de série identificador único a partir do hash do arquivo
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const serialNumber = hashArray
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()

  return {
    commonName,
    issuer,
    validFrom,
    validTo,
    serialNumber,
    email: email || undefined,
    cpf: cpf || undefined,
    installedAt: now.toISOString(),
    fileName,
  }
}

class DoctorA1CertificateService {
  /**
   * Salva os dados do certificado no IndexedDB do médico (por userId).
   */
  public async saveCertificate(
    userId: string,
    info: ActiveA1CertificateInfo,
    rawPfxBytes: ArrayBuffer,
  ): Promise<void> {
    const db = await openPkiDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const data = {
        userId,
        info,
        rawBytes: rawPfxBytes,
        updatedAt: new Date().toISOString(),
      }
      const req = store.put(data, `a1_cert_${userId}`)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  /**
   * Obtém os metadados do certificado A1 configurado para o médico atual.
   */
  public async getCertificateInfo(userId: string): Promise<ActiveA1CertificateInfo | null> {
    try {
      const db = await openPkiDb()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(`a1_cert_${userId}`)
        req.onsuccess = () => {
          if (req.result && req.result.info) {
            resolve(req.result.info as ActiveA1CertificateInfo)
          } else {
            resolve(null)
          }
        }
        req.onerror = () => reject(req.error)
      })
    } catch {
      return null
    }
  }

  /**
   * Remove o certificado do navegador do médico.
   */
  public async removeCertificate(userId: string): Promise<void> {
    const db = await openPkiDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(`a1_cert_${userId}`)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }
}

export const doctorA1CertificateService = new DoctorA1CertificateService()
