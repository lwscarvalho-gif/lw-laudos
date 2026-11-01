import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  dailyClosingsService,
  type DailyClosingMode,
  type DailyClosingItem,
} from '@/services/dailyClosings'
import { FileCheck, UserX, Printer, Download, Save, RefreshCw, Calendar, Clock } from 'lucide-react'
import type { Appointment, Report, User } from '@/types'

interface DailyClosingPanelProps {
  clinicLocation: string
  selectedDate: string
  onDateChange: (date: string) => void
  appointments: Appointment[]
  reports: Report[]
  currentUser?: User | null
}

export function DailyClosingProductionPanel({
  clinicLocation,
  selectedDate,
  onDateChange,
  appointments,
  reports,
  currentUser,
}: DailyClosingPanelProps) {
  const { toast } = useToast()
  const [closingMode, setClosingMode] = useState<DailyClosingMode>('completo')
  const [savingClosing, setSavingClosing] = useState(false)

  // Classificação estrita: APENAS duas classificações — Laudo Finalizado e Falta do Paciente
  // Faltas ficam FORA da produção.
  const { finalizedItems, absentItems, byPhysician } = useMemo(() => {
    const finalized: DailyClosingItem[] = []
    const absent: DailyClosingItem[] = []

    // 1. Laudos finalizados do dia (Produção Real)
    reports.forEach((rep) => {
      const repDate = (rep.signature_date || rep.created || '').slice(0, 10)
      if (repDate !== selectedDate) return
      if (clinicLocation && rep.clinic_location && rep.clinic_location !== clinicLocation) return
      if (rep.status !== 'Finalizado' || rep.is_draft) return

      finalized.push({
        patient_name: rep.expand?.patient_id?.name || 'Paciente identificado',
        procedure_name:
          rep.title?.replace(/^Laudo de /i, '').trim() || rep.exam_type || 'Ultrassonografia',
        referring_physician: rep.referring_physician || 'Demanda espontânea',
        executing_doctor: rep.author_name || 'Dr. Médico Responsável',
        exam_id: rep.exam_id,
        status: 'Laudo Finalizado',
        time: rep.signature_date ? rep.signature_date.slice(11, 16) : undefined,
      })
    })

    // 2. Faltas do Paciente do dia (FORA da produção)
    appointments.forEach((appt) => {
      const apptDate = (appt.start_time || '').slice(0, 10)
      if (apptDate !== selectedDate) return
      if (clinicLocation && appt.clinic_location && appt.clinic_location !== clinicLocation) return

      // Faltas ou cancelamentos de pacientes ausentes
      if (appt.status === 'Falta' || appt.status === 'Cancelado') {
        absent.push({
          patient_name: appt.expand?.patient_id?.name || 'Paciente ausente',
          procedure_name: appt.exam_type || 'Ultrassonografia',
          referring_physician: appt.referring_physician || 'Não informado',
          executing_doctor: appt.expand?.owner_id?.name || appt.created_by_name || 'Corpo Clínico',
          appointment_id: appt.id,
          status: 'Falta do Paciente',
          time: appt.start_time ? appt.start_time.slice(11, 16) : undefined,
        })
      }
    })

    // Agregação por médico solicitante
    const physicianMap = new Map<string, { count: number; procedures: Record<string, number> }>()

    finalized.forEach((item) => {
      const doc = item.referring_physician || 'Demanda espontânea'
      const entry = physicianMap.get(doc) || { count: 0, procedures: {} }
      entry.count += 1
      entry.procedures[item.procedure_name] = (entry.procedures[item.procedure_name] || 0) + 1
      physicianMap.set(doc, entry)
    })

    const byPhysicianList = Array.from(physicianMap.entries()).map(([doc, data]) => ({
      physician: doc,
      count_finalized: data.count,
      procedures: Object.entries(data.procedures).map(([name, count]) => ({ name, count })),
    }))

    return {
      finalizedItems: finalized,
      absentItems: absent,
      byPhysician: byPhysicianList,
    }
  }, [reports, appointments, selectedDate, clinicLocation])

  // Salvar registro de fechamento oficial no PocketBase
  const handleSaveClosing = async () => {
    setSavingClosing(true)
    try {
      const record = await dailyClosingsService.saveClosing({
        clinic_location: clinicLocation || 'HM Samuel Marques dos Santos',
        closing_date: selectedDate,
        mode: closingMode,
        total_finalized: finalizedItems.length,
        total_absent: absentItems.length,
        data_json: {
          items: [...finalizedItems, ...absentItems],
          by_physician: byPhysician,
          summary: {
            total_procedures: finalizedItems.length,
            total_patients: finalizedItems.length,
            total_absent: absentItems.length,
          },
        },
        issued_by_id: currentUser?.id,
        issued_by_name: currentUser?.professional_name || currentUser?.name || 'Administrador',
        issued_by_role: currentUser?.role || 'secretaria',
      })

      toast({
        title: 'Fechamento diário registrado',
        description: `Fechamento salvo com sucesso (Versão ${record.version || 1}) para auditoria e reimpressão.`,
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao salvar fechamento',
        description: 'Não foi possível gravar o fechamento no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSavingClosing(false)
    }
  }

  // Exportação CSV
  const handleExportCSV = () => {
    const headers = [
      'Classificação',
      'Paciente',
      'Procedimento',
      'Médico Solicitante',
      'Executante',
      'Horário',
    ]
    const rows: string[] = []

    finalizedItems.forEach((i) => {
      rows.push(
        [
          `"Laudo Finalizado"`,
          `"${i.patient_name}"`,
          `"${i.procedure_name}"`,
          `"${i.referring_physician || ''}"`,
          `"${i.executing_doctor || ''}"`,
          `"${i.time || ''}"`,
        ].join(','),
      )
    })

    absentItems.forEach((i) => {
      rows.push(
        [
          `"Falta do Paciente (Fora da Produção)"`,
          `"${i.patient_name}"`,
          `"${i.procedure_name}"`,
          `"${i.referring_physician || ''}"`,
          `"${i.executing_doctor || ''}"`,
          `"${i.time || ''}"`,
        ].join(','),
      )
    })

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n')
    const encoded = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encoded)
    link.setAttribute(
      'download',
      `fechamento_producao_${clinicLocation.replace(/\s+/g, '_')}_${selectedDate}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Geração do PDF A4 nos 3 modos
  const handlePrintA4 = () => {
    const win = window.open('', '_blank')
    if (!win) return

    const emittedAt = new Date().toLocaleString('pt-BR')
    const issuerName =
      currentUser?.professional_name || currentUser?.name || 'Responsável Técnico / Secretaria'

    let contentHtml = ''

    if (closingMode === 'sintetico') {
      contentHtml = `
        <div class="summary-box">
          <h3>Resumo Sintético da Produção</h3>
          <p><strong>Total de Laudos Finalizados (Produção):</strong> <span class="highlight">${finalizedItems.length}</span></p>
          <p><strong>Total de Faltas de Pacientes (Fora da Produção):</strong> <span class="absent-count">${absentItems.length}</span></p>
        </div>
      `
    } else if (closingMode === 'solicitante') {
      contentHtml = `
        <h3>Produção Consolidada por Médico Solicitante</h3>
        <table>
          <thead>
            <tr>
              <th>Médico Solicitante</th>
              <th style="text-align: center;">Laudos Finalizados</th>
              <th>Procedimentos Realizados</th>
            </tr>
          </thead>
          <tbody>
            ${byPhysician
              .map(
                (p) => `
              <tr>
                <td><strong>${p.physician}</strong></td>
                <td style="text-align: center; font-weight: bold; color: #0C6B58;">${p.count_finalized}</td>
                <td>${p.procedures.map((proc) => `${proc.name} (${proc.count})`).join(', ')}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      `
    } else {
      // Modo Completo
      contentHtml = `
        <h3>Seção 1: Produção Realizada (Laudos Finalizados) — Total: ${finalizedItems.length}</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 10%;">Horário</th>
              <th style="width: 25%;">Paciente</th>
              <th style="width: 25%;">Procedimento</th>
              <th style="width: 20%;">Solicitante</th>
              <th style="width: 20%;">Executante</th>
            </tr>
          </thead>
          <tbody>
            ${finalizedItems.length === 0 ? '<tr><td colspan="5" style="text-align:center;">Nenhum laudo finalizado nesta data.</td></tr>' : ''}
            ${finalizedItems
              .map(
                (item) => `
              <tr>
                <td>${item.time || '—'}</td>
                <td><strong>${item.patient_name}</strong></td>
                <td>${item.procedure_name}</td>
                <td>${item.referring_physician || '—'}</td>
                <td>${item.executing_doctor || '—'}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      `
    }

    // Seção separada de Faltas (SEMPRE separada da produção)
    const absentHtml = `
      <div style="margin-top: 25px;">
        <h3 style="color: #DC2626; border-bottom: 2px solid #DC2626; padding-bottom: 4px;">
          Seção 2: Faltas do Paciente (Não Computadas na Produção) — Total: ${absentItems.length}
        </h3>
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Horário</th>
              <th style="width: 35%;">Paciente Ausente</th>
              <th style="width: 30%;">Procedimento Agendado</th>
              <th style="width: 20%;">Solicitante</th>
            </tr>
          </thead>
          <tbody>
            ${absentItems.length === 0 ? '<tr><td colspan="4" style="text-align:center;">Nenhuma falta registrada nesta data.</td></tr>' : ''}
            ${absentItems
              .map(
                (item) => `
              <tr>
                <td>${item.time || '—'}</td>
                <td><span style="color: #991B1B;">${item.patient_name}</span></td>
                <td>${item.procedure_name}</td>
                <td>${item.referring_physician || '—'}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Fechamento Diário de Produção — ${clinicLocation}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10pt; color: #1F2A27; margin: 0; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0C6B58; padding-bottom: 8px; margin-bottom: 15px; }
          .logo-area { font-size: 16pt; font-weight: bold; color: #0C6B58; }
          .meta-info { text-align: right; font-size: 8.5pt; color: #5F6E69; }
          h2 { margin: 0 0 4px 0; font-size: 14pt; color: #0C6B58; }
          h3 { font-size: 11pt; color: #0C6B58; margin: 16px 0 6px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9pt; }
          th { background: #E8F3F0; color: #0C6B58; text-align: left; padding: 6px; border: 1px solid #C8DFD7; }
          td { padding: 6px; border: 1px solid #E5E9E7; }
          tr:nth-child(even) { background: #FAFBFB; }
          .summary-box { background: #FAFBFB; border: 1px solid #E5E9E7; border-radius: 6px; padding: 12px; margin-top: 10px; font-size: 10pt; }
          .highlight { font-size: 14pt; font-weight: bold; color: #0C6B58; margin-left: 8px; }
          .absent-count { font-size: 14pt; font-weight: bold; color: #DC2626; margin-left: 8px; }
          .signature-area { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
          .sig-box { width: 45%; border-top: 1px solid #1F2A27; text-align: center; padding-top: 6px; font-size: 8.5pt; color: #5F6E69; }
          .page-footer { position: fixed; bottom: 0; left: 0; right: 0; font-size: 8pt; color: #8A9691; display: flex; justify-content: space-between; border-top: 1px solid #E5E9E7; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo-area">LW LAUDOS</div>
            <h2>Fechamento Diário de Produção</h2>
            <div style="font-size: 9.5pt; color: #5F6E69;">
              Unidade: <strong>${clinicLocation}</strong> | Modo: <strong>${closingMode.toUpperCase()}</strong>
            </div>
          </div>
          <div class="meta-info">
            <div>Data de Referência: <strong>${selectedDate.split('-').reverse().join('/')}</strong></div>
            <div>Horário de Emissão: <strong>${emittedAt}</strong></div>
            <div>Emitido por: <strong>${issuerName}</strong></div>
          </div>
        </div>

        ${contentHtml}
        ${absentHtml}

        <div class="signature-area">
          <div class="sig-box">
            <strong>Responsável pela Emissão</strong><br/>
            ${issuerName}
          </div>
          <div class="sig-box">
            <strong>Responsável Técnico / Direção Clínica</strong><br/>
            Visto e Homologação
          </div>
        </div>

        <div class="page-footer">
          <span>LW Laudos — Sistema Médico Especializado</span>
          <span>Página 1 de 1</span>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `

    win.document.write(html)
    win.document.close()
  }

  return (
    <Card className="border-[#E5E9E7] shadow-xs">
      <CardHeader className="bg-[#FAFBFB] border-b border-[#E5E9E7] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-[#1F2A27] flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#0C6B58]" />
              Fechamento Diário de Produção Médica
            </CardTitle>
            <CardDescription className="text-xs text-[#5F6E69]">
              Produção auditada com apenas duas classificações: Laudos Finalizados vs. Faltas do
              Paciente (fora da produção)
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={closingMode}
              onValueChange={(v) => setClosingMode(v as DailyClosingMode)}
            >
              <SelectTrigger className="h-8 w-36 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="completo">Modo Completo</SelectItem>
                <SelectItem value="solicitante">Por Solicitante</SelectItem>
                <SelectItem value="sintetico">Modo Sintético</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveClosing}
              disabled={savingClosing}
              className="text-xs h-8 text-[#0C6B58] border-[#0C6B58]/30"
              title="Salvar registro deste fechamento para auditoria e reimpressão"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {savingClosing ? 'Salvando...' : 'Gravar Fechamento'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-xs h-8 text-[#0C6B58]"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              CSV
            </Button>

            <Button
              size="sm"
              onClick={handlePrintA4}
              className="text-xs h-8 bg-[#0C6B58] hover:bg-[#0A5949] text-white"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Imprimir A4
            </Button>
          </div>
        </div>

        {/* Resumo da Data Selecionada */}
        <div className="flex flex-wrap items-center gap-4 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#0C6B58]" />
            <span className="font-semibold text-[#1F2A27]">Data de Fechamento:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="text-xs bg-white border border-[#E5E9E7] rounded px-2 py-0.5"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#5F6E69]">Unidade:</span>
            <strong className="text-[#0C6B58]">{clinicLocation}</strong>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Painéis Indicadores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Laudos Finalizados (Produção Real)
              </span>
              <span className="text-2xl font-bold text-emerald-700">{finalizedItems.length}</span>
            </div>
            <p className="text-[11px] text-emerald-600 mt-1">
              Computados na produção do dia da unidade selecionada.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-red-200 bg-red-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-800 uppercase flex items-center gap-1.5">
                <UserX className="w-4 h-4 text-red-600" />
                Faltas do Paciente (Fora da Produção)
              </span>
              <span className="text-2xl font-bold text-red-700">{absentItems.length}</span>
            </div>
            <p className="text-[11px] text-red-600 mt-1">
              Pacientes agendados ausentes. Não entram na produção médica.
            </p>
          </div>
        </div>

        {/* Visualização de Produção */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[#1F2A27] uppercase tracking-wider">
            Prévia de Itens ({closingMode})
          </h4>

          {closingMode === 'sintetico' && (
            <div className="p-4 border rounded-lg bg-white text-xs text-[#5F6E69] space-y-1">
              <p>
                <strong>Unidade:</strong> {clinicLocation}
              </p>
              <p>
                <strong>Data:</strong> {selectedDate}
              </p>
              <p>
                <strong>Total Produção (Laudos Finalizados):</strong>{' '}
                <span className="text-[#0C6B58] font-bold">{finalizedItems.length}</span>
              </p>
              <p>
                <strong>Total Faltas de Pacientes:</strong>{' '}
                <span className="text-red-600 font-bold">{absentItems.length}</span>
              </p>
            </div>
          )}

          {closingMode === 'solicitante' && (
            <div className="border rounded-lg overflow-hidden bg-white text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#FAFBFB] text-[#5F6E69] border-b">
                  <tr>
                    <th className="p-2.5">Médico Solicitante</th>
                    <th className="p-2.5 text-center">Laudos Finalizados</th>
                    <th className="p-2.5">Procedimentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E7]">
                  {byPhysician.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-[#8A9691]">
                        Nenhum atendimento finalizado nesta data.
                      </td>
                    </tr>
                  ) : (
                    byPhysician.map((p) => (
                      <tr key={p.physician}>
                        <td className="p-2.5 font-semibold text-[#1F2A27]">{p.physician}</td>
                        <td className="p-2.5 text-center font-bold text-[#0C6B58]">
                          {p.count_finalized}
                        </td>
                        <td className="p-2.5">
                          {p.procedures.map((proc) => `${proc.name} (${proc.count})`).join(', ')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {closingMode === 'completo' && (
            <div className="border rounded-lg overflow-hidden bg-white text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#FAFBFB] text-[#5F6E69] border-b">
                  <tr>
                    <th className="p-2.5">Horário</th>
                    <th className="p-2.5">Paciente</th>
                    <th className="p-2.5">Procedimento</th>
                    <th className="p-2.5">Solicitante</th>
                    <th className="p-2.5">Classificação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E7]">
                  {finalizedItems.map((item, idx) => (
                    <tr key={`f_${idx}`}>
                      <td className="p-2.5">{item.time || '—'}</td>
                      <td className="p-2.5 font-semibold text-[#1F2A27]">{item.patient_name}</td>
                      <td className="p-2.5">{item.procedure_name}</td>
                      <td className="p-2.5">{item.referring_physician || '—'}</td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className="border-emerald-300 text-emerald-700 bg-emerald-50 text-[10px]"
                        >
                          Laudo Finalizado
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {absentItems.map((item, idx) => (
                    <tr key={`a_${idx}`} className="bg-red-50/20">
                      <td className="p-2.5">{item.time || '—'}</td>
                      <td className="p-2.5 font-semibold text-red-900">{item.patient_name}</td>
                      <td className="p-2.5">{item.procedure_name}</td>
                      <td className="p-2.5">{item.referring_physician || '—'}</td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className="border-red-300 text-red-700 bg-red-50 text-[10px]"
                        >
                          Falta do Paciente (Fora da Produção)
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {finalizedItems.length === 0 && absentItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-[#8A9691]">
                        Nenhum atendimento registrado nesta data para a unidade.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
