import React, { useMemo } from 'react'
import type {
  ClinicalMaskDefinition,
  ClinicalSectionDefinition,
} from '@/services/clinicalMasksRegistry'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'

export interface DynamicMaskRendererProps {
  mask: ClinicalMaskDefinition | null
  sectionValues: Record<string, string>
  onSectionChange: (sectionId: string, value: string) => void
  onApplySectionNormal?: (
    sectionId: string,
    level: 'resumida' | 'convencional' | 'detalhada',
  ) => void
  disabled?: boolean
}

export function DynamicMaskRenderer({
  mask,
  sectionValues,
  onSectionChange,
  onApplySectionNormal,
  disabled = false,
}: DynamicMaskRendererProps) {
  if (!mask) {
    return (
      <div className="p-6 text-center text-slate-500 border border-dashed rounded-lg bg-slate-50/50">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="font-medium">Nenhuma máscara estruturada vinculada a este procedimento.</p>
        <p className="text-xs text-slate-400 mt-1">
          O exame está configurado para o editor de texto livre seguro com título preservado.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <span>{mask.name}</span>
            <Badge
              variant="outline"
              className="text-xs font-normal border-teal-200 text-teal-800 bg-teal-50"
            >
              {mask.code}
            </Badge>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{mask.technique}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {mask.sections.map((section) => {
          const value = sectionValues[section.id] || ''
          const hasNormalPhrase = Boolean(
            section.normalPhraseConvencional ||
            section.normalPhraseResumida ||
            section.normalPhraseDetalhada,
          )

          return (
            <Card
              key={section.id}
              className="border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors"
            >
              <CardHeader className="py-2.5 px-4 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xs font-semibold text-slate-800 tracking-wide uppercase">
                    {section.label}
                  </CardTitle>
                  {section.laterality && section.laterality !== 'none' && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {section.laterality === 'D'
                        ? 'Direito'
                        : section.laterality === 'E'
                          ? 'Esquerdo'
                          : 'Bilateral'}
                    </Badge>
                  )}
                  {section.fieldType === 'measurement' && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 border-indigo-200 text-indigo-700 bg-indigo-50"
                    >
                      Biometria
                    </Badge>
                  )}
                </div>

                {hasNormalPhrase && onApplySectionNormal && (
                  <div className="flex items-center gap-1">
                    {section.normalPhraseResumida && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onApplySectionNormal(section.id, 'resumida')}
                        className="h-6 px-1.5 text-[11px] text-slate-600 hover:text-teal-700 hover:bg-teal-50"
                        title="Inserir texto normal resumido"
                      >
                        <Sparkles className="w-3 h-3 mr-1 text-teal-600" />
                        Resumido
                      </Button>
                    )}
                    {section.normalPhraseConvencional && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onApplySectionNormal(section.id, 'convencional')}
                        className="h-6 px-1.5 text-[11px] text-slate-600 hover:text-teal-700 hover:bg-teal-50"
                        title="Inserir texto normal convencional"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1 text-teal-600" />
                        Normal
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-3">
                <Textarea
                  value={value}
                  onChange={(e) => onSectionChange(section.id, e.target.value)}
                  placeholder={`Descreva os achados de ${section.anatomicalStructure}...`}
                  rows={2}
                  disabled={disabled}
                  className="text-xs resize-y min-h-[58px] leading-relaxed focus-visible:ring-1 focus-visible:ring-teal-600"
                />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
