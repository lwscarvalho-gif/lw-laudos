import { PdfDocument, PdfPage, PdfImageResource, PdfTextOptions } from './pdfBuilder'

export interface PrintReportImageItem {
  id: string
  url: string
  caption?: string
  sortOrder?: number
}

import type { BodyMarksState } from '@/types'
import { buildBodyMarkSvgString, renderSvgToJpegBytes } from './bodyMarks/svgRenderer'
import { ANATOMICAL_SCHEMES } from './bodyMarks/schemes'

export interface PrintReportProps {
  title: string
  patientName: string
  patientDocument?: string
  examDate?: string
  indication?: string
  referringPhysician?: string
  clinicLocation?: string
  clinicLogoUrl?: string
  bodyHtml: string
  conclusionHtml?: string
  authorName: string
  authorCrm?: string
  authorCrmUf?: string
  authorTitle?: string
  logoUrl?: string // Physician author logo
  headerText?: string
  signatureDate?: string
  isDraft?: boolean
  images?: PrintReportImageItem[]
  imagesPerPage?: 2 | 4 | 6
  bodyMarks?: BodyMarksState
  digitalSignature?: {
    enabled: boolean
    isRealSignature?: boolean // Indica se a assinatura foi realizada com certificado ICP-Brasil real
    providerName?: string // ex: "Bird ID", "VIDaaS", "Certificado A1"
    commonName?: string
    issuer?: string
    serialNumber?: string
    signedAt?: string
    hashSha256?: string
  }
  validityDays?: number // Período de validade configurável (padrão 90 dias)
  issueDate?: string // Data de emissão oficial (ISO string ou YYYY-MM-DD)
}

// Fixed legal indicator (exibido apenas quando a assinatura real NÃO está ativa)
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
  authorLogoResId?: string,
  authorLogoAspect?: number, // width / height
  clinicLogoResId?: string,
  clinicLogoAspect?: number,
) {
  const marginX = 40
  const topY = 800
  let currentLeftX = marginX

  // 1. Clinic Identification (if report is linked to a clinic)
  if (clinicLogoResId && clinicLogoAspect) {
    const maxH = 30
    const maxW = 90
    let drawW = maxH * clinicLogoAspect
    let drawH = maxH
    if (drawW > maxW) {
      drawW = maxW
      drawH = drawW / clinicLogoAspect
    }
    page.drawImage(clinicLogoResId, currentLeftX, topY - drawH + 8, drawW, drawH)
    currentLeftX += drawW + 10
  }

  // If clinic has a name, display it or display alongside author logo
  if (props.clinicLocation) {
    page.drawText(props.clinicLocation.slice(0, 35), currentLeftX, topY + 4, {
      fontSize: 9.5,
      bold: true,
      color: COLOR_PRIMARY,
    })
    if (props.authorName) {
      page.drawText(
        `Dr(a). ${props.authorName.replace(/^Dr(\(a\))?\.?\s*/i, '')}${props.authorCrm ? ` • CRM ${props.authorCrmUf ? `${props.authorCrmUf} ` : ''}${props.authorCrm}` : ''}`.slice(
          0,
          45,
        ),
        currentLeftX,
        topY - 7,
        {
          fontSize: 7.5,
          color: COLOR_MUTED,
        },
      )
    }
    currentLeftX += 170
  } else if (authorLogoResId && authorLogoAspect) {
    // 2. Personal Physician Author Logo (when no clinic takes primary slot)
    const maxH = 34
    const maxW = 120
    let drawW = maxH * authorLogoAspect
    let drawH = maxH
    if (drawW > maxW) {
      drawW = maxW
      drawH = drawW / authorLogoAspect
    }
    page.drawImage(authorLogoResId, currentLeftX, topY - drawH + 8, drawW, drawH)
    currentLeftX += drawW + 12
  } else if (props.headerText) {
    // Physician custom header text lines
    const lines = props.headerText.split('\n').slice(0, 2)
    let y = topY + 4
    for (const l of lines) {
      page.drawText(l.slice(0, 50), currentLeftX, y, {
        fontSize: 8.5,
        bold: true,
        color: COLOR_PRIMARY,
      })
      y -= 11
    }
  } else {
    // Provisória typographic mark: LW LAUDOS
    page.drawText('LW LAUDOS', currentLeftX, topY + 4, {
      fontSize: 14,
      bold: true,
      color: COLOR_PRIMARY,
    })
    page.drawText('SISTEMA MÉDICO MULTIPERFIL • ULTRASSONOGRAFIA', currentLeftX, topY - 8, {
      fontSize: 7.5,
      bold: true,
      color: COLOR_MUTED,
    })
  }

  // If there's also an author personal logo and clinic was displayed, render author logo on right of header
  if (props.clinicLocation && authorLogoResId && authorLogoAspect) {
    const maxH = 26
    const maxW = 75
    let drawW = maxH * authorLogoAspect
    let drawH = maxH
    if (drawW > maxW) {
      drawW = maxW
      drawH = drawW / authorLogoAspect
    }
    page.drawImage(authorLogoResId, 360 - drawW, topY - drawH + 6, drawW, drawH)
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

// Helper para calcular e formatar as datas de emissão e validade
export function formatReportValidityStatement(
  issueDateStr?: string,
  validityDays: number = 90,
): { issueFormatted: string; validUntilFormatted: string; statementText: string } {
  const baseDate = issueDateStr ? new Date(issueDateStr) : new Date()
  const validUntilDate = new Date(baseDate.getTime() + validityDays * 24 * 60 * 60 * 1000)

  const issueFormatted = baseDate.toLocaleDateString('pt-BR')
  const validUntilFormatted = validUntilDate.toLocaleDateString('pt-BR')
  const statementText = `Este laudo tem validade de ${validityDays} dias a partir da data de emissão (${issueFormatted}), válido até ${validUntilFormatted}.`

  return { issueFormatted, validUntilFormatted, statementText }
}

// Renders the standard running footer on a page
function drawRunningFooter(
  page: PdfPage,
  pageNum: number,
  totalPages: number,
  props: PrintReportProps,
) {
  const marginX = 40
  const rightX = 555
  const bottomY = 18

  // Top line separator do rodapé
  page.drawLine(marginX, bottomY + 22, rightX, bottomY + 22, COLOR_BORDER, 0.5)

  // Linha 1 do rodapé: Declaração de validade nos moldes exigidos
  const validityDays =
    typeof props.validityDays === 'number' && props.validityDays > 0 ? props.validityDays : 90
  const { statementText } = formatReportValidityStatement(
    props.issueDate || props.signatureDate,
    validityDays,
  )

  page.drawText(statementText, marginX, bottomY + 11, {
    fontSize: 7,
    color: COLOR_TEXT_MAIN,
  })

  // Linha 2 do rodapé: Aviso preliminar (apenas se assinatura real NÃO estiver ativa) + Paginação
  const isRealActive = Boolean(
    props.digitalSignature?.enabled && props.digitalSignature?.isRealSignature,
  )
  if (!isRealActive) {
    page.drawText(PRELIMINARY_VERSION_DISCLAIMER, marginX, bottomY, {
      fontSize: 6.5,
      italic: true,
      color: COLOR_MUTED,
    })
  }

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
  const hasExtraLine = Boolean(props.referringPhysician || props.clinicLocation)
  const height = hasExtraLine ? 56 : 44

  page.drawRect(marginX, topY - height, width, height, {
    fillColor: COLOR_BG_BOX,
    strokeColor: COLOR_BORDER,
    lineWidth: 0.75,
  })

  // Left column: Paciente / CPF
  page.drawText('Paciente:', marginX + 10, topY - 15, {
    fontSize: 9,
    bold: true,
    color: COLOR_TEXT_MAIN,
  })
  page.drawText(props.patientName || 'Não informado', marginX + 60, topY - 15, {
    fontSize: 9.5,
    bold: true,
    color: COLOR_TEXT_MAIN,
  })

  if (props.patientDocument) {
    page.drawText(`CPF: ${props.patientDocument}`, marginX + 10, topY - 29, {
      fontSize: 8.5,
      color: COLOR_MUTED,
    })
  }

  // Optional: Médico Solicitante on Left Column (line 3)
  if (props.referringPhysician) {
    const refTxt = wrapText(`Médico Solicitante: ${props.referringPhysician}`, 45)[0] || ''
    page.drawText(refTxt, marginX + 10, topY - 44, {
      fontSize: 8,
      italic: true,
      color: COLOR_TEXT_MAIN,
    })
  }

  // Right column: Data / Indicação / Clínica
  const col2X = marginX + 300
  if (props.examDate) {
    page.drawText(`Data do Exame: ${props.examDate}`, col2X, topY - 15, {
      fontSize: 8.5,
      color: COLOR_TEXT_MAIN,
    })
  }
  if (props.indication) {
    const ind = wrapText(`Indicação: ${props.indication}`, 36)[0] || ''
    page.drawText(ind, col2X, topY - 29, {
      fontSize: 8,
      color: COLOR_MUTED,
    })
  }
  if (props.clinicLocation) {
    const cln = wrapText(`Local: ${props.clinicLocation}`, 36)[0] || ''
    page.drawText(cln, col2X, topY - 44, {
      fontSize: 8,
      bold: true,
      color: COLOR_PRIMARY,
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

  // 1. Preload logos if present (Author logo and Clinic logo)
  let logoResId: string | undefined
  let logoAspect = 1
  if (props.logoUrl) {
    const loadedLogo = await loadImageAsJpegBytes(props.logoUrl)
    if (loadedLogo) {
      logoResId = 'AuthorLogoImg'
      logoAspect = loadedLogo.width / loadedLogo.height
      doc.registerImage({
        id: logoResId,
        width: loadedLogo.width,
        height: loadedLogo.height,
        jpegBytes: loadedLogo.jpegBytes,
      })
    }
  }

  let clinicLogoResId: string | undefined
  let clinicLogoAspect = 1
  if (props.clinicLogoUrl) {
    const loadedClinicLogo = await loadImageAsJpegBytes(props.clinicLogoUrl)
    if (loadedClinicLogo) {
      clinicLogoResId = 'ClinicLogoImg'
      clinicLogoAspect = loadedClinicLogo.width / loadedClinicLogo.height
      doc.registerImage({
        id: clinicLogoResId,
        width: loadedClinicLogo.width,
        height: loadedClinicLogo.height,
        jpegBytes: loadedClinicLogo.jpegBytes,
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
  drawRunningHeader(currentPage, props, logoResId, logoAspect, clinicLogoResId, clinicLogoAspect)
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
        drawRunningHeader(
          currentPage,
          props,
          logoResId,
          logoAspect,
          clinicLogoResId,
          clinicLogoAspect,
        )
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

  // Signature Block (posicionado logo acima do rodapé, antes das páginas de anexos)
  const isDigital = Boolean(props.digitalSignature?.enabled)
  const sigHeight = isDigital ? 105 : 75
  if (cursorY - sigHeight < pageBottomLimit + 15) {
    currentPage = doc.addPage()
    textPages.push(currentPage)
    drawRunningHeader(currentPage, props, logoResId, logoAspect)
    cursorY = 740
  }

  cursorY -= 16
  const sigCenterX = marginX + contentWidth / 2

  if (isDigital) {
    // Carimbo Visual Oficial de Assinatura Digital (ICP-Brasil PAdES compliant visual representation)
    const stampW = 360
    const stampH = 72
    const stampX = sigCenterX - stampW / 2
    const stampY = cursorY - stampH

    // Fundo do selo digital e borda verde
    currentPage.drawRect(stampX, stampY, stampW, stampH, {
      fillColor: [0.965, 0.985, 0.975],
      strokeColor: COLOR_PRIMARY,
      lineWidth: 1,
    })
    // Barra lateral do selo
    currentPage.drawRect(stampX, stampY, 5, stampH, {
      fillColor: COLOR_PRIMARY,
    })

    // Cabeçalho do selo
    currentPage.drawText(
      'DOCUMENTO ASSINADO DIGITALMENTE (PADES / ICP-BRASIL)',
      stampX + 14,
      stampY + stampH - 14,
      {
        fontSize: 8,
        bold: true,
        color: COLOR_PRIMARY,
      },
    )

    // Linha 1: Titular e CRM
    const certHolder =
      props.digitalSignature?.commonName || props.authorName || 'Médico Responsável'
    const authorCrmStr = props.authorCrm
      ? `CRM ${props.authorCrmUf ? `${props.authorCrmUf} ` : ''}${props.authorCrm}`
      : 'CRM não informado'
    const providerTag = props.digitalSignature?.providerName
      ? ` via ${props.digitalSignature.providerName}`
      : ''
    currentPage.drawText(
      `Assinado digitalmente${providerTag} por: ${certHolder}`,
      stampX + 14,
      stampY + stampH - 28,
      {
        fontSize: 8.5,
        bold: true,
        color: COLOR_TEXT_MAIN,
      },
    )

    // Linha 2: Emissor / Modalidade e CRM
    const certIssuer = props.digitalSignature?.issuer || 'Certificação Digital em Nuvem'
    const certSerial = props.digitalSignature?.serialNumber
      ? ` • Serial: ${props.digitalSignature.serialNumber}`
      : ''
    currentPage.drawText(
      `${authorCrmStr} • Emissor: ${certIssuer.slice(0, 44)}${certSerial}`,
      stampX + 14,
      stampY + stampH - 41,
      {
        fontSize: 7.5,
        color: COLOR_MUTED,
      },
    )

    // Linha 3: Data/Hora e Hash
    const signDateStr = props.digitalSignature?.signedAt
      ? new Date(props.digitalSignature.signedAt).toLocaleString('pt-BR')
      : new Date().toLocaleString('pt-BR')
    const hashShort = props.digitalSignature?.hashSha256
      ? ` • SHA-256: ${props.digitalSignature.hashSha256.slice(0, 16)}...`
      : ''
    currentPage.drawText(
      `Data da assinatura: ${signDateStr}${hashShort}`,
      stampX + 14,
      stampY + stampH - 54,
      {
        fontSize: 7,
        color: COLOR_MUTED,
      },
    )

    // Linha 4: Validação
    currentPage.drawText(
      'Conforme MP nº 2.200-2/2001 e Resolução CFM nº 2.299/2021',
      stampX + 14,
      stampY + stampH - 65,
      {
        fontSize: 6.5,
        italic: true,
        color: COLOR_PRIMARY,
      },
    )

    cursorY = stampY - 14
  } else {
    // Fluxo clássico de assinatura manual
    currentPage.drawLine(
      sigCenterX - 110,
      cursorY,
      sigCenterX + 110,
      cursorY,
      COLOR_TEXT_MAIN,
      0.75,
    )
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
  }

  // 3.5. Body Mark Anatomical Scheme Page (Placed BETWEEN text and photographic images)
  if (props.bodyMarks && props.bodyMarks.schemeId && props.bodyMarks.schemeId !== 'none') {
    try {
      const schemeId = props.bodyMarks.schemeId
      const points = props.bodyMarks.points || []
      const schemeDef = ANATOMICAL_SCHEMES[schemeId]

      // Generate standalone SVG string
      const svgStr = buildBodyMarkSvgString(schemeId, points, {
        width: 1200,
        height: 900,
        showBackground: true,
      })

      // Convert SVG into JPEG bytes for binary PDF embed
      const rendered = await renderSvgToJpegBytes(svgStr, 1200, 900)
      if (rendered) {
        const bodyMarkResId = 'BodyMark_Scheme'
        doc.registerImage({
          id: bodyMarkResId,
          width: rendered.width,
          height: rendered.height,
          jpegBytes: rendered.jpegBytes,
        })

        const bmPage = doc.addPage()
        drawRunningHeader(bmPage, props, logoResId, logoAspect, clinicLogoResId, clinicLogoAspect)

        // Section header
        bmPage.drawText('ESQUEMA ANATÔMICO • BODY MARK', marginX, 755, {
          fontSize: 11,
          bold: true,
          color: COLOR_PRIMARY,
        })
        bmPage.drawText(
          schemeDef ? schemeDef.title.toUpperCase() : 'MAPEAMENTO TOPOGRÁFICO',
          rightX,
          755,
          {
            fontSize: 8.5,
            align: 'right',
            bold: true,
            color: COLOR_TEXT_MAIN,
          },
        )
        bmPage.drawLine(marginX, 746, rightX, 746, COLOR_BORDER, 0.5)

        // Draw Diagram card
        const cardW = contentWidth // 515
        const cardH = 340
        const cardX = marginX
        const cardY = 390

        bmPage.drawRect(cardX, cardY, cardW, cardH, {
          fillColor: COLOR_WHITE,
          strokeColor: COLOR_BORDER,
          lineWidth: 0.75,
        })

        // Draw Diagram Image inside card (preserving 4:3 aspect ratio)
        const pad = 8
        const maxImgW = cardW - pad * 2
        const maxImgH = cardH - pad * 2
        const aspect = rendered.width / rendered.height // 1.333
        let drawW = maxImgW
        let drawH = drawW / aspect
        if (drawH > maxImgH) {
          drawH = maxImgH
          drawW = drawH * aspect
        }
        const imgX = cardX + (cardW - drawW) / 2
        const imgY = cardY + (cardH - drawH) / 2

        bmPage.drawImage(bodyMarkResId, imgX, imgY, drawW, drawH)

        // Draw Legend Table below diagram (Y: 375 down to 80)
        let legendY = cardY - 18
        bmPage.drawText(
          `LEGENDA DAS MARCAS ANATÔMICAS (${points.length} ${points.length === 1 ? 'REGISTRO' : 'REGISTROS'})`,
          marginX,
          legendY,
          {
            fontSize: 9.5,
            bold: true,
            color: COLOR_PRIMARY,
          },
        )
        legendY -= 6
        bmPage.drawLine(marginX, legendY, rightX, legendY, COLOR_PRIMARY, 1)
        legendY -= 14

        if (points.length === 0) {
          bmPage.drawText('Nenhuma lesão ou ponto foi marcado no esquema.', marginX, legendY, {
            fontSize: 8.5,
            italic: true,
            color: COLOR_MUTED,
          })
        } else {
          for (const pt of points) {
            if (legendY < 70) break // avoid footer collision

            // Marker badge circle / number
            bmPage.drawRect(marginX, legendY - 3, 14, 14, {
              fillColor: [0.863, 0.149, 0.149], // #DC2626
              strokeColor: [0.863, 0.149, 0.149],
            })
            bmPage.drawText(String(pt.number), marginX + 7, legendY + 1, {
              fontSize: 8.5,
              bold: true,
              align: 'center',
              color: COLOR_WHITE,
            })

            // Compile details
            const detailTokens: string[] = []
            if (pt.side && pt.side !== 'Não se aplica') detailTokens.push(`Lado: ${pt.side}`)
            if (pt.quadrant && pt.quadrant !== 'Não se aplica')
              detailTokens.push(`Quadrante: ${pt.quadrant}`)
            if (pt.clockHour) detailTokens.push(`Posição: ${pt.clockHour}h`)
            if (pt.distanceFromNippleCm) detailTokens.push(`Distância: ${pt.distanceFromNippleCm}`)
            if (pt.tendon && pt.tendon !== 'Não se aplica')
              detailTokens.push(`Tendão: ${pt.tendon}`)
            if (pt.lesionGrade && pt.lesionGrade !== 'Não se aplica')
              detailTokens.push(`Grau: ${pt.lesionGrade}`)
            if (pt.deviceStatus && pt.deviceStatus !== 'Não se aplica')
              detailTokens.push(`DIU: ${pt.deviceStatus}`)

            const tokenStr = detailTokens.join('  •  ')
            if (tokenStr) {
              bmPage.drawText(tokenStr, marginX + 22, legendY, {
                fontSize: 8.5,
                bold: true,
                color: COLOR_TEXT_MAIN,
              })
              legendY -= 12
            }

            if (pt.description) {
              const descLines = wrapText(pt.description, 92)
              for (const dLine of descLines) {
                bmPage.drawText(dLine, marginX + 22, legendY, {
                  fontSize: 8,
                  color: COLOR_MUTED,
                })
                legendY -= 10
              }
            } else {
              legendY -= 4
            }

            legendY -= 6 // space between items
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao embutir body mark no PDF binário:', err)
    }
  }

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

      drawRunningHeader(imgPage, props, logoResId, logoAspect, clinicLogoResId, clinicLogoAspect)

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
    drawRunningFooter(p, idx + 1, totalPages, props)
  })

  // 6. Build PDF Binary
  const pdfBytes = doc.buildPdfBytes()
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
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
  if (props.clinicLogoUrl || props.clinicLocation) {
    clinicBrand = `<div class="header-logo-container">
      ${props.clinicLogoUrl ? `<img src="${props.clinicLogoUrl}" alt="${props.clinicLocation || 'Clínica'}" class="header-logo-img" />` : ''}
      <div>
        ${props.clinicLocation ? `<div style="font-size: 11pt; font-weight: bold; color: #0C6B58;">${props.clinicLocation}</div>` : ''}
        ${props.authorName ? `<div style="font-size: 8pt; color: #5F6E69;">Dr(a). ${props.authorName.replace(/^Dr(\(a\))?\.?\s*/i, '')}${crmFormatted ? ` • ${crmFormatted}` : ''}</div>` : ''}
      </div>
      ${props.logoUrl ? `<img src="${props.logoUrl}" alt="Logo Médico" class="header-logo-img" style="margin-left: 10px; max-height: 42px;" />` : ''}
    </div>`
  } else if (props.logoUrl) {
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

    /* Body Mark Page Layout */
    .bodymark-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 10px 0;
    }
    .bodymark-svg-card {
      border: 1px solid #D6DDD9;
      border-radius: 6px;
      padding: 10px;
      background: #FFFFFF;
      max-width: 100%;
    }
    .bodymark-legend-box {
      width: 100%;
      margin-top: 14px;
      border: 1px solid #E5E9E7;
      border-radius: 6px;
      padding: 10px 14px;
      background: #FAFCFB;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .bodymark-legend-title {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0C6B58;
      margin-bottom: 8px;
      text-transform: uppercase;
      border-bottom: 1px solid #D0E6E1;
      padding-bottom: 4px;
    }
    .bodymark-legend-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 8.5pt;
    }
    .bodymark-badge {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #DC2626;
      color: #FFFFFF;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      flex-shrink: 0;
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
        ${props.referringPhysician ? `<br/><span style="color:#33413B; font-style: italic;">Médico Solicitante: <strong>${props.referringPhysician}</strong></span>` : ''}
      </div>
      <div style="text-align: right;">
        ${props.examDate ? `<span>Data do Exame: <strong>${props.examDate}</strong></span>` : ''}
        ${props.indication ? `<br/><span style="color:#5F6E69;">Indicação: ${props.indication}</span>` : ''}
        ${props.clinicLocation ? `<br/><span style="color:#0C6B58; font-weight: bold;">Local: ${props.clinicLocation}</span>` : ''}
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

    ${
      props.digitalSignature?.enabled
        ? `
      <div style="margin-top: 28px; page-break-inside: avoid; border: 1.5px solid #0C6B58; border-radius: 6px; padding: 12px 16px; background: #F4F9F7; font-family: -apple-system, sans-serif; text-align: left; max-width: 440px; margin-left: auto; margin-right: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="color: #0C6B58; font-weight: 800; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #D1E5DE; padding-bottom: 4px; margin-bottom: 6px;">
          ✓ Documento Assinado Digitalmente (ICP-Brasil / PAdES)
        </div>
        <div style="font-size: 9pt; font-weight: 700; color: #1F2A27;">
          Assinado digitalmente${props.digitalSignature.providerName ? ` via ${props.digitalSignature.providerName}` : ''} por: ${props.digitalSignature.commonName || props.authorName}${crmFormatted ? ` • ${crmFormatted}` : ''}
        </div>
        <div style="font-size: 8pt; color: #5F6E69; margin-top: 2px;">
          Emissor / Provedor: ${props.digitalSignature.issuer || props.digitalSignature.providerName || 'Certificação Digital'}${props.digitalSignature.serialNumber ? ` • Serial: ${props.digitalSignature.serialNumber}` : ''}
        </div>
        <div style="font-size: 7.5pt; color: #5F6E69; margin-top: 2px;">
          Data da assinatura: ${props.digitalSignature.signedAt ? new Date(props.digitalSignature.signedAt).toLocaleString('pt-BR') : sigDateFormatted}${props.digitalSignature.hashSha256 ? ` • SHA-256: ${props.digitalSignature.hashSha256.slice(0, 16)}...` : ''}
        </div>
        <div style="font-size: 7pt; color: #0C6B58; margin-top: 4px; font-style: italic;">
          Conforme MP nº 2.200-2/2001 e Resolução CFM nº 2.299/2021
        </div>
      </div>
    `
        : `
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="author-name">${props.authorName}</div>
        ${crmFormatted ? `<div class="author-crm">${crmFormatted}</div>` : ''}
        <div class="author-title">${authorTitleFormatted}</div>
        <div class="signature-date">Identificação profissional registrada eletronicamente em ${sigDateFormatted}</div>
      </div>
    `
    }
  </div>

  <!-- BODY MARK SECTION (Between Text and Images) -->
  ${
    props.bodyMarks && props.bodyMarks.schemeId && props.bodyMarks.schemeId !== 'none'
      ? `
    <div class="page-sheet page-break-before">
      <div class="header">
        <div class="header-clinic">
          ${clinicBrand}
        </div>
        <div class="header-meta">
          <div>ESQUEMA ANATÔMICO (BODY MARK)</div>
          <div>Mapeamento Topográfico de Lesões</div>
        </div>
      </div>

      <div class="patient-box">
        <div>Paciente: <strong>${props.patientName}</strong></div>
        <div style="text-align: right;">${props.examDate ? `Data: <strong>${props.examDate}</strong>` : ''}</div>
      </div>

      <div class="bodymark-container">
        <div class="bodymark-svg-card">
          ${buildBodyMarkSvgString(props.bodyMarks.schemeId, props.bodyMarks.points, {
            width: 580,
            height: 435,
            showBackground: true,
          })}
        </div>

        <div class="bodymark-legend-box">
          <div class="bodymark-legend-title">
            Legenda de Marcas Anatômicas (${(props.bodyMarks.points || []).length} Registros)
          </div>
          ${
            (props.bodyMarks.points || []).length === 0
              ? '<div style="color: #718079; font-style: italic; font-size: 8.5pt;">Nenhum ponto registrado no esquema.</div>'
              : (props.bodyMarks.points || [])
                  .map((pt) => {
                    const tokens = []
                    if (pt.side && pt.side !== 'Não se aplica') tokens.push(`Lado: ${pt.side}`)
                    if (pt.quadrant && pt.quadrant !== 'Não se aplica')
                      tokens.push(`Quadrante: ${pt.quadrant}`)
                    if (pt.clockHour) tokens.push(`Posição: ${pt.clockHour}h`)
                    if (pt.distanceFromNippleCm)
                      tokens.push(`Distância: ${pt.distanceFromNippleCm}`)
                    if (pt.tendon && pt.tendon !== 'Não se aplica')
                      tokens.push(`Tendão: ${pt.tendon}`)
                    if (pt.lesionGrade && pt.lesionGrade !== 'Não se aplica')
                      tokens.push(`Grau: ${pt.lesionGrade}`)
                    if (pt.deviceStatus && pt.deviceStatus !== 'Não se aplica')
                      tokens.push(`DIU: ${pt.deviceStatus}`)

                    return `
                    <div class="bodymark-legend-item">
                      <div class="bodymark-badge">${pt.number}</div>
                      <div>
                        <strong>${tokens.join(' • ') || 'Marcação anatômica'}</strong>
                        ${pt.description ? `<div style="color: #4B5563; margin-top: 2px;">${pt.description}</div>` : ''}
                      </div>
                    </div>
                  `
                  })
                  .join('')
          }
        </div>
      </div>
    </div>
  `
      : ''
  }

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
    <div style="font-size: 7.5pt; color: #1F2A27; margin-bottom: 2px;">
      ${formatReportValidityStatement(props.issueDate || props.signatureDate, typeof props.validityDays === 'number' && props.validityDays > 0 ? props.validityDays : 90).statementText}
    </div>
    ${
      !props.digitalSignature?.enabled || !props.digitalSignature?.isRealSignature
        ? `<div style="font-size: 7pt; font-style: italic; color: #8A9691;">${PRELIMINARY_VERSION_DISCLAIMER}</div>`
        : ''
    }
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
