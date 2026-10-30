import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Download,
  Loader2,
  FileText,
  Layers,
  Sparkles,
  AlertCircle,
  Tag,
  Search,
  BookOpen,
} from 'lucide-react'
import { TextMasksModal } from '@/components/ultrasound/TextMasksModal'
import { reportsService } from '@/services/reports'
import { examsService } from '@/services/exams'
import { patientsService } from '@/services/patients'
import { templatesService } from '@/services/templates'
import { specialtiesService } from '@/services/specialties'
import { useAuth } from '@/contexts/AuthContext'
import type { Patient, Exam, Template, MedicalSpecialty } from '@/types'
import RichTextEditor from '@/components/RichTextEditor'
import { printReportPDF, downloadReportRealPdf } from '@/lib/pdfGenerator'
import BodyMarkEditor from '@/components/ultrasound/BodyMarkEditor'
import type { BodyMarksState } from '@/types'
import { formatDateBR } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { useToast } from '@/hooks/use-toast'

export default function LaudoNovo() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefilledExamId = searchParams.get('exame') || ''
  const prefilledPatientId = searchParams.get('paciente') || ''
  const prefilledTemplateId = searchParams.get('modelo') || ''

  const { user } = useAuth()
  const { toast } = useToast()

  const [patients, setPatients] = useState<Patient[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [myTemplates, setMyTemplates] = useState<Template[]>([])
  const [generalTemplates, setGeneralTemplates] = useState<Template[]>([])
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([])
  const [loadingInitial, setLoadingInitial] = useState(true)

  // Specialty filter inside template picker
  const [templateSpecialtyFilter, setTemplateSpecialtyFilter] = useState<string>('todas')
  const [templateSearchTerm, setTemplateSearchTerm] = useState('')

  // Form
  const [title, setTitle] = useState('')
  const [patientId, setPatientId] = useState(prefilledPatientId)
  const [examId, setExamId] = useState(prefilledExamId)
  const [body, setBody] = useState('<p></p>')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null)
  const [showApplyConfirm, setShowApplyConfirm] = useState(false)
  const [bodyMarks, setBodyMarks] = useState<BodyMarksState>({
    schemeId: 'none',
    points: [],
  })

  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function init() {
      try {
        const [pts, myTpls, genTpls, specs] = await Promise.all([
          patientsService.getAll(),
          templatesService.getMyTemplates(),
          templatesService.getGeneralTemplates(),
          specialtiesService.getActive(),
        ])
        setPatients(pts)
        setMyTemplates(myTpls)
        setGeneralTemplates(genTpls)
        setSpecialties(specs)

        // If exam was prefilled, fetch exam and prefill patient
        if (prefilledExamId) {
          try {
            const ex = await examsService.getById(prefilledExamId)
            setExamId(ex.id)
            setPatientId(ex.patient_id)
            setTitle(`Laudo de ${ex.type}`)
          } catch {
            // ignore
          }
        }

        // If template was prefilled
        if (prefilledTemplateId) {
          try {
            const tpl = await templatesService.getById(prefilledTemplateId)
            setSelectedTemplateId(tpl.id)
            setBody(tpl.body)
            if (!title) {
              setTitle(`Laudo de ${tpl.title}`)
            }
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingInitial(false)
      }
    }
    init()
  }, [prefilledExamId, prefilledPatientId, prefilledTemplateId])

  // Load patient's exams when patient is selected
  useEffect(() => {
    if (patientId) {
      examsService
        .getByPatientId(patientId)
        .then(setExams)
        .catch(() => {})
    } else {
      setExams([])
    }
  }, [patientId])

  const handleTemplateSelection = (templateId: string) => {
    if (templateId === 'blank') {
      setSelectedTemplateId('')
      return
    }

    const tpl = [...myTemplates, ...generalTemplates].find((t) => t.id === templateId)
    if (!tpl) return

    // If body already has text, confirm replacement
    const cleanBody = body.replace(/<[^>]*>/g, '').trim()
    if (cleanBody.length > 10) {
      setPendingTemplate(tpl)
      setShowApplyConfirm(true)
    } else {
      applyTemplate(tpl)
    }
  }

  const applyTemplate = (tpl: Template) => {
    setSelectedTemplateId(tpl.id)
    setBody(tpl.body)
    if (!title) {
      setTitle(`Laudo de ${tpl.title}`)
    }
    setPendingTemplate(null)
    setShowApplyConfirm(false)
    toast({
      title: 'Modelo aplicado',
      description: 'O conteúdo foi preenchido como uma cópia pessoal.',
    })
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Título do laudo é obrigatório.'
    if (!patientId) errs.patientId = 'Selecione o paciente do laudo.'
    const textOnly = body.replace(/<[^>]*>/g, '').trim()
    if (!textOnly) errs.body = 'O corpo do laudo não pode estar vazio.'

    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (downloadAfter = false) => {
    if (!validate()) return

    setSaving(true)
    try {
      const created = await reportsService.create({
        patient_id: patientId,
        exam_id: examId || undefined,
        template_id: selectedTemplateId || undefined,
        title: title.trim(),
        body,
        author_name: user?.professional_name || user?.name || 'Dr. Médico',
        author_crm: user?.crm,
        author_crm_uf: user?.crm_uf,
        structured_data: {
          sections: [],
          conclusion: '',
          mode: 'freetext',
          body_marks: bodyMarks,
        },
      })

      // If exam linked, update exam status to 'Concluído'
      if (examId) {
        await examsService.update(examId, { status: 'Concluído' }).catch(() => {})
      }

      toast({
        title: 'Laudo salvo com sucesso.',
        description: 'Assinatura e identificação profissional registradas.',
      })

      if (downloadAfter) {
        const selectedPatient = patients.find((p) => p.id === patientId)
        printReportPDF({
          title: created.title,
          patientName: selectedPatient?.name || 'Paciente',
          patientDocument: selectedPatient?.document,
          bodyHtml: created.body,
          authorName: created.author_name || user?.professional_name || 'Médico',
          authorCrm: created.author_crm || user?.crm,
          authorCrmUf: created.author_crm_uf || user?.crm_uf,
          authorTitle: user?.professional_title,
          headerText: user?.header,
          signatureDate: created.signature_date,
          validityDays: created.validity_days || 90,
          bodyMarks: bodyMarks.schemeId !== 'none' ? bodyMarks : undefined,
        })
      }

      navigate(`/laudos/${created.id}`)
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar o laudo médico.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const [downloadingRealPdf, setDownloadingRealPdf] = useState(false)
  const [textMasksOpen, setTextMasksOpen] = useState(false)

  const handleDownloadDraft = async () => {
    const selectedPatient = patients.find((p) => p.id === patientId)
    const crmNum = user?.crm
    const crmUf = user?.crm_uf
    const crmStr = crmNum ? `CRM ${crmUf ? `${crmUf} ` : ''}${crmNum}` : 'CRM não informado'
    const defaultAuthorTitle = user?.professional_title || `Médico / ${crmStr}`

    setDownloadingRealPdf(true)
    try {
      await downloadReportRealPdf({
        title: title || 'Laudo Médico',
        patientName: selectedPatient?.name || 'Paciente Não Selecionado',
        patientDocument: selectedPatient?.document,
        bodyHtml: body,
        authorName: user?.professional_name || user?.name || 'Médico Responsável',
        authorCrm: crmNum,
        authorCrmUf: crmUf,
        authorTitle: defaultAuthorTitle,
        headerText: user?.header,
        signatureDate: new Date().toISOString(),
        validityDays: 90,
        isDraft: true,
        bodyMarks: bodyMarks.schemeId !== 'none' ? bodyMarks : undefined,
      })
      toast({
        title: 'Download iniciado',
        description: 'O PDF verdadeiro foi baixado com sucesso.',
      })
    } catch (err: unknown) {
      console.error(err)
      printReportPDF({
        title: title || 'Laudo Médico',
        patientName: selectedPatient?.name || 'Paciente Não Selecionado',
        patientDocument: selectedPatient?.document,
        bodyHtml: body,
        authorName: user?.professional_name || user?.name || 'Médico Responsável',
        authorCrm: crmNum,
        authorCrmUf: crmUf,
        authorTitle: defaultAuthorTitle,
        headerText: user?.header,
        signatureDate: new Date().toISOString(),
        bodyMarks: bodyMarks.schemeId !== 'none' ? bodyMarks : undefined,
      })
    } finally {
      setDownloadingRealPdf(false)
    }
  }

  if (loadingInitial) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
        <p className="text-sm text-[#5F6E69]">Carregando editor de laudos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/laudos')}
            className="border-[#E5E9E7] text-[#5F6E69] hover:text-[#1F2A27]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#1F2A27]">Novo Laudo</h1>
            <p className="text-sm text-[#5F6E69] mt-0.5">
              Redija o laudo clínico e assine com sua identificação profissional
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadDraft}
            disabled={downloadingRealPdf}
            className="border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] text-xs h-9 font-medium"
          >
            {downloadingRealPdf ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-1.5" />
                Baixar PDF Real
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white shadow-sm font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Salvar Laudo
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editor Layout: 70% left / 30% right on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Rich Text Editor ~70%) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-[#E5E9E7] shadow-sm space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="report_title" className="text-xs font-semibold text-[#1F2A27]">
                Título do laudo *
              </Label>
              <Input
                id="report_title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Laudo de Ultrassonografia de Abdome Total"
                className={`text-base font-semibold ${fieldErrors.title ? 'border-red-500' : ''}`}
              />
              {fieldErrors.title && <p className="text-xs text-[#DC2626]">{fieldErrors.title}</p>}
            </div>

            {/* Patient & Exam selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E5E9E7]">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1F2A27]">
                  Identificação do Paciente *
                </Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger className={fieldErrors.patientId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione o paciente..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.document ? `(${p.document})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.patientId && (
                  <p className="text-xs text-[#DC2626]">{fieldErrors.patientId}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1F2A27]">
                  Exame Vinculado (opcional)
                </Label>
                <Select
                  value={examId}
                  onValueChange={setExamId}
                  disabled={!patientId || exams.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !patientId
                          ? 'Selecione o paciente primeiro'
                          : exams.length === 0
                            ? 'Nenhum exame cadastrado'
                            : 'Selecione o exame...'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>
                        {ex.type} ({formatDateBR(ex.exam_date)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rich text body */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#1F2A27]">
                  Conteúdo Clínico do Laudo *
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTextMasksOpen(true)}
                  className="h-7 text-xs border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] font-medium"
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  Máscaras de Texto
                </Button>
              </div>
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder="Digite a análise descritiva e a conclusão diagnóstica ou utilize uma máscara de texto..."
                minHeight="420px"
              />
              {fieldErrors.body && <p className="text-xs text-[#DC2626]">{fieldErrors.body}</p>}
            </div>

            {/* Body Mark Diagram (Esquema Anatômico) */}
            <div className="pt-2">
              <BodyMarkEditor value={bodyMarks} onChange={setBodyMarks} />
            </div>

            {/* Author identification notice */}
            <div className="p-4 rounded-xl bg-[#F7F9F8] border border-[#E5E9E7] text-xs text-[#5F6E69] flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#1F2A27] block">
                  Identificação do Autor no Rodapé
                </span>
                <span>
                  {user?.professional_name || user?.name || 'Médico'} • CRM{' '}
                  {user?.crm_uf ? `${user?.crm_uf} ` : ''}
                  {user?.crm || '—'}
                </span>
              </div>
              <span className="text-[11px] text-[#0C6B58] font-medium bg-[#E8F3F0] px-2 py-1 rounded">
                Assinatura automática
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (Template Selector & Shortcuts ~30%) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-[#E5E9E7] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E9E7]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0C6B58]" />
                <h3 className="font-bold text-sm text-[#1F2A27]">Modelos por Especialidade</h3>
              </div>
              <span className="text-[10px] font-semibold text-[#0C6B58] bg-[#E8F3F0] px-2 py-0.5 rounded-full">
                Ágil
              </span>
            </div>

            <p className="text-xs text-[#5F6E69] leading-relaxed">
              Filtre por especialidade médica para carregar rapidamente o modelo ideal para este
              exame.
            </p>

            {/* Filter by Specialty */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1F2A27] flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#0C6B58]" />
                Filtrar Especialidade
              </Label>
              <Select
                value={templateSpecialtyFilter}
                onValueChange={(val) => setTemplateSpecialtyFilter(val)}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Todas as especialidades" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="todas">Todas as Especialidades</SelectItem>
                  {specialties.map((spec) => (
                    <SelectItem key={spec.id} value={spec.id}>
                      {spec.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="unclassified">Geral / Sem especialidade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search within filtered */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A9691]" />
              <Input
                value={templateSearchTerm}
                onChange={(e) => setTemplateSearchTerm(e.target.value)}
                placeholder="Buscar modelo..."
                className="pl-8 text-xs h-8 bg-[#F7F9F8]"
              />
            </div>

            {/* Template Selection Dropdown */}
            {(() => {
              const filterTpls = (list: Template[]) => {
                return list.filter((t) => {
                  if (templateSpecialtyFilter !== 'todas') {
                    if (templateSpecialtyFilter === 'unclassified') {
                      if (t.specialty_id) return false
                    } else if (t.specialty_id !== templateSpecialtyFilter) {
                      return false
                    }
                  }
                  if (templateSearchTerm.trim()) {
                    const q = templateSearchTerm.toLowerCase()
                    const matchTitle = t.title.toLowerCase().includes(q)
                    const matchDesc = t.description?.toLowerCase().includes(q)
                    if (!matchTitle && !matchDesc) return false
                  }
                  return true
                })
              }

              const visibleGeneral = filterTpls(generalTemplates)
              const visibleMy = filterTpls(myTemplates)

              return (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#1F2A27]">Selecione o Modelo</Label>
                  <Select
                    value={selectedTemplateId || 'blank'}
                    onValueChange={handleTemplateSelection}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Selecione um modelo..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectItem value="blank">Em branco (sem modelo)</SelectItem>
                      {visibleGeneral.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-xs font-bold text-[#0C6B58]">
                            Modelos Gerais ({visibleGeneral.length})
                          </SelectLabel>
                          {visibleGeneral.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {visibleMy.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-xs font-bold text-[#5F6E69]">
                            Meus Modelos ({visibleMy.length})
                          </SelectLabel>
                          {visibleMy.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {visibleGeneral.length === 0 && visibleMy.length === 0 && (
                        <div className="py-3 px-2 text-center text-xs text-[#5F6E69]">
                          Nenhum modelo para esta especialidade.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )
            })()}

            <div className="pt-4 border-t border-[#E5E9E7] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#5F6E69]">
                <span>Seus modelos particulares</span>
                <span className="font-bold">{myTemplates.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#5F6E69]">
                <span>Modelos gerais da clínica</span>
                <span className="font-bold">{generalTemplates.length}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/modelos/novo')}
                className="w-full text-xs border-[#E5E9E7] text-[#0C6B58]"
              >
                + Criar Novo Modelo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Text Masks Modal */}
      <TextMasksModal
        open={textMasksOpen}
        onOpenChange={setTextMasksOpen}
        currentEditorText={body}
        currentUserId={user?.id}
        onApplyMask={(newText, applyMode) => {
          // Convert plain text to basic HTML paragraphs if needed or keep format
          const formatted = newText
            .split('\n\n')
            .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
            .join('')
          if (applyMode === 'replace') {
            setBody(formatted)
          } else {
            setBody((prev) => (prev.trim() ? `${prev}<br/><br/>${formatted}` : formatted))
          }
        }}
      />

      {/* Template Apply Confirmation */}
      <AlertDialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              O conteúdo atual digitado no editor será substituído pelo modelo{' '}
              <strong>"{pendingTemplate?.title}"</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingTemplate(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingTemplate && applyTemplate(pendingTemplate)}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
            >
              Aplicar modelo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
