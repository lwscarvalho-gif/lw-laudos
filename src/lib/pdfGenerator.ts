interface PrintReportProps {
  title: string
  patientName: string
  patientDocument?: string
  examDate?: string
  bodyHtml: string
  authorName: string
  authorCrm?: string
  authorCrmUf?: string
  authorTitle?: string
  headerText?: string
  signatureDate?: string
}

export function printReportPDF({
  title,
  patientName,
  patientDocument,
  examDate,
  bodyHtml,
  authorName,
  authorCrm,
  authorCrmUf,
  authorTitle,
  headerText,
  signatureDate,
}: PrintReportProps) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Permita popups neste navegador para baixar/imprimir o laudo em PDF.')
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

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${title} - ${patientName}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: Georgia, 'Times New Roman', Times, serif;
      color: #1F2A27;
      background: #ffffff;
      margin: 0;
      padding: 0;
      line-height: 1.6;
      font-size: 11pt;
    }
    .header {
      border-bottom: 2px solid #0C6B58;
      padding-bottom: 12px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-clinic {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      color: #5F6E69;
      white-space: pre-line;
    }
    .header-meta {
      text-align: right;
      font-family: 'Inter', sans-serif;
      font-size: 9pt;
      color: #8A9691;
    }
    .patient-box {
      font-family: 'Inter', sans-serif;
      background: #F7F9F8;
      border: 1px solid #E5E9E7;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      font-size: 10pt;
    }
    .patient-box strong {
      color: #1F2A27;
    }
    .report-title {
      font-family: 'Inter', sans-serif;
      font-size: 16pt;
      font-weight: bold;
      color: #0C6B58;
      margin-top: 0;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .report-body {
      min-height: 480px;
    }
    .report-body h1, .report-body h2, .report-body h3 {
      font-family: 'Inter', sans-serif;
      color: #1F2A27;
      margin-top: 18px;
      margin-bottom: 8px;
    }
    .report-body h1 { font-size: 14pt; }
    .report-body h2 { font-size: 12pt; }
    .report-body h3 { font-size: 11pt; }
    .signature-block {
      margin-top: 48px;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .signature-line {
      width: 280px;
      border-top: 1px solid #1F2A27;
      margin-bottom: 8px;
    }
    .author-name {
      font-family: 'Inter', sans-serif;
      font-size: 11pt;
      font-weight: bold;
      color: #1F2A27;
    }
    .author-crm {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      color: #0C6B58;
      font-weight: 600;
    }
    .author-title {
      font-family: 'Inter', sans-serif;
      font-size: 9pt;
      color: #5F6E69;
    }
    .signature-date {
      font-family: 'Inter', sans-serif;
      font-size: 9pt;
      color: #8A9691;
      margin-top: 4px;
    }
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #8A9691;
      border-top: 1px solid #E5E9E7;
      padding-top: 6px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-clinic">
      ${headerText ? headerText.replace(/\n/g, '<br/>') : '<strong>Sistema Médico Multiperfil</strong><br/>Diagnóstico por Imagem e Laudos Especializados'}
    </div>
    <div class="header-meta">
      Via do Paciente / Prontuário Médico
    </div>
  </div>

  <div class="patient-box">
    <div>
      <span>Paciente: <strong>${patientName}</strong></span>
      ${patientDocument ? ` • CPF: <strong>${patientDocument}</strong>` : ''}
    </div>
    ${examDate ? `<div>Data do Exame: <strong>${examDate}</strong></div>` : ''}
  </div>

  <h1 class="report-title">${title}</h1>

  <div class="report-body">
    ${bodyHtml}
  </div>

  <div class="signature-block">
    <div class="signature-line"></div>
    <div class="author-name">${authorName}</div>
    ${crmFormatted ? `<div class="author-crm">${crmFormatted}</div>` : ''}
    ${authorTitle ? `<div class="author-title">${authorTitle}</div>` : ''}
    <div class="signature-date">Assinado eletronicamente em ${sigDateFormatted}</div>
  </div>

  <div class="footer">
    Documento assinado digitalmente pelo profissional responsável. Válido como laudo médico oficial.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
