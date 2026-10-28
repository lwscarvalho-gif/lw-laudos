import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Printer,
  Sparkles,
  Layers,
  BookOpen,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  HelpCircle,
  AlertTriangle,
  Loader2,
  FileCheck2,
  LayoutGrid,
  Download,
  Eye,
  FileText,
} from 'lucide-react'
import { reportsService } from '@/services/reports'
import { examsService } from '@/services/exams'
import { patientsService } from '@/services/patients'
import { ultrasoundFindingsService } from '@/services/ultrasoundFindings'
import { examImagesService } from '@/services/examImages'
import { useAuth } from '@/contexts/AuthContext'
import type {
  Patient,
  Exam,
  ExamImage,
  Report,
  UltrasoundSectionData,
  ReportStructuredData,
} from '@/types'
import { printReportPDF, buildReportHTML, downloadReportHTML } from '@/lib/pdfGenerator'
import { formatDateBR } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import FindingsLibraryModal from '@/components/ultrasound/FindingsLibraryModal'
import ExamImagesManager from '@/components/ultrasound/ExamImagesManager'
import AiAssistantPanel from '@/components/ultrasound/AiAssistantPanel'

// Default structured sections for Abdome Total
const DEFAULT_ABDOME_SECTIONS: Array<{ id: string; label: string }> = [
  { id: 'figado', label: 'Fígado' },
  { id: 'vias_biliares', label: 'Vias Biliares' },
  { id: 'vesicula', label: 'Vesícula Biliar' },
  { id: 'pancreas', label: 'Pâncreas' },
  { id: 'baco', label: 'Baço' },
  { id: 'rim_direito', label: 'Rim Direito' },
  { id: 'rim_esquerdo', label: 'Rim Esquerdo' },
  { id: 'bexiga', label: 'Bexiga' },
  { id: 'vasos', label: 'Grandes Vasos (Aorta e Cava)' },
  { id: 'retroperitonio', label: 'Retroperitônio e Cavidade' },
  { id: 'observacoes', label: 'Observações Técnicas e Preparo' },
]

export default function UltrasoundReportEditor() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const reportIdParam = searchParams.get('id') || ''
  const prefilledExamId = searchParams.get('exame') || ''
  const prefilledPatientId = searchParams.get('paciente') || ''

  const { user } = useAuth()
  const { toast } = useToast()

  // Data sources
  const [patients, setPatients] = useState<Patient[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [loadingInitial, setLoadingInitial] = useState(true)

  // Report Form State
  const [currentReportId, setCurrentReportId] = useState<string>(reportIdParam)
  const [title, setTitle] = useState('Laudo de Ultrassonografia de Abdome Total')
  const [patientId, setPatientId] = useState(prefilledPatientId)
  const [examId, setExamId] = useState(prefilledExamId)
  const [sections, setSections] = useState<UltrasoundSectionData[]>(() =>
    DEFAULT_ABDOME_SECTIONS.map((sec) => ({
      id: sec.id,
      label: sec.label,
      text: '',
    })),
  )
  const [conclusion, setConclusion] = useState('')
  const [mode, setMode] = useState<'structured' | 'freetext'>('structured')
  const [freeTextBody, setFreeTextBody] = useState('')

  // Images state & config
  const [images, setImages] = useState<ExamImage[]>([])
  const [imagesPerPage, setImagesPerPage] = useState<2 | 4 | 6>(4)

  // Active Organ for Ctrl+N / Normal button / Library
  const [activeOrganId, setActiveOrganId] = useState<string>('figado')
  const [activeOrganLabel, setActiveOrganLabel] = useState<string>('Fígado')

  // Replacement confirmation state
  // PDF inside app preview state
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfPreviewHtml, setPdfPreviewHtml] = useState('')

  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false)
  const [pendingTextToInsert, setPendingTextToInsert] = useState<{
    targetId: string
    newText: string
  } | null>(null)

  // Undo memory map per section: organId -> previousText
  const [historyUndo, setHistoryUndo] = useState<Record<string, string>>({})

  // Library modal
  const [libraryModalOpen, setLibraryModalOpen] = useState(false)
  const [libraryTargetOrgan, setLibraryTargetOrgan] = useState<{ id: string; label: string }>({
    id: 'figado',
    label: 'Fígado',
  })

  // Add custom section modal
  const [addSectionOpen, setAddSectionOpen] = useState(false)
  const [newSectionLabel, setNewSectionLabel] = useState('')

  // Autosave tracking
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Finalize Dialog
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false)
  const [explicitReviewed, setExplicitReviewed] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  // Ref tracking for textarea elements
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  // Initial Data Loading
  useEffect(() => {
    async function init() {
      try {
        const pts = await patientsService.getAll()
        setPatients(pts)

        if (reportIdParam) {
          // Load existing report
          const rep = await reportsService.getById(reportIdParam)
          setCurrentReportId(rep.id)
          setTitle(rep.title || 'Laudo de Ultrassonografia')
          setPatientId(rep.patient_id)
          setExamId(rep.exam_id || '')

          if (rep.structured_data?.sections && rep.structured_data.sections.length > 0) {
            setSections(rep.structured_data.sections)
            setConclusion(rep.structured_data.conclusion || rep.conclusion || '')
            setMode(rep.structured_data.mode || 'structured')
          } else {
            // legacy free text
            setMode('freetext')
            setFreeTextBody(rep.body)
          }

          if (rep.images_config?.imagesPerPage) {
            setImagesPerPage(rep.images_config.imagesPerPage)
          }

          // Load images associated
          const imgs = await examImagesService.getByReportId(rep.id)
          setImages(imgs)
        } else if (prefilledExamId) {
          // New report from existing exam
          const ex = await examsService.getById(prefilledExamId)
          setExamId(ex.id)
          setPatientId(ex.patient_id)
          setTitle(`Laudo de Ultrassonografia - ${ex.type}`)

          // Also fetch exam images if any exist
          const imgs = await examImagesService.getByExamId(ex.id)
          setImages(imgs)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingInitial(false)
      }
    }
    init()
  }, [reportIdParam, prefilledExamId])

  // Load patient's exams when patientId changes
  useEffect(() => {
    if (patientId) {
      examsService
        .getByPatientId(patientId)
        .then((patientExams) => {
          setExams(patientExams)
          // If examId doesn't belong to this patient, clear exam selection
          if (examId) {
            const belongs = patientExams.some((e) => e.id === examId)
            if (!belongs) {
              setExamId('')
            }
          }
        })
        .catch(() => setExams([]))
    } else {
      setExams([])
      setExamId('')
    }
  }, [patientId])

  // Handle Patient Change with server validation
  const handlePatientChange = (newPatientId: string) => {
    setPatientId(newPatientId)
    // Server validation: clean exam selection immediately
    setExamId('')
    setHasUnsavedChanges(true)
  }

  // Handle Exam Change with server cross-check
  const handleExamChange = (newExamId: string) => {
    if (!newExamId) {
      setExamId('')
      return
    }
    const matched = exams.find((e) => e.id === newExamId)
    if (matched && matched.patient_id === patientId) {
      setExamId(newExamId)
      setHasUnsavedChanges(true)
    } else {
      toast({
        title: 'Vínculo inválido',
        description: 'O exame selecionado não pertence a este paciente.',
        variant: 'destructive',
      })
      setExamId('')
    }
  }

  // Update section text
  const handleSectionTextChange = (id: string, text: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)))
    setHasUnsavedChanges(true)
  }

  // Assemble HTML body for storage and printing
  const generateFullHtmlBody = useCallback((): string => {
    if (mode === 'freetext') {
      return freeTextBody
    }

    let html = '<div class="ultrasound-structured-report">'
    sections.forEach((sec) => {
      if (sec.text.trim()) {
        html += `<div class="report-organ-block" style="margin-bottom: 12px;">
          <h3 style="font-family: -apple-system, sans-serif; font-size: 11pt; font-weight: 700; color: #0C6B58; margin: 0 0 4px 0; text-transform: uppercase;">${sec.label}:</h3>
          <p style="margin: 0; line-height: 1.5; font-size: 11pt; color: #1F2A27;">${sec.text.replace(/\n/g, '<br/>')}</p>
        </div>`
      }
    })
    html += '</div>'
    return html
  }, [mode, freeTextBody, sections])

  // AUTOSAVE LOGIC (Saves as Draft; does NOT mark as concluded)
  const performSaveDraft = useCallback(
    async (manual = false) => {
      if (!patientId || !title.trim()) {
        if (manual) {
          toast({
            title: 'Campos obrigatórios',
            description: 'Informe o título do laudo e selecione o paciente para salvar.',
            variant: 'destructive',
          })
        }
        return
      }

      // Validate patient-exam match
      if (examId) {
        const found = exams.find((e) => e.id === examId)
        if (found && found.patient_id !== patientId) {
          toast({
            title: 'Inconsistência cadastral',
            description: 'O exame selecionado não pertence ao paciente indicado.',
            variant: 'destructive',
          })
          return
        }
      }

      setAutosaveStatus('saving')
      try {
        const bodyHtml = generateFullHtmlBody()
        const structuredData: ReportStructuredData = {
          sections,
          conclusion,
          mode,
        }
        const imagesConfig = {
          imagesPerPage,
        }

        let savedRep: Report
        if (currentReportId) {
          savedRep = await reportsService.update(currentReportId, {
            title: title.trim(),
            patient_id: patientId,
            exam_id: examId || undefined,
            body: bodyHtml,
            conclusion,
            structured_data: structuredData,
            images_config: imagesConfig,
            status: 'Rascunho',
            is_draft: true,
          })
        } else {
          savedRep = await reportsService.create({
            title: title.trim(),
            patient_id: patientId,
            exam_id: examId || undefined,
            body: bodyHtml,
            conclusion,
            structured_data: structuredData,
            images_config: imagesConfig,
            status: 'Rascunho',
            is_draft: true,
            exam_type: 'Ultrassonografia',
          })
          setCurrentReportId(savedRep.id)

          // Update URL query string with the newly created draft id without page reload
          const currentUrl = new URL(window.location.href)
          if (currentUrl.searchParams.get('id') !== savedRep.id) {
            currentUrl.searchParams.set('id', savedRep.id)
            window.history.replaceState({}, '', currentUrl.toString())
          }

          // Link any pending images to this newly created report
          if (images.length > 0) {
            await examImagesService.linkImagesToReport(
              images.map((img) => img.id),
              savedRep.id,
            )
          }
        }

        setAutosaveStatus('saved')
        setLastSavedTime(new Date())
        setHasUnsavedChanges(false)
        if (manual) {
          toast({
            title: 'Rascunho salvo',
            description: 'O laudo foi salvo como rascunho. O exame segue em andamento.',
          })
        }
      } catch (err) {
        console.error(err)
        setAutosaveStatus('error')
        if (manual) {
          toast({
            title: 'Erro ao salvar',
            description: 'Não foi possível salvar o rascunho no servidor.',
            variant: 'destructive',
          })
        }
      }
    },
    [
      patientId,
      examId,
      exams,
      title,
      generateFullHtmlBody,
      sections,
      conclusion,
      mode,
      imagesPerPage,
      currentReportId,
      images,
      toast,
    ],
  )

  // Debounced autosave effect
  useEffect(() => {
    if (!hasUnsavedChanges || loadingInitial) return
    const timer = setTimeout(() => {
      performSaveDraft(false)
    }, 4000)
    return () => clearTimeout(timer)
  }, [hasUnsavedChanges, performSaveDraft, loadingInitial])

  // NORMAL TEXT INSERTION WITH CONFIRMATION AND UNDO
  const requestInsertText = (targetId: string, newText: string) => {
    let currentText = ''
    if (targetId === 'conclusao') {
      currentText = conclusion
    } else {
      const sec = sections.find((s) => s.id === targetId)
      currentText = sec ? sec.text : ''
    }

    // If current text already exists and differs, ask confirmation
    if (currentText.trim() && currentText.trim() !== newText.trim()) {
      setPendingTextToInsert({ targetId, newText })
      setReplaceConfirmOpen(true)
    } else {
      executeTextInsertion(targetId, newText)
    }
  }

  const executeTextInsertion = (targetId: string, newText: string) => {
    // Save to undo history first
    if (targetId === 'conclusao') {
      setHistoryUndo((prev) => ({ ...prev, [targetId]: conclusion }))
      setConclusion(newText)
    } else {
      const sec = sections.find((s) => s.id === targetId)
      if (sec) {
        setHistoryUndo((prev) => ({ ...prev, [targetId]: sec.text }))
      }
      handleSectionTextChange(targetId, newText)
    }
    setHasUnsavedChanges(true)

    // Only restore focus if the user hasn't actively switched to another input/textarea
    setTimeout(() => {
      const activeEl = document.activeElement
      const isUserTypingElsewhere =
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
        activeEl !== textareaRefs.current[targetId]

      if (!isUserTypingElsewhere) {
        const el = textareaRefs.current[targetId]
        if (el) el.focus()
      }
    }, 50)
  }

  const handleUndo = (targetId: string) => {
    const previous = historyUndo[targetId]
    if (previous === undefined) return

    if (targetId === 'conclusao') {
      setConclusion(previous)
    } else {
      handleSectionTextChange(targetId, previous)
    }
    setHistoryUndo((prev) => {
      const next = { ...prev }
      delete next[targetId]
      return next
    })
    toast({
      title: 'Desfeito',
      description: 'O texto anterior foi restaurado com sucesso.',
    })
  }

  // Insert Default Normal into specific organ
  const handleInsertNormalForOrgan = async (organId: string) => {
    try {
      const finding = await ultrasoundFindingsService.getDefaultNormal(organId)
      if (finding && finding.text_content) {
        requestInsertText(organId, finding.text_content)
      } else {
        toast({
          title: 'Frase padrão não encontrada',
          description: `Não há frase normal cadastrada para este órgão.`,
        })
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao buscar frase normal.',
        variant: 'destructive',
      })
    }
  }

  // SHORTCUTS LISTENER: Ctrl+N / Alt+N ONLY ON THE ACTIVE FOCUSED BOX
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlN = (e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')
      const isAltN = e.altKey && (e.key === 'n' || e.key === 'N')

      if (isCtrlN || isAltN) {
        // Prevent default browser behavior (e.g. opening new window)
        e.preventDefault()
        e.stopPropagation()

        // Apply only to the currently active organ box
        if (activeOrganId) {
          handleInsertNormalForOrgan(activeOrganId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeOrganId])

  // Add custom section
  const handleAddCustomSection = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSectionLabel.trim()) return

    const newId = `custom_${Date.now()}`
    const newSec: UltrasoundSectionData = {
      id: newId,
      label: newSectionLabel.trim(),
      text: '',
      isCustom: true,
    }
    setSections((prev) => [...prev, newSec])
    setNewSectionLabel('')
    setAddSectionOpen(false)
    setHasUnsavedChanges(true)
    toast({
      title: 'Seção adicionada',
      description: `A seção "${newSec.label}" foi adicionada ao laudo.`,
    })
  }

  const handleRemoveCustomSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id))
    setHasUnsavedChanges(true)
  }

  // Open Library for specific organ
  const openLibraryForOrgan = (id: string, label: string) => {
    setLibraryTargetOrgan({ id, label })
    setLibraryModalOpen(true)
  }

  const buildCurrentReportProps = useCallback(() => {
    const patientObj = patients.find((p) => p.id === patientId)
    const selectedExam = exams.find((e) => e.id === examId)

    const selectedImgs = images
      .filter((img) => img.selected_for_print !== false)
      .map((img) => ({
        id: img.id,
        url: examImagesService.getImageUrl(img),
        caption: img.caption,
        sortOrder: img.sort_order,
      }))

    return {
      title: title || 'Laudo de Ultrassonografia',
      patientName: patientObj?.name || 'Paciente',
      patientDocument: patientObj?.document,
      examDate: selectedExam?.exam_date ? formatDateBR(selectedExam.exam_date) : undefined,
      indication: selectedExam?.indication,
      bodyHtml: generateFullHtmlBody(),
      conclusionHtml: conclusion.trim() ? conclusion.replace(/\n/g, '<br/>') : undefined,
      authorName: user?.professional_name || user?.name || 'Médico Responsável Técnico',
      authorCrm: user?.crm,
      authorCrmUf: user?.crm_uf,
      authorTitle: user?.professional_title,
      headerText: user?.header,
      signatureDate: new Date().toISOString(),
      isDraft: autosaveStatus !== 'saved' || !currentReportId,
      images: selectedImgs,
      imagesPerPage,
    }
  }, [
    patients,
    patientId,
    exams,
    examId,
    images,
    title,
    generateFullHtmlBody,
    conclusion,
    user,
    autosaveStatus,
    currentReportId,
    imagesPerPage,
  ])

  // Open in-app PDF preview modal
  const handleOpenPdfPreview = () => {
    const reportProps = buildCurrentReportProps()
    const html = buildReportHTML({ ...reportProps, autoPrint: false })
    setPdfPreviewHtml(html)
    setPdfPreviewOpen(true)
  }

  // Print / PDF action
  const handlePrint = () => {
    const reportProps = buildCurrentReportProps()
    printReportPDF(reportProps)
  }

  const handleDownloadHtml = () => {
    const reportProps = buildCurrentReportProps()
    downloadReportHTML(reportProps)
  }

  // FINALIZATION FLOW
  const handleFinalizeReport = async () => {
    if (!explicitReviewed) {
      toast({
        title: 'Revisão obrigatória',
        description: 'Você precisa marcar a confirmação de que revisou o laudo.',
        variant: 'destructive',
      })
      return
    }

    setFinalizing(true)
    try {
      const bodyHtml = generateFullHtmlBody()
      const structuredData: ReportStructuredData = {
        sections,
        conclusion,
        mode,
      }
      const imagesConfig = {
        imagesPerPage,
      }

      let finalizedReport: Report
      if (currentReportId) {
        finalizedReport = await reportsService.update(currentReportId, {
          title: title.trim(),
          patient_id: patientId,
          exam_id: examId || undefined,
          body: bodyHtml,
          conclusion,
          structured_data: structuredData,
          images_config: imagesConfig,
          status: 'Finalizado',
          is_draft: false,
          author_name: user?.professional_name || user?.name || '',
          author_crm: user?.crm || '',
          author_crm_uf: user?.crm_uf || '',
          signature_date: new Date().toISOString(),
        })
      } else {
        finalizedReport = await reportsService.create({
          title: title.trim(),
          patient_id: patientId,
          exam_id: examId || undefined,
          body: bodyHtml,
          conclusion,
          structured_data: structuredData,
          images_config: imagesConfig,
          status: 'Finalizado',
          is_draft: false,
          exam_type: 'Ultrassonografia',
          author_name: user?.professional_name || user?.name || '',
          author_crm: user?.crm || '',
          author_crm_uf: user?.crm_uf || '',
          signature_date: new Date().toISOString(),
        })
      }

      // Conclude exam if linked
      if (examId) {
        await examsService.update(examId, { status: 'Concluído' }).catch(() => {})
      }

      toast({
        title: 'Laudo finalizado com sucesso!',
        description:
          'Identificação profissional e responsável técnico registrados. Exame concluído.',
      })

      setFinalizeDialogOpen(false)
      navigate(`/laudos/${finalizedReport.id}`)
    } catch {
      toast({
        title: 'Erro ao finalizar',
        description: 'Falha ao concluir o laudo no servidor.',
        variant: 'destructive',
      })
    } finally {
      setFinalizing(false)
    }
  }

  if (loadingInitial) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
        <p className="text-sm text-[#5F6E69]">Carregando editor de laudo ultrassonográfico...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top sticky navigation bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-16 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/laudos')}
            className="border-[#E5E9E7] text-[#5F6E69] hover:text-[#1F2A27]"
            title="Voltar aos laudos"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#1F2A27]">
                Editor de Laudo — Ultrassonografia
              </h1>
              <span className="text-[11px] font-bold text-[#0C6B58] bg-[#E8F3F0] px-2 py-0.5 rounded">
                LW Laudos
              </span>
            </div>

            {/* Autosave status indicator */}
            <div className="flex items-center gap-2 text-xs text-[#5F6E69] mt-0.5">
              {autosaveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-[#0C6B58]">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Salvando rascunho...
                </span>
              )}
              {autosaveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-[#0C6B58]">
                  <CheckCircle2 className="w-3 h-3" />
                  Rascunho salvo às {lastSavedTime?.toLocaleTimeString('pt-BR')}
                </span>
              )}
              {autosaveStatus === 'error' && (
                <span className="flex items-center gap-1 text-[#DC2626]">
                  <AlertTriangle className="w-3 h-3" />
                  Falha ao salvar rascunho
                </span>
              )}
              {autosaveStatus === 'idle' && (
                <span>{hasUnsavedChanges ? 'Alterações pendentes...' : 'Edição ativa'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => performSaveDraft(true)}
            className="border-[#E5E9E7] text-[#1F2A27] text-xs h-9"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Salvar Rascunho
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenPdfPreview}
            className="border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] text-xs h-9 font-medium"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            Prévia do Laudo / PDF
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="border-[#E5E9E7] text-[#1F2A27] text-xs h-9"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Imprimir A4
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setExplicitReviewed(false)
              setFinalizeDialogOpen(true)
            }}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-9 font-semibold shadow-sm"
          >
            <FileCheck2 className="w-3.5 h-3.5 mr-1.5" />
            Finalizar Laudo
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Editor (75%), Right AI/Tools (25%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Forms & Organ Boxes) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Metadata Card: Patient, Exam, Title */}
          <div className="bg-white p-6 rounded-xl border border-[#E5E9E7] shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1F2A27]">
                  Identificação do Paciente *
                </Label>
                <Select value={patientId} onValueChange={handlePatientChange}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione o paciente..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.document ? `(CPF: ${p.document})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1F2A27]">
                  Exame Vinculado (validação estrita)
                </Label>
                <Select
                  value={examId}
                  onValueChange={handleExamChange}
                  disabled={!patientId || exams.length === 0}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue
                      placeholder={
                        !patientId
                          ? 'Selecione o paciente primeiro'
                          : exams.length === 0
                            ? 'Nenhum exame deste paciente'
                            : 'Selecione o exame...'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>
                        {ex.type} — {formatDateBR(ex.exam_date)} ({ex.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#E5E9E7]">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#1F2A27]">Título do Laudo *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#5F6E69]">Modo:</span>
                  <button
                    type="button"
                    onClick={() => setMode('structured')}
                    className={`px-2 py-0.5 rounded text-xs transition ${
                      mode === 'structured'
                        ? 'bg-[#0C6B58] text-white font-semibold'
                        : 'text-[#5F6E69] hover:bg-gray-100'
                    }`}
                  >
                    Estruturado por órgãos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (mode === 'structured' && !freeTextBody) {
                        setFreeTextBody(generateFullHtmlBody())
                      }
                      setMode('freetext')
                    }}
                    className={`px-2 py-0.5 rounded text-xs transition ${
                      mode === 'freetext'
                        ? 'bg-[#0C6B58] text-white font-semibold'
                        : 'text-[#5F6E69] hover:bg-gray-100'
                    }`}
                  >
                    Texto livre
                  </button>
                </div>
              </div>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setHasUnsavedChanges(true)
                }}
                className="text-sm font-semibold"
                placeholder="Ex.: Laudo de Ultrassonografia de Abdome Total"
              />
            </div>
          </div>

          {/* Mode Switcher */}
          {mode === 'freetext' ? (
            /* LEGACY FREE TEXT MODE */
            <div className="bg-white p-6 rounded-xl border border-[#E5E9E7] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#1F2A27]">Corpo do Laudo (Texto Livre)</h3>
                <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                  Modo texto livre legado preservado
                </span>
              </div>
              <Textarea
                rows={16}
                value={freeTextBody}
                onChange={(e) => {
                  setFreeTextBody(e.target.value)
                  setHasUnsavedChanges(true)
                }}
                className="font-serif-report text-sm leading-relaxed"
                placeholder="Digite livremente o conteúdo descritivo..."
              />
            </div>
          ) : (
            /* STRUCTURED ORGAN-BY-ORGAN EDITOR */
            <div className="space-y-4">
              {/* Shortcut hint banner */}
              <div className="p-3 bg-[#E8F3F0] rounded-xl border border-[#D0E6E1] text-xs text-[#0C6B58] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Atalhos na caixa ativa:</strong> Pressione <code>Ctrl+N</code> ou{' '}
                    <code>Alt+N</code> para inserir o texto padrão normal daquele órgão específico.
                  </span>
                </div>
                <span className="text-[10px] text-[#5F6E69] hidden sm:inline">
                  Ativo: <strong>{activeOrganLabel}</strong>
                </span>
              </div>

              {/* Organ Textarea Boxes */}
              <div className="space-y-4">
                {sections.map((section) => {
                  const isActive = activeOrganId === section.id
                  const hasUndo = historyUndo[section.id] !== undefined

                  return (
                    <div
                      key={section.id}
                      className={`bg-white p-4 rounded-xl border transition shadow-sm ${
                        isActive ? 'border-[#0C6B58] ring-1 ring-[#0C6B58]/20' : 'border-[#E5E9E7]'
                      }`}
                    >
                      {/* Box Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor={`organ_${section.id}`}
                            className="font-bold text-sm text-[#1F2A27] cursor-pointer"
                            onClick={() => {
                              setActiveOrganId(section.id)
                              setActiveOrganLabel(section.label)
                            }}
                          >
                            {section.label}
                          </label>
                          {isActive && (
                            <span className="text-[10px] bg-[#E8F3F0] text-[#0C6B58] px-1.5 py-0.2 rounded font-medium">
                              Caixa ativa
                            </span>
                          )}
                        </div>

                        {/* Box Quick Tools */}
                        <div className="flex items-center gap-1.5">
                          {hasUndo && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUndo(section.id)}
                              className="h-7 text-xs text-[#5F6E69] hover:text-[#1F2A27]"
                              title="Desfazer substituição"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Desfazer
                            </Button>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleInsertNormalForOrgan(section.id)}
                            className="h-7 text-xs border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0]"
                            title="Inserir texto normal para este órgão (Ctrl+N)"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Normal
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openLibraryForOrgan(section.id, section.label)}
                            className="h-7 text-xs border-[#E5E9E7] text-[#5F6E69] hover:text-[#1F2A27]"
                            title="Abrir biblioteca de frases e achados deste órgão"
                          >
                            <BookOpen className="w-3 h-3 mr-1" />
                            Frases
                          </Button>

                          {section.isCustom && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveCustomSection(section.id)}
                              className="h-7 w-7 text-red-500 hover:text-red-700"
                              title="Remover seção personalizada"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Textarea */}
                      <Textarea
                        id={`organ_${section.id}`}
                        ref={(el) => {
                          textareaRefs.current[section.id] = el
                        }}
                        rows={3}
                        value={section.text}
                        onFocus={() => {
                          setActiveOrganId(section.id)
                          setActiveOrganLabel(section.label)
                        }}
                        onChange={(e) => handleSectionTextChange(section.id, e.target.value)}
                        placeholder={`Descreva os achados de ${section.label} (vazio = não laudado)...`}
                        className="text-xs leading-relaxed font-sans"
                      />
                    </div>
                  )
                })}
              </div>

              {/* Add Custom Section Button */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddSectionOpen(true)}
                  className="w-full text-xs border-dashed border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar Outra Seção ou Órgão
                </Button>
              </div>

              {/* SEPARATE CONCLUSION BOX */}
              <div
                className={`bg-white p-5 rounded-xl border transition shadow-sm ${
                  activeOrganId === 'conclusao'
                    ? 'border-[#0C6B58] ring-1 ring-[#0C6B58]/20'
                    : 'border-[#E5E9E7]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="organ_conclusao"
                      className="font-bold text-sm text-[#0C6B58] uppercase cursor-pointer"
                      onClick={() => {
                        setActiveOrganId('conclusao')
                        setActiveOrganLabel('Conclusão Diagnóstica')
                      }}
                    >
                      Conclusão Diagnóstica Separada
                    </label>
                    {activeOrganId === 'conclusao' && (
                      <span className="text-[10px] bg-[#E8F3F0] text-[#0C6B58] px-1.5 py-0.2 rounded font-medium">
                        Ativa
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {historyUndo['conclusao'] !== undefined && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUndo('conclusao')}
                        className="h-7 text-xs text-[#5F6E69] hover:text-[#1F2A27]"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Desfazer
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleInsertNormalForOrgan('conclusao')}
                      className="h-7 text-xs border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0]"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Normal
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openLibraryForOrgan('conclusao', 'Conclusão Diagnóstica')}
                      className="h-7 text-xs border-[#E5E9E7] text-[#5F6E69] hover:text-[#1F2A27]"
                    >
                      <BookOpen className="w-3 h-3 mr-1" />
                      Frases
                    </Button>
                  </div>
                </div>

                <Textarea
                  id="organ_conclusao"
                  ref={(el) => {
                    textareaRefs.current['conclusao'] = el
                  }}
                  rows={4}
                  value={conclusion}
                  onFocus={() => {
                    setActiveOrganId('conclusao')
                    setActiveOrganLabel('Conclusão Diagnóstica')
                  }}
                  onChange={(e) => {
                    setConclusion(e.target.value)
                    setHasUnsavedChanges(true)
                  }}
                  placeholder="Síntese diagnóstica, achados positivos ou impressão conclusiva..."
                  className="text-xs leading-relaxed font-semibold font-sans bg-[#FAFBFB]"
                />
              </div>
            </div>
          )}

          {/* MULTIPLE IMAGES SECTION */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-[#1F2A27] flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#0C6B58]" />
                Documentação Fotográfica e Anexos de Imagens
              </h2>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#5F6E69]">Layout por página de impressão:</span>
                <Select
                  value={String(imagesPerPage)}
                  onValueChange={(val) => {
                    setImagesPerPage(Number(val) as any)
                    setHasUnsavedChanges(true)
                  }}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 por página</SelectItem>
                    <SelectItem value="4">4 por página</SelectItem>
                    <SelectItem value="6">6 por página</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ExamImagesManager
              images={images}
              onImagesChange={(newImgs) => {
                setImages(newImgs)
                setHasUnsavedChanges(true)
              }}
              reportId={currentReportId}
              examId={examId}
            />
          </div>
        </div>

        {/* Right Column: AI Assistant Panel & Quick Actions (25%) */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Panel */}
          <AiAssistantPanel
            sections={sections}
            conclusionText={conclusion}
            onApplyText={(targetId, newText) => {
              requestInsertText(targetId, newText)
            }}
          />

          {/* Professional Identification Preview */}
          <div className="bg-white p-5 rounded-xl border border-[#E5E9E7] shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E9E7]">
              <span className="font-bold text-xs text-[#1F2A27]">
                Identificação do Responsável Técnico
              </span>
              <span className="text-[10px] text-[#0C6B58] bg-[#E8F3F0] px-1.5 py-0.5 rounded font-semibold">
                Configurada
              </span>
            </div>

            <div className="text-xs space-y-1 text-[#5F6E69]">
              <p className="font-bold text-[#1F2A27]">
                {user?.professional_name || user?.name || 'Dr. Médico'}
              </p>
              <p>
                CRM {user?.crm_uf ? `${user?.crm_uf} ` : ''}
                {user?.crm || 'Não informado'}
              </p>
              {user?.professional_title && <p>{user.professional_title}</p>}
            </div>

            <p className="text-[11px] text-[#8A9691] pt-1 border-t border-[#E5E9E7]">
              Identificação profissional emitida automaticamente no rodapé do laudo (sem menção a
              assinatura digital certificada).
            </p>
          </div>
        </div>
      </div>

      {/* CONFIRMATION DIALOG: REPLACE EXISTING TEXT */}
      <AlertDialog open={replaceConfirmOpen} onOpenChange={setReplaceConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Substituir texto existente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed text-[#5F6E69]">
              A caixa já contém texto digitado. Deseja substituir pelo novo texto selecionado? (Você
              poderá desfazer esta ação a qualquer momento com o botão "Desfazer").
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingTextToInsert(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingTextToInsert) {
                  executeTextInsertion(pendingTextToInsert.targetId, pendingTextToInsert.newText)
                  setPendingTextToInsert(null)
                }
              }}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
            >
              Confirmar Substituição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL: ADD CUSTOM SECTION */}
      <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1F2A27]">
              Nova Seção / Órgão
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5F6E69]">
              Adicione uma área anatômica adicional (ex.: Apêndice Cecal, Tireoide, Parede
              Abdominal).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCustomSection} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome da Seção *</Label>
              <Input
                required
                placeholder="Ex.: Apêndice Cecal"
                value={newSectionLabel}
                onChange={(e) => setNewSectionLabel(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddSectionOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
              >
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: FINALIZE REPORT */}
      <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1F2A27] flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#0C6B58]" />
              Finalizar e Emitir Laudo Médico
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5F6E69]">
              A finalização consolida o laudo e conclui o exame. Esta etapa exige revisão explícita
              do responsável técnico.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4">
            <div className="p-3 bg-[#F7F9F8] rounded-lg border border-[#E5E9E7] text-xs space-y-2">
              <div>
                <span className="text-[#8A9691] block">Paciente:</span>
                <span className="font-bold text-[#1F2A27]">
                  {patients.find((p) => p.id === patientId)?.name || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-[#8A9691] block">Responsável Técnico / Identificação:</span>
                <span className="font-semibold text-[#0C6B58]">
                  {user?.professional_name || user?.name || 'Médico'} • CRM{' '}
                  {user?.crm_uf ? `${user?.crm_uf} ` : ''}
                  {user?.crm || '—'}
                </span>
              </div>
              <div>
                <span className="text-[#8A9691] block">Documentação fotográfica:</span>
                <span>
                  {images.filter((img) => img.selected_for_print !== false).length} imagem(ns)
                  anexada(s) para impressão
                </span>
              </div>
            </div>

            {/* Explicit review checkbox required */}
            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 cursor-pointer">
              <input
                type="checkbox"
                checked={explicitReviewed}
                onChange={(e) => setExplicitReviewed(e.target.checked)}
                className="mt-0.5 rounded text-[#0C6B58] focus:ring-[#0C6B58]"
              />
              <span className="text-xs text-[#1F2A27] leading-relaxed">
                Atesto que revisei integralmente os achados ecográficos descritos, as imagens anexas
                e a conclusão diagnóstica como médico responsável técnico.
              </span>
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFinalizeDialogOpen(false)}
              disabled={finalizing}
            >
              Voltar ao editor
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!explicitReviewed || finalizing}
              onClick={handleFinalizeReport}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
            >
              {finalizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Finalizando...
                </>
              ) : (
                'Confirmar e Finalizar Laudo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: IN-APP PDF / DOCUMENT PREVIEW */}
      <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-[#E5E9E7] flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-[#1F2A27] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0C6B58]" />
                Prévia do Laudo / PDF Integrada
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5F6E69]">
                Visualização do documento com formatação clínica A4, sem bloqueio de popups
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadHtml}
                className="text-xs h-8 border-[#E5E9E7]"
                title="Baixar arquivo HTML/PDF do laudo"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Baixar Documento
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handlePrint}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-8"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Imprimir
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 bg-gray-100 p-4 overflow-hidden">
            <iframe
              title="Prévia do Laudo em PDF"
              srcDoc={pdfPreviewHtml}
              className="w-full h-full bg-white rounded-lg shadow-sm border border-gray-300"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: FINDINGS LIBRARY */}
      <FindingsLibraryModal
        isOpen={libraryModalOpen}
        onClose={() => setLibraryModalOpen(false)}
        organId={libraryTargetOrgan.id}
        organLabel={libraryTargetOrgan.label}
        onSelectFinding={(text) => {
          requestInsertText(libraryTargetOrgan.id, text)
        }}
      />
    </div>
  )
}
