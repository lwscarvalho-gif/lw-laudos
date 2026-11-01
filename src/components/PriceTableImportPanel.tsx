import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  clinicManagementService,
  type ClinicProcedure,
  type ProcedureCategory,
} from '@/services/clinicManagement'
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react'

interface ParsedRow {
  index: number
  rawCode: string
  rawName: string
  rawCategory: string
  rawPricePix: number
  rawPriceCardCash: number
  rawPriceCardInstallment: number
  rawDuration: number
  isValid: boolean
  error?: string
  isDuplicate: boolean
  action: 'cadastrar' | 'atualizar' | 'ignorar'
  existingId?: string
}

interface PriceTableImportPanelProps {
  clinicLocation: string
  existingProcedures: ClinicProcedure[]
  onImportCompleted: () => void
}

export function PriceTableImportPanel({
  clinicLocation,
  existingProcedures,
  onImportCompleted,
}: PriceTableImportPanelProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [summaryResult, setSummaryResult] = useState<{
    created: number
    updated: number
    rejected: Array<{ index: number; reason: string }>
  } | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setAnalyzing(true)
    setSummaryResult(null)

    try {
      const text = await file.text()
      // Quebra linhas
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (lines.length < 2) {
        throw new Error('O arquivo CSV deve conter um cabeçalho e pelo menos uma linha de dados.')
      }

      // Detecção de delimitador: vírgula ou ponto-e-vírgula
      const headerLine = lines[0]
      const delimiter = headerLine.includes(';') ? ';' : ','
      const headerCols = headerLine.split(delimiter).map((c) => c.trim().toLowerCase())

      // Mapeamento de colunas
      const codeIdx = headerCols.findIndex((c) => c.includes('cod') || c.includes('código'))
      const nameIdx = headerCols.findIndex((c) => c.includes('nome') || c.includes('procedimento'))
      const catIdx = headerCols.findIndex((c) => c.includes('categ') || c.includes('grupo'))
      const pixIdx = headerCols.findIndex(
        (c) => c.includes('pix') || c.includes('dinheiro') || c.includes('vista'),
      )
      const cardCashIdx = headerCols.findIndex(
        (c) => c.includes('cartao_vista') || (c.includes('cartão') && c.includes('vista')),
      )
      const cardInstIdx = headerCols.findIndex(
        (c) => c.includes('parcel') || c.includes('cartao_parc'),
      )
      const durIdx = headerCols.findIndex(
        (c) => c.includes('duracao') || c.includes('duração') || c.includes('min'),
      )

      if (nameIdx === -1) {
        throw new Error('Coluna obrigatória "Nome" ou "Procedimento" não encontrada no cabeçalho.')
      }

      const rows: ParsedRow[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const cols = line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim())
        const rawName = cols[nameIdx] || ''
        const rawCode = codeIdx !== -1 ? cols[codeIdx] || '' : ''
        const rawCategory = catIdx !== -1 ? cols[catIdx] || 'abdome' : 'abdome'

        const parseMoney = (val?: string) => {
          if (!val) return 0
          const clean = val.replace(/[R$\s]/g, '').replace(',', '.')
          const n = parseFloat(clean)
          return isNaN(n) ? 0 : n
        }

        const rawPricePix = pixIdx !== -1 ? parseMoney(cols[pixIdx]) : 200
        const rawPriceCardCash =
          cardCashIdx !== -1 ? parseMoney(cols[cardCashIdx]) : rawPricePix * 1.15
        const rawPriceCardInstallment =
          cardInstIdx !== -1 ? parseMoney(cols[cardInstIdx]) : rawPricePix * 1.25
        const rawDuration = durIdx !== -1 ? parseInt(cols[durIdx], 10) || 20 : 20

        // Validação
        let isValid = true
        let error: string | undefined = undefined

        if (!rawName) {
          isValid = false
          error = 'Nome do procedimento está vazio'
        } else if (rawPricePix <= 0) {
          isValid = false
          error = 'Valor de PIX/Dinheiro deve ser maior que zero'
        }

        // Detecção de duplicidade com a tabela existente
        const normName = rawName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
        const existing = existingProcedures.find((p) => {
          const pNorm = p.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
          return pNorm === normName || (rawCode && p.internal_code && p.internal_code === rawCode)
        })

        const isDuplicate = Boolean(existing)
        const action: 'cadastrar' | 'atualizar' | 'ignorar' = !isValid
          ? 'ignorar'
          : isDuplicate
            ? 'atualizar'
            : 'cadastrar'

        rows.push({
          index: i,
          rawCode,
          rawName,
          rawCategory,
          rawPricePix,
          rawPriceCardCash,
          rawPriceCardInstallment,
          rawDuration,
          isValid,
          error,
          isDuplicate,
          action,
          existingId: existing?.id,
        })
      }

      setParsedRows(rows)
    } catch (err: unknown) {
      console.error(err)
      toast({
        title: 'Erro ao ler arquivo',
        description: err instanceof Error ? err.message : 'Arquivo inválido.',
        variant: 'destructive',
      })
      setParsedRows([])
    } finally {
      setAnalyzing(false)
    }
  }

  const handleExecuteImport = async () => {
    setImporting(true)
    let createdCount = 0
    let updatedCount = 0
    const rejectedList: Array<{ index: number; reason: string }> = []

    try {
      for (const row of parsedRows) {
        if (!row.isValid || row.action === 'ignorar') {
          rejectedList.push({ index: row.index, reason: row.error || 'Linha ignorada ou inválida' })
          continue
        }

        const rawCat = row.rawCategory.toLowerCase()
        let validCat: ProcedureCategory = 'geral'
        if (rawCat === 'abdome') validCat = 'abdome'
        else if (rawCat === 'tireoide' || rawCat.includes('cervical')) validCat = 'tireoide'
        else if (rawCat.includes('articul') || rawCat.includes('musculo')) validCat = 'articulacoes'
        else if (rawCat.includes('partes_moles') || rawCat.includes('moles'))
          validCat = 'partes_moles'
        else if (rawCat.includes('doppler') || rawCat.includes('vascular')) validCat = 'doppler'
        else if (rawCat.includes('obstetr') || rawCat.includes('pelvic')) validCat = 'obstetricia'

        try {
          if (row.action === 'atualizar' && row.existingId) {
            // Preserva histórico: o PocketBase mantém updated e histórico de pagamentos passados
            await clinicManagementService.saveProcedure({
              id: row.existingId,
              price_pix_cash: row.rawPricePix,
              price_card_cash: row.rawPriceCardCash,
              price_card_installment: row.rawPriceCardInstallment,
              default_duration_minutes: row.rawDuration,
              internal_code: row.rawCode || undefined,
            })
            updatedCount++
          } else if (row.action === 'cadastrar') {
            await clinicManagementService.saveProcedure({
              clinic_location: clinicLocation || 'HM Samuel Marques dos Santos',
              name: row.rawName,
              internal_code: row.rawCode || undefined,
              category: validCat,
              price_pix_cash: row.rawPricePix,
              price_card_cash: row.rawPriceCardCash,
              price_card_installment: row.rawPriceCardInstallment,
              default_duration_minutes: row.rawDuration,
              is_active: true,
            })
            createdCount++
          }
        } catch (procErr: unknown) {
          rejectedList.push({
            index: row.index,
            reason: procErr instanceof Error ? procErr.message : 'Falha ao salvar no banco',
          })
        }
      }

      setSummaryResult({
        created: createdCount,
        updated: updatedCount,
        rejected: rejectedList,
      })

      toast({
        title: 'Importação concluída',
        description: `${createdCount} cadastrados, ${updatedCount} atualizados, ${rejectedList.length} rejeitados.`,
      })

      onImportCompleted()
      setConfirmModalOpen(false)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Falha durante importação',
        description: 'Ocorreu um erro no processo de gravação.',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  const validRows = parsedRows.filter((r) => r.isValid)
  const toCreateCount = validRows.filter((r) => r.action === 'cadastrar').length
  const toUpdateCount = validRows.filter((r) => r.action === 'atualizar').length
  const invalidCount = parsedRows.length - validRows.length

  return (
    <Card className="border-[#E5E9E7] shadow-xs">
      <CardHeader className="bg-[#FAFBFB] border-b border-[#E5E9E7] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-[#1F2A27] flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#0C6B58]" />
              Importação de Tabela de Preços (CSV / Planilha)
            </CardTitle>
            <CardDescription className="text-xs text-[#5F6E69]">
              Atualize ou cadastre procedimentos em lote com mapeamento de colunas, validação e
              preservação histórica de preços
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-8 border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0]"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1" />
              {fileName ? 'Trocar Arquivo CSV' : 'Selecionar Arquivo CSV'}
            </Button>

            {parsedRows.length > 0 && validRows.length > 0 && (
              <Button
                size="sm"
                onClick={() => setConfirmModalOpen(true)}
                className="text-xs h-8 bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold"
              >
                Gravar Importação
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {analyzing && (
          <div className="py-8 text-center text-xs text-[#5F6E69] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#0C6B58]" />
            Analisando estrutura e detectando duplicidades...
          </div>
        )}

        {!analyzing && parsedRows.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed border-[#E5E9E7] rounded-xl text-xs text-[#8A9691] space-y-2">
            <p>Selecione um arquivo CSV com as colunas:</p>
            <p className="font-mono text-[11px] text-[#0C6B58] bg-[#E8F3F0] p-2 rounded inline-block">
              codigo, procedimento, categoria, pix_dinheiro, cartao_vista, cartao_parcelado,
              duracao_min
            </p>
            <p className="text-[11px]">
              O sistema detectará automaticamente itens já existentes para atualização sem perder
              histórico de laudos passados.
            </p>
          </div>
        )}

        {/* Resumo da Validação */}
        {parsedRows.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#FAFBFB] rounded-lg border">
                <span className="text-[#5F6E69]">Total de Linhas</span>
                <p className="text-lg font-bold text-[#1F2A27]">{parsedRows.length}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-emerald-800">Novos Cadastros</span>
                <p className="text-lg font-bold text-emerald-700">{toCreateCount}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-blue-800">Atualizações de Preço</span>
                <p className="text-lg font-bold text-blue-700">{toUpdateCount}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <span className="text-red-800">Linhas Rejeitadas/Inválidas</span>
                <p className="text-lg font-bold text-red-700">{invalidCount}</p>
              </div>
            </div>

            {/* Tabela de Pré-visualização */}
            <div className="border rounded-lg overflow-hidden bg-white text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#FAFBFB] text-[#5F6E69] border-b">
                  <tr>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Procedimento</th>
                    <th className="p-2.5">PIX / Dinheiro</th>
                    <th className="p-2.5">Cartão à Vista</th>
                    <th className="p-2.5">Cartão Parc.</th>
                    <th className="p-2.5">Ação Prevista</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E7]">
                  {parsedRows.slice(0, 15).map((row) => (
                    <tr key={row.index} className={!row.isValid ? 'bg-red-50/40' : ''}>
                      <td className="p-2.5">
                        {row.isValid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <span title={row.error} className="inline-flex">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono">{row.rawCode || '—'}</td>
                      <td className="p-2.5 font-semibold text-[#1F2A27]">{row.rawName}</td>
                      <td className="p-2.5 font-semibold text-emerald-700">
                        R$ {row.rawPricePix.toFixed(2)}
                      </td>
                      <td className="p-2.5">R$ {row.rawPriceCardCash.toFixed(2)}</td>
                      <td className="p-2.5">R$ {row.rawPriceCardInstallment.toFixed(2)}</td>
                      <td className="p-2.5">
                        {row.action === 'cadastrar' && (
                          <Badge
                            variant="outline"
                            className="border-emerald-300 text-emerald-700 bg-emerald-50 text-[10px]"
                          >
                            Cadastrar Novo
                          </Badge>
                        )}
                        {row.action === 'atualizar' && (
                          <Badge
                            variant="outline"
                            className="border-blue-300 text-blue-700 bg-blue-50 text-[10px]"
                          >
                            Atualizar Preço
                          </Badge>
                        )}
                        {row.action === 'ignorar' && (
                          <Badge
                            variant="outline"
                            className="border-red-300 text-red-700 bg-red-50 text-[10px]"
                          >
                            Rejeitar ({row.error})
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 15 && (
                <div className="p-2 text-center text-[11px] text-[#8A9691] bg-[#FAFBFB] border-t">
                  Mostrando primeiras 15 linhas de {parsedRows.length}.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resumo Final de Pós-Importação */}
        {summaryResult && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2 text-xs">
            <h4 className="font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Resultado da Gravação em Lote:
            </h4>
            <p className="text-emerald-700">
              • <strong>{summaryResult.created}</strong> novos procedimentos inseridos com sucesso.
              <br />• <strong>{summaryResult.updated}</strong> procedimentos tiveram seus preços
              atualizados.
              <br />• <strong>{summaryResult.rejected.length}</strong> linhas rejeitadas.
            </p>
            {summaryResult.rejected.length > 0 && (
              <div className="mt-2 p-2 bg-white rounded border border-red-200 text-red-800 font-mono text-[11px]">
                {summaryResult.rejected.map((r, i) => (
                  <div key={i}>
                    Linha {r.index}: {r.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* DIÁLOGO DE CONFIRMAÇÃO ANTES DE GRAVAR */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1F2A27] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Confirmar Importação de Preços
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5F6E69]">
              Você está prestes a gravar a nova tabela de preços para a unidade{' '}
              <strong>{clinicLocation}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2 text-xs text-[#1F2A27]">
            <p>
              • <strong>{toCreateCount}</strong> novos procedimentos serão cadastrados.
              <br />• <strong>{toUpdateCount}</strong> procedimentos existentes terão preços
              ajustados.
              <br />• <strong>{invalidCount}</strong> linhas inválidas serão descartadas sem alterar
              dados.
              <br />•{' '}
              <strong>Histórico de laudos e pagamentos anteriores permanece intacto.</strong>
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={importing}
              onClick={() => setConfirmModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={importing}
              onClick={handleExecuteImport}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold"
            >
              {importing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Gravando...
                </>
              ) : (
                'Confirmar e Gravar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
