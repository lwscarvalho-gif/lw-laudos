import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Activity,
  Heart,
  Baby,
  Bone,
  Stethoscope,
  Layers,
  Sparkles,
} from 'lucide-react'
import { specialtiesService } from '@/services/specialties'
import type { MedicalSpecialty } from '@/types'
import { useToast } from '@/hooks/use-toast'

interface SpecialtyManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  specialties: MedicalSpecialty[]
  onSpecialtiesChange: () => void
}

export function SpecialtyManagerDialog({
  open,
  onOpenChange,
  specialties,
  onSpecialtiesChange,
}: SpecialtyManagerDialogProps) {
  const { toast } = useToast()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState<number>(1)
  const [isActive, setIsActive] = useState(true)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const startCreate = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setSortOrder(specialties.length + 1)
    setIsActive(true)
    setIsFormOpen(true)
  }

  const startEdit = (spec: MedicalSpecialty) => {
    setEditingId(spec.id)
    setName(spec.name)
    setDescription(spec.description || '')
    setSortOrder(spec.sort_order ?? 0)
    setIsActive(spec.is_active ?? true)
    setIsFormOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome da especialidade médica.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await specialtiesService.update(editingId, {
          name: name.trim(),
          description: description.trim(),
          sort_order: Number(sortOrder) || 0,
          is_active: isActive,
        })
        toast({
          title: 'Especialidade atualizada',
          description: 'Alterações salvas com sucesso.',
        })
      } else {
        await specialtiesService.create({
          name: name.trim(),
          description: description.trim(),
          sort_order: Number(sortOrder) || 0,
          is_active: isActive,
        })
        toast({
          title: 'Especialidade criada',
          description: 'Nova especialidade disponível para classificar modelos.',
        })
      }
      setIsFormOpen(false)
      onSpecialtiesChange()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a especialidade. Verifique se o nome é único.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (spec: MedicalSpecialty) => {
    if (
      !confirm(
        `Deseja remover a especialidade "${spec.name}"? Modelos vinculados ficarão sem especialidade.`,
      )
    ) {
      return
    }

    setDeletingId(spec.id)
    try {
      await specialtiesService.delete(spec.id)
      toast({
        title: 'Especialidade removida',
        description: 'A especialidade foi excluída com sucesso.',
      })
      onSpecialtiesChange()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a especialidade.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#0C6B58]" />
            <DialogTitle className="text-xl font-bold text-[#1F2A27]">
              Gerenciar Especialidades Médicas
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-[#5F6E69]">
            Configure as especialidades para organizar modelos de laudos por área de atuação
            clínica.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Header row with Add button */}
          {!isFormOpen && (
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E9E7]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5F6E69]">
                Especialidades Cadastradas ({specialties.length})
              </span>
              <Button
                size="sm"
                onClick={startCreate}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Nova Especialidade
              </Button>
            </div>
          )}

          {/* Form when open */}
          {isFormOpen ? (
            <form
              onSubmit={handleSave}
              className="p-4 bg-[#F7F9F8] rounded-xl border border-[#E5E9E7] space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[#1F2A27]">
                  {editingId ? 'Editar Especialidade' : 'Cadastrar Especialidade'}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs h-7 text-[#5F6E69]"
                >
                  Cancelar
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="spec_name" className="text-xs font-semibold text-[#1F2A27]">
                  Nome da Especialidade *
                </Label>
                <Input
                  id="spec_name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Mastologia, Musculoesquelético..."
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="spec_desc" className="text-xs font-semibold text-[#1F2A27]">
                  Descrição / Escopo de Exames
                </Label>
                <Textarea
                  id="spec_desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex.: Mama, axilas, core biopsy guiada por ultrassom..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="space-y-1.5">
                  <Label htmlFor="spec_order" className="text-xs font-semibold text-[#1F2A27]">
                    Ordem de Exibição
                  </Label>
                  <Input
                    id="spec_order"
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                  />
                </div>

                <div className="flex items-center justify-between pt-5">
                  <Label
                    htmlFor="spec_active"
                    className="text-xs font-semibold text-[#1F2A27] cursor-pointer"
                  >
                    Ativa para seleção
                  </Label>
                  <Switch id="spec_active" checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E9E7]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* List of specialties */
            <div className="divide-y divide-[#E5E9E7] border border-[#E5E9E7] rounded-xl overflow-hidden bg-white">
              {specialties.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#5F6E69]">
                  Nenhuma especialidade cadastrada. Clique em "Nova Especialidade".
                </div>
              ) : (
                specialties.map((spec) => (
                  <div
                    key={spec.id}
                    className="p-3.5 flex items-center justify-between hover:bg-[#F7F9F8] transition"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#1F2A27]">{spec.name}</span>
                        {!spec.is_active && (
                          <span className="text-[10px] uppercase font-bold text-[#DC2626] bg-red-50 px-1.5 py-0.5 rounded">
                            Inativa
                          </span>
                        )}
                      </div>
                      {spec.description && (
                        <p className="text-xs text-[#5F6E69] truncate mt-0.5">{spec.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(spec)}
                        className="p-1.5 text-[#5F6E69] hover:text-[#0C6B58] hover:bg-[#E8F3F0] rounded-md transition"
                        title="Editar especialidade"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(spec)}
                        disabled={deletingId === spec.id}
                        className="p-1.5 text-[#8A9691] hover:text-[#DC2626] hover:bg-red-50 rounded-md transition"
                        title="Excluir especialidade"
                      >
                        {deletingId === spec.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-[#E5E9E7]">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
