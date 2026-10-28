// ISO 32000 / PDF 1.4 Specification Compliant Binary PDF Generator
// Generates authentic application/pdf with %PDF- header, cross-reference table, and %%EOF

export interface PdfImageResource {
  id: string
  width: number
  height: number
  jpegBytes: Uint8Array
}

export interface PdfTextOptions {
  fontSize?: number
  bold?: boolean
  italic?: boolean
  color?: [number, number, number] // [r, g, b] 0..1
  lineHeight?: number
  align?: 'left' | 'center' | 'right'
}

export interface PdfRectOptions {
  fillColor?: [number, number, number]
  strokeColor?: [number, number, number]
  lineWidth?: number
}

// Convert Portuguese / Latin-1 characters to WinAnsiEncoding bytes / octal escapes
export function escapePdfString(text: string): string {
  if (!text) return ''
  const winAnsiMap: Record<string, number> = {
    á: 225,
    à: 224,
    ã: 227,
    â: 226,
    é: 233,
    è: 232,
    ê: 234,
    í: 237,
    ì: 236,
    î: 238,
    ó: 243,
    ò: 242,
    õ: 245,
    ô: 244,
    ú: 250,
    ù: 249,
    û: 251,
    ü: 252,
    ç: 231,
    Á: 193,
    À: 192,
    Ã: 195,
    Â: 194,
    É: 201,
    È: 200,
    Ê: 202,
    Í: 205,
    Ì: 204,
    Î: 206,
    Ó: 211,
    Ò: 210,
    Õ: 215,
    Ô: 212,
    Ú: 218,
    Ù: 217,
    Û: 219,
    Ü: 220,
    Ç: 199,
    º: 186,
    ª: 170,
    '°': 176,
    '•': 149,
    '–': 150,
    '—': 151,
    '“': 147,
    '”': 148,
    '‘': 145,
    '’': 146,
  }

  let out = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '\\') {
      out += '\\\\'
    } else if (char === '(') {
      out += '\\('
    } else if (char === ')') {
      out += '\\)'
    } else {
      const code = char.charCodeAt(0)
      if (code >= 32 && code <= 126) {
        out += char
      } else if (winAnsiMap[char]) {
        const oct = winAnsiMap[char].toString(8).padStart(3, '0')
        out += `\\${oct}`
      } else if (code >= 160 && code <= 255) {
        const oct = code.toString(8).padStart(3, '0')
        out += `\\${oct}`
      } else {
        // Fallback for uncommon unmapped unicode: normalize
        out += ' '
      }
    }
  }
  return out
}

export class PdfPage {
  public width = 595.28 // A4 width in pt
  public height = 841.89 // A4 height in pt
  private streamParts: string[] = []
  private imagesUsed: Set<string> = new Set()

  constructor(width = 595.28, height = 841.89) {
    this.width = width
    this.height = height
  }

  public drawRect(x: number, y: number, w: number, h: number, opts: PdfRectOptions = {}) {
    const parts: string[] = ['q']
    if (opts.fillColor) {
      const [r, g, b] = opts.fillColor
      parts.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`)
    }
    if (opts.strokeColor) {
      const [r, g, b] = opts.strokeColor
      parts.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`)
    }
    if (opts.lineWidth) {
      parts.push(`${opts.lineWidth} w`)
    }
    parts.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`)
    if (opts.fillColor && opts.strokeColor) {
      parts.push('B')
    } else if (opts.fillColor) {
      parts.push('f')
    } else {
      parts.push('S')
    }
    parts.push('Q')
    this.streamParts.push(parts.join('\n'))
  }

  public drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: [number, number, number] = [0, 0, 0],
    lineWidth = 1,
  ) {
    const [r, g, b] = color
    this.streamParts.push(
      [
        'q',
        `${lineWidth} w`,
        `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`,
        `${x1.toFixed(2)} ${y1.toFixed(2)} m`,
        `${x2.toFixed(2)} ${y2.toFixed(2)} l`,
        'S',
        'Q',
      ].join('\n'),
    )
  }

  public drawText(text: string, x: number, y: number, opts: PdfTextOptions = {}) {
    if (!text) return
    const fontSize = opts.fontSize || 10
    const fontName = opts.bold ? '/F2' : opts.italic ? '/F3' : '/F1'
    const color = opts.color || [0.12, 0.16, 0.15]
    const [r, g, b] = color

    let drawX = x
    if (opts.align === 'center' || opts.align === 'right') {
      const estimatedWidth = text.length * fontSize * 0.52
      if (opts.align === 'center') {
        drawX = x - estimatedWidth / 2
      } else {
        drawX = x - estimatedWidth
      }
    }

    const escaped = escapePdfString(text)
    this.streamParts.push(
      [
        'BT',
        `${fontName} ${fontSize} Tf`,
        `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`,
        `${drawX.toFixed(2)} ${y.toFixed(2)} Td`,
        `(${escaped}) Tj`,
        'ET',
      ].join('\n'),
    )
  }

  public drawImage(imgId: string, x: number, y: number, w: number, h: number) {
    this.imagesUsed.add(imgId)
    this.streamParts.push(
      [
        'q',
        `${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm`,
        `/${imgId} Do`,
        'Q',
      ].join('\n'),
    )
  }

  public getUsedImages(): string[] {
    return Array.from(this.imagesUsed)
  }

  public buildStreamBytes(): Uint8Array {
    const content = this.streamParts.join('\n')
    return new TextEncoder().encode(content)
  }
}

export class PdfDocument {
  private pages: PdfPage[] = []
  private images: Map<string, PdfImageResource> = new Map()
  public title = 'Laudo Médico'
  public author = 'LW Laudos'
  public subject = 'Laudo de Ultrassonografia'

  public addPage(page?: PdfPage): PdfPage {
    const p = page || new PdfPage()
    this.pages.push(p)
    return p
  }

  public getPages(): PdfPage[] {
    return this.pages
  }

  public registerImage(img: PdfImageResource) {
    this.images.set(img.id, img)
  }

  public buildPdfBytes(): Uint8Array {
    const encoder = new TextEncoder()
    const parts: Uint8Array[] = []
    let currentOffset = 0
    const offsets: number[] = [0] // 0 index dummy for xref

    function append(chunk: Uint8Array | string) {
      const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk
      parts.push(bytes)
      currentOffset += bytes.length
    }

    // 1. PDF Header
    append('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')

    // Object registry
    let nextObjNum = 1

    // Obj 1: Catalog
    const catalogNum = nextObjNum++
    // Obj 2: Pages
    const pagesNum = nextObjNum++

    // Font Objs
    const fontHelvetica = nextObjNum++
    const fontHelveticaBold = nextObjNum++
    const fontHelveticaItalic = nextObjNum++

    // Image Objs mapped to obj num
    const imageObjNums = new Map<string, number>()
    this.images.forEach((_, id) => {
      imageObjNums.set(id, nextObjNum++)
    })

    // Page Objs: each page gets: Page obj + Content stream obj
    interface PageObjMeta {
      pageObjNum: number
      contentObjNum: number
      page: PdfPage
    }
    const pageMetas: PageObjMeta[] = []
    for (const p of this.pages) {
      pageMetas.push({
        pageObjNum: nextObjNum++,
        contentObjNum: nextObjNum++,
        page: p,
      })
    }

    // Info obj
    const infoNum = nextObjNum++

    // Write Catalog (Obj 1)
    offsets[catalogNum] = currentOffset
    append(`${catalogNum} 0 obj\n<< /Type /Catalog /Pages ${pagesNum} 0 R >>\nendobj\n`)

    // Write Pages parent (Obj 2)
    offsets[pagesNum] = currentOffset
    const kidsStr = pageMetas.map((m) => `${m.pageObjNum} 0 R`).join(' ')
    append(
      `${pagesNum} 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pageMetas.length} >>\nendobj\n`,
    )

    // Write Fonts (Helvetica standard Type1 with WinAnsiEncoding)
    offsets[fontHelvetica] = currentOffset
    append(
      `${fontHelvetica} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`,
    )

    offsets[fontHelveticaBold] = currentOffset
    append(
      `${fontHelveticaBold} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`,
    )

    offsets[fontHelveticaItalic] = currentOffset
    append(
      `${fontHelveticaItalic} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>\nendobj\n`,
    )

    // Write Images (DCTDecode XObjects)
    this.images.forEach((img, id) => {
      const objNum = imageObjNums.get(id)!
      offsets[objNum] = currentOffset
      const header = `${objNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpegBytes.length} >>\nstream\n`
      append(header)
      append(img.jpegBytes)
      append('\nendstream\nendobj\n')
    })

    // Write Page and Content Objs
    for (const meta of pageMetas) {
      // Content stream
      const streamBytes = meta.page.buildStreamBytes()
      offsets[meta.contentObjNum] = currentOffset
      append(`${meta.contentObjNum} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`)
      append(streamBytes)
      append('\nendstream\nendobj\n')

      // Page Object
      offsets[meta.pageObjNum] = currentOffset
      const usedImgs = meta.page.getUsedImages()
      let xobjectDict = ''
      if (usedImgs.length > 0) {
        const xobjEntries = usedImgs
          .map((imgId) => {
            const num = imageObjNums.get(imgId)
            return num ? `/${imgId} ${num} 0 R` : ''
          })
          .filter(Boolean)
          .join(' ')
        xobjectDict = `/XObject << ${xobjEntries} >>`
      }

      const resources = `<< /Font << /F1 ${fontHelvetica} 0 R /F2 ${fontHelveticaBold} 0 R /F3 ${fontHelveticaItalic} 0 R >> ${xobjectDict} >>`
      append(
        `${meta.pageObjNum} 0 obj\n<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${meta.page.width} ${meta.page.height}] /Contents ${meta.contentObjNum} 0 R /Resources ${resources} >>\nendobj\n`,
      )
    }

    // Info Object
    offsets[infoNum] = currentOffset
    const nowIso = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
    append(
      `${infoNum} 0 obj\n<< /Title (${escapePdfString(this.title)}) /Author (${escapePdfString(
        this.author,
      )}) /Subject (${escapePdfString(this.subject)}) /Creator (LW Laudos) /CreationDate (D:${nowIso}Z) >>\nendobj\n`,
    )

    // xref table
    const startXref = currentOffset
    const totalObjs = nextObjNum
    append(`xref\n0 ${totalObjs}\n`)
    append('0000000000 65535 f \n')
    for (let i = 1; i < totalObjs; i++) {
      const off = offsets[i] || 0
      const offStr = off.toString().padStart(10, '0')
      append(`${offStr} 00000 n \n`)
    }

    // trailer
    append(
      `trailer\n<< /Size ${totalObjs} /Root ${catalogNum} 0 R /Info ${infoNum} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`,
    )

    // Assemble final Uint8Array
    const finalBuffer = new Uint8Array(currentOffset)
    let pos = 0
    for (const chunk of parts) {
      finalBuffer.set(chunk, pos)
      pos += chunk.length
    }

    return finalBuffer
  }
}
