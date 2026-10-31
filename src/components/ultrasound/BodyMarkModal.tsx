import React from 'react'
import type { BodyMarksState } from '@/types'
import { ANATOMICAL_SCHEMES } from '@/lib/bodyMarks/schemes'
import BodyMarkEditor from './BodyMarkEditor'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Layers, Trash2, Check } from 'lucide-react'

interface BodyMarkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: BodyMarksState
  onChange: (value: BodyMarksState) => void
  disabled?: boolean
  patientName?: string
  examType?: string
}

export default function BodyMarkModal({
  open,
  onOpenChange,
  value,
  onChange,
  disabled = false,
  patientName,
  examType,
}: BodyMarkModalProps) {
  const schemeId = value?.schemeId || 'none'
  const points = value?.points || []
  const hasActiveScheme = schemeId !== 'none'
  const activeSchemeDef = hasActiveScheme ? ANATOMICAL_SCHEMES[schemeId] : null

  const handleRemoveScheme = () => {
    if (
      window.confirm(
        'Deseja remover o esquema anatômico deste laudo? As marcações associadas serão excluídas.',
      )
    ) {
      onChange({
        schemeId: 'none',
        points: [],
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b border-[#E5E9E7] pb-3">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E8F3F0] flex items-center justify-center text-[#0C6B58]">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#1F2A27] flex items-center gap-2">
                  Esquema Anatômico / Body Mark
                  {hasActiveScheme && activeSchemeDef && (
                    <span className="text-[11px] font-semibold text-[#0C6B58] bg-[#E8F3F0] px-2 py-0.5 rounded border border-[#C8DFD7]">
                      {activeSchemeDef.title}
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5F6E69] mt-0.5">
                  Mapeamento visual sob demanda de lesões, quadrantes, tendões e dispositivos
                  {patientName && (
                    <span className="block mt-0.5 font-medium text-[#1F2A27]">
                      Paciente: <strong>{patientName}</strong>{' '}
                      {examType ? `• Exame: ${examType}` : ''}
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>

            {hasActiveScheme && !disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveScheme}
                className="text-xs text-[#DC2626] border-red-200 hover:bg-red-50 hover:text-red-700 h-8 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Remover Esquema
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="py-2">
          <BodyMarkEditor value={value} onChange={onChange} disabled={disabled} hideHeaderCard />
        </div>

        <DialogFooter className="border-t border-[#E5E9E7] pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-[11px] text-[#5F6E69]">
            {hasActiveScheme ? (
              <span>
                Esquema ativo: <strong>{activeSchemeDef?.title}</strong> ({points.length}{' '}
                {points.length === 1 ? 'marca' : 'marcas'}). O esquema sairá automaticamente no PDF.
              </span>
            ) : (
              <span>Nenhum esquema anatômico ativo. O laudo será impresso sem body mark.</span>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs font-semibold px-4 h-8"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Concluir e Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
