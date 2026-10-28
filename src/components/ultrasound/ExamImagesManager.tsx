import React, { useState, useRef } from 'react'
import {
  Upload,
  Image as ImageIcon,
  Check,
  X,
  Trash2,
  MoveUp,
  MoveDown,
  Loader2,
  FileText,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { examImagesService } from '@/services/examImages'
import type { ExamImage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface ExamImagesManagerProps {
  images: ExamImage[]
  onImagesChange: (imgs: ExamImage[]) => void
  reportId?: string
  examId?: string
}

export default function ExamImagesManager({
  images,
  onImagesChange,
  reportId,
  examId,
}: ExamImagesManagerProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const validFiles: File[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      // Validate type: JPG/PNG
      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        toast({
          title: 'Arquivo inválido',
          description: `O arquivo "${file.name}" não é JPG ou PNG válido. Apenas JPG e PNG são aceitos.`,
          variant: 'destructive',
        })
        continue
      }
      // Validate size: 15MB max
      if (file.size > 15 * 1024 * 1024) {
        toast({
          title: 'Tamanho excessivo',
          description: `A imagem "${file.name}" excede o limite máximo permitido de 15MB.`,
          variant: 'destructive',
        })
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const uploadedResults: ExamImage[] = []
      let startOrder = images.length

      for (const file of validFiles) {
        const created = await examImagesService.upload(file, {
          report_id: reportId || undefined,
          exam_id: examId || undefined,
          sort_order: startOrder++,
          selected_for_print: true, // Default checked
          caption: '',
        })
        uploadedResults.push(created)
      }

      onImagesChange([...images, ...uploadedResults])
      toast({
        title: 'Imagens enviadas',
        description: `${uploadedResults.length} imagem(ns) adicionada(s) ao exame.`,
      })
    } catch {
      toast({
        title: 'Erro no envio',
        description: 'Falha ao salvar as imagens no servidor seguro.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Toggle selection for print (does NOT delete file)
  const handleTogglePrintSelection = async (index: number) => {
    const img = images[index]
    const updatedStatus = !img.selected_for_print
    const updatedList = images.map((it, idx) =>
      idx === index ? { ...it, selected_for_print: updatedStatus } : it,
    )
    onImagesChange(updatedList)

    try {
      await examImagesService.update(img.id, {
        selected_for_print: updatedStatus,
      })
    } catch {
      // rollback or silent warning
    }
  }

  // Update caption
  const handleCaptionChange = async (index: number, newCaption: string) => {
    const img = images[index]
    const updatedList = images.map((it, idx) =>
      idx === index ? { ...it, caption: newCaption } : it,
    )
    onImagesChange(updatedList)

    try {
      await examImagesService.update(img.id, { caption: newCaption })
    } catch {
      // silent
    }
  }

  // Delete image permanently from PB
  const handleDeleteImage = async (index: number) => {
    const img = images[index]
    try {
      await examImagesService.delete(img.id)
      const updatedList = images.filter((_, idx) => idx !== index)
      onImagesChange(updatedList)
      toast({
        title: 'Imagem removida',
        description: 'O arquivo foi excluído com sucesso.',
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir o arquivo.',
        variant: 'destructive',
      })
    }
  }

  // Move up
  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const list = [...images]
    const temp = list[index - 1]
    list[index - 1] = list[index]
    list[index] = temp

    // reindex sort_order
    list.forEach((item, idx) => {
      item.sort_order = idx
    })
    onImagesChange(list)

    // persist sort orders in background
    Promise.all([
      examImagesService.update(list[index - 1].id, { sort_order: index - 1 }),
      examImagesService.update(list[index].id, { sort_order: index }),
    ]).catch(() => {})
  }

  // Move down
  const handleMoveDown = async (index: number) => {
    if (index === images.length - 1) return
    const list = [...images]
    const temp = list[index + 1]
    list[index + 1] = list[index]
    list[index] = temp

    list.forEach((item, idx) => {
      item.sort_order = idx
    })
    onImagesChange(list)

    Promise.all([
      examImagesService.update(list[index + 1].id, { sort_order: index + 1 }),
      examImagesService.update(list[index].id, { sort_order: index }),
    ]).catch(() => {})
  }

  const selectedCount = images.filter((img) => img.selected_for_print !== false).length

  return (
    <div className="space-y-4">
      {/* Top Header info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E9E7]">
        <div>
          <h3 className="font-bold text-sm text-[#1F2A27] flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#0C6B58]" />
            Documentação Fotográfica do Exame
          </h3>
          <p className="text-xs text-[#5F6E69] mt-0.5">
            Anexe imagens JPG ou PNG. Todas vêm selecionadas para o anexo do laudo; desmarcar não
            apaga o arquivo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label
            className={`inline-flex items-center justify-center rounded-md font-medium transition cursor-pointer select-none text-white text-xs h-9 px-4 shadow-sm bg-[#0C6B58] hover:bg-[#0A5949] ${
              uploading ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png"
              multiple
              disabled={uploading}
              className="sr-only"
            />
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Enviando imagens...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Adicionar Imagens (JPG/PNG)
              </>
            )}
          </label>
        </div>
      </div>

      {/* Summary status */}
      <div className="flex items-center justify-between text-xs text-[#5F6E69] px-1">
        <span>
          Total: <strong>{images.length}</strong> imagem(ns) vinculada(s)
        </span>
        <span>
          Selecionadas para impressão/PDF: <strong>{selectedCount}</strong> de {images.length}
        </span>
      </div>

      {/* Images Grid */}
      {images.length === 0 ? (
        <label className="block p-8 text-center border-2 border-dashed border-[#E5E9E7] hover:border-[#0C6B58] rounded-xl bg-white space-y-2 cursor-pointer transition">
          <input
            type="file"
            onChange={handleFileSelect}
            accept="image/jpeg,image/png"
            multiple
            disabled={uploading}
            className="sr-only"
          />
          <ImageIcon className="w-8 h-8 text-[#8A9691] mx-auto stroke-1" />
          <p className="text-xs font-semibold text-[#1F2A27]">
            Nenhuma imagem anexada a este exame ainda
          </p>
          <p className="text-[11px] text-[#5F6E69]">
            Clique aqui ou no botão acima para selecionar capturas ultrassonográficas (JPG ou PNG
            até 15MB cada).
          </p>
        </label>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, index) => {
            const isSelected = img.selected_for_print !== false
            const url = examImagesService.getImageUrl(img)

            return (
              <div
                key={img.id}
                className={`bg-white rounded-xl border transition flex flex-col overflow-hidden ${
                  isSelected
                    ? 'border-[#0C6B58] ring-1 ring-[#0C6B58]/20 shadow-sm'
                    : 'border-[#E5E9E7] opacity-60'
                }`}
              >
                {/* Image display & overlay buttons */}
                <div className="relative h-44 bg-[#0B0E0D] flex items-center justify-center overflow-hidden group">
                  <img
                    src={url}
                    alt={img.caption || `Imagem ${index + 1}`}
                    className="max-h-full max-w-full object-contain"
                  />

                  {/* Print checkbox tag top-left */}
                  <button
                    type="button"
                    onClick={() => handleTogglePrintSelection(index)}
                    className={`absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold transition ${
                      isSelected
                        ? 'bg-[#0C6B58] text-white shadow'
                        : 'bg-white/90 text-[#5F6E69] hover:bg-white'
                    }`}
                    title={isSelected ? 'Incluída na impressão' : 'Oculta na impressão'}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                        isSelected ? 'border-white bg-[#0C6B58]' : 'border-[#5F6E69] bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    {isSelected ? 'Na impressão' : 'Desmarcada'}
                  </button>

                  {/* Top-right preview zoom */}
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(url)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/90 text-white rounded opacity-0 group-hover:opacity-100 transition"
                    title="Ampliar imagem"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {/* Position badge */}
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                    #{index + 1}
                  </span>
                </div>

                {/* Bottom Controls: Caption & reorder */}
                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between bg-white">
                  <div>
                    <Label className="text-[10px] text-[#5F6E69] font-medium block mb-1">
                      Legenda / Identificação:
                    </Label>
                    <Input
                      placeholder="Ex.: Fígado corte longitudinal"
                      value={img.caption || ''}
                      onChange={(e) => handleCaptionChange(index, e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E5E9E7]">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => handleMoveUp(index)}
                        className="h-6 w-6 text-[#5F6E69] hover:text-[#1F2A27]"
                        title="Mover para cima"
                      >
                        <MoveUp className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={index === images.length - 1}
                        onClick={() => handleMoveDown(index)}
                        className="h-6 w-6 text-[#5F6E69] hover:text-[#1F2A27]"
                        title="Mover para baixo"
                      >
                        <MoveDown className="w-3 h-3" />
                      </Button>
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteImage(index)}
                      className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Excluir imagem do exame"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewModalUrl} onOpenChange={(open) => !open && setPreviewModalUrl(null)}>
        <DialogContent className="max-w-4xl p-2 bg-black border-none flex flex-col items-center">
          <div className="w-full flex justify-end p-2">
            <button
              onClick={() => setPreviewModalUrl(null)}
              className="text-white hover:text-gray-300 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {previewModalUrl && (
            <img
              src={previewModalUrl}
              alt="Ampliação"
              className="max-h-[80vh] max-w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
