import React, { useState } from 'react'
import {
  Sparkles,
  Bell,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  EyeOff,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react'
import type { CopilotSuggestion } from '@/services/ultrasoundCopilotEngine'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface ActiveCopilotWidgetProps {
  suggestions: CopilotSuggestion[]
  organLabel: string
  onApply: (suggestion: CopilotSuggestion) => void
  onDismiss: (suggestionId: string) => void
}

export function ActiveCopilotWidget({
  suggestions,
  organLabel,
  onApply,
  onDismiss,
}: ActiveCopilotWidgetProps) {
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [detailsExpanded, setDetailsExpanded] = useState<Record<string, boolean>>({})

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copiado para área de transferência',
      description: 'O texto sugerido foi copiado.',
    })
  }

  const toggleDetails = (id: string) => {
    setDetailsExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const count = suggestions.length

  return (
    <div className="mt-2 text-xs">
      {/* Botão indicador discreto: quando há observações exibe sino com contador numérico real */}
      {count > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFFBEB] text-[#92400E] hover:bg-[#FEF3C7] border border-[#FCD34D] font-medium transition shadow-xs"
          title={`Clique para ver as ${count} observações produzidas pelo Copiloto`}
        >
          <Bell className="w-3.5 h-3.5 text-[#D97706] animate-pulse" />
          <span className="font-semibold">
            {count} observaç{count > 1 ? 'ões' : 'ão'} ({organLabel})
          </span>
          <span className="bg-[#D97706] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
            {count}
          </span>
          {expanded ? (
            <ChevronUp className="w-3 h-3 ml-0.5 text-[#92400E]" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-0.5 text-[#92400E]" />
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-[#8A9691] hover:text-[#0C6B58] hover:bg-[#E8F3F0] transition"
          title="Copiloto ativo em segundo plano — nenhuma observação pendente"
        >
          <Sparkles className="w-3 h-3 text-[#8A9691]" />
          <span>Copiloto local (regras)</span>
        </button>
      )}

      {/* Caixa com sugestões detalhadas (NUNCA abre automaticamente: aberta estritamente após clique do médico) */}
      {expanded && (
        <div className="mt-2 p-3 bg-white rounded-lg border border-[#0C6B58]/30 shadow-md space-y-3 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between pb-1 border-b border-gray-100">
            <span className="font-semibold text-[#1F2A27] flex items-center gap-1 text-[11px]">
              <Lightbulb className="w-3.5 h-3.5 text-[#0C6B58]" />
              Sugestões Clínicas — {organLabel}
            </span>
            <span className="text-[10px] text-[#5F6E69]">
              Nenhuma alteração é aplicada sem sua autorização
            </span>
          </div>

          {count === 0 ? (
            <div className="p-3 text-center text-xs text-[#8A9691] italic bg-[#FAFBFB] rounded border border-gray-100">
              Nenhuma inconsistência, grafia anômala ou medida ausente detectada nesta seção.
            </div>
          ) : (
            <div className="space-y-2.5">
              {suggestions.map((sug) => {
                const isDetailsOpen = Boolean(detailsExpanded[sug.id])
                return (
                  <div
                    key={sug.id}
                    className={`p-2.5 rounded-md border ${
                      sug.requiresReview
                        ? 'bg-amber-50/60 border-amber-300'
                        : 'bg-[#F7F9F8] border-[#E5E9E7]'
                    } space-y-1.5`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-[#1F2A27] text-xs block">
                          {sug.title}
                        </span>
                        <p className="text-[11px] text-[#5F6E69] leading-relaxed">
                          {sug.explanation}
                        </p>
                      </div>
                      {sug.requiresReview && (
                        <span className="shrink-0 text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Revisão
                        </span>
                      )}
                    </div>

                    {sug.deterministicCriteria && (
                      <div className="text-[10px] text-[#0C6B58] bg-[#E8F3F0] p-1.5 rounded font-mono">
                        Critério: {sug.deterministicCriteria}
                      </div>
                    )}

                    {isDetailsOpen && (
                      <div className="p-2 bg-white rounded border border-gray-200 text-[11px] space-y-1">
                        <span className="text-[#8A9691] font-semibold block text-[10px] uppercase">
                          Texto Sugerido:
                        </span>
                        <p className="text-[#1F2A27] whitespace-pre-wrap">{sug.suggestedText}</p>
                      </div>
                    )}

                    {/* Ações por sugestão: Aplicar, Ignorar, Copiar, Aprofundar */}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => toggleDetails(sug.id)}
                        className="text-[#0C6B58] hover:underline font-medium text-[11px]"
                      >
                        {isDetailsOpen ? 'Ocultar texto' : 'Aprofundar e ver texto'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(sug.suggestedText)}
                          className="h-6 px-2 text-[10px] text-[#5F6E69]"
                          title="Copiar texto sugerido"
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copiar
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onDismiss(sug.id)}
                          className="h-6 px-2 text-[10px] text-[#5F6E69] border-[#E5E9E7]"
                          title="Ignorar esta sugestão"
                        >
                          <EyeOff className="w-3 h-3 mr-1" /> Ignorar
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onApply(sug)}
                          className="h-6 px-2.5 text-[10px] bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold"
                          title="Aplicar no texto do laudo"
                        >
                          <Check className="w-3 h-3 mr-1" /> Aplicar
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
