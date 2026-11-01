import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, FileText, Filter, Users, TrendingUp, Calendar, Search } from 'lucide-react'
import type { Report } from '@/types'
import type { ClinicProcedure } from '@/services/clinicManagement'

interface ReferringReportItem {
  physician: string
  finalizedCount: number
  procedures: Record<string, number>
  monthlyCount: Record<string, number> // YYYY-MM -> count
  clinicLocations: Set<string>
  executingDoctors: Set<string>
}

interface ReferringReportProps {
  reports: Report[]
  procedures: ClinicProcedure[]
  clinicLocation: string
}

export function ReferringPhysiciansReportPanel({
  reports,
  procedures,
  clinicLocation,
}: ReferringReportProps) {
  const [filterPhysician, setFilterPhysician] = useState('')
  const [filterProcedure, setFilterProcedure] = useState('ALL')
  const [filterExecutor, setFilterExecutor] = useState('ALL')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  // Lista de executantes únicos
  const executingDoctorsList = useMemo(() => {
    const set = new Set<string>()
    reports.forEach((r) => {
      if (r.author_name) set.add(r.author_name)
    })
    return Array.from(set).sort()
  }, [reports])

  // Processamento e agregação dos dados (sem dados sensíveis de pacientes)
  const reportData = useMemo(() => {
    // Apenas laudos finalizados
    const finalized = reports.filter((r) => r.status === 'Finalizado' && !r.is_draft)

    const map = new Map<string, ReferringReportItem>()

    finalized.forEach((rep) => {
      // Filtros
      if (clinicLocation && rep.clinic_location && rep.clinic_location !== clinicLocation) {
        return
      }

      const physicianName = rep.referring_physician?.trim() || 'Não informado / Demanda espontânea'
      if (filterPhysician.trim()) {
        const normFilter = filterPhysician
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
        const normTarget = physicianName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
        if (!normTarget.includes(normFilter)) return
      }

      const procName =
        rep.title?.replace(/^Laudo de /i, '').trim() || rep.exam_type || 'Ultrassonografia'
      if (
        filterProcedure !== 'ALL' &&
        !procName.toLowerCase().includes(filterProcedure.toLowerCase())
      ) {
        return
      }

      if (filterExecutor !== 'ALL' && rep.author_name !== filterExecutor) {
        return
      }

      const repDate = rep.signature_date || rep.created || ''
      if (filterStartDate && repDate && repDate.slice(0, 10) < filterStartDate) {
        return
      }
      if (filterEndDate && repDate && repDate.slice(0, 10) > filterEndDate) {
        return
      }

      const monthKey = repDate ? repDate.slice(0, 7) : 'Indefinido'

      let item = map.get(physicianName)
      if (!item) {
        item = {
          physician: physicianName,
          finalizedCount: 0,
          procedures: {},
          monthlyCount: {},
          clinicLocations: new Set<string>(),
          executingDoctors: new Set<string>(),
        }
        map.set(physicianName, item)
      }

      item.finalizedCount += 1
      item.procedures[procName] = (item.procedures[procName] || 0) + 1
      item.monthlyCount[monthKey] = (item.monthlyCount[monthKey] || 0) + 1
      if (rep.clinic_location) item.clinicLocations.add(rep.clinic_location)
      if (rep.author_name) item.executingDoctors.add(rep.author_name)
    })

    return Array.from(map.values()).sort((a, b) => b.finalizedCount - a.finalizedCount)
  }, [
    reports,
    clinicLocation,
    filterPhysician,
    filterProcedure,
    filterExecutor,
    filterStartDate,
    filterEndDate,
  ])

  const totalReportsCount = useMemo(() => {
    return reportData.reduce((acc, curr) => acc + curr.finalizedCount, 0)
  }, [reportData])

  const handleExportCSV = () => {
    const headers = [
      'Médico Solicitante',
      'Nº Laudos Finalizados',
      'Procedimentos e Quantidades',
      'Unidades',
      'Executantes',
    ]
    const rows = reportData.map((item) => {
      const procStr = Object.entries(item.procedures)
        .map(([p, c]) => `${p} (${c})`)
        .join('; ')
      return [
        `"${item.physician}"`,
        item.finalizedCount,
        `"${procStr}"`,
        `"${Array.from(item.clinicLocations).join(', ')}"`,
        `"${Array.from(item.executingDoctors).join(', ')}"`,
      ].join(',')
    })

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n')
    const encoded = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encoded)
    link.setAttribute(
      'download',
      `relatorio_origem_solicitacoes_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPDF = () => {
    const win = window.open('', '_blank')
    if (!win) return

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Relatório de Origem das Solicitações — LW Laudos</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11pt; color: #1F2A27; margin: 30px; }
          h1 { color: #0C6B58; font-size: 16pt; margin-bottom: 4px; }
          .header { border-bottom: 2px solid #0C6B58; padding-bottom: 10px; margin-bottom: 16px; }
          .meta { font-size: 9pt; color: #5F6E69; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 9.5pt; }
          th { background: #E8F3F0; color: #0C6B58; text-align: left; padding: 8px; border: 1px solid #C8DFD7; }
          td { padding: 8px; border: 1px solid #E5E9E7; vertical-align: top; }
          tr:nth-child(even) { background: #FAFBFB; }
          .badge { display: inline-block; background: #E8F3F0; color: #0C6B58; padding: 2px 6px; border-radius: 4px; font-size: 8pt; margin: 1px; }
          .footer { margin-top: 30px; border-top: 1px solid #E5E9E7; padding-top: 8px; font-size: 8.5pt; color: #8A9691; text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>LW Laudos — Relatório de Origem das Solicitações</h1>
          <div class="meta">
            Unidade: <strong>${clinicLocation || 'Todas as Unidades'}</strong> |
            Data de Emissão: <strong>${new Date().toLocaleString('pt-BR')}</strong> |
            Total de Laudos: <strong>${totalReportsCount}</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Médico Solicitante</th>
              <th style="width: 12%; text-align: center;">Laudos Finalizados</th>
              <th style="width: 45%;">Procedimentos Realizados</th>
              <th style="width: 18%;">Evolução Mensal</th>
            </tr>
          </thead>
          <tbody>
            ${reportData
              .map(
                (item) => `
              <tr>
                <td><strong>${item.physician}</strong></td>
                <td style="text-align: center; font-weight: bold; color: #0C6B58;">${item.finalizedCount}</td>
                <td>
                  ${Object.entries(item.procedures)
                    .map(
                      ([proc, cnt]) =>
                        `<span class="badge">${proc}: <strong>${cnt}</strong></span>`,
                    )
                    .join(' ')}
                </td>
                <td style="font-size: 8.5pt;">
                  ${Object.entries(item.monthlyCount)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([m, c]) => `${m}: ${c}`)
                    .join('<br/>')}
                </td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          Relatório gerado em conformidade com a LGPD (sem exposição de dados sensíveis de pacientes).
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
              <Users className="w-4 h-4 text-[#0C6B58]" />
              Relatório de Origem das Solicitações (Médicos Solicitantes)
            </CardTitle>
            <CardDescription className="text-xs text-[#5F6E69]">
              Consolidado de encaminhamentos, procedimentos solicitados e evolução mensal (sem dados
              de pacientes)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
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
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="text-xs h-8 text-[#0C6B58]"
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Imprimir / PDF
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-3">
          <div className="relative">
            <Input
              value={filterPhysician}
              onChange={(e) => setFilterPhysician(e.target.value)}
              placeholder="Filtrar solicitante..."
              className="text-xs h-8 pl-7 bg-white"
            />
            <Search className="w-3.5 h-3.5 text-[#8A9691] absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <Select value={filterProcedure} onValueChange={setFilterProcedure}>
            <SelectTrigger className="h-8 text-xs bg-white">
              <SelectValue placeholder="Procedimento" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="ALL">Todos os Procedimentos</SelectItem>
              {procedures.map((p) => (
                <SelectItem key={p.id} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterExecutor} onValueChange={setFilterExecutor}>
            <SelectTrigger className="h-8 text-xs bg-white">
              <SelectValue placeholder="Médico Executante" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="ALL">Todos os Executantes</SelectItem>
              {executingDoctorsList.map((doc) => (
                <SelectItem key={doc} value={doc}>
                  {doc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="text-xs h-8 bg-white"
              title="Data inicial"
            />
            <span className="text-xs text-[#8A9691]">até</span>
            <Input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="text-xs h-8 bg-white"
              title="Data final"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAFBFB] text-[#5F6E69] border-b border-[#E5E9E7]">
              <tr>
                <th className="p-3">Médico Solicitante</th>
                <th className="p-3 text-center">Laudos Finalizados</th>
                <th className="p-3">Procedimentos e Quantidades</th>
                <th className="p-3">Evolução Mensal Recente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9E7]">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-[#8A9691]">
                    Nenhum laudo finalizado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                reportData.map((item) => (
                  <tr key={item.physician} className="hover:bg-[#FAFBFB]">
                    <td className="p-3 font-semibold text-[#1F2A27]">{item.physician}</td>
                    <td className="p-3 text-center font-bold text-[#0C6B58] text-sm">
                      {item.finalizedCount}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(item.procedures).map(([proc, cnt]) => (
                          <span
                            key={proc}
                            className="bg-[#E8F3F0] text-[#0C6B58] px-2 py-0.5 rounded text-[11px] font-medium"
                          >
                            {proc}: <strong>{cnt}</strong>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-[11px] text-[#5F6E69]">
                      {Object.entries(item.monthlyCount)
                        .slice(0, 3)
                        .map(([m, c]) => `${m}: ${c}`)
                        .join(' • ')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
