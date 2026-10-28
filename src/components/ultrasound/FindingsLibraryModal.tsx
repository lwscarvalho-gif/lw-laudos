import React, { useState, useEffect } from 'react'
import {
  Search,
  Star,
  Check,
  Plus,
  Bookmark,
  Sparkles,
  FileText,
  AlertTriangle,
  X,
  Edit2,
  Trash2,
} from 'lucide-react'
import { ultrasoundFindingsService } from '@/services/ultrasoundFindings'
import type { UltrasoundFinding } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface FindingsLibraryProps {
  organId: string
  organLabel: string
  onSelectFinding: (text: string) => void
}

export default function FindingsLibraryModal({
  organId,
  organLabel,
  onSelectFinding,
  isOpen,
  onClose,
}: FindingsLibraryProps & { isOpen: boolean; onClose: () => void }) {
  const { toast } = useToast()
  const [findings, setFindings] = useState<UltrasoundFinding[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'normal' | 'patologico' | 'favorites'>('all')

  // Review & customize before inserting
  const [reviewingFinding, setReviewingFinding] = useState<UltrasoundFinding | null>(null)
  const [reviewText, setReviewText] = useState('')

  // Variable inputs if finding has placeholders
  const [variableLado, setVariableLado] = useState<'direito' | 'esquerdo' | 'bilateral' | ''>('')
  const [variableLocal, setVariableLocal] = useState('')
  const [variableDimensoes, setVariableDimensoes] = useState('')
  const [variableQtd, setVariableQtd] = useState('')

  // New Finding creation dialog
  const [newFindingOpen, setNewFindingOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<'normal' | 'patologico'>('patologico')
  const [newContent, setNewContent] = useState('')
  const [savingNew, setSavingNew] = useState(false)

  const loadFindings = async () => {
    if (!organId) return
    setLoading(true)
    try {
      const list = await ultrasoundFindingsService.getByOrgan(organId)
      setFindings(list)
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a biblioteca de textos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadFindings()
      setReviewingFinding(null)
      setSearchTerm('')
    }
  }, [isOpen, organId])

  const handleToggleFavorite = async (e: React.MouseEvent, finding: UltrasoundFinding) => {
    e.stopPropagation()
    try {
      await ultrasoundFindingsService.toggleFavorite(finding.id, !!finding.is_favorite)
      setFindings((prev) =>
        prev.map((f) => (f.id === finding.id ? { ...f, is_favorite: !f.is_favorite } : f)),
      )
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar favorito.',
        variant: 'destructive',
      })
    }
  }

  const handleStartReview = (finding: UltrasoundFinding) => {
    setReviewingFinding(finding)
    setReviewText(finding.text_content)
    setVariableLado('')
    setVariableLocal('')
    setVariableDimensoes('')
    setVariableQtd('')
  }

  const applyVariablesToReview = () => {
    if (!reviewingFinding) return
    let text = reviewingFinding.text_content
    if (variableLado) {
      text = text.replace(/\[LADO\]/gi, variableLado)
    }
    if (variableLocal.trim()) {
      text = text.replace(/\[LOCALIZACAO\]/gi, variableLocal.trim())
      text = text.replace(/\[SEGMENTO\]/gi, variableLocal.trim())
    }
    if (variableDimensoes.trim()) {
      text = text.replace(/\[DIMENSOES_MM\]/gi, variableDimensoes.trim())
    }
    if (variableQtd.trim()) {
      text = text.replace(/\[QUANTIDADE\]/gi, variableQtd.trim())
    }
    setReviewText(text)
  }

  const handleConfirmInsert = () => {
    if (!reviewText.trim()) return
    onSelectFinding(reviewText.trim())
    onClose()
  }

  const handleSaveNewCustom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) return

    setSavingNew(true)
    try {
      const created = await ultrasoundFindingsService.create({
        organ: organId,
        title: newTitle.trim(),
        finding_type: newType,
        text_content: newContent.trim(),
        is_favorite: true,
      })
      setFindings((prev) => [created, ...prev])
      setNewFindingOpen(false)
      setNewTitle('')
      setNewContent('')
      toast({
        title: 'Frase salva',
        description: 'Nova frase cadastrada na sua biblioteca pessoal.',
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar frase.',
        variant: 'destructive',
      })
    } finally {
      setSavingNew(false)
    }
  }

  const filteredFindings = findings.filter((f) => {
    const matchesSearch =
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.text_content.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false

    if (activeTab === 'normal') return f.finding_type === 'normal'
    if (activeTab === 'patologico') return f.finding_type === 'patologico'
    if (activeTab === 'favorites') return !!f.is_favorite
    return true
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-[#E5E9E7]">
          <div className="flex items-center justify-between pr-4">
            <div>
              <DialogTitle className="text-lg font-bold text-[#1F2A27]">
                Biblioteca de Textos — {organLabel}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5F6E69]">
                Selecione uma frase padrão ou achado patológico para revisão e inserção na caixa
                ativa.
              </DialogDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setNewFindingOpen(true)}
              className="text-xs border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0]"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nova Frase
            </Button>
          </div>
        </DialogHeader>

        {reviewingFinding ? (
          /* STEP 2: REVISION BEFORE INSERTION */
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="flex items-center justify-between bg-[#F7F9F8] p-3 rounded-lg border border-[#E5E9E7]">
              <div>
                <span className="text-xs font-semibold text-[#1F2A27] block">
                  {reviewingFinding.title}
                </span>
                <span className="text-[11px] text-[#5F6E69]">
                  Tipo:{' '}
                  {reviewingFinding.finding_type === 'normal'
                    ? 'Padrão Normal'
                    : 'Achado Patológico'}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReviewingFinding(null)}
                className="text-xs text-[#5F6E69]"
              >
                Voltar à lista
              </Button>
            </div>

            {/* Variable fields optional */}
            <div className="bg-[#FAFBFB] p-3 rounded-lg border border-[#E5E9E7] space-y-3">
              <span className="text-xs font-semibold text-[#1F2A27] flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5 text-[#0C6B58]" />
                Campos Variáveis Opcionais (preencha somente se aplicável ao caso real)
              </span>
              <p className="text-[11px] text-[#5F6E69]">
                Não preencha medidas fictícias. O médico deve atestar as dimensões e lados reais.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div>
                  <Label className="text-[11px]">Lado</Label>
                  <Input
                    placeholder="Ex.: direito"
                    value={variableLado}
                    onChange={(e) => setVariableLado(e.target.value as any)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Localização / Segm.</Label>
                  <Input
                    placeholder="Ex.: polo superior / IV"
                    value={variableLocal}
                    onChange={(e) => setVariableLocal(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Dimensões (mm)</Label>
                  <Input
                    placeholder="Ex.: 14 x 9"
                    value={variableDimensoes}
                    onChange={(e) => setVariableDimensoes(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Quantidade</Label>
                  <Input
                    placeholder="Ex.: único / múltiplos"
                    value={variableQtd}
                    onChange={(e) => setVariableQtd(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {(variableLado || variableLocal || variableDimensoes || variableQtd) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyVariablesToReview}
                  className="text-xs h-7 border-[#0C6B58] text-[#0C6B58]"
                >
                  Substituir marcadores no texto
                </Button>
              )}
            </div>

            {/* Editable review text */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1F2A27]">
                Texto para Inserção (Revise e edite livremente antes de aplicar):
              </Label>
              <Textarea
                rows={5}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="text-xs leading-relaxed"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-[#E5E9E7]">
              <Button variant="outline" size="sm" onClick={() => setReviewingFinding(null)}>
                Voltar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmInsert}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Inserir na caixa de {organLabel}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* STEP 1: BROWSE FINDINGS */
          <div className="flex-1 overflow-hidden flex flex-col pt-3 space-y-3">
            {/* Search and filter tabs */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8A9691]" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar frase ou palavra-chave..."
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <div className="flex items-center gap-1 bg-[#F7F9F8] p-1 rounded-lg border border-[#E5E9E7]">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 text-xs rounded-md transition ${
                    activeTab === 'all'
                      ? 'bg-white font-semibold text-[#1F2A27] shadow-sm'
                      : 'text-[#5F6E69] hover:text-[#1F2A27]'
                  }`}
                >
                  Todas ({findings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('normal')}
                  className={`px-2.5 py-1 text-xs rounded-md transition ${
                    activeTab === 'normal'
                      ? 'bg-white font-semibold text-[#0C6B58] shadow-sm'
                      : 'text-[#5F6E69] hover:text-[#1F2A27]'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('patologico')}
                  className={`px-2.5 py-1 text-xs rounded-md transition ${
                    activeTab === 'patologico'
                      ? 'bg-white font-semibold text-amber-800 shadow-sm'
                      : 'text-[#5F6E69] hover:text-[#1F2A27]'
                  }`}
                >
                  Patológico
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('favorites')}
                  className={`px-2.5 py-1 text-xs rounded-md transition ${
                    activeTab === 'favorites'
                      ? 'bg-white font-semibold text-[#1F2A27] shadow-sm'
                      : 'text-[#5F6E69] hover:text-[#1F2A27]'
                  }`}
                >
                  Favoritas
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="py-12 text-center text-xs text-[#5F6E69]">
                  Carregando frases da biblioteca...
                </div>
              ) : filteredFindings.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#5F6E69] border border-dashed border-[#E5E9E7] rounded-lg">
                  Nenhuma frase encontrada para este filtro.
                </div>
              ) : (
                filteredFindings.map((finding) => (
                  <div
                    key={finding.id}
                    onClick={() => handleStartReview(finding)}
                    className="p-3 rounded-lg border border-[#E5E9E7] hover:border-[#0C6B58] hover:bg-[#F9FBFA] transition cursor-pointer flex flex-col gap-1.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#1F2A27] group-hover:text-[#0C6B58]">
                          {finding.title}
                        </span>
                        {finding.finding_type === 'normal' ? (
                          <Badge
                            variant="secondary"
                            className="bg-[#E8F3F0] text-[#0C6B58] text-[10px] font-medium"
                          >
                            Normal
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-amber-50 text-amber-800 text-[10px] font-medium"
                          >
                            Patológico
                          </Badge>
                        )}
                        {finding.has_variables && (
                          <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            Exemplo com variáveis
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, finding)}
                          className="p-1 text-[#8A9691] hover:text-amber-500 rounded"
                          title="Favoritar frase"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              finding.is_favorite ? 'fill-amber-400 text-amber-400' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-[#5F6E69] line-clamp-2 leading-relaxed">
                      {finding.text_content}
                    </p>

                    <div className="flex items-center justify-end text-[11px] text-[#0C6B58] font-semibold opacity-0 group-hover:opacity-100 transition pt-1">
                      <span>Revisar e inserir →</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-[#E5E9E7]">
              <Button variant="outline" size="sm" onClick={onClose}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* SUB-MODAL: CREATE NEW CUSTOM FINDING */}
        <Dialog open={newFindingOpen} onOpenChange={setNewFindingOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#1F2A27]">
                Nova Frase para {organLabel}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5F6E69]">
                Cadastre um modelo pessoal para reuso rápido nos seus laudos.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveNewCustom} className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Título do modelo *</Label>
                <Input
                  required
                  placeholder="Ex.: Litíase renal polar inferior"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Classificação</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-[#1F2A27] cursor-pointer">
                    <input
                      type="radio"
                      name="ftype"
                      checked={newType === 'normal'}
                      onChange={() => setNewType('normal')}
                    />
                    Normal
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[#1F2A27] cursor-pointer">
                    <input
                      type="radio"
                      name="ftype"
                      checked={newType === 'patologico'}
                      onChange={() => setNewType('patologico')}
                    />
                    Patológico
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Texto descritivo *</Label>
                <Textarea
                  required
                  rows={4}
                  placeholder="Texto do laudo. Pode incluir [DIMENSOES_MM] se desejar marcadores."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="text-xs leading-relaxed"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewFindingOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingNew}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
                >
                  {savingNew ? 'Salvando...' : 'Salvar frase'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
