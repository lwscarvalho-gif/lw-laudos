import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Bot,
  AlertCircle,
  Check,
  X,
  FileCheck,
  Languages,
  AlignLeft,
  Loader2,
  Lock,
} from 'lucide-react'
import {
  aiAssistantService,
  type AiActionType,
  type AiAssistantStatus,
} from '@/services/aiAssistant'
import { localLlamaCppService } from '@/services/localAiEngine'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface AiAssistantPanelProps {
  sections: Array<{ id: string; label: string; text: string }>
  conclusionText: string
  onApplyText: (targetId: string, newText: string) => void
}

export default function AiAssistantPanel({
  sections,
  conclusionText,
  onApplyText,
}: AiAssistantPanelProps) {
  const { toast } = useToast()
  const [status, setStatus] = useState<AiAssistantStatus | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string>('conclusao')
  const [selectedAction, setSelectedAction] = useState<AiActionType>('corrigir_ortografia')
  const [suggestion, setSuggestion] = useState<{
    originalText: string
    suggestedText: string
    targetField: string
    requiresReview?: boolean
    riskSummary?: string | null
  } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Consulta status real do llama.cpp local
    localLlamaCppService
      .checkAvailability()
      .then((res) => {
        setStatus({
          connected: res.isEngineRunning,
          providerName: res.isEngineRunning ? 'llama.cpp local (127.0.0.1:8080)' : 'Desconectado',
          modelName: res.modelName,
          statusMessage: res.statusMessage,
          ready: res.isEngineRunning,
        })
      })
      .catch(() => {
        aiAssistantService
          .getStatus()
          .then(setStatus)
          .catch(() => {})
      })
  }, [])

  const getTargetText = (): string => {
    if (selectedTarget === 'conclusao') return conclusionText
    const sec = sections.find((s) => s.id === selectedTarget)
    return sec ? sec.text : ''
  }

  const handleRequestAi = async () => {
    const text = getTargetText()
    if (!text.trim()) {
      toast({
        title: 'Texto vazio',
        description: 'Selecione uma seção ou conclusão que contenha texto para análise.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // 1. Tentar execução real no llama.cpp local
      const llamaStatus = await localLlamaCppService.checkAvailability()
      if (llamaStatus.isEngineRunning) {
        const out = await localLlamaCppService.requestSuggestion({
          textToReview: text,
          sectionName: selectedTarget,
          task:
            selectedAction === 'corrigir_ortografia'
              ? 'orthography'
              : selectedAction === 'melhorar_redacao'
                ? 'clarity'
                : 'structure',
        })

        setSuggestion({
          originalText: out.originalText,
          suggestedText: out.proposedText,
          targetField: selectedTarget,
          requiresReview: out.requiresExplicitDoctorReview,
          riskSummary: out.preservationResult.riskSummary,
        })
      } else {
        const res = await aiAssistantService.processText({
          action: selectedAction,
          targetField: selectedTarget,
          originalText: text,
        })
        setSuggestion({
          originalText: res.originalText,
          suggestedText: res.suggestedText,
          targetField: res.targetField,
        })
      }
    } catch (err: any) {
      toast({
        title: 'Assistente IA',
        description:
          err.message ||
          'O motor de IA local não está ativo. O editor continua 100% funcional sem IA.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApplySuggestion = () => {
    if (!suggestion) return
    onApplyText(suggestion.targetField, suggestion.suggestedText)
    setSuggestion(null)
    toast({
      title: 'Sugestão aplicada',
      description: 'O texto foi inserido no campo selecionado.',
    })
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-[#E5E9E7] shadow-sm space-y-4">
      {/* Header with status badge */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E9E7]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#1F2A27]">Assistente IA Clínico</h3>
            <p className="text-[11px] text-[#5F6E69]">Revisão e aprimoramento redacional</p>
          </div>
        </div>

        {/* Real Status Badge (No faking) */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            status?.connected
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              status?.connected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
            }`}
          />
          <span>{status?.connected ? `Ativo: ${status.modelName}` : 'Status: Desconectado'}</span>
        </div>
      </div>

      {/* Security & Medical Safety Statement */}
      <div className="p-3 bg-[#F7F9F8] rounded-lg border border-[#E5E9E7] text-xs text-[#5F6E69] space-y-1">
        <p className="font-semibold text-[#1F2A27] flex items-center gap-1">
          <Lock className="w-3.5 h-3.5 text-[#0C6B58]" />
          Diretrizes de Segurança e Privacidade Médica
        </p>
        <p className="text-[11px] leading-relaxed">
          Sem provedor conectado nesta versão preliminar. Quando ativo via backend seguro, o
          assistente <strong>não inferirá achados não laudados</strong>,{' '}
          <strong>não alterará medidas</strong> nem mudará negações ou lateralidade. Chaves de API
          nunca residem no navegador.
        </p>
      </div>

      {/* Target selector and Action buttons */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#1F2A27]">Alvo da análise:</Label>
          <Select value={selectedTarget} onValueChange={setSelectedTarget}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conclusao">Conclusão Diagnóstica</SelectItem>
              {sections.map((sec) => (
                <SelectItem key={sec.id} value={sec.id}>
                  {sec.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#1F2A27]">Ação desejada:</Label>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedAction('corrigir_ortografia')}
              className={`p-2 rounded-lg border text-left text-xs flex items-center gap-2 transition ${
                selectedAction === 'corrigir_ortografia'
                  ? 'border-[#0C6B58] bg-[#E8F3F0] text-[#0C6B58] font-semibold'
                  : 'border-[#E5E9E7] text-[#5F6E69] hover:bg-[#F7F9F8]'
              }`}
            >
              <Languages className="w-3.5 h-3.5 shrink-0" />
              <span>Corrigir ortografia e concordância</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAction('melhorar_redacao')}
              className={`p-2 rounded-lg border text-left text-xs flex items-center gap-2 transition ${
                selectedAction === 'melhorar_redacao'
                  ? 'border-[#0C6B58] bg-[#E8F3F0] text-[#0C6B58] font-semibold'
                  : 'border-[#E5E9E7] text-[#5F6E69] hover:bg-[#F7F9F8]'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Melhorar fluidez e clareza redacional</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAction('estruturar_descricao')}
              className={`p-2 rounded-lg border text-left text-xs flex items-center gap-2 transition ${
                selectedAction === 'estruturar_descricao'
                  ? 'border-[#0C6B58] bg-[#E8F3F0] text-[#0C6B58] font-semibold'
                  : 'border-[#E5E9E7] text-[#5F6E69] hover:bg-[#F7F9F8]'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Estruturar descrição padronizada</span>
            </button>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleRequestAi}
          disabled={loading}
          className="w-full bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-9 shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Processando análise...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Executar Ação Selecionada
            </>
          )}
        </Button>
      </div>

      {/* Side-by-side comparison if a suggestion exists */}
      {suggestion && (
        <div className="pt-3 border-t border-[#E5E9E7] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1F2A27]">Comparação Lado a Lado</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSuggestion(null)}
              className="h-6 text-xs text-[#5F6E69]"
            >
              <X className="w-3.5 h-3.5" /> Descartar
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-red-50/50 border border-red-200 rounded-lg space-y-1">
              <span className="font-semibold text-red-900 text-[11px] uppercase block">
                Original
              </span>
              <p className="text-[#33413B] whitespace-pre-wrap leading-relaxed">
                {suggestion.originalText}
              </p>
            </div>

            <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-1">
              <span className="font-semibold text-emerald-900 text-[11px] uppercase block">
                Sugestão Proposta
              </span>
              <p className="text-[#33413B] whitespace-pre-wrap leading-relaxed">
                {suggestion.suggestedText}
              </p>
              {suggestion.requiresReview && (
                <div className="mt-2 p-2 bg-amber-100 border border-amber-300 rounded text-[11px] text-amber-900 font-medium">
                  ⚠ Atenção clínica:{' '}
                  {suggestion.riskSummary || 'Revisão explícita obrigatória antes da aplicação.'}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSuggestion(null)}
              className="text-xs border-[#E5E9E7]"
            >
              Descartar
            </Button>
            <Button
              size="sm"
              onClick={handleApplySuggestion}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Aplicar Sugestão ao Campo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
