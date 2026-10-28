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
  headerText?: string
  signatureDate?: string
  isDraft?: boolean
  // Multiple images in separate pages
  images?: PrintReportImageItem[]
  imagesPerPage?: 2 | 4 | 6
}

export function printReportPDF({
  title,
  patientName,
  patientDocument,
  examDate,
  indication,
  bodyHtml,
  conclusionHtml,
  authorName,
  authorCrm,
  authorCrmUf,
  authorTitle,
  headerText,
  signatureDate,
  isDraft,
  images = [],
  imagesPerPage = 4,
}: PrintReportProps) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Permita popups neste navegador para baixar ou imprimir o laudo em PDF.')
    return
  }

  const crmFormatted = authorCrm ? `CRM ${authorCrmUf ? `${authorCrmUf} ` : ''}${authorCrm}` : ''
  const sigDateFormatted = signatureDate
    ? new Date(signatureDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })

  // Format header text or brand typography
  const clinicBrand = headerText
    ? headerText.replace(/\n/g, '<br/>')
    : `<div class="brand-typography">
         <span class="brand-lw">LW LAUDOS</span>
         <span class="brand-sub">SISTEMA MÉDICO MULTIPERFIL • ULTRASSONOGRAFIA</span>
       </div>`

  // Chunk images per page
  const imagePages: PrintReportImageItem[][] = []
  if (images && images.length > 0) {
    for (let i = 0; i < images.length; i += imagesPerPage) {
      imagePages.push(images.slice(i, i + imagesPerPage))
    }
  }

  // Grid column class based on imagesPerPage: 2 -> 1 col x 2 rows, 4 -> 2x2, 6 -> 2 cols x 3 rows
  const gridClass =
    imagesPerPage === 2 ? 'images-grid-2' : imagesPerPage === 6 ? 'images-grid-6' : 'images-grid-4'

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${title} - ${patientName}</title>
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
    .header-clinic {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
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
  <!-- TEXT DOCUMENT (always comes first) -->
  <div class="page-sheet">
    <div class="header">
      <div class="header-clinic">
        ${clinicBrand}
      </div>
      <div class="header-meta">
        ${isDraft ? '<div class="draft-badge">RASCUNHO NÃO CONCLUÍDO</div>' : ''}
        <div>Via do Paciente / Prontuário Médico</div>
        <div>Emissão: ${sigDateFormatted}</div>
      </div>
    </div>

    <div class="patient-box">
      <div>
        <span>Paciente: <strong>${patientName}</strong></span>
        ${patientDocument ? `<br/><span style="color:#5F6E69;">CPF: <strong>${patientDocument}</strong></span>` : ''}
      </div>
      <div style="text-align: right;">
        ${examDate ? `<span>Data do Exame: <strong>${examDate}</strong></span>` : ''}
        ${indication ? `<br/><span style="color:#5F6E69;">Indicação: ${indication}</span>` : ''}
      </div>
    </div>

    <h1 class="report-title">${title}</h1>

    <!-- Structured or free text body -->
    <div class="report-body">
      ${bodyHtml}
    </div>

    <!-- Separate Conclusion Box if provided -->
    ${
      conclusionHtml
        ? `<div class="conclusion-container">
             <div class="conclusion-title">CONCLUSÃO DIAGNÓSTICA</div>
             <div class="conclusion-body">${conclusionHtml}</div>
           </div>`
        : ''
    }

    <!-- Professional Identification Footer (strictly NOT called certificada) -->
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="author-name">${authorName}</div>
      ${crmFormatted ? `<div class="author-crm">${crmFormatted}</div>` : ''}
      ${authorTitle ? `<div class="author-title">${authorTitle}</div>` : ''}
      <div class="signature-date">Identificação profissional registrada eletronicamente em ${sigDateFormatted}</div>
    </div>
  </div>

  <!-- IMAGES SECTION (Separated into subsequent pages) -->
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
        <div>Paciente: <strong>${patientName}</strong></div>
        <div style="text-align: right;">${examDate ? `Data: <strong>${examDate}</strong>` : ''}</div>
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
    ${
      isDraft
        ? 'DOCUMENTO EM RASCUNHO — NÃO CONCLUÍDO PELO MÉDICO RESPONSÁVEL TÉCNICO.'
        : 'Documento assinado eletronicamente pelo responsável técnico. Válido como laudo médico oficial.'
    }
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
