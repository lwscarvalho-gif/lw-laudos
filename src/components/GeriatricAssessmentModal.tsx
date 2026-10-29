import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Activity,
  Award,
  AlertTriangle,
  CheckCircle2,
  FileText,
  HelpCircle,
  Loader2,
  Save,
  Sparkles,
  Info,
  Scale,
  Brain,
  ShieldAlert,
} from 'lucide-react'
import {
  GERIATRIC_INSTRUMENTS,
  calculateInstrumentScore,
  type GeriatricInstrumentType,
} from '@/lib/geriatricTools'
import { geriatricAssessmentsService } from '@/services/geriatricAssessments'
import type { GeriatricAssessment } from '@/types'
import { useToast } from '@/hooks/use-toast'

interface GeriatricAssessmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  patientName: string
  doctorName?: string
  doctorCrm?: string
  doctorCrmUf?: string
  onSaved: (assessment: GeriatricAssessment) => void
}

export function GeriatricAssessmentModal({
  open,
  onOpenChange,
  patientId,
  patientName,
  doctorName,
  doctorCrm,
  doctorCrmUf,
  onSaved,
}: GeriatricAssessmentModalProps) {
  const { toast } = useToast()

  const [selectedInstrument, setSelectedInstrument] = useState<GeriatricInstrumentType>('katz')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Cognitive screening note (free text for copyright-protected tests like MMSE/MEEM)
  const [cognitiveFreeText, setCognitiveFreeText] = useState('')

  const instrument = GERIATRIC_INSTRUMENTS[selectedInstrument]

  // Dynamic automatic calculation while the physician answers
  const calculation = useMemo(() => {
    return calculateInstrumentScore(selectedInstrument, answers)
  }, [selectedInstrument, answers])

  const handleSelectOption = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleSwitchInstrument = (type: GeriatricInstrumentType) => {
    setSelectedInstrument(type)
    setAnswers({})
    setClinicalNotes('')
  }

  const handlePreFillNormalAll = () => {
    const prefill: Record<string, string> = {}
    instrument.questions.forEach((q) => {
      // Pick the best/highest option
      const best = [...q.options].sort((a, b) => b.points - a.points)[0]
      if (best) prefill[q.id] = String(best.value)
    })
    setAnswers(prefill)
  }

  const handleSaveAssessment = async () => {
    if (calculation.answeredCount === 0) {
      toast({
        title: 'Responda pelo menos um item',
        description: 'Selecione as opções do instrumento para calcular o escore.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      // Append cognitive note if filled
      let fullNotes = clinicalNotes.trim()
      if (cognitiveFreeText.trim()) {
        fullNotes = fullNotes
          ? `${fullNotes}\n\n[Registro Cognitivo Adicional / MEEM]: ${cognitiveFreeText.trim()}`
          : `[Registro Cognitivo Adicional / MEEM]: ${cognitiveFreeText.trim()}`
      }

      const created = await geriatricAssessmentsService.create({
        patient_id: patientId,
        instrument_type: selectedInstrument,
        instrument_title: instrument.title,
        score_number: calculation.scoreNumber,
        score_display: calculation.scoreDisplay,
        classification: calculation.classification,
        summary_markdown: calculation.summaryMarkdown,
        answers_json: answers,
        clinical_notes: fullNotes,
        author_name: doctorName,
        author_crm: doctorCrm,
        author_crm_uf: doctorCrmUf,
        assessment_date: new Date().toISOString(),
      })

      toast({
        title: 'Avaliação geriátrica salva',
        description: `${instrument.shortTitle}: ${calculation.scoreDisplay} — ${calculation.classification}`,
      })

      onSaved(created)
      onOpenChange(false)
      // Reset state for next use
      setAnswers({})
      setClinicalNotes('')
      setCognitiveFreeText('')
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao salvar avaliação',
        description: 'Não foi possível registrar a avaliação geriátrica no prontuário.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-[#FAFBFB]">
        {/* HEADER */}
        <DialogHeader className="p-5 bg-white border-b border-[#E5E9E7] shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-[#1F2A27] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#0C6B58]" />
                  Avaliações Geriátricas — GeriTools Integrado
                </DialogTitle>
                <Badge className="bg-[#E8F3F0] text-[#0C6B58] border-none text-[11px] font-semibold">
                  Módulo Clínico
                </Badge>
              </div>
              <DialogDescription className="text-xs text-[#5F6E69] mt-0.5">
                Instrumentos validados de acesso aberto para avaliação multidimensional do paciente{' '}
                <strong className="text-[#1F2A27]">{patientName}</strong>.
              </DialogDescription>
            </div>

            {/* Quick pre-fill button for fast consultation */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreFillNormalAll}
                className="text-xs border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] h-8"
                title="Preenche todas as respostas com padrão de máxima independência"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Marcar Todas Independentes / Normais
              </Button>
            </div>
          </div>

          {/* INSTRUMENTS SELECTOR TABS */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3">
            {(
              [
                { id: 'katz', label: 'Katz (ABVD)', tag: 'Básicas' },
                { id: 'lawton', label: 'Lawton (AIVD)', tag: 'Instrumentais' },
                { id: 'g8', label: 'G8 Triagem', tag: 'Onco / AGA' },
                { id: 'fried', label: 'Fenótipo de Fried', tag: 'Fragilidade' },
                { id: 'fall_risk', label: 'Risco de Queda (STEADI)', tag: 'Quedas' },
              ] as const
            ).map((item) => {
              const isActive = selectedInstrument === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSwitchInstrument(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#0C6B58] text-white shadow-xs'
                      : 'bg-white text-[#5F6E69] hover:text-[#1F2A27] hover:bg-gray-100 border border-[#E5E9E7]'
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-normal ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#5F6E69]'
                    }`}
                  >
                    {item.tag}
                  </span>
                </button>
              )
            })}
          </div>
        </DialogHeader>

        {/* BODY SCROLLABLE: 2 COLUMNS (Left Questions, Right Score Card) */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: QUESTIONS LIST */}
          <div className="lg:col-span-8 space-y-4">
            {/* Instrument Intro Card */}
            <div className="bg-white p-4 rounded-xl border border-[#E5E9E7] space-y-1.5 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-[#1F2A27]">{instrument.title}</h3>
                  <p className="text-xs text-[#5F6E69]">{instrument.subtitle}</p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] text-[#0C6B58] border-teal-200 shrink-0"
                >
                  {instrument.maxScoreDisplay}
                </Badge>
              </div>
              <p className="text-[10px] text-[#8A9691] italic pt-1 border-t border-[#E5E9E7]">
                Ref: {instrument.reference} ({instrument.copyrightNote})
              </p>
            </div>

            {/* Questions Feed */}
            <div className="space-y-3">
              {instrument.questions.map((q, qIndex) => {
                const currentVal = answers[q.id]
                const isAnswered = currentVal !== undefined && currentVal !== ''

                return (
                  <div
                    key={q.id}
                    className={`bg-white p-4 rounded-xl border transition shadow-xs space-y-2.5 ${
                      isAnswered
                        ? 'border-emerald-200 ring-1 ring-emerald-500/20'
                        : 'border-[#E5E9E7]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-[#1F2A27] flex items-center gap-1.5">
                          {isAnswered ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-gray-300 inline-block shrink-0" />
                          )}
                          {q.title}
                        </span>
                        {q.description && (
                          <p className="text-[11px] text-[#5F6E69] leading-snug pl-5">
                            {q.description}
                          </p>
                        )}
                      </div>
                      {isAnswered && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                          Respondido
                        </span>
                      )}
                    </div>

                    {/* Radio Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-5">
                      {q.options.map((opt) => {
                        const isSelected = String(currentVal) === String(opt.value)
                        return (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onClick={() => handleSelectOption(q.id, String(opt.value))}
                            className={`p-2.5 rounded-lg border text-left transition flex items-start gap-2 ${
                              isSelected
                                ? 'bg-emerald-50/70 border-emerald-600 ring-1 ring-emerald-600 text-emerald-900'
                                : 'bg-[#FAFBFB] border-[#E5E9E7] text-[#1F2A27] hover:border-[#0C6B58]/40 hover:bg-white'
                            }`}
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-600'
                                  : 'border-gray-400 bg-white'
                              }`}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold block leading-tight">
                                {opt.label}
                              </span>
                              {opt.description && (
                                <span className="text-[10px] text-[#5F6E69] block leading-tight">
                                  {opt.description}
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Additional Free Cognition Field (Copyright Protection note) */}
            <div className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="cog_note"
                  className="text-xs font-bold text-[#1F2A27] flex items-center gap-1.5"
                >
                  <Brain className="w-3.5 h-3.5 text-[#0C6B58]" />
                  Registro de Rastreio Cognitivo Adicional (MEEM / MoCA / Teste do Relógio)
                </Label>
                <span className="text-[10px] text-[#8A9691]">Campo livre</span>
              </div>
              <p className="text-[11px] text-[#5F6E69] leading-snug">
                Conforme as regras éticas do módulo, testes com direitos autorais restritos (ex.:
                MEEM oficial da Folstein) não possuem itens reproduzidos. Registre aqui o escore ou
                achados cognitivos (ex.: &quot;MEEM: 27/30 pontos; evocação 3/3; teste do relógio
                normal&quot;).
              </p>
              <Textarea
                id="cog_note"
                rows={2}
                value={cognitiveFreeText}
                onChange={(e) => setCognitiveFreeText(e.target.value)}
                placeholder="Ex.: MEEM aplicado com 26/30 pontos (escolaridade > 8 anos). Déficit leve de memória de fixação..."
                className="text-xs"
              />
            </div>

            {/* General Physician Observations */}
            <div className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-xs space-y-2">
              <Label htmlFor="obs_clin" className="text-xs font-bold text-[#1F2A27]">
                Observações Clínicas e Conduta Proposta
              </Label>
              <Textarea
                id="obs_clin"
                rows={3}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Ex.: Paciente acompanhado de cuidador; prescrito plano de fisioterapia motora e ajuste posológico..."
                className="text-xs leading-relaxed"
              />
            </div>
          </div>

          {/* RIGHT: REALTIME SCORE CARD & INTERPRETATION */}
          <div className="lg:col-span-4 space-y-4">
            {/* Realtime Score Floating Card */}
            <div className="bg-white p-5 rounded-xl border border-[#E5E9E7] shadow-sm space-y-4 sticky top-0">
              <div className="flex items-center justify-between border-b border-[#E5E9E7] pb-3">
                <div className="flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-[#0C6B58]" />
                  <span className="font-bold text-xs uppercase tracking-wide text-[#1F2A27]">
                    Pontuação e Escore
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold ${
                    calculation.isComplete
                      ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                      : 'border-amber-300 text-amber-800 bg-amber-50'
                  }`}
                >
                  {calculation.answeredCount} / {calculation.totalCount} respondidos
                </Badge>
              </div>

              {/* Big Score Callout */}
              <div className="text-center py-2 space-y-1">
                <span className="text-[11px] font-semibold text-[#5F6E69] uppercase tracking-wide block">
                  Escore Calculado Automaticamente
                </span>
                <div className="text-3xl font-extrabold text-[#0C6B58] tracking-tight">
                  {calculation.scoreDisplay}
                </div>
              </div>

              {/* Classification Pill */}
              <div
                className={`p-3 rounded-xl border text-center space-y-1 ${
                  calculation.classificationTone === 'normal'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : calculation.classificationTone === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                  Classificação Clínica
                </span>
                <span className="font-extrabold text-sm block">{calculation.classification}</span>
              </div>

              {/* Interpretation Text */}
              <div className="bg-[#FAFBFB] p-3 rounded-lg border border-[#E5E9E7] space-y-1 text-xs">
                <span className="font-bold text-[#1F2A27] flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-[#0C6B58]" />
                  Significado Clínico:
                </span>
                <p className="text-[#5F6E69] leading-relaxed text-[11px]">
                  {calculation.interpretation}
                </p>
              </div>

              {/* Doctor Stamp Preview */}
              <div className="pt-2 border-t border-[#E5E9E7] text-[11px] text-[#5F6E69] space-y-1">
                <div>
                  Médico responsável:{' '}
                  <strong className="text-[#1F2A27]">{doctorName || 'Médico'}</strong>
                </div>
                {doctorCrm && (
                  <div>
                    CRM:{' '}
                    <strong className="text-[#1F2A27]">
                      {doctorCrm}
                      {doctorCrmUf ? `/${doctorCrmUf}` : ''}
                    </strong>
                  </div>
                )}
                <div>Data: Hoje ({new Date().toLocaleDateString('pt-BR')})</div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <DialogFooter className="p-4 bg-white border-t border-[#E5E9E7] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div className="text-xs text-[#5F6E69]">
            {calculation.isComplete ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Todos os itens respondidos ({calculation.scoreDisplay})
              </span>
            ) : (
              <span className="text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Preenchimento parcial ({calculation.answeredCount}/{calculation.totalCount})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAssessment}
              disabled={saving}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold shadow-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Salvando no Prontuário...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Salvar Avaliação no Prontuário
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
