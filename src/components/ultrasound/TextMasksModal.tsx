import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { textMasksService } from '@/services/textMasks'
import type { TextMask } from '@/types'
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  Sparkles,
  BookTemplate,
  Loader2,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Info,
} from 'lucide-react'

export interface TextMasksModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentEditorText: string
  onApplyMask: (text: string, mode: 'replace' | 'append') => void
  currentUserId?: string
}

export function TextMasksModal({
  open,
  onOpenChange,
  currentEditorText,
  onApplyMask,
  currentUserId,
}: TextMasksModalProps) {
  const { toast } = useToast()

  const [masks, setMasks] = useState<TextMask[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'system' | 'my'>('all')

  // Selected mask for preview
  const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null)

  // Dialogs / States inside modal
  // 1. Confirm insertion mode dialog (replace vs append)
  const [confirmInsertMask, setConfirmInsertMask] = useState<TextMask | null>(null)

  // 2. Save current editor text or clone system mask as new personal mask
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [saveBody, setSaveBody] = useState('')
  const [savingLoading, setSavingLoading] = useState(false)

  // 3. Edit existing personal mask
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingMaskId, setEditingMaskId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editingLoading, setEditingLoading] = useState(false)

  // 4. Delete confirm dialog
  const [deleteMask, setDeleteMask] = useState<TextMask | null>(null)
  const [deletingLoading, setDeletingLoading] = useState(false)

  // Load masks when modal opens
  useEffect(() => {
    if (open) {
      loadMasks()
    }
  }, [open])

  async function loadMasks() {
    try {
      setLoading(true)
      const list = await textMasksService.getAll()
      setMasks(list)
      if (list.length > 0 && !selectedMaskId) {
        setSelectedMaskId(list[0].id)
      }
    } catch (err: any) {
      console.error('Erro ao carregar máscaras:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar máscaras',
        description: err?.message || 'Não foi possível carregar os modelos de texto.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtered list
  const filteredMasks = useMemo(() => {
    return masks.filter((m) => {
      // Tab filter
      if (filterTab === 'system' && !m.is_system) return false
      if (filterTab === 'my' && m.is_system) return false

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchName = m.name?.toLowerCase().includes(q)
        const matchDesc = m.description?.toLowerCase().includes(q)
        const matchBody = m.body?.toLowerCase().includes(q)
        if (!matchName && !matchDesc && !matchBody) return false
      }

      return true
    })
  }, [masks, filterTab, searchTerm])

  const selectedMask = useMemo(() => {
    return masks.find((m) => m.id === selectedMaskId) || filteredMasks[0] || null
  }, [masks, selectedMaskId, filteredMasks])

  // Insertion handler
  function handleSelectToApply(mask: TextMask) {
    if (currentEditorText.trim().length > 0) {
      // Editor already has text: open confirmation to let doctor choose replace or append
      setConfirmInsertMask(mask)
    } else {
      // Editor is empty: direct replace
      onApplyMask(mask.body, 'replace')
      onOpenChange(false)
      toast({
        title: 'Máscara aplicada',
        description: `Modelo "${mask.name}" inserido no corpo do laudo.`,
      })
    }
  }

  function handleConfirmApply(mode: 'replace' | 'append') {
    if (!confirmInsertMask) return
    onApplyMask(confirmInsertMask.body, mode)
    toast({
      title: mode === 'replace' ? 'Corpo do laudo substituído' : 'Texto adicionado ao final',
      description: `Modelo "${confirmInsertMask.name}" aplicado com sucesso.`,
    })
    setConfirmInsertMask(null)
    onOpenChange(false)
  }

  // Action: Open modal to save current editor text as personal mask
  function handleOpenSaveCurrentText() {
    if (!currentEditorText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Corpo vazio',
        description: 'Digite algo no corpo do laudo antes de salvar como máscara.',
      })
      return
    }
    setSaveName('')
    setSaveDescription('')
    setSaveBody(currentEditorText)
    setSaveModalOpen(true)
  }

  // Action: Open modal to clone a system mask as personal mask
  function handleCloneMask(mask: TextMask) {
    setSaveName(`${mask.name} (Personalizada)`)
    setSaveDescription(mask.description || '')
    setSaveBody(mask.body)
    setSaveModalOpen(true)
  }

  // Submit save new personal mask
  async function handleSaveNewMaskSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!saveName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Dê um nome para identificar a sua máscara.',
      })
      return
    }
    if (!saveBody.trim()) {
      toast({
        variant: 'destructive',
        title: 'Texto obrigatório',
        description: 'O conteúdo da máscara não pode ficar em branco.',
      })
      return
    }

    try {
      setSavingLoading(true)
      const created = await textMasksService.create({
        name: saveName.trim(),
        description: saveDescription.trim() || undefined,
        body: saveBody,
        exam_type: 'Ultrassonografia',
      })
      setMasks((prev) => [created, ...prev])
      setSelectedMaskId(created.id)
      setFilterTab('my')
      setSaveModalOpen(false)
      toast({
        title: 'Máscara pessoal cadastrada',
        description: `"${created.name}" foi salva com sucesso e está disponível apenas para você.`,
      })
    } catch (err: any) {
      console.error('Erro ao salvar máscara:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar máscara',
        description: err?.message || 'Falha ao salvar a máscara pessoal no banco de dados.',
      })
    } finally {
      setSavingLoading(false)
    }
  }

  // Action: Open edit personal mask modal
  function handleOpenEditPersonal(mask: TextMask) {
    if (mask.is_system) {
      toast({
        variant: 'destructive',
        title: 'Máscara do sistema',
        description:
          'Máscaras padrão do sistema não podem ser editadas diretamente. Use "Salvar cópia pessoal".',
      })
      return
    }
    setEditingMaskId(mask.id)
    setEditName(mask.name)
    setEditDescription(mask.description || '')
    setEditBody(mask.body)
    setEditModalOpen(true)
  }

  // Submit edit personal mask
  async function handleEditMaskSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMaskId || !editName.trim()) return

    try {
      setEditingLoading(true)
      const updated = await textMasksService.update(editingMaskId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        body: editBody,
      })
      setMasks((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      setEditModalOpen(false)
      toast({
        title: 'Máscara atualizada',
        description: `"${updated.name}" foi atualizada com sucesso.`,
      })
    } catch (err: any) {
      console.error('Erro ao atualizar máscara:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: err?.message || 'Não foi possível atualizar a máscara.',
      })
    } finally {
      setEditingLoading(false)
    }
  }

  // Delete personal mask
  async function handleDeleteMaskConfirm() {
    if (!deleteMask) return
    try {
      setDeletingLoading(true)
      await textMasksService.delete(deleteMask.id)
      setMasks((prev) => prev.filter((m) => m.id !== deleteMask.id))
      if (selectedMaskId === deleteMask.id) {
        setSelectedMaskId(null)
      }
      toast({
        title: 'Máscara excluída',
        description: `"${deleteMask.name}" foi removida da sua lista de máscaras pessoais.`,
      })
      setDeleteMask(null)
    } catch (err: any) {
      console.error('Erro ao excluir máscara:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err?.message || 'Não foi possível excluir a máscara.',
      })
    } finally {
      setDeletingLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-[#FAFBFB]">
          {/* Header */}
          <DialogHeader className="p-5 pb-4 bg-white border-b border-[#E5E9E7]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-bold text-[#1F2A27] flex items-center gap-2">
                  <BookTemplate className="w-5 h-5 text-[#0C6B58]" />
                  Máscaras de Laudo — Modelos Pré-Prontos
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5F6E69] mt-0.5">
                  Insira modelos completos com um clique e personalize livremente no editor.
                  Cadastre suas próprias máscaras isoladas para agilizar seus laudos.
                </DialogDescription>
              </div>

              {/* Botão de Salvar Texto Atual como Máscara Pessoal */}
              <Button
                type="button"
                onClick={handleOpenSaveCurrentText}
                size="sm"
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-8 font-semibold shadow-sm shrink-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Salvar Texto Atual como Máscara
              </Button>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3">
              {/* Tabs */}
              <div className="inline-flex rounded-lg bg-[#F0F4F2] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1 rounded-md font-medium transition ${
                    filterTab === 'all'
                      ? 'bg-white text-[#0C6B58] shadow-sm'
                      : 'text-[#5F6E69] hover:text-[#1F2A27]'
                  }`}
                >
                  Todas ({masks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('system')}
                  className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                    filterTab === 'system'
                      ? 'bg-white text-[#0C6B58] shadow-sm'
                      : 'text-[#5F6E69] hover:text-[#1F2A27]'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3 text-[#0C6B58]" />
                  Do Sistema ({masks.filter((m) => m.is_system).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('my')}
                  className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                    filterTab === 'my'
                      ? 'bg-white text-[#0C6B58] shadow-sm'
                      : 'text-[#5F6E69] hover:text-[#1F2A27]'
                  }`}
                >
                  <UserCheck className="w-3 h-3 text-[#0C6B58]" />
                  Minhas Máscaras ({masks.filter((m) => !m.is_system).length})
                </button>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A9691]" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar máscara..."
                  className="pl-8 text-xs h-8 bg-white border-[#E5E9E7]"
                />
              </div>
            </div>
          </DialogHeader>

          {/* Body: Split View (List 40% + Preview 60%) */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[380px]">
            {/* Left Column: Mask List */}
            <div className="md:col-span-5 border-r border-[#E5E9E7] overflow-y-auto p-3 space-y-2 bg-white">
              {loading ? (
                <div className="p-8 text-center text-xs text-[#5F6E69]">
                  <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-[#0C6B58]" />
                  Carregando máscaras...
                </div>
              ) : filteredMasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5F6E69] space-y-2">
                  <Info className="w-6 h-6 mx-auto text-[#8A9691]" />
                  <p className="font-semibold text-[#1F2A27]">Nenhuma máscara encontrada</p>
                  <p className="text-[11px]">
                    {searchTerm
                      ? 'Nenhum resultado com o termo pesquisado.'
                      : filterTab === 'my'
                        ? 'Você ainda não cadastrou nenhuma máscara pessoal. Clique no botão acima para salvar seu texto atual.'
                        : 'Nenhuma máscara disponível.'}
                  </p>
                </div>
              ) : (
                filteredMasks.map((mask) => {
                  const isSelected = selectedMask?.id === mask.id
                  const isOwner =
                    !mask.is_system && (!currentUserId || mask.owner_id === currentUserId)

                  return (
                    <div
                      key={mask.id}
                      onClick={() => setSelectedMaskId(mask.id)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition relative group ${
                        isSelected
                          ? 'border-[#0C6B58] bg-[#F2F8F6] ring-1 ring-[#0C6B58]/30'
                          : 'border-[#E5E9E7] bg-white hover:border-[#CADBD5] hover:bg-[#FAFBFB]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            {mask.is_system ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0 font-medium"
                              >
                                Sistema
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200 shrink-0 font-medium"
                              >
                                Pessoal
                              </Badge>
                            )}
                            <h4 className="font-semibold text-xs text-[#1F2A27] truncate">
                              {mask.name}
                            </h4>
                          </div>

                          {mask.description && (
                            <p className="text-[11px] text-[#5F6E69] line-clamp-2 leading-tight">
                              {mask.description}
                            </p>
                          )}
                        </div>

                        {/* Quick actions on card */}
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                          {isOwner && (
                            <>
                              <button
                                type="button"
                                title="Editar máscara pessoal"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenEditPersonal(mask)
                                }}
                                className="p-1 text-[#5F6E69] hover:text-[#0C6B58] rounded hover:bg-white"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                title="Excluir máscara pessoal"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteMask(mask)
                                }}
                                className="p-1 text-[#5F6E69] hover:text-red-600 rounded hover:bg-white"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {mask.is_system && (
                            <button
                              type="button"
                              title="Salvar como máscara pessoal personalizável"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCloneMask(mask)
                              }}
                              className="p-1 text-[#5F6E69] hover:text-[#0C6B58] rounded hover:bg-white"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Right Column: Mask Preview & Insertion Actions */}
            <div className="md:col-span-7 flex flex-col p-4 bg-[#FAFBFB] overflow-y-auto">
              {selectedMask ? (
                <div className="flex-1 flex flex-col space-y-3">
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#E5E9E7]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-sm text-[#1F2A27]">{selectedMask.name}</h3>
                        {selectedMask.is_system ? (
                          <Badge className="bg-[#0C6B58] text-white text-[10px] h-4 px-1.5">
                            Padrão do Sistema
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-600 text-white text-[10px] h-4 px-1.5">
                            Máscara Pessoal
                          </Badge>
                        )}
                      </div>
                      {selectedMask.description && (
                        <p className="text-xs text-[#5F6E69]">{selectedMask.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {selectedMask.is_system ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCloneMask(selectedMask)}
                          className="text-xs h-7 border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0]"
                          title="Gera uma cópia pessoal que você pode renomear e salvar com suas alterações"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Personalizar Cópia
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditPersonal(selectedMask)}
                          className="text-xs h-7 border-[#CADBD5] text-[#1F2A27] hover:bg-white"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Body Preview */}
                  <div className="flex-1 min-h-[220px] bg-white p-3.5 rounded-lg border border-[#E5E9E7] shadow-inner font-serif-report text-xs leading-relaxed text-[#1F2A27] overflow-y-auto whitespace-pre-wrap select-text">
                    {selectedMask.body}
                  </div>

                  {/* Apply actions */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[#EEF5F3] p-3 rounded-lg border border-[#D0E6E1]">
                    <div className="text-xs text-[#0C6B58] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span className="font-semibold">
                        Clique para inserir este modelo no laudo:
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => handleSelectToApply(selectedMask)}
                        className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-8 font-semibold shadow-sm px-4"
                      >
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        Inserir no Corpo do Laudo
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#5F6E69] space-y-2">
                  <FileText className="w-10 h-10 text-[#CBD5E1]" />
                  <p className="text-sm font-semibold text-[#1F2A27]">
                    Nenhuma máscara selecionada
                  </p>
                  <p className="text-xs">
                    Selecione um modelo na lista à esquerda para visualizar seu texto clínico e
                    inseri-lo.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 bg-white border-t border-[#E5E9E7] flex items-center justify-between text-xs text-[#5F6E69]">
            <span className="text-[11px] hidden sm:inline">
              Dica: Máscaras do sistema permanecem intactas; suas personalizações são salvas como
              máscaras particulares.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="ml-auto text-xs h-8"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: Replace vs Append when editor already has text */}
      <AlertDialog
        open={!!confirmInsertMask}
        onOpenChange={(op) => !op && setConfirmInsertMask(null)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-[#1F2A27]">
              O corpo do laudo já possui texto
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#5F6E69] leading-relaxed">
              Você selecionou a máscara <strong>"{confirmInsertMask?.name}"</strong>. Como deseja
              aplicar no editor?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2 space-y-2 text-xs">
            <button
              type="button"
              onClick={() => handleConfirmApply('replace')}
              className="w-full p-3 rounded-lg border border-[#D0E6E1] bg-[#F2F8F6] hover:bg-[#E4F1ED] text-left transition flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-[#0C6B58] block">
                  Substituir todo o conteúdo atual
                </span>
                <span className="text-[11px] text-[#5F6E69]">
                  O texto atual será substituído integralmente pelo modelo escolhido (Recomendado ao
                  iniciar).
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#0C6B58] shrink-0 ml-2" />
            </button>

            <button
              type="button"
              onClick={() => handleConfirmApply('append')}
              className="w-full p-3 rounded-lg border border-[#E5E9E7] bg-white hover:bg-[#FAFBFB] text-left transition flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-[#1F2A27] block">
                  Adicionar ao final do texto atual
                </span>
                <span className="text-[11px] text-[#5F6E69]">
                  Preserva o texto já digitado e anexa a máscara ao fim do documento.
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#1F2A27] shrink-0 ml-2" />
            </button>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmInsertMask(null)} className="text-xs h-8">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL: Save new personal mask */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSaveNewMaskSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base text-[#1F2A27] flex items-center gap-2">
                <BookTemplate className="w-4 h-4 text-[#0C6B58]" />
                Salvar como Máscara Pessoal
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5F6E69]">
                Esta máscara ficará disponível apenas no seu usuário médico. Máscaras do sistema
                original nunca são alteradas.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#1F2A27]">Nome da Máscara *</Label>
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Ex.: Abdome Total — Padrão Dr. Lucas"
                  className="text-xs h-9"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#1F2A27]">
                  Descrição / Indicação rápida (opcional)
                </Label>
                <Input
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Ex.: Modelo com foco em litíase biliar e esteatose grau 1"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#1F2A27]">Conteúdo do Modelo *</Label>
                <Textarea
                  rows={8}
                  value={saveBody}
                  onChange={(e) => setSaveBody(e.target.value)}
                  className="text-xs font-serif-report leading-relaxed"
                  placeholder="Texto clínico pré-pronto..."
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSaveModalOpen(false)}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingLoading}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-8 font-semibold"
              >
                {savingLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Salvar Máscara Pessoal
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Edit personal mask */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleEditMaskSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base text-[#1F2A27] flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#0C6B58]" />
                Editar Máscara Pessoal
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5F6E69]">
                Altere o nome, descrição ou o texto da sua máscara.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#1F2A27]">Nome da Máscara *</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#1F2A27]">Descrição (opcional)</Label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#1F2A27]">Texto Clínico *</Label>
                <Textarea
                  rows={8}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="text-xs font-serif-report leading-relaxed"
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={editingLoading}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-8 font-semibold"
              >
                {editingLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Delete Confirm */}
      <AlertDialog open={!!deleteMask} onOpenChange={(op) => !op && setDeleteMask(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-red-600 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Excluir Máscara Pessoal?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#5F6E69] leading-relaxed">
              Tem certeza que deseja excluir permanentemente a máscara{' '}
              <strong>"{deleteMask?.name}"</strong>? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteMask(null)} className="text-xs h-8">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMaskConfirm}
              disabled={deletingLoading}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 font-semibold"
            >
              {deletingLoading ? 'Excluindo...' : 'Sim, Excluir Máscara'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
