import React, { useState } from 'react'
import { Sparkles, Save, CheckCircle2, Sliders, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import type { DoctorAiPreferences, User } from '@/types'

interface DoctorAiPreferencesPanelProps {
  user: User | null
  onUpdated?: () => void
}

export function DoctorAiPreferencesPanel({ user, onUpdated }: DoctorAiPreferencesPanelProps) {
  const { toast } = useToast()

  const initialPreferences: DoctorAiPreferences = (() => {
    if (!user?.doctor_ai_preferences) {
      return {
        mode: 'active',
        style: 'resumido',
        preferredTerminology: '',
        conclusionOrganization: 'consecutive_lines',
        customInstructions: 'Prefiro conclusões objetivas e frases sucintas.',
        suggestionFrequency: 'normal',
      }
    }
    if (typeof user.doctor_ai_preferences === 'string') {
      try {
        return JSON.parse(user.doctor_ai_preferences)
      } catch {
        // fallback
      }
    }
    return user.doctor_ai_preferences as DoctorAiPreferences
  })()

  const [mode, setMode] = useState<'active' | 'discrete' | 'manual'>(
    initialPreferences.mode || 'active',
  )
  const [style, setStyle] = useState<'resumido' | 'convencional' | 'detalhado'>(
    initialPreferences.style || 'resumido',
  )
  const [preferredTerminology, setPreferredTerminology] = useState(
    initialPreferences.preferredTerminology || '',
  )
  const [conclusionOrganization, setConclusionOrganization] = useState<
    'consecutive_lines' | 'bullet_points' | 'single_paragraph'
  >(initialPreferences.conclusionOrganization || 'consecutive_lines')
  const [customInstructions, setCustomInstructions] = useState(
    initialPreferences.customInstructions || '',
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      const payload: DoctorAiPreferences = {
        mode,
        style,
        preferredTerminology,
        conclusionOrganization,
        customInstructions,
        suggestionFrequency: 'normal',
      }

      await pb.collection('users').update(user.id, {
        doctor_ai_preferences: payload,
      })

      toast({
        title: 'Preferências salvas',
        description: 'As configurações individuais do Copiloto foram atualizadas com sucesso.',
      })
      if (onUpdated) onUpdated()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar preferências',
        description: err.message || 'Falha ao gravar no perfil.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9E7] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-[#1F2A27]">
                Personalização do Copiloto Ultrassonográfico
              </h2>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                Individual por Médico
              </span>
            </div>
            <p className="text-xs text-[#5F6E69]">
              Defina seu modo de trabalho, estilo de redação e instruções personalizadas para as
              sugestões.
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs font-semibold shrink-0"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {saving ? 'Salvando...' : 'Salvar Preferências'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Modo de Interação */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-[#1F2A27] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#0C6B58]" />
            Modo de Interação do Copiloto
          </Label>
          <div className="space-y-2">
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                mode === 'active'
                  ? 'border-[#0C6B58] bg-[#E8F3F0]/60 ring-1 ring-[#0C6B58]'
                  : 'border-[#E5E9E7] hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="copilot_mode"
                checked={mode === 'active'}
                onChange={() => setMode('active')}
                className="mt-0.5 text-[#0C6B58]"
              />
              <div>
                <span className="text-xs font-bold text-[#1F2A27] block">Ativo (Recomendado)</span>
                <p className="text-[11px] text-[#5F6E69] leading-tight">
                  Analisa em segundo plano após breve pausa e exibe indicador discreto com a
                  contagem de sugestões.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                mode === 'discrete'
                  ? 'border-[#0C6B58] bg-[#E8F3F0]/60 ring-1 ring-[#0C6B58]'
                  : 'border-[#E5E9E7] hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="copilot_mode"
                checked={mode === 'discrete'}
                onChange={() => setMode('discrete')}
                className="mt-0.5 text-[#0C6B58]"
              />
              <div>
                <span className="text-xs font-bold text-[#1F2A27] block">Discreto</span>
                <p className="text-[11px] text-[#5F6E69] leading-tight">
                  Alerta apenas para inconsistências graves ou dimensões de nódulos ausentes.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                mode === 'manual'
                  ? 'border-[#0C6B58] bg-[#E8F3F0]/60 ring-1 ring-[#0C6B58]'
                  : 'border-[#E5E9E7] hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="copilot_mode"
                checked={mode === 'manual'}
                onChange={() => setMode('manual')}
                className="mt-0.5 text-[#0C6B58]"
              />
              <div>
                <span className="text-xs font-bold text-[#1F2A27] block">Sob Demanda (Manual)</span>
                <p className="text-[11px] text-[#5F6E69] leading-tight">
                  Não executa em background; você aciona diretamente no painel lateral quando
                  desejar.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Estilo de Redação */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-[#1F2A27]">Estilo Padrão de Redação</Label>
          <div className="space-y-2">
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                style === 'resumido'
                  ? 'border-[#0C6B58] bg-[#E8F3F0]/60 ring-1 ring-[#0C6B58]'
                  : 'border-[#E5E9E7] hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="copilot_style"
                checked={style === 'resumido'}
                onChange={() => setStyle('resumido')}
                className="mt-0.5 text-[#0C6B58]"
              />
              <div>
                <span className="text-xs font-bold text-[#1F2A27] block">
                  Resumido (Padrão Inicial)
                </span>
                <p className="text-[11px] text-[#5F6E69] leading-tight">
                  Frases curtas, diretas e concisas (ex: "Fígado com dimensões, contornos e
                  ecotextura preservados").
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                style === 'convencional'
                  ? 'border-[#0C6B58] bg-[#E8F3F0]/60 ring-1 ring-[#0C6B58]'
                  : 'border-[#E5E9E7] hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="copilot_style"
                checked={style === 'convencional'}
                onChange={() => setStyle('convencional')}
                className="mt-0.5 text-[#0C6B58]"
              />
              <div>
                <span className="text-xs font-bold text-[#1F2A27] block">Convencional</span>
                <p className="text-[11px] text-[#5F6E69] leading-tight">
                  Texto descritivo equilibrado padrão ambulatorial.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                style === 'detalhado'
                  ? 'border-[#0C6B58] bg-[#E8F3F0]/60 ring-1 ring-[#0C6B58]'
                  : 'border-[#E5E9E7] hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="copilot_style"
                checked={style === 'detalhado'}
                onChange={() => setStyle('detalhado')}
                className="mt-0.5 text-[#0C6B58]"
              />
              <div>
                <span className="text-xs font-bold text-[#1F2A27] block">Detalhado</span>
                <p className="text-[11px] text-[#5F6E69] leading-tight">
                  Descrições minuciosas com detalhamento acadêmico de cada compartimento anatômico.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Instruções Pessoais do Médico */}
      <div className="space-y-2 pt-2 border-t border-[#E5E9E7]">
        <Label className="text-xs font-semibold text-[#1F2A27]">
          Instruções Pessoais de Escrita (Respeitadas em todas as revisões)
        </Label>
        <Textarea
          rows={3}
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder='Ex.: "Prefiro conclusões objetivas", "Não quero frases excessivamente longas", "Apresentar a impressão diagnóstica em tópicos", "Evitar repetição desnecessária de achados normais"'
          className="text-xs font-sans leading-relaxed"
        />
        <div className="flex items-center gap-2 text-[11px] text-[#5F6E69]">
          <Shield className="w-3.5 h-3.5 text-[#0C6B58]" />
          <span>
            Isolamento de privacidade: suas preferências são mantidas exclusivamente no seu perfil e
            nenhum dado identificável de paciente é utilizado para treinamento.
          </span>
        </div>
      </div>
    </div>
  )
}
