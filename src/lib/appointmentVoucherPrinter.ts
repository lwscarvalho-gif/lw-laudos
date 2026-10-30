/**
 * Gerador de HTML e acionador de impressão dedicado para o Comprovante de Agendamento do Paciente.
 * Garante compatibilidade 100% à prova de falhas:
 * 1. Usa janela/iframe dedicado com documento HTML isolado (sem interferência de overlays de modais,
 *    overflow do viewport pai, quebras de página por Tailwind ou regras de visibilidade de SPAs).
 * 2. Estilos 100% auto-contidos em CSS print inline, com @page A4 portrait, margens calculadas e
 *    renderização de cores garantida (-webkit-print-color-adjust: exact).
 * 3. Enquadramento perfeito em 1 página A4 sem cortes e sem folhas em branco.
 */

import { Appointment, Patient } from '@/types'
import { formatCuiabaDate, formatCuiabaTime } from '@/lib/formatters'
import { PRELIMINARY_VERSION_DISCLAIMER } from '@/lib/pdfGenerator'

export interface AppointmentVoucherData {
  appointment: Appointment
  patient?: Patient | null
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildAppointmentVoucherHTML(data: AppointmentVoucherData): string {
  const { appointment, patient } = data

  const resolvedPatientName =
    patient?.name ||
    appointment.expand?.patient_id?.name ||
    appointment.patient_name_dicom ||
    'Paciente'
  const resolvedPatientDoc =
    patient?.document ||
    appointment.expand?.patient_id?.document ||
    appointment.patient_id_dicom ||
    ''
  const resolvedSusCard = patient?.sus_card || appointment.expand?.patient_id?.sus_card || ''
  const resolvedPhone = patient?.phone || appointment.expand?.patient_id?.phone || ''
  const resolvedAddress = patient?.address || appointment.expand?.patient_id?.address || ''

  const appointmentDate = appointment.start_time ? formatCuiabaDate(appointment.start_time) : ''
  const appointmentTime = appointment.start_time ? formatCuiabaTime(appointment.start_time) : ''
  const duration = appointment.duration_minutes || 30

  const patientFirstName = resolvedPatientName.trim().split(' ')[0] || 'Paciente'
  const clinicLocation = appointment.clinic_location || 'Clínica de Atendimento'
  const isHospitalSamuel = clinicLocation.toLowerCase().includes('samuel')

  const now = new Date()
  const issuedDateStr = now.toLocaleDateString('pt-BR')
  const issuedTimeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const examTypeLower = (appointment.exam_type || '').toLowerCase()
  const isObstetric =
    examTypeLower.includes('obstétric') ||
    examTypeLower.includes('morfológic') ||
    examTypeLower.includes('gesta')

  const notesContent =
    appointment.notes && appointment.notes.trim()
      ? escapeHtml(appointment.notes.trim())
      : 'Pedimos a gentileza de chegar cerca de 15 minutos antes do horário marcado, trazendo seus documentos e exames anteriores. Não é necessário jejum ou preparo especial, apenas mantenha sua hidratação habitual.'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comprovante de Agendamento — ${escapeHtml(resolvedPatientName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #1F2A27;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.35;
    }

    body {
      padding: 0;
    }

    .voucher-sheet {
      width: 100%;
      max-width: 100%;
      background: #ffffff;
      margin: 0 auto;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Cabeçalho */
    .header {
      border-bottom: 2.5px solid #0C6B58;
      padding-bottom: 8px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .header-sub {
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #0C6B58;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .header-title {
      font-size: 14pt;
      font-weight: 800;
      color: #1F2A27;
      margin: 0;
      line-height: 1.2;
    }

    .header-sus-tag {
      font-size: 8.5pt;
      color: #5F6E69;
      margin-top: 3px;
    }

    .header-accession {
      text-align: right;
    }

    .accession-label {
      font-size: 7pt;
      text-transform: uppercase;
      color: #71827C;
      font-family: monospace;
      display: block;
    }

    .accession-code {
      font-size: 10pt;
      font-family: monospace;
      font-weight: 700;
      color: #0C6B58;
      background: #E8F3F0;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 2px;
    }

    /* Mensagem calorosa */
    .welcome-card {
      background: #F0F7F4;
      border: 1px solid #CDE3DA;
      border-radius: 7px;
      padding: 8px 12px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .welcome-text-title {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0C6B58;
      margin: 0;
    }

    .welcome-text-desc {
      font-size: 8.5pt;
      color: #3B4B46;
      margin: 1px 0 0 0;
    }

    .welcome-badge {
      font-size: 8pt;
      font-weight: 600;
      color: #0C6B58;
      background: #ffffff;
      padding: 3px 8px;
      border-radius: 5px;
      border: 1px solid #CDE3DA;
      white-space: nowrap;
    }

    /* Grid Destaque: Data, Hora, Local */
    .highlight-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1.2fr;
      gap: 8px;
      background: #F4F8F6;
      border: 1px solid #D5E5DE;
      border-radius: 7px;
      padding: 8px 10px;
      margin-bottom: 10px;
    }

    .highlight-col {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .highlight-icon-box {
      width: 28px;
      height: 28px;
      background: #ffffff;
      border: 1px solid #D5E5DE;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0C6B58;
      font-weight: bold;
      font-size: 11pt;
      flex-shrink: 0;
    }

    .highlight-meta-label {
      font-size: 7pt;
      text-transform: uppercase;
      font-weight: 600;
      color: #5F6E69;
      display: block;
      line-height: 1.1;
    }

    .highlight-meta-value {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1F2A27;
      display: block;
      line-height: 1.2;
    }

    .highlight-meta-duration {
      font-size: 8pt;
      font-weight: 400;
      color: #5F6E69;
    }

    /* Duas Colunas: Paciente e Procedimento */
    .two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    }

    .info-card {
      background: #ffffff;
      border: 1px solid #E5E9E7;
      border-radius: 7px;
      padding: 8px 10px;
    }

    .info-card-title {
      font-size: 7.5pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #5F6E69;
      margin-bottom: 4px;
      display: block;
      letter-spacing: 0.05em;
    }

    .patient-main-name {
      font-size: 10pt;
      font-weight: 700;
      color: #1F2A27;
      margin-bottom: 3px;
    }

    .info-line {
      font-size: 8.5pt;
      color: #4F5E59;
      margin: 2px 0;
    }

    .info-line strong {
      color: #1F2A27;
    }

    .exam-name {
      font-size: 10pt;
      font-weight: 700;
      color: #0C6B58;
      margin-bottom: 3px;
    }

    .scheduled-by-line {
      border-top: 1px solid #F0F2F1;
      padding-top: 4px;
      margin-top: 4px;
      font-size: 7.5pt;
      color: #5F6E69;
    }

    /* Preparo Clínico em Destaque */
    .prep-box {
      border: 2px solid #0C6B58;
      background: #F7FAF9;
      border-radius: 7px;
      padding: 9px 12px;
      margin-bottom: 10px;
    }

    .prep-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0C6B58;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .prep-body {
      background: #ffffff;
      border: 1px solid #D5E2DC;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 8.5pt;
      color: #1F2A27;
      line-height: 1.4;
      font-weight: 500;
      white-space: pre-wrap;
    }

    .prep-tip {
      font-size: 7.8pt;
      color: #4F5E59;
      margin-top: 5px;
      line-height: 1.3;
    }

    .prep-tip strong {
      color: #0C6B58;
    }

    /* O Que Trazer */
    .docs-box {
      border: 1px solid #D5DED9;
      background: #ffffff;
      border-radius: 7px;
      padding: 9px 12px;
      margin-bottom: 10px;
    }

    .docs-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0C6B58;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }

    .docs-list {
      margin: 0;
      padding-left: 16px;
      font-size: 8pt;
      color: #33423E;
      line-height: 1.35;
    }

    .docs-list li {
      margin-bottom: 3px;
    }

    .docs-list li:last-child {
      margin-bottom: 0;
    }

    .docs-list strong {
      color: #1F2A27;
    }

    .docs-alert-item {
      color: #0C6B58;
      font-weight: 500;
    }

    /* Rodapé */
    .footer {
      border-top: 1px solid #E5E9E7;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #8A9691;
    }

    .preliminary-tag {
      font-size: 7pt;
      font-weight: 500;
      color: #5F6E69;
    }

    /* No modo de tela cheia/impressão sem cortes */
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .voucher-sheet {
        box-shadow: none !important;
        border: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="voucher-sheet">
    <!-- Cabeçalho -->
    <div class="header">
      <div>
        <div class="header-sub">Comprovante de Agendamento de Exame</div>
        <h1 class="header-title">${escapeHtml(clinicLocation)}</h1>
        ${
          isHospitalSamuel
            ? '<div class="header-sus-tag">Prefeitura Municipal de Mirante da Serra — Sistema Único de Saúde (SUS)</div>'
            : ''
        }
      </div>
      <div class="header-accession">
        <span class="accession-label">Accession Number</span>
        <span class="accession-code">${escapeHtml(appointment.accession_number || 'N/A')}</span>
      </div>
    </div>

    <!-- Mensagem calorosa -->
    <div class="welcome-card">
      <div>
        <p class="welcome-text-title">Olá, ${escapeHtml(patientFirstName)}! Estamos à sua espera.</p>
        <p class="welcome-text-desc">Seu exame foi agendado com carinho e nossa equipe está pronta para acolher você.</p>
      </div>
      <div class="welcome-badge">✦ Cuidado e dedicação</div>
    </div>

    <!-- Destaque: Data, Hora e Local -->
    <div class="highlight-grid">
      <div class="highlight-col">
        <div class="highlight-icon-box">📅</div>
        <div>
          <span class="highlight-meta-label">Data do Exame</span>
          <span class="highlight-meta-value">${escapeHtml(appointmentDate)}</span>
        </div>
      </div>
      <div class="highlight-col">
        <div class="highlight-icon-box">⏰</div>
        <div>
          <span class="highlight-meta-label">Horário Previsto</span>
          <span class="highlight-meta-value">${escapeHtml(appointmentTime)} <span class="highlight-meta-duration">(${duration} min)</span></span>
        </div>
      </div>
      <div class="highlight-col">
        <div class="highlight-icon-box">📍</div>
        <div>
          <span class="highlight-meta-label">Local de Atendimento</span>
          <span class="highlight-meta-value" style="font-size: 8.5pt; word-break: break-word;">${escapeHtml(clinicLocation)}</span>
        </div>
      </div>
    </div>

    <!-- Dados do Paciente e Procedimento -->
    <div class="two-cols">
      <div class="info-card">
        <span class="info-card-title">Dados do Paciente</span>
        <div class="patient-main-name">${escapeHtml(resolvedPatientName)}</div>
        ${
          resolvedPatientDoc
            ? `<div class="info-line"><strong>CPF/Doc:</strong> ${escapeHtml(resolvedPatientDoc)}</div>`
            : ''
        }
        ${
          isHospitalSamuel && resolvedSusCard
            ? `<div class="info-line"><strong>Cartão SUS:</strong> ${escapeHtml(resolvedSusCard)}</div>`
            : ''
        }
        ${
          resolvedPhone
            ? `<div class="info-line"><strong>Contato:</strong> ${escapeHtml(resolvedPhone)}</div>`
            : ''
        }
        ${
          resolvedAddress
            ? `<div class="info-line"><strong>Endereço:</strong> ${escapeHtml(resolvedAddress)}</div>`
            : ''
        }
      </div>

      <div class="info-card">
        <span class="info-card-title">Procedimento e Atendimento</span>
        <div class="exam-name">${escapeHtml(appointment.exam_type || 'Exame de Imagem')}</div>
        ${
          appointment.referring_physician
            ? `<div class="info-line"><strong>Médico Solicitante:</strong> ${escapeHtml(appointment.referring_physician)}</div>`
            : ''
        }
        <div class="info-line"><strong>Status:</strong> ${escapeHtml(appointment.status || 'Agendado')}</div>
        ${
          appointment.created_by_name || appointment.created_by_role
            ? `<div class="scheduled-by-line"><strong>Agendado com carinho por:</strong> ${escapeHtml(appointment.created_by_name || 'Profissional da Equipe')}${
                appointment.created_by_role ? ` (${escapeHtml(appointment.created_by_role)})` : ''
              }</div>`
            : ''
        }
      </div>
    </div>

    <!-- Orientação e Preparo Clínico -->
    <div class="prep-box">
      <div class="prep-title">ℹ Como se Preparar para o Seu Exame</div>
      <div class="prep-body">${notesContent}</div>
      <div class="prep-tip">
        <strong>Dica importante:</strong> Seguir com carinho estas orientações garante que seu exame tenha imagens bem nítidas e um resultado seguro. Qualquer dúvida, contate a clínica com antecedência.
      </div>
    </div>

    <!-- O Que Trazer -->
    <div class="docs-box">
      <div class="docs-title">O Que Trazer no Dia do Exame</div>
      <ul class="docs-list">
        <li><strong>Documento oficial com foto:</strong> RG ou CNH original (do paciente ou responsável legal em menores).</li>
        ${
          isHospitalSamuel
            ? '<li><strong>Cartão do SUS (CNS):</strong> obrigatório para atendimento pelo SUS no HM Samuel Marques dos Santos, juntamente com comprovante de residência atualizado.</li>'
            : '<li><strong>Cartão do Convênio (se houver):</strong> carteirinha física ou digital atualizada do plano de saúde, caso atendimento seja conveniado.</li>'
        }
        <li><strong>Pedido / Solicitação médica original:</strong> com carimbo e assinatura legível do médico solicitante.</li>
        <li><strong>Exames anteriores da mesma região:</strong> ultrassonografias, tomografias ou exames laboratoriais anteriores para estudo comparativo essencial.</li>
        ${
          isObstetric
            ? '<li class="docs-alert-item"><strong>Caderneta da Gestante / Pré-natal:</strong> não se esqueça de trazer sua caderneta e os ultrassons anteriores desta gestação.</li>'
            : ''
        }
      </ul>
    </div>

    <!-- Rodapé -->
    <div class="footer">
      <div>
        <span>LW Laudos — Sistema Médico de Laudos e Agendamento</span>
        <span> • </span>
        <span>Emissão em: ${issuedDateStr} às ${issuedTimeStr}</span>
      </div>
      <div class="preliminary-tag">
        🛡 ${escapeHtml(PRELIMINARY_VERSION_DISCLAIMER)}
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Dispara a impressão física ou salvamento em PDF do comprovante.
 * Tenta primeiro abrir uma popup/janela limpa e autocontida.
 * Se popups estiverem bloqueadas, recorre a um iframe oculto sem interferência na tela principal.
 */
export function printAppointmentVoucher(data: AppointmentVoucherData): void {
  const html = buildAppointmentVoucherHTML(data)

  // Tentativa 1: Abrir janela de impressão dedicada
  const printWindow = window.open('', '_blank', 'width=840,height=960')
  if (printWindow && !printWindow.closed) {
    try {
      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        try {
          printWindow.print()
        } catch (e) {
          console.warn('Falha ao acionar print na janela:', e)
        }
      }, 350)
      return
    } catch (e) {
      console.warn('Falha ao escrever na janela de impressão:', e)
    }
  }

  // Tentativa 2: Iframe oculto direto no documento (à prova de bloqueador de popup)
  const existingFrame = document.getElementById('appointment-voucher-print-frame')
  if (existingFrame) {
    existingFrame.remove()
  }

  const iframe = document.createElement('iframe')
  iframe.id = 'appointment-voucher-print-frame'
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'

  document.body.appendChild(iframe)

  const frameDoc = iframe.contentWindow?.document || iframe.contentDocument
  if (frameDoc) {
    frameDoc.open()
    frameDoc.write(html)
    frameDoc.close()
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (e) {
        console.warn('Falha no fallback de impressão via iframe:', e)
        window.print()
      } finally {
        setTimeout(() => {
          iframe.remove()
        }, 3000)
      }
    }, 350)
  } else {
    // Fallback final
    window.print()
  }
}
