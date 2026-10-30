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
  Eye,
  Server,
  FileCode,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Grid,
  List,
} from 'lucide-react'
import { examImagesService } from '@/services/examImages'
import type { ExamImage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { extractDicomFrames } from '@/lib/dicomParser'
import { OrthancPacsSearchModal } from '@/components/ultrasound/OrthancPacsSearchModal'

interface ExamImagesManagerProps {
  images: ExamImage[]
  onImagesChange: (imgs: ExamImage[]) => void
  reportId?: string
  examId?: string
  patientName?: string
  patientId?: string
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
  const [uploadProgressText, setUploadProgressText] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewModalIndex, setPreviewModalIndex] = useState<number | null>(null)
  const [pacsModalOpen, setPacsModalOpen] = useState(false)
  const [displayMode, setDisplayMode] = useState<'card' | 'expanded'>('card')

  const processAndUploadFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return

    const filesArray = Array.from(fileList)
    setUploading(true)
    setUploadProgressText('Processando arquivos selecionados...')

    const itemsToUpload: Array<{
      blob: Blob | File
      fileName: string
      caption: string
      isRealDicom?: boolean
    }> = []

    for (const file of filesArray) {
      const lowerName = file.name.toLowerCase()
      const isDicom =
        lowerName.endsWith('.dcm') ||
        lowerName.endsWith('.dicom') ||
        file.type === 'application/dicom'

      if (isDicom) {
        setUploadProgressText(`Decodificando frames DICOM de ${file.name}...`)
        try {
          const frames = await extractDicomFrames(file)
          if (frames.length === 0) {
            toast({
              title: 'Arquivo DICOM sem frames',
              description: `Não foram encontrados frames visuais em "${file.name}".`,
              variant: 'destructive',
            })
            continue
          }

          frames.forEach((frame, idx) => {
            const frameLabel = frames.length > 1 ? ` (Frame ${idx + 1}/${frames.length})` : ''
            const desc =
              frame.metadata.studyDescription || frame.metadata.seriesDescription || 'Frame DICOM'
            itemsToUpload.push({
              blob: frame.blob,
              fileName: `${file.name.replace(/\.[^/.]+$/, '')}_frame_${idx + 1}.jpg`,
              caption: `DICOM: ${desc}${frameLabel}`,
              isRealDicom: true,
            })
          })
        } catch (dicomErr: unknown) {
          const msg = dicomErr instanceof Error ? dicomErr.message : 'Falha na decodificação'
          toast({
            title: 'Erro ao processar DICOM',
            description: `Não foi possível ler o arquivo DICOM "${file.name}": ${msg}`,
            variant: 'destructive',
          })
        }
        continue
      }

      // Check standard JPG / PNG
      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        toast({
          title: 'Arquivo não suportado',
          description: `O arquivo "${file.name}" não é JPG, PNG nem DICOM (.dcm).`,
          variant: 'destructive',
        })
        continue
      }

      if (file.size > 15 * 1024 * 1024) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
        toast({
          title: 'Tamanho excedido (limite 15 MB)',
          description: `A imagem "${file.name}" possui ${sizeMb} MB e ultrapassa o limite de 15 MB.`,
          variant: 'destructive',
        })
        continue
      }

      itemsToUpload.push({
        blob: file,
        fileName: file.name,
        caption: '',
        isRealDicom: false,
      })
    }

    if (itemsToUpload.length === 0) {
      setUploading(false)
      setUploadProgressText('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploadProgressText(`Salvando ${itemsToUpload.length} imagem(ns) no laudo...`)
    const uploadedResults: ExamImage[] = []
    const errors: string[] = []
    let startOrder = images.length

    for (let i = 0; i < itemsToUpload.length; i++) {
      const item = itemsToUpload[i]
      setUploadProgressText(`Enviando frame ${i + 1} de ${itemsToUpload.length}...`)
      try {
        const created = await examImagesService.upload(item.blob, {
          report_id: reportId || undefined,
          exam_id: examId || undefined,
          sort_order: startOrder++,
          selected_for_print: true, // Default checked
          caption: item.caption,
          fileName: item.fileName,
        })

        // Flag in memory whether this is real DICOM
        if (item.isRealDicom) {
          created.is_real_dicom = true
        }

        uploadedResults.push(created)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha na requisição'
        errors.push(`"${item.fileName}": ${msg}`)
      }
    }

    if (uploadedResults.length > 0) {
      onImagesChange([...images, ...uploadedResults])
      toast({
        title: 'Imagens anexadas',
        description: `${uploadedResults.length} imagem(ns) vinculada(s) ao exame com sucesso.`,
      })
    }

    if (errors.length > 0) {
      toast({
        title: 'Falha no envio de arquivo(s)',
        description: `Não foi possível enviar: ${errors.join(', ')}.`,
        variant: 'destructive',
      })
    }

    setUploading(false)
    setUploadProgressText('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Handler for direct PACS Orthanc frames import
  const handleImportPacsFrames = async (
    frames: { blob: Blob; fileName: string; caption: string }[],
  ) => {
    setUploading(true)
    setUploadProgressText(`Vinculando ${frames.length} frame(s) do PACS Orthanc...`)
    const uploadedResults: ExamImage[] = []
    let startOrder = images.length

    for (let i = 0; i < frames.length; i++) {
      const f = frames[i]
      try {
        const created = await examImagesService.upload(f.blob, {
          report_id: reportId || undefined,
          exam_id: examId || undefined,
          sort_order: startOrder++,
          selected_for_print: true,
          caption: f.caption,
          fileName: f.fileName,
        })
        created.is_real_dicom = true
        uploadedResults.push(created)
      } catch (err) {
        console.error('Erro ao enviar imagem importada do PACS:', err)
      }
    }

    if (uploadedResults.length > 0) {
      onImagesChange([...images, ...uploadedResults])
    }
    setUploading(false)
    setUploadProgressText('')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processAndUploadFiles(e.target.files)
    }
  }

  // Accessible Drag-and-Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!uploading) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (uploading) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAndUploadFiles(e.dataTransfer.files)
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
      {/* Top Header info & Native Visible File Input */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E9E7] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-[#1F2A27] flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#0C6B58]" />
              Documentação Fotográfica do Exame
            </h3>
            <p className="text-xs text-[#5F6E69] mt-0.5">
              Anexe imagens JPG ou PNG (até 15 MB cada). Todas vêm selecionadas para o anexo do
              laudo; desmarcar não apaga o arquivo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* PACS Orthanc Import Action Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPacsModalOpen(true)}
              className="h-8 border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] text-xs font-semibold gap-1.5"
            >
              <Server className="w-3.5 h-3.5" />
              Buscar no PACS Orthanc
            </Button>

            {uploading && (
              <span className="flex items-center gap-1.5 text-xs text-[#0C6B58] font-medium bg-[#E8F3F0] px-2.5 py-1 rounded-md">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {uploadProgressText || 'Enviando imagens...'}
              </span>
            )}
          </div>
        </div>

        {/* Option: Visible Native File Input with DICOM support */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#E5E9E7]">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="native-file-input"
              className="text-xs font-semibold text-[#1F2A27] shrink-0"
            >
              Seletor direto de arquivo:
            </Label>
            <input
              id="native-file-input"
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,.dcm,.dicom,application/dicom"
              multiple
              disabled={uploading}
              className="text-xs text-[#1F2A27] file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0C6B58] file:text-white hover:file:bg-[#0A5949] cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] text-[#0C6B58] border-[#0C6B58]/40 bg-[#E8F3F0]/50 flex items-center gap-1"
            >
              <FileCode className="w-3 h-3" />
              DICOM (.dcm) nativo suportado
            </Badge>
          </div>
        </div>
      </div>

      {/* Accessible Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-6 text-center border-2 border-dashed rounded-xl transition cursor-pointer select-none ${
          isDragOver
            ? 'border-[#0C6B58] bg-[#E8F3F0] scale-[0.998]'
            : 'border-[#D6DDD9] bg-white hover:border-[#0C6B58] hover:bg-[#F7F9F8]'
        }`}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        aria-label="Área de arrastar e soltar imagens para o exame"
      >
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <Upload className={`w-7 h-7 ${isDragOver ? 'text-[#0C6B58]' : 'text-[#8A9691]'}`} />
          <div>
            <p className="text-xs font-semibold text-[#1F2A27]">
              {isDragOver
                ? 'Solte as imagens aqui para iniciar o envio'
                : 'Arraste e solte arquivos DICOM (.dcm), JPG ou PNG aqui'}
            </p>
            <p className="text-[11px] text-[#5F6E69] mt-0.5">
              Frames DICOM (incluindo multi-frame) são extraídos e convertidos automaticamente
            </p>
          </div>
        </div>
      </div>

      {/* Summary status and view mode toggles */}
      <div className="flex items-center justify-between text-xs text-[#5F6E69] px-1">
        <span>
          <strong>{images.length}</strong> imagem(ns) • <strong>{selectedCount}</strong> na
          impressão
        </span>

        {images.length > 0 && (
          <div className="flex items-center gap-1 bg-[#FAFBFB] p-0.5 rounded-lg border border-[#E5E9E7]">
            <button
              type="button"
              onClick={() => setDisplayMode('card')}
              className={`p-1 rounded text-xs transition flex items-center gap-1 ${
                displayMode === 'card'
                  ? 'bg-white shadow-xs font-semibold text-[#0C6B58]'
                  : 'text-[#5F6E69] hover:text-[#1F2A27]'
              }`}
              title="Visualização padrão com dados e edição de legenda"
            >
              <List className="w-3.5 h-3.5" />
              <span className="text-[10px]">Padrão</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('expanded')}
              className={`p-1 rounded text-xs transition flex items-center gap-1 ${
                displayMode === 'expanded'
                  ? 'bg-white shadow-xs font-semibold text-[#0C6B58]'
                  : 'text-[#5F6E69] hover:text-[#1F2A27]'
              }`}
              title="Miniaturas ampliadas com foco na consulta médica visual"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="text-[10px]">Visão Clínica</span>
            </button>
          </div>
        )}
      </div>

      {/* Images Grid — na coluna lateral fica com rolagem suave caso haja muitas imagens */}
      {images.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-[#FAFBFB] border border-[#E5E9E7] space-y-2">
          <ImageIcon className="w-7 h-7 text-[#8A9691] mx-auto stroke-1" />
          <p className="text-xs font-semibold text-[#1F2A27]">
            Nenhuma imagem anexada a este exame ainda
          </p>
          <p className="text-[11px] text-[#5F6E69]">
            Utilize o seletor nativo visível ou a área de arrastar e soltar acima para adicionar
            capturas ecográficas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className={`overflow-y-auto pr-1 max-h-[700px] scrollbar-thin ${
              displayMode === 'expanded'
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'
                : 'grid grid-cols-1 gap-3'
            }`}
          >
            {images.map((img, index) => {
              const isSelected = img.selected_for_print !== false
              const url = examImagesService.getImageUrl(img)

              if (displayMode === 'expanded') {
                // Expanded clinical viewing: large thumbnail with quick zoom click
                return (
                  <div
                    key={img.id}
                    className={`bg-white rounded-lg border transition flex flex-col overflow-hidden group ${
                      isSelected
                        ? 'border-[#0C6B58] ring-1 ring-[#0C6B58]/20 shadow-xs'
                        : 'border-[#E5E9E7] opacity-75'
                    }`}
                  >
                    <div
                      className="relative h-40 bg-[#0B0E0D] flex items-center justify-center overflow-hidden cursor-pointer"
                      onClick={() => setPreviewModalIndex(index)}
                      title="Clique para ampliar em tela cheia para consulta de dúvidas"
                    >
                      <img
                        src={url}
                        alt={img.caption || `Imagem ${index + 1}`}
                        className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105 duration-200"
                        loading="lazy"
                      />

                      {/* Top-left position & DICOM */}
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                        <span className="bg-black/75 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                          #{index + 1}
                        </span>
                        {(img.is_real_dicom ||
                          img.caption?.includes('DICOM') ||
                          img.caption?.includes('PACS')) && (
                          <span className="bg-[#0C6B58] text-white text-[9px] px-1 py-0.5 rounded font-semibold">
                            DICOM
                          </span>
                        )}
                      </div>

                      {/* Top-right zoom action button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreviewModalIndex(index)
                        }}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-black text-white rounded transition"
                        title="Ampliar em tela cheia"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Center hover indicator */}
                      <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition pointer-events-none">
                        <span className="text-xs font-semibold bg-black/70 px-2.5 py-1 rounded-md flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          Consultar Imagem
                        </span>
                      </div>
                    </div>

                    {/* Bottom minimal strip with caption & print toggle */}
                    <div className="p-2 bg-white flex items-center justify-between gap-1 text-[11px] border-t border-[#E5E9E7]">
                      <span
                        className="truncate text-[#1F2A27] font-medium flex-1"
                        title={img.caption || `Imagem ${index + 1}`}
                      >
                        {img.caption || `Imagem ${index + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTogglePrintSelection(index)}
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${
                          isSelected ? 'bg-[#E8F3F0] text-[#0C6B58]' : 'bg-gray-100 text-[#8A9691]'
                        }`}
                        title={isSelected ? 'Incluída no anexo do laudo' : 'Oculta na impressão'}
                      >
                        {isSelected ? '✓ Imprimir' : 'Oculta'}
                      </button>
                    </div>
                  </div>
                )
              }

              // Standard card mode with full caption input and reordering controls
              return (
                <div
                  key={img.id}
                  className={`bg-white rounded-xl border transition flex flex-col overflow-hidden ${
                    isSelected
                      ? 'border-[#0C6B58] ring-1 ring-[#0C6B58]/20 shadow-sm'
                      : 'border-[#E5E9E7] opacity-65'
                  }`}
                >
                  {/* Image display & overlay buttons */}
                  <div
                    className="relative h-48 bg-[#0B0E0D] flex items-center justify-center overflow-hidden group cursor-pointer"
                    onClick={() => setPreviewModalIndex(index)}
                    title="Clique para ampliar imagem em alta resolução"
                  >
                    <img
                      src={url}
                      alt={img.caption || `Imagem ${index + 1}`}
                      className="max-h-full max-w-full object-contain transition-transform group-hover:scale-102 duration-200"
                      loading="lazy"
                    />

                    {/* Print checkbox tag top-left */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTogglePrintSelection(index)
                      }}
                      className={`absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold transition ${
                        isSelected
                          ? 'bg-[#0C6B58] text-white shadow'
                          : 'bg-white/90 text-[#5F6E69] hover:bg-white'
                      }`}
                      title={isSelected ? 'Incluída na impressão' : 'Oculta na impressão'}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                          isSelected
                            ? 'border-white bg-[#0C6B58]'
                            : 'border-[#5F6E69] bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {isSelected ? 'Na impressão' : 'Desmarcada'}
                    </button>

                    {/* Top-right preview zoom */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewModalIndex(index)
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/90 text-white rounded transition flex items-center gap-1 text-[11px]"
                      title="Ampliar imagem para sanar dúvidas"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Ampliar</span>
                    </button>

                    {/* Position badge */}
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                      #{index + 1}
                    </span>

                    {/* DICOM Real Tag */}
                    {(img.is_real_dicom ||
                      img.caption?.includes('DICOM') ||
                      img.caption?.includes('PACS')) && (
                      <span className="absolute bottom-2 right-2 bg-[#0C6B58]/90 text-white text-[9px] px-1.5 py-0.5 rounded font-semibold tracking-wider">
                        FRAME REAL DICOM
                      </span>
                    )}
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
        </div>
      )}

      {/* PACS Orthanc Search Modal */}
      <OrthancPacsSearchModal
        open={pacsModalOpen}
        onOpenChange={setPacsModalOpen}
        onImportFrames={handleImportPacsFrames}
        defaultPatientName=""
        defaultPatientId=""
      />

      {/* Lightbox / High Resolution Viewer Dialog with Prev/Next Navigation */}
      <Dialog
        open={previewModalIndex !== null}
        onOpenChange={(open) => !open && setPreviewModalIndex(null)}
      >
        <DialogContent className="max-w-5xl w-[96vw] h-[92vh] p-0 bg-[#0B0E0D] border-none flex flex-col overflow-hidden text-white">
          {previewModalIndex !== null && images[previewModalIndex] && (
            <>
              {/* Header with image index, caption and close */}
              <div className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold bg-[#0C6B58] px-2 py-0.5 rounded">
                    Imagem {previewModalIndex + 1} de {images.length}
                  </span>
                  <span className="text-xs text-white/90 truncate max-w-md">
                    {images[previewModalIndex].caption || 'Sem legenda'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewModalIndex(null)}
                    className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10"
                    title="Fechar visualizador"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main image stage with prev/next overlays */}
              <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden select-none bg-black">
                <img
                  src={examImagesService.getImageUrl(images[previewModalIndex])}
                  alt={images[previewModalIndex].caption || `Imagem ${previewModalIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                />

                {/* Left arrow */}
                {previewModalIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setPreviewModalIndex(previewModalIndex - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white transition border border-white/20"
                    title="Imagem anterior"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {/* Right arrow */}
                {previewModalIndex < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setPreviewModalIndex(previewModalIndex + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white transition border border-white/20"
                    title="Próxima imagem"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Footer strip: Thumbnails carousel for rapid hopping */}
              <div className="px-4 py-2 bg-black/80 border-t border-white/10 shrink-0 flex items-center gap-2 overflow-x-auto">
                {images.map((thumbImg, thumbIdx) => {
                  const thumbUrl = examImagesService.getImageUrl(thumbImg)
                  const isCurrent = thumbIdx === previewModalIndex
                  return (
                    <button
                      key={thumbImg.id}
                      type="button"
                      onClick={() => setPreviewModalIndex(thumbIdx)}
                      className={`relative w-14 h-11 shrink-0 rounded overflow-hidden border-2 transition ${
                        isCurrent
                          ? 'border-[#0C6B58] scale-105'
                          : 'border-white/20 hover:border-white/60 opacity-60 hover:opacity-100'
                      }`}
                      title={thumbImg.caption || `Imagem ${thumbIdx + 1}`}
                    >
                      <img
                        src={thumbUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute bottom-0 right-0 bg-black/80 text-[9px] px-1 font-mono">
                        #{thumbIdx + 1}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
