import { PdfDocument, PdfPage, PdfImageResource, PdfTextOptions } from './pdfBuilder'

export interface PrintReportImageItem {
  id: string
  url: string
  caption?: string
  sortOrder?: number
}

export interface PrintReportProps {
  title: string
  patientName: string
  patientDocument?: string
  examDate?: string
  indication?: string
  bodyHtml: string
  conclusionHtml?: string
  authorName: string
  authorCrm?: string
  authorCrmUf?: string
  authorTitle?: string
  logoUrl?: string
  headerText?: string
  signatureDate?: string
  isDraft?: boolean
  images?: PrintReportImageItem[]
  imagesPerPage?: 2 | 4 | 6
}

// Fixed legal indicator
export const PRELIMINARY_VERSION_DISCLAIMER =
  'Versão preliminar para avaliação (não homologada para uso real)'

// Color palette constants for PDF styling (RGB 0..1)
const COLOR_PRIMARY: [number, number, number] = [0.047, 0.42, 0.345] // #0C6B58
const COLOR_TEXT_MAIN: [number, number, number] = [0.12, 0.165, 0.153] // #1F2A27
const COLOR_MUTED: [number, number, number] = [0.373, 0.431, 0.412] // #5F6E69
const COLOR_BORDER: [number, number, number] = [0.839, 0.867, 0.851] // #D6DDD9
const COLOR_BG_BOX: [number, number, number] = [0.969, 0.976, 0.973] // #F7F9F8
const COLOR_BG_DARK: [number, number, number] = [0.043, 0.055, 0.051] // #0B0E0D
const COLOR_WHITE: [number, number, number] = [1, 1, 1]

// HTML tag stripper and plain text converter
function htmlToStructuredBlocks(html: string): Array<{
  type: 'h1' | 'h2' | 'h3' | 'p' | 'divider'
  text: string
}> {
  if (!html) return []
  const blocks: Array<{ type: 'h1' | 'h2' | 'h3' | 'p' | 'divider'; text: string }> = []

  // Clean html comments and scripts
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')

  // Split by tag boundaries
  const regex = /<(h1|h2|h3|p|hr|div)[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi
  let match: RegExpExecArray | null
  let lastIndex = 0

  while ((match = regex.exec(cleaned)) !== null) {
    const tag = (match[1] || 'hr').toLowerCase()
    const content = match[2] || ''

    if (tag === 'hr') {
      blocks.push({ type: 'divider', text: '' })
    } else {
      // Decode HTML entities and strip inner tags
      const text = content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, ' ')
        .trim()

      if (text) {
        if (tag === 'h1') blocks.push({ type: 'h1', text })
        else if (tag === 'h2') blocks.push({ type: 'h2', text })
        else if (tag === 'h3') blocks.push({ type: 'h3', text })
        else blocks.push({ type: 'p', text })
      }
    }
    lastIndex = regex.lastIndex
  }

  // Fallback: if no HTML tags matched, wrap the raw text as paragraphs
  if (blocks.length === 0) {
    const raw = cleaned
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
    const paragraphs = raw.split(/\n\s*\n/)
    for (const p of paragraphs) {
      const trimmed = p.trim()
      if (trimmed) blocks.push({ type: 'p', text: trimmed })
    }
  }

  return blocks
}

// Word-wrap utility for PDF text
export function wrapText(text: string, maxCharsPerLine: number): string[] {
  if (!text) return []
  const lines: string[] = []
  const paragraphs = text.split('\n')

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/)
    let currentLine = ''

    for (const word of words) {
      if (!word) continue
      if (!currentLine) {
        currentLine = word
      } else if (currentLine.length + 1 + word.length <= maxCharsPerLine) {
        currentLine += ' ' + word
      } else {
        lines.push(currentLine)
        currentLine = word
      }
    }
    if (currentLine) {
      lines.push(currentLine)
    }
  }
  return lines
}

// Convert image URL to JPEG Uint8Array + dimensions via canvas (client-side)
// In test environments or when Image isn't available, handles gracefully
export async function loadImageAsJpegBytes(url: string): Promise<{
  width: number
  height: number
  jpegBytes: Uint8Array
} | null> {
  if (!url) return null

  // In Node / SSR or browser without Image/canvas
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return null
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const naturalW = img.naturalWidth || img.width || 800
        const naturalH = img.naturalHeight || img.height || 600

        // Limit size to max 1200px width/height for fast rendering and small PDF size
        const maxDim = 1200
        let targetW = naturalW
        let targetH = naturalH
        if (targetW > maxDim || targetH > maxDim) {
          if (targetW > targetH) {
            targetH = Math.round((targetH * maxDim) / targetW)
            targetW = maxDim
          } else {
            targetW = Math.round((targetW * maxDim) / targetH)
            targetH = maxDim
          }
        }

        canvas.width = targetW
        canvas.height = targetH
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }

        // Draw with white background in case of PNG transparency
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, targetW, targetH)
        ctx.drawImage(img, 0, 0, targetW, targetH)

        // Export as JPEG DataURL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        const base64 = dataUrl.split(',')[1]
        const binStr = atob(base64)
        const bytes = new Uint8Array(binStr.length)
        for (let i = 0; i < binStr.length; i++) {
          bytes[i] = binStr.charCodeAt(i)
        }

        resolve({
          width: targetW,
          height: targetH,
          jpegBytes: bytes,
        })
      } catch (err) {
        console.warn('Falha ao processar imagem para PDF:', err)
        resolve(null)
      }
    }
    img.onerror = () => {
      resolve(null)
    }
    img.src = url
  })
}

// Renders the standard running header on a page
function drawRunningHeader(
  page: PdfPage,
  props: PrintReportProps,
  logoResId?: string,
  logoAspect?: number, // width / height
) {
  const marginX = 40
  const topY = 800

  // 1. Logo or Typographic Brand
  if (logoResId && logoAspect) {
    const maxH = 34
    const maxW = 120
    let drawW = maxH * logoAspect
    let drawH = maxH
    if (drawW > maxW) {
      drawW = maxW
      drawH = drawW / logoAspect
    }
    page.drawImage(logoResId, marginX, topY - drawH + 8, drawW, drawH)
  } else if (props.headerText) {
    // Physician custom header text lines
    const lines = props.headerText.split('\n').slice(0, 2)
    let y = topY + 4
    for (const l of lines) {
      page.drawText(l.slice(0, 60), marginX, y, {
        fontSize: 9,
        bold: true,
        color: COLOR_PRIMARY,
      })
      y -= 11
    }
  } else {
    // Provisória typographic mark: LW LAUDOS
    page.drawText('LW LAUDOS', marginX, topY + 4, {
      fontSize: 14,
      bold: true,
      color: COLOR_PRIMARY,
    })
    page.drawText('SISTEMA MÉDICO MULTIPERFIL • ULTRASSONOGRAFIA', marginX, topY - 8, {
      fontSize: 7.5,
      bold: true,
      color: COLOR_MUTED,
    })
  }

  // Right side meta
  const rightX = 555
  if (props.isDraft) {
    page.drawRect(rightX - 165, topY - 1, 165, 14, {
      fillColor: [0.996, 0.953, 0.78],
      strokeColor: [0.961, 0.62, 0.043],
      lineWidth: 0.5,
    })
    page.drawText('RASCUNHO NÃO CONCLUÍDO', rightX - 82, topY + 3, {
      fontSize: 7.5,
      bold: true,
      align: 'center',
      color: [0.573, 0.251, 0.055],
    })
  } else {
    page.drawText('Via do Paciente / Prontuário Médico', rightX, topY + 3, {
      fontSize: 8,
      align: 'right',
      color: COLOR_MUTED,
    })
  }

  const sigDate = props.signatureDate
    ? new Date(props.signatureDate).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR')
  page.drawText(`Emissão: ${sigDate}`, rightX, topY - 10, {
    fontSize: 7.5,
    align: 'right',
    color: COLOR_MUTED,
  })

  // Header bottom divider line (#0C6B58)
  page.drawLine(marginX, 775, rightX, 775, COLOR_PRIMARY, 1.5)
}

// Renders the standard running footer on a page
function drawRunningFooter(page: PdfPage, pageNum: number, totalPages: number) {
  const marginX = 40
  const rightX = 555
  const bottomY = 26

  // Top line
  page.drawLine(marginX, bottomY + 12, rightX, bottomY + 12, COLOR_BORDER, 0.5)

  // Version disclaimer
  page.drawText(PRELIMINARY_VERSION_DISCLAIMER, marginX, bottomY, {
    fontSize: 7,
    italic: true,
    color: COLOR_MUTED,
  })

  // Pagination
  page.drawText(`Página ${pageNum} de ${totalPages}`, rightX, bottomY, {
    fontSize: 7.5,
    align: 'right',
    color: COLOR_MUTED,
  })
}

// Patient Box
function drawPatientBox(page: PdfPage, props: PrintReportProps, topY: number): number {
  const marginX = 40
  const width = 515
  const height = 44

  page.drawRect(marginX, topY - height, width, height, {
    fillColor: COLOR_BG_BOX,
    strokeColor: COLOR_BORDER,
    lineWidth: 0.75,
  })

  // Left column: Paciente / CPF
  page.drawText('Paciente:', marginX + 10, topY - 16, {
    fontSize: 9,
    bold: true,
    color: COLOR_TEXT_MAIN,
  })
  page.drawText(props.patientName || 'Não informado', marginX + 60, topY - 16, {
    fontSize: 9.5,
    bold: true,
    color: COLOR_TEXT_MAIN,
  })

  if (props.patientDocument) {
    page.drawText(`CPF: ${props.patientDocument}`, marginX + 10, topY - 32, {
      fontSize: 8.5,
      color: COLOR_MUTED,
    })
  }

  // Right column: Data / Indicação
  const col2X = marginX + 310
  if (props.examDate) {
    page.drawText(`Data do Exame: ${props.examDate}`, col2X, topY - 16, {
      fontSize: 8.5,
      color: COLOR_TEXT_MAIN,
    })
  }
  if (props.indication) {
    const ind = wrapText(`Indicação: ${props.indication}`, 38)[0] || ''
    page.drawText(ind, col2X, topY - 32, {
      fontSize: 8,
      color: COLOR_MUTED,
    })
  }

  return topY - height - 14
}

// Core PDF Generation Pipeline producing authentic binary application/pdf
export async function generateReportPdfBlob(props: PrintReportProps): Promise<Blob> {
  const doc = new PdfDocument()
  doc.title = props.title || 'Laudo de Ultrassonografia'
  doc.author = props.authorName || 'Médico'
  doc.subject = `Laudo Médico - ${props.patientName}`

  // 1. Preload logo if present
  let logoResId: string | undefined
  let logoAspect = 1
  if (props.logoUrl) {
    const loadedLogo = await loadImageAsJpegBytes(props.logoUrl)
    if (loadedLogo) {
      logoResId = 'LogoImg'
      logoAspect = loadedLogo.width / loadedLogo.height
      doc.registerImage({
        id: logoResId,
        width: loadedLogo.width,
        height: loadedLogo.height,
        jpegBytes: loadedLogo.jpegBytes,
      })
    }
  }

  // 2. Preload clinical images
  const loadedImages: Array<{
    item: PrintReportImageItem
    resId: string
    aspect: number
  }> = []

  if (props.images && props.images.length > 0) {
    for (let i = 0; i < props.images.length; i++) {
      const it = props.images[i]
      const loaded = await loadImageAsJpegBytes(it.url)
      if (loaded) {
        const resId = `ExamImg_${i + 1}`
        doc.registerImage({
          id: resId,
          width: loaded.width,
          height: loaded.height,
          jpegBytes: loaded.jpegBytes,
        })
        loadedImages.push({
          item: it,
          resId,
          aspect: loaded.width / loaded.height,
        })
      }
    }
  }

  // 3. Prepare text document content and pagination
  const textPages: PdfPage[] = []
  let currentPage = doc.addPage()
  textPages.push(currentPage)

  const marginX = 40
  const rightX = 555
  const contentWidth = rightX - marginX // 515 pt
  const pageBottomLimit = 60 // Leave room for footer

  // Draw header and patient box on first page
  drawRunningHeader(currentPage, props, logoResId, logoAspect)
  let cursorY = 760
  cursorY = drawPatientBox(currentPage, props, cursorY)

  // Report Title
  pageTitle(currentPage, props.title || 'Laudo de Ultrassonografia', cursorY)
  cursorY -= 26

  function pageTitle(p: PdfPage, text: string, y: number) {
    p.drawRect(marginX, y - 14, 4, 16, { fillColor: COLOR_PRIMARY })
    p.drawText(text.toUpperCase(), marginX + 10, y - 1, {
      fontSize: 12,
      bold: true,
      color: COLOR_PRIMARY,
    })
  }

  // Parse structured or raw body HTML
  const blocks = htmlToStructuredBlocks(props.bodyHtml || '')

  for (const block of blocks) {
    if (block.type === 'h1' || block.type === 'h2') {
      // Need ~30 pt
      if (cursorY - 30 < pageBottomLimit) {
        currentPage = doc.addPage()
        textPages.push(currentPage)
        drawRunningHeader(currentPage, props, logoResId, logoAspect)
        cursorY = 750
      }
      cursorY -= 14
      currentPage.drawText(block.text, marginX, cursorY, {
        fontSize: 11,
        bold: true,
        color: COLOR_TEXT_MAIN,
      })
      cursorY -= 4
      currentPage.drawLine(marginX, cursorY, rightX, cursorY, COLOR_BORDER, 0.5)
      cursorY -= 10
    } else if (block.type === 'h3') {
      if (cursorY - 24 < pageBottomLimit) {
        currentPage = doc.addPage()
        textPages.push(currentPage)
        drawRunningHeader(currentPage, props, logoResId, logoAspect)
        cursorY = 750
      }
      cursorY -= 12
      currentPage.drawText(block.text, marginX, cursorY, {
        fontSize: 10,
        bold: true,
        color: COLOR_PRIMARY,
      })
      cursorY -= 8
    } else if (block.type === 'divider') {
      if (cursorY - 15 < pageBottomLimit) {
        currentPage = doc.addPage()
        textPages.push(currentPage)
        drawRunningHeader(currentPage, props, logoResId, logoAspect)
        cursorY = 750
      }
      cursorY -= 6
      currentPage.drawLine(marginX, cursorY, rightX, cursorY, COLOR_BORDER, 0.5)
      cursorY -= 8
    } else {
      // Paragraph: word-wrap at ~86 chars per line (10pt font in 515pt width)
      const lines = wrapText(block.text, 86)
      const lineHeight = 13.5

      for (const line of lines) {
        if (cursorY - lineHeight < pageBottomLimit) {
          currentPage = doc.addPage()
          textPages.push(currentPage)
          drawRunningHeader(currentPage, props, logoResId, logoAspect)
          cursorY = 750
        }
        currentPage.drawText(line, marginX, cursorY, {
          fontSize: 9.5,
          color: COLOR_TEXT_MAIN,
        })
        cursorY -= lineHeight
      }
      cursorY -= 6 // paragraph spacing
    }
  }

  // Conclusion Box (if provided)
  if (props.conclusionHtml) {
    const rawConclusion = props.conclusionHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim()
    const concLines = wrapText(rawConclusion, 82)
    const requiredHeight = 28 + concLines.length * 13 + 10

    if (cursorY - requiredHeight < pageBottomLimit) {
      currentPage = doc.addPage()
      textPages.push(currentPage)
      drawRunningHeader(currentPage, props, logoResId, logoAspect)
      cursorY = 750
    }

    cursorY -= 10
    const boxTop = cursorY
    const boxHeight = requiredHeight
    currentPage.drawRect(marginX, boxTop - boxHeight, contentWidth, boxHeight, {
      fillColor: [0.98, 0.98, 0.975],
      strokeColor: COLOR_BORDER,
      lineWidth: 0.75,
    })
    // Green accent left bar
    currentPage.drawRect(marginX, boxTop - boxHeight, 4, boxHeight, {
      fillColor: COLOR_PRIMARY,
    })

    currentPage.drawText('CONCLUSÃO DIAGNÓSTICA', marginX + 12, boxTop - 16, {
      fontSize: 10,
      bold: true,
      color: COLOR_PRIMARY,
    })

    let concY = boxTop - 30
    for (const cl of concLines) {
      currentPage.drawText(cl, marginX + 12, concY, {
        fontSize: 9.5,
        color: COLOR_TEXT_MAIN,
      })
      concY -= 13
    }
    cursorY = boxTop - boxHeight - 16
  }

  // Signature Block
  const sigHeight = 70
  if (cursorY - sigHeight < pageBottomLimit) {
    currentPage = doc.addPage()
    textPages.push(currentPage)
    drawRunningHeader(currentPage, props, logoResId, logoAspect)
    cursorY = 750
  }

  cursorY -= 20
  const sigCenterX = marginX + contentWidth / 2
  currentPage.drawLine(sigCenterX - 110, cursorY, sigCenterX + 110, cursorY, COLOR_TEXT_MAIN, 0.75)
  cursorY -= 12

  // Author Name
  currentPage.drawText(props.authorName || 'Médico Responsável', sigCenterX, cursorY, {
    fontSize: 10.5,
    bold: true,
    align: 'center',
    color: COLOR_TEXT_MAIN,
  })
  cursorY -= 12

  // Author Title: default to "Médico / CRM <num>" without presuming specialty
  const authorCrmStr = props.authorCrm
    ? `CRM ${props.authorCrmUf ? `${props.authorCrmUf} ` : ''}${props.authorCrm}`
    : 'CRM não informado'
  const displayTitle = props.authorTitle ? props.authorTitle : `Médico / ${authorCrmStr}`

  currentPage.drawText(authorCrmStr, sigCenterX, cursorY, {
    fontSize: 9.5,
    bold: true,
    align: 'center',
    color: COLOR_PRIMARY,
  })
  cursorY -= 11

  currentPage.drawText(displayTitle, sigCenterX, cursorY, {
    fontSize: 8.5,
    italic: true,
    align: 'center',
    color: COLOR_MUTED,
  })
  cursorY -= 10

  const sigDateStr = props.signatureDate
    ? new Date(props.signatureDate).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR')
  currentPage.drawText(
    `Identificação profissional registrada eletronicamente em ${sigDateStr}`,
    sigCenterX,
    cursorY,
    {
      fontSize: 7.5,
      align: 'center',
      color: COLOR_MUTED,
    },
  )

  // 4. Image Section (Separated into subsequent pages)
  const imagesPerPage = props.imagesPerPage || 4
  const imagePages: PdfPage[] = []

  if (loadedImages.length > 0) {
    const chunked: (typeof loadedImages)[] = []
    for (let i = 0; i < loadedImages.length; i += imagesPerPage) {
      chunked.push(loadedImages.slice(i, i + imagesPerPage))
    }

    for (let pIdx = 0; pIdx < chunked.length; pIdx++) {
      const pageImgs = chunked[pIdx]
      const imgPage = doc.addPage()
      imagePages.push(imgPage)

      drawRunningHeader(imgPage, props, logoResId, logoAspect)

      // Section title
      imgPage.drawText('DOCUMENTAÇÃO FOTOGRÁFICA DO EXAME', marginX, 755, {
        fontSize: 11,
        bold: true,
        color: COLOR_PRIMARY,
      })
      imgPage.drawText(`Anexo de Imagens • Página ${pIdx + 1} de ${chunked.length}`, rightX, 755, {
        fontSize: 8.5,
        align: 'right',
        color: COLOR_MUTED,
      })
      imgPage.drawLine(marginX, 746, rightX, 746, COLOR_BORDER, 0.5)

      // Grid layouts: 2, 4, 6 per page
      // Available area: X: 40..555 (width 515), Y: 60..735 (height 675)
      const gridTopY = 730

      if (imagesPerPage === 2) {
        // 1 column x 2 rows (large views)
        const cellH = 320
        const cellW = contentWidth

        pageImgs.forEach((imgMeta, idx) => {
          const overallNum = pIdx * imagesPerPage + idx + 1
          const cellY = gridTopY - (idx + 1) * cellH + 10
          drawImageCard(imgPage, imgMeta, marginX, cellY, cellW, cellH - 20, overallNum)
        })
      } else if (imagesPerPage === 6) {
        // 2 columns x 3 rows
        const cols = 2
        const rows = 3
        const gapX = 14
        const gapY = 12
        const cellW = (contentWidth - gapX) / cols // ~250.5 pt
        const cellH = (660 - gapY * 2) / rows // ~212 pt

        pageImgs.forEach((imgMeta, idx) => {
          const overallNum = pIdx * imagesPerPage + idx + 1
          const col = idx % cols
          const row = Math.floor(idx / cols)
          const cellX = marginX + col * (cellW + gapX)
          const cellY = gridTopY - (row + 1) * cellH + gapY
          drawImageCard(imgPage, imgMeta, cellX, cellY, cellW, cellH - gapY, overallNum)
        })
      } else {
        // Default 4 per page: 2 columns x 2 rows
        const cols = 2
        const rows = 2
        const gapX = 15
        const gapY = 16
        const cellW = (contentWidth - gapX) / cols // 250 pt
        const cellH = (660 - gapY) / rows // ~322 pt

        pageImgs.forEach((imgMeta, idx) => {
          const overallNum = pIdx * imagesPerPage + idx + 1
          const col = idx % cols
          const row = Math.floor(idx / cols)
          const cellX = marginX + col * (cellW + gapX)
          const cellY = gridTopY - (row + 1) * cellH + gapY
          drawImageCard(imgPage, imgMeta, cellX, cellY, cellW, cellH - gapY, overallNum)
        })
      }
    }
  }

  // Helper to draw an image card while strictly preserving aspect ratio without distortion
  function drawImageCard(
    page: PdfPage,
    meta: { item: PrintReportImageItem; resId: string; aspect: number },
    cardX: number,
    cardY: number,
    cardW: number,
    cardH: number,
    num: number,
  ) {
    const captionH = 26
    const frameH = cardH - captionH - 8
    const frameW = cardW - 8
    const frameX = cardX + 4
    const frameY = cardY + captionH + 4

    // Card outer border
    page.drawRect(cardX, cardY, cardW, cardH, {
      fillColor: COLOR_WHITE,
      strokeColor: COLOR_BORDER,
      lineWidth: 0.75,
    })

    // Image frame with dark background (standard ultrasound viewer)
    page.drawRect(frameX, frameY, frameW, frameH, {
      fillColor: COLOR_BG_DARK,
    })

    // Calculate fitted dimensions preserving natural aspect ratio
    let imgW = frameW
    let imgH = imgW / meta.aspect
    if (imgH > frameH) {
      imgH = frameH
      imgW = imgH * meta.aspect
    }

    const imgX = frameX + (frameW - imgW) / 2
    const imgY = frameY + (frameH - imgH) / 2
    page.drawImage(meta.resId, imgX, imgY, imgW, imgH)

    // Figure number & Caption text
    const captionText = meta.item.caption
      ? `Fig. ${num}: ${meta.item.caption}`
      : `Fig. ${num}: Registro ecográfico padrão`
    const wrapped = wrapText(captionText, Math.floor(cardW / 5.5))[0] || captionText
    page.drawText(wrapped, cardX + cardW / 2, cardY + 8, {
      fontSize: 8,
      bold: true,
      align: 'center',
      color: COLOR_TEXT_MAIN,
    })
  }

  // 5. Apply Footers with full page count to ALL pages
  const allPages = doc.getPages()
  const totalPages = allPages.length
  allPages.forEach((p, idx) => {
    drawRunningFooter(p, idx + 1, totalPages)
  })

  // 6. Build PDF Binary
  const pdfBytes = doc.buildPdfBytes()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}

// Download Real PDF file triggers real browser save
export async function downloadReportRealPdf(props: PrintReportProps, filename?: string) {
  const blob = await generateReportPdfBlob(props)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const cleanTitle = (props.title || 'Laudo').replace(/[^a-zA-Z0-9À-ÿ_-]/g, '_')
  const cleanName = (props.patientName || 'Paciente').replace(/[^a-zA-Z0-9À-ÿ_-]/g, '_')
  a.download = filename || `${cleanTitle}_${cleanName}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// Retain legacy HTML builder for in-app iframe preview
export function buildReportHTML(props: PrintReportProps & { autoPrint?: boolean }): string {
  const crmFormatted = props.authorCrm
    ? `CRM ${props.authorCrmUf ? `${props.authorCrmUf} ` : ''}${props.authorCrm}`
    : ''
  const sigDateFormatted = props.signatureDate
    ? new Date(props.signatureDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })

  // Logo or Clinic Brand
  let clinicBrand = ''
  if (props.logoUrl) {
    clinicBrand = `<div class="header-logo-container">
      <img src="${props.logoUrl}" alt="Logotipo do Médico" class="header-logo-img" />
      ${props.headerText ? `<div class="header-clinic-text">${props.headerText.replace(/\n/g, '<br/>')}</div>` : ''}
    </div>`
  } else if (props.headerText) {
    clinicBrand = `<div class="header-clinic-text">${props.headerText.replace(/\n/g, '<br/>')}</div>`
  } else {
    clinicBrand = `<div class="brand-typography">
         <span class="brand-lw">LW LAUDOS</span>
         <span class="brand-sub">SISTEMA MÉDICO MULTIPERFIL • ULTRASSONOGRAFIA</span>
       </div>`
  }

  // Chunk images per page
  const imagesPerPage = props.imagesPerPage || 4
  const images = props.images || []
  const imagePages: PrintReportImageItem[][] = []
  if (images && images.length > 0) {
    for (let i = 0; i < images.length; i += imagesPerPage) {
      imagePages.push(images.slice(i, i + imagesPerPage))
    }
  }

  const gridClass =
    imagesPerPage === 2 ? 'images-grid-2' : imagesPerPage === 6 ? 'images-grid-6' : 'images-grid-4'

  // Default authorTitle without presumption
  const authorTitleFormatted = props.authorTitle
    ? props.authorTitle
    : `Médico / ${crmFormatted || 'CRM não informado'}`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${props.title} - ${props.patientName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 20mm 15mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, Georgia, serif;
      color: #1F2A27;
      background: #ffffff;
      margin: 0;
      padding: 0;
      line-height: 1.55;
      font-size: 11pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-sheet {
      position: relative;
    }
    .page-break-before {
      page-break-before: always;
      break-before: page;
      margin-top: 20px;
    }
    .header {
      border-bottom: 2px solid #0C6B58;
      padding-bottom: 8px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-logo-img {
      max-height: 52px;
      max-width: 160px;
      object-fit: contain;
    }
    .header-clinic-text {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 9pt;
      color: #33413B;
      line-height: 1.35;
    }
    .brand-typography {
      display: flex;
      flex-direction: column;
    }
    .brand-lw {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-weight: 800;
      font-size: 14pt;
      letter-spacing: 1px;
      color: #0C6B58;
    }
    .brand-sub {
      font-size: 7.5pt;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: #5F6E69;
      text-transform: uppercase;
    }
    .header-meta {
      text-align: right;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 8.5pt;
      color: #718079;
    }
    .draft-badge {
      display: inline-block;
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #F59E0B;
      padding: 2px 8px;
      font-size: 8pt;
      font-weight: bold;
      border-radius: 4px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .patient-box {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F7F9F8;
      border: 1px solid #D6DDD9;
      border-radius: 5px;
      padding: 9px 12px;
      margin-bottom: 16px;
      font-size: 9.5pt;
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 6px;
    }
    .patient-box strong {
      color: #111827;
    }
    .report-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13.5pt;
      font-weight: 700;
      color: #0C6B58;
      margin: 12px 0 16px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-left: 4px solid #0C6B58;
      padding-left: 8px;
    }
    .report-body {
      min-height: 200px;
    }
    .report-body p {
      margin: 0 0 8px 0;
    }
    .report-body h2, .report-body h3 {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #111827;
      margin-top: 14px;
      margin-bottom: 6px;
    }
    .report-body h2 { font-size: 12pt; border-bottom: 1px solid #E5E7EB; padding-bottom: 3px; }
    .report-body h3 { font-size: 10.5pt; }
    .conclusion-container {
      margin-top: 18px;
      padding: 12px;
      background: #FAFAF9;
      border-left: 4px solid #0C6B58;
      border-top: 1px solid #E5E7EB;
      border-right: 1px solid #E5E7EB;
      border-bottom: 1px solid #E5E7EB;
      border-radius: 0 4px 4px 0;
      page-break-inside: avoid;
    }
    .conclusion-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      font-weight: bold;
      color: #0C6B58;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .conclusion-body {
      font-size: 11pt;
      line-height: 1.5;
    }
    .signature-block {
      margin-top: 36px;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .signature-line {
      width: 280px;
      border-top: 1px solid #111827;
      margin-bottom: 6px;
    }
    .author-name {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10.5pt;
      font-weight: bold;
      color: #111827;
    }
    .author-crm {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 9.5pt;
      color: #0C6B58;
      font-weight: 600;
    }
    .author-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 8.5pt;
      color: #5F6E69;
    }
    .signature-date {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 8.5pt;
      color: #718079;
      margin-top: 3px;
    }
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 7.5pt;
      color: #8A9691;
      border-top: 1px solid #E5E9E7;
      padding-top: 4px;
      text-align: center;
    }

    /* Images page layout */
    .images-page-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11.5pt;
      font-weight: bold;
      color: #0C6B58;
      margin: 8px 0 14px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .images-grid-2 {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .images-grid-4 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }
    .images-grid-6 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .image-card {
      border: 1px solid #D6DDD9;
      border-radius: 4px;
      padding: 6px;
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      align-items: center;
      page-break-inside: avoid;
    }
    .image-frame {
      width: 100%;
      height: 210px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0B0E0D;
      border-radius: 2px;
      overflow: hidden;
    }
    .images-grid-2 .image-frame {
      height: 380px;
    }
    .images-grid-6 .image-frame {
      height: 180px;
    }
    .image-frame img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
    }
    .image-caption {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 8.5pt;
      color: #374151;
      margin-top: 5px;
      text-align: center;
      width: 100%;
      word-break: break-word;
    }
    .image-counter {
      font-weight: bold;
      color: #0C6B58;
      margin-right: 4px;
    }
  </style>
</head>
<body>
  <!-- TEXT DOCUMENT -->
  <div class="page-sheet">
    <div class="header">
      <div class="header-clinic">
        ${clinicBrand}
      </div>
      <div class="header-meta">
        ${props.isDraft ? '<div class="draft-badge">RASCUNHO NÃO CONCLUÍDO</div>' : ''}
        <div>Via do Paciente / Prontuário Médico</div>
        <div>Emissão: ${sigDateFormatted}</div>
      </div>
    </div>

    <div class="patient-box">
      <div>
        <span>Paciente: <strong>${props.patientName}</strong></span>
        ${props.patientDocument ? `<br/><span style="color:#5F6E69;">CPF: <strong>${props.patientDocument}</strong></span>` : ''}
      </div>
      <div style="text-align: right;">
        ${props.examDate ? `<span>Data do Exame: <strong>${props.examDate}</strong></span>` : ''}
        ${props.indication ? `<br/><span style="color:#5F6E69;">Indicação: ${props.indication}</span>` : ''}
      </div>
    </div>

    <h1 class="report-title">${props.title}</h1>

    <div class="report-body">
      ${props.bodyHtml}
    </div>

    ${
      props.conclusionHtml
        ? `<div class="conclusion-container">
             <div class="conclusion-title">CONCLUSÃO DIAGNÓSTICA</div>
             <div class="conclusion-body">${props.conclusionHtml}</div>
           </div>`
        : ''
    }

    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="author-name">${props.authorName}</div>
      ${crmFormatted ? `<div class="author-crm">${crmFormatted}</div>` : ''}
      <div class="author-title">${authorTitleFormatted}</div>
      <div class="signature-date">Identificação profissional registrada eletronicamente em ${sigDateFormatted}</div>
    </div>
  </div>

  <!-- IMAGES SECTION -->
  ${imagePages
    .map(
      (pageImgs, pageIndex) => `
    <div class="page-sheet page-break-before">
      <div class="header">
        <div class="header-clinic">
          ${clinicBrand}
        </div>
        <div class="header-meta">
          <div>DOCUMENTAÇÃO FOTOGRÁFICA</div>
          <div>Página de Imagens ${pageIndex + 1} de ${imagePages.length}</div>
        </div>
      </div>

      <div class="patient-box">
        <div>Paciente: <strong>${props.patientName}</strong></div>
        <div style="text-align: right;">${props.examDate ? `Data: <strong>${props.examDate}</strong>` : ''}</div>
      </div>

      <div class="images-page-title">
        Registro Ultrassonográfico - Anexo de Imagens
      </div>

      <div class="${gridClass}">
        ${pageImgs
          .map((img, idx) => {
            const overallNumber = pageIndex * imagesPerPage + idx + 1
            return `
              <div class="image-card">
                <div class="image-frame">
                  <img src="${img.url}" alt="Registro ${overallNumber}" />
                </div>
                <div class="image-caption">
                  <span class="image-counter">Fig. ${overallNumber}:</span>
                  ${img.caption ? img.caption : 'Registro ecográfico padrão'}
                </div>
              </div>
            `
          })
          .join('')}
      </div>
    </div>
  `,
    )
    .join('')}

  <div class="footer">
    ${PRELIMINARY_VERSION_DISCLAIMER}
  </div>

  ${
    props.autoPrint
      ? `<script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>`
      : ''
  }
</body>
</html>`
}

export function printReportPDF(props: PrintReportProps) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Permita popups neste navegador para baixar ou imprimir o laudo em PDF.')
    return
  }
  const html = buildReportHTML({ ...props, autoPrint: true })
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

// Download report directly as HTML file if specifically requested
export function downloadReportHTML(props: PrintReportProps, filename?: string) {
  const html = buildReportHTML({ ...props, autoPrint: false })
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `${props.title || 'Laudo'}-${props.patientName || 'Paciente'}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
