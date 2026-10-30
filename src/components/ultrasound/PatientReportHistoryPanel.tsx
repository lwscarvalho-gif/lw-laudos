import React, { useState, useEffect } from 'react'
import {
  History,
  FileText,
  Copy,
  Check,
  Calendar,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Layers,
  ArrowRight,
  Loader2,
  AlertCircle,
  Search,
} from 'lucide-react'
import { reportsService } from '@/services/reports'
import { examImagesService } from '@/services/examImages'
import { buildBodyMarkSvgString } from '@/lib/bodyMarks/svgRenderer'
import { formatDateBR } from '@/lib/formatters'
import type { Report, ExamImage } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

interface PatientReportHistoryPanelProps {
  patientId: string
  currentReportId?: string
  patientName?: string
  onClose: () => void
  onInsertTextIntoActiveSection?: (text: string) => void
}

export function PatientReportHistoryPanel({
  patientId,
  currentReportId,
  patientName,
  onClose,
  onInsertTextIntoActiveSection,
}: PatientReportHistoryPanelProps) {
  const { toast } = useToast()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Report selected for full expanded reading
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [selectedReportImages, setSelectedReportImages] = useState<ExamImage[]>([])
  const [loadingImages, setLoadingImages] = useState(false)

  // Copy feedback state: mapping of piece identifier to boolean
  const [copiedKeys, setCopiedKeys] = useState<Record<string, boolean>>({})

  // Load previous reports for this patient, excluding currentReportId
  useEffect(() => {
    if (!patientId) {
      setReports([])
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    reportsService
      .getByPatientId(patientId)
      .then((items) => {
        if (!isMounted) return
        // Exclui o laudo atual que está em edição
        const filtered = items.filter((r) => r.id !== currentReportId)
        setReports(filtered)
        if (filtered.length > 0 && !selectedReportId) {
          // Deixa o laudo mais recente pré-aberto para consulta imediata
          setSelectedReportId(filtered[0].id)
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.error('Erro ao carregar histórico de laudos da paciente:', err)
        setError('Não foi possível carregar o histórico de laudos anteriores desta paciente.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [patientId, currentReportId])

  // Load images when a report is selected
  useEffect(() => {
    if (!selectedReportId) {
      setSelectedReportImages([])
      return
    }

    let isMounted = true
    setLoadingImages(true)
    examImagesService
      .getByReportId(selectedReportId)
      .then((imgs) => {
        if (isMounted) setSelectedReportImages(imgs)
      })
      .catch(() => {
        if (isMounted) setSelectedReportImages([])
      })
      .finally(() => {
        if (isMounted) setLoadingImages(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedReportId])

  // Copy helper
  const handleCopyText = async (text: string, key: string, label = 'Trecho copiado') => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKeys((prev) => ({ ...prev, [key]: true }))
      toast({
        title: label,
        description:
          'Texto copiado para a área de transferência. Cole no laudo atual onde desejar.',
      })
      setTimeout(() => {
        setCopiedKeys((prev) => ({ ...prev, [key]: false }))
      }, 2000)
    } catch {
      toast({
        title: 'Falha ao copiar',
        description: 'Selecione o texto manualmente com o mouse e use Ctrl+C.',
        variant: 'destructive',
      })
    }
  }

  // Filtered reports list
  const filteredReports = reports.filter((r) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      (r.title || '').toLowerCase().includes(term) ||
      (r.exam_type || '').toLowerCase().includes(term) ||
      (r.body || '').toLowerCase().includes(term) ||
      (r.conclusion || '').toLowerCase().includes(term)
    )
  })

  const selectedReport = reports.find((r) => r.id === selectedReportId) || null

  // Helper to extract clean plain text from html body
  const extractPlainText = (html: string): string => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.innerText || tmp.textContent || ''
  }

  const handleCopyFullReport = (rep: Report) => {
    const sectionsText = rep.structured_data?.sections
      ? rep.structured_data.sections
          .filter((s) => s.text.trim())
          .map((s) => `${s.label.toUpperCase()}:\n${s.text}`)
          .join('\n\n')
      : extractPlainText(rep.body)

    const full = [
      rep.title,
      `Data: ${formatDateBR(rep.created)}`,
      sectionsText,
      rep.conclusion || rep.structured_data?.conclusion
        ? `\nCONCLUSÃO:\n${rep.conclusion || rep.structured_data?.conclusion}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    handleCopyText(full, `full_${rep.id}`, 'Laudo completo copiado')
  }

  return (
    <div className="h-full flex flex-col bg-[#F7F9F8] border-l border-[#D0E6E1] shadow-lg rounded-xl overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 bg-white border-b border-[#E5E9E7] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-[#1F2A27] flex items-center gap-2">
              Histórico de Laudos da Paciente
              <Badge
                variant="outline"
                className="text-[10px] bg-[#E8F3F0] text-[#0C6B58] border-[#C8DFD7]"
              >
                {reports.length} {reports.length === 1 ? 'anterior' : 'anteriores'}
              </Badge>
            </h2>
            <p className="text-[11px] text-[#5F6E69] truncate max-w-xs sm:max-w-md">
              {patientName
                ? `Paciente: ${patientName}`
                : 'Consulte laudos passados para comparação'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs text-[#5F6E69] hover:text-[#1F2A27]"
            title="Fechar tela dividida e voltar à visualização cheia"
          >
            <X className="w-4 h-4 mr-1" />
            Fechar Dividida
          </Button>
        </div>
      </div>

      {/* Main Content Area: Split between list and detail */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#5F6E69] flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#0C6B58]" />
            Carregando histórico de laudos da paciente...
          </div>
        ) : error ? (
          <div className="p-6 m-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Falha ao carregar</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-10 m-4 rounded-xl bg-white border border-[#E5E9E7] text-center space-y-2">
            <FileText className="w-8 h-8 text-[#8A9691] mx-auto stroke-1" />
            <h3 className="font-bold text-xs text-[#1F2A27]">Nenhum laudo anterior encontrado</h3>
            <p className="text-[11px] text-[#5F6E69] max-w-sm mx-auto leading-relaxed">
              Esta paciente não possui laudos anteriores salvos no sistema. O laudo atual em edição
              é o primeiro registrado.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E9E7]">
            {/* Left list of prior reports (compact selector) */}
            <div className="w-full lg:w-72 shrink-0 bg-white flex flex-col min-h-0">
              {/* Search bar inside prior reports */}
              <div className="p-3 border-b border-[#E5E9E7] shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#8A9691]" />
                  <Input
                    placeholder="Filtrar por tipo ou texto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>

              {/* Reports scrollable list */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#E5E9E7]">
                {filteredReports.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#8A9691]">
                    Nenhum laudo corresponde ao filtro.
                  </div>
                ) : (
                  filteredReports.map((rep) => {
                    const isSelected = rep.id === selectedReportId
                    const dateStr = formatDateBR(rep.created)
                    const isFinal = rep.status === 'Finalizado'

                    return (
                      <button
                        key={rep.id}
                        type="button"
                        onClick={() => setSelectedReportId(rep.id)}
                        className={`w-full text-left p-3 transition flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-[#E8F3F0] border-l-4 border-[#0C6B58]'
                            : 'hover:bg-[#FAFBFB]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className="font-mono text-[#5F6E69] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#0C6B58]" />
                            {dateStr}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                              isFinal
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rep.status || 'Rascunho'}
                          </span>
                        </div>

                        <span className="text-xs font-bold text-[#1F2A27] line-clamp-1">
                          {rep.title || 'Laudo sem título'}
                        </span>

                        <div className="flex items-center justify-between text-[10px] text-[#5F6E69]">
                          <span className="truncate">{rep.exam_type || 'Ultrassonografia'}</span>
                          <span className="text-[#0C6B58] font-semibold flex items-center gap-0.5">
                            Ver íntegra →
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Right: Full inspection of the selected report */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#FAFBFB] overflow-y-auto">
              {selectedReport ? (
                <div className="p-5 space-y-5 select-text">
                  {/* Selected report top card */}
                  <div className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E5E9E7] pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#0C6B58]">
                          {selectedReport.exam_type || 'Ultrassonografia'}
                        </span>
                        <h3 className="text-base font-bold text-[#1F2A27]">
                          {selectedReport.title}
                        </h3>
                        <p className="text-xs text-[#5F6E69] flex items-center gap-2 mt-0.5">
                          <span>
                            Realizado em: <strong>{formatDateBR(selectedReport.created)}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Status: <strong>{selectedReport.status || 'Rascunho'}</strong>
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyFullReport(selectedReport)}
                          className="h-8 text-xs border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] font-semibold gap-1.5"
                          title="Copiar todo o texto do laudo (órgãos e conclusão)"
                        >
                          {copiedKeys[`full_${selectedReport.id}`] ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copiar Texto Completo
                            </>
                          )}
                        </Button>

                        <a
                          href={`/laudos/${selectedReport.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-[#E5E9E7] hover:bg-gray-100 text-[#5F6E69] transition"
                          title="Abrir este laudo antigo em nova aba"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    {/* Metadata summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#5F6E69]">
                      <div>
                        <span className="block text-[10px] text-[#8A9691]">
                          Responsável Técnico:
                        </span>
                        <span className="font-semibold text-[#1F2A27]">
                          {selectedReport.author_name || 'Não informado'}
                          {selectedReport.author_crm
                            ? ` • CRM ${selectedReport.author_crm_uf || ''} ${selectedReport.author_crm}`
                            : ''}
                        </span>
                      </div>
                      {selectedReport.clinic_location && (
                        <div>
                          <span className="block text-[10px] text-[#8A9691]">
                            Local de Atendimento:
                          </span>
                          <span className="font-semibold text-[#1F2A27]">
                            {selectedReport.clinic_location}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body mark preview if exists */}
                  {selectedReport.structured_data?.body_marks &&
                    selectedReport.structured_data.body_marks.schemeId &&
                    selectedReport.structured_data.body_marks.schemeId !== 'none' && (
                      <div className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-xs space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-[#E5E9E7]">
                          <span className="font-bold text-xs text-[#1F2A27] flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-[#0C6B58]" />
                            Body Mark Registrado Neste Laudo Antigo
                          </span>
                          <span className="text-[10px] text-[#0C6B58] bg-[#E8F3F0] px-2 py-0.5 rounded font-semibold">
                            {(selectedReport.structured_data.body_marks.points || []).length}{' '}
                            marca(s)
                          </span>
                        </div>

                        <div className="flex justify-center bg-[#FAFBFB] p-2 rounded-lg border border-[#E5E9E7]">
                          <div
                            className="max-w-xs w-full"
                            dangerouslySetInnerHTML={{
                              __html: buildBodyMarkSvgString(
                                selectedReport.structured_data.body_marks.schemeId,
                                selectedReport.structured_data.body_marks.points || [],
                                { width: 320, height: 240 },
                              ),
                            }}
                          />
                        </div>
                      </div>
                    )}

                  {/* Structured sections (each with dedicated copy & quick-insert buttons) */}
                  {selectedReport.structured_data?.sections &&
                  selectedReport.structured_data.sections.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-[#1F2A27] uppercase tracking-wide">
                          Seções Anatômicas do Laudo Anterior
                        </span>
                        <span className="text-[11px] text-[#5F6E69]">
                          💡 Selecione qualquer texto com o mouse para Ctrl+C ou use o botão Copiar
                        </span>
                      </div>

                      {selectedReport.structured_data.sections.map((sec) => {
                        const hasText = Boolean(sec.text && sec.text.trim())
                        const copyKey = `sec_${selectedReport.id}_${sec.id}`

                        return (
                          <div
                            key={sec.id}
                            className={`p-3.5 rounded-xl border transition ${
                              hasText
                                ? 'bg-white border-[#E5E9E7] shadow-xs'
                                : 'bg-[#F2F5F4]/60 border-[#E5E9E7] opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-bold text-xs text-[#0C6B58] uppercase">
                                {sec.label}
                              </span>

                              {hasText && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleCopyText(
                                        sec.text,
                                        copyKey,
                                        `Trecho de "${sec.label}" copiado`,
                                      )
                                    }
                                    className="h-6 text-[11px] text-[#0C6B58] hover:bg-[#E8F3F0] px-2 font-medium"
                                    title="Copiar texto desta seção"
                                  >
                                    {copiedKeys[copyKey] ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600 mr-1" />
                                        Copiado
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copiar trecho
                                      </>
                                    )}
                                  </Button>

                                  {onInsertTextIntoActiveSection && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onInsertTextIntoActiveSection(sec.text)}
                                      className="h-6 text-[11px] border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] px-2 font-semibold"
                                      title="Inserir texto desta seção na caixa ativa do laudo atual"
                                    >
                                      <ArrowRight className="w-3 h-3 mr-1" />
                                      Inserir na caixa ativa
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            {hasText ? (
                              <p className="text-xs text-[#1F2A27] leading-relaxed whitespace-pre-line font-sans select-text">
                                {sec.text}
                              </p>
                            ) : (
                              <span className="text-[11px] text-[#8A9691] italic">
                                Não descrito neste exame.
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    /* Free text body view */
                    <div className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-xs space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-[#E5E9E7]">
                        <span className="font-bold text-xs text-[#1F2A27]">
                          Corpo do Laudo Anterior (Texto Livre)
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleCopyText(
                              extractPlainText(selectedReport.body),
                              `body_${selectedReport.id}`,
                              'Corpo do laudo copiado',
                            )
                          }
                          className="h-6 text-[11px] text-[#0C6B58] hover:bg-[#E8F3F0] px-2 font-medium"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar corpo
                        </Button>
                      </div>

                      <div
                        className="text-xs text-[#1F2A27] leading-relaxed select-text"
                        dangerouslySetInnerHTML={{ __html: selectedReport.body }}
                      />
                    </div>
                  )}

                  {/* Conclusion box */}
                  {(selectedReport.conclusion || selectedReport.structured_data?.conclusion) && (
                    <div className="bg-[#FAF7E8] p-4 rounded-xl border border-[#F0E6B6] shadow-xs space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#F0E6B6]">
                        <span className="font-bold text-xs text-[#8A6A0A] uppercase tracking-wide">
                          Conclusão Diagnóstica do Laudo Anterior
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleCopyText(
                                selectedReport.conclusion ||
                                  selectedReport.structured_data?.conclusion ||
                                  '',
                                `conc_${selectedReport.id}`,
                                'Conclusão copiada',
                              )
                            }
                            className="h-6 text-[11px] text-[#8A6A0A] hover:bg-amber-100 px-2 font-medium"
                          >
                            {copiedKeys[`conc_${selectedReport.id}`] ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600 mr-1" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 mr-1" />
                                Copiar conclusão
                              </>
                            )}
                          </Button>

                          {onInsertTextIntoActiveSection && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                onInsertTextIntoActiveSection(
                                  selectedReport.conclusion ||
                                    selectedReport.structured_data?.conclusion ||
                                    '',
                                )
                              }
                              className="h-6 text-[11px] border-[#8A6A0A] text-[#8A6A0A] hover:bg-amber-100 px-2 font-semibold"
                            >
                              <ArrowRight className="w-3 h-3 mr-1" />
                              Inserir na caixa ativa
                            </Button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-[#1F2A27] leading-relaxed font-semibold whitespace-pre-line select-text">
                        {selectedReport.conclusion || selectedReport.structured_data?.conclusion}
                      </p>
                    </div>
                  )}

                  {/* Images of the prior report */}
                  <div className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E5E9E7]">
                      <span className="font-bold text-xs text-[#1F2A27] flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-[#0C6B58]" />
                        Documentação Fotográfica Anexada ao Laudo Anterior
                      </span>
                      <span className="text-[10px] text-[#0C6B58] bg-[#E8F3F0] px-2 py-0.5 rounded font-semibold">
                        {selectedReportImages.length}{' '}
                        {selectedReportImages.length === 1 ? 'imagem' : 'imagens'}
                      </span>
                    </div>

                    {loadingImages ? (
                      <div className="p-4 text-center text-xs text-[#5F6E69] flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#0C6B58]" />
                        Carregando imagens do exame anterior...
                      </div>
                    ) : selectedReportImages.length === 0 ? (
                      <p className="text-xs text-[#8A9691] italic text-center py-2">
                        Nenhuma imagem anexada a este laudo anterior.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {selectedReportImages.map((img, idx) => {
                          const url = examImagesService.getImageUrl(img)
                          return (
                            <div
                              key={img.id}
                              className="bg-[#0B0E0D] rounded-lg overflow-hidden border border-[#E5E9E7] flex flex-col group"
                            >
                              <div className="relative aspect-4/3 flex items-center justify-center overflow-hidden">
                                <img
                                  src={url}
                                  alt={img.caption || `Imagem ${idx + 1}`}
                                  className="max-h-full max-w-full object-contain"
                                  loading="lazy"
                                />
                                <span className="absolute bottom-1 left-1 bg-black/75 text-white text-[9px] px-1 font-mono">
                                  #{idx + 1}
                                </span>
                              </div>
                              {img.caption && (
                                <p
                                  className="p-1.5 text-[10px] text-[#1F2A27] bg-white truncate"
                                  title={img.caption}
                                >
                                  {img.caption}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-[#8A9691]">
                  Selecione um laudo anterior à esquerda para consultar o texto completo.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default PatientReportHistoryPanel
