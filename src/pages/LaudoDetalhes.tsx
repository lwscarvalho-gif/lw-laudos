import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  Edit2,
  Trash2,
  Calendar,
  User,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Printer,
  ShieldAlert,
  Fingerprint,
  Info,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { reportsService } from '@/services/reports'
import { digitalSignatureService, DigitalSignatureStatus } from '@/services/digitalSignature'
import { useNetworkStatus } from '@/lib/networkStatus'
import { computeSha256Hex, buildReportCanonicalDigestString } from '@/lib/cryptoDigest'
import { useAuth } from '@/contexts/AuthContext'
import type { Report } from '@/types'
import { formatDateBR, formatDateTimeBR } from '@/lib/formatters'
import {
  printReportPDF,
  downloadReportRealPdf,
  PRELIMINARY_VERSION_DISCLAIMER,
} from '@/lib/pdfGenerator'
import pb from '@/lib/pocketbase/client'
import { examImagesService } from '@/services/examImages'
import type { ExamImage } from '@/types'
import { Button } from '@/components/ui/button'
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

export default function LaudoDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [report, setReport] = useState<Report | null>(null)
  const [images, setImages] = useState<ExamImage[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Assinatura digital do laudo
  const { isOnline } = useNetworkStatus()
  const [currentSha256, setCurrentSha256] = useState<string>('')
  const [sigEvaluation, setSigEvaluation] = useState<{
    status: DigitalSignatureStatus
    detail: string
    isModifiedSinceSigned: boolean
  }>({
    status: 'Não configurado',
    detail: '',
    isModifiedSinceSigned: false,
  })

  const loadReport = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [rep, imgs] = await Promise.all([
        reportsService.getById(id),
        examImagesService.getByReportId(id),
      ])
      setReport(rep)
      setImages(imgs)

      // Calcula hash canônico do documento atual
      const digestStr = buildReportCanonicalDigestString(rep)
      const hash = await computeSha256Hex(digestStr)
      setCurrentSha256(hash)

      const evalRes = digitalSignatureService.evaluateStatus(rep.id, hash, isOnline)
      setSigEvaluation({
        status: evalRes.status,
        detail: evalRes.detail,
        isModifiedSinceSigned: evalRes.isModifiedSinceSigned,
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Laudo não encontrado.',
        variant: 'destructive',
      })
      navigate('/laudos')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, toast])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  // Recalcula avaliação quando muda a conectividade
  useEffect(() => {
    if (!report || !currentSha256) return
    const evalRes = digitalSignatureService.evaluateStatus(report.id, currentSha256, isOnline)
    setSigEvaluation({
      status: evalRes.status,
      detail: evalRes.detail,
      isModifiedSinceSigned: evalRes.isModifiedSinceSigned,
    })
  }, [isOnline, report, currentSha256])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await reportsService.delete(id)
      toast({
        title: 'Laudo excluído',
        description: 'Laudo médico removido com sucesso.',
      })
      navigate('/laudos')
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir o laudo.',
        variant: 'destructive',
      })
      setDeleting(false)
    }
  }

  const [downloadingRealPdf, setDownloadingRealPdf] = useState(false)

  const buildPrintReportProps = () => {
    if (!report) return null
    const printableImages = images
      .filter((img) => img.selected_for_print !== false)
      .map((img) => ({
        id: img.id,
        url: examImagesService.getImageUrl(img),
        caption: img.caption,
        sortOrder: img.sort_order,
      }))

    const crmNum = report.author_crm || user?.crm
    const crmUf = report.author_crm_uf || user?.crm_uf
    const crmStr = crmNum ? `CRM ${crmUf ? `${crmUf} ` : ''}${crmNum}` : 'CRM não informado'
    const defaultAuthorTitle = user?.professional_title || `Médico / ${crmStr}`

    const logoUrl = user?.logo
      ? pb.files.getURL(user as unknown as Record<string, unknown>, user.logo)
      : undefined

    return {
      title: report.title,
      patientName: report.expand?.patient_id?.name || 'Paciente',
      patientDocument: report.expand?.patient_id?.document,
      examDate: formatDateBR(report.expand?.exam_id?.exam_date || report.created),
      bodyHtml: report.body,
      conclusionHtml: report.conclusion || report.structured_data?.conclusion || undefined,
      authorName: report.author_name || user?.professional_name || 'Médico Responsável',
      authorCrm: crmNum,
      authorCrmUf: crmUf,
      authorTitle: defaultAuthorTitle,
      logoUrl,
      headerText: user?.header,
      signatureDate: report.signature_date || report.created,
      isDraft: report.status === 'Rascunho' || report.is_draft,
      images: printableImages,
      imagesPerPage: (report.images_config?.imagesPerPage || 4) as 2 | 4 | 6,
    }
  }

  const handleDownloadPDF = async () => {
    const props = buildPrintReportProps()
    if (!props) return

    setDownloadingRealPdf(true)
    try {
      await downloadReportRealPdf(props)
      toast({
        title: 'Download iniciado',
        description: 'O laudo em PDF real (%PDF-) foi gerado com sucesso.',
      })
    } catch (err: unknown) {
      console.error(err)
      toast({
        title: 'Erro ao gerar PDF',
        description: 'Falha na compilação do arquivo PDF.',
        variant: 'destructive',
      })
    } finally {
      setDownloadingRealPdf(false)
    }
  }

  const handlePrintPDF = () => {
    const props = buildPrintReportProps()
    if (!props) return
    printReportPDF(props)
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
        <p className="text-sm text-[#5F6E69]">Carregando documento do laudo...</p>
      </div>
    )
  }

  if (!report) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar */}
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
            <h1 className="text-xl font-bold text-[#1F2A27]">Visualização de Laudo</h1>
            <p className="text-xs text-[#5F6E69]">Documento médico oficial assinado digitalmente</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadPDF}
            disabled={downloadingRealPdf}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white shadow-sm font-semibold text-xs h-9"
            title="Baixar arquivo PDF autêntico (application/pdf)"
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
            variant="outline"
            onClick={handlePrintPDF}
            className="border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] text-xs h-9"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              navigate(
                report.structured_data || report.exam_type === 'Ultrassonografia'
                  ? `/laudos/ultrassom?id=${report.id}`
                  : `/laudos/${report.id}/editar`,
              )
            }
            className="border-[#E5E9E7] text-[#1F2A27]"
          >
            <Edit2 className="w-4 h-4 mr-1.5" />
            Editar
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteModalOpen(true)}
            className="border-red-200 text-[#DC2626] hover:bg-red-50 hover:text-[#DC2626]"
            title="Excluir laudo"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Report "Paper" Card (Georgia font body, generous margins) */}
      <div className="bg-white p-8 sm:p-14 rounded-2xl border border-[#E5E9E7] shadow-md animate-fade-in space-y-8">
        {/* Professional Header */}
        <div className="border-b-2 border-[#0C6B58] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-bold text-base text-[#0C6B58] tracking-tight">
              {user?.header || 'Clínica Médica de Diagnóstico e Imagem'}
            </h2>
            <p className="text-xs text-[#5F6E69] mt-0.5">Prontuário e Laudo Médico Eletrônico</p>
          </div>
          <div className="text-left sm:text-right text-xs text-[#8A9691]">
            <span>Emitido em: {formatDateBR(report.signature_date || report.created)}</span>
          </div>
        </div>

        {/* Painel Informativo da Assinatura Digital (Opcional) */}
        {digitalSignatureService.getConfig().enabled && (
          <div className="p-4 rounded-xl border border-[#D1E5DE] bg-[#F4F9F7] space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D1E5DE] pb-2.5">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-[#0C6B58]" />
                <span className="font-bold text-sm text-[#1F2A27]">
                  Assinatura Digital (Estrutura Preparada)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#5F6E69]">Status da Assinatura:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    sigEvaluation.status === 'Assinado'
                      ? 'bg-emerald-100 text-emerald-800'
                      : sigEvaluation.status === 'Pendente'
                        ? 'bg-blue-100 text-blue-800'
                        : sigEvaluation.status === 'Requer internet'
                          ? 'bg-amber-100 text-amber-800'
                          : sigEvaluation.status === 'Falhou'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {sigEvaluation.status}
                </span>
              </div>
            </div>

            <p className="text-[#40524C] leading-relaxed">{sigEvaluation.detail}</p>

            {currentSha256 && (
              <div className="p-2.5 rounded bg-white border border-[#E0ECE8] font-mono text-[10px] text-[#5F6E69] break-all flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>
                  <strong className="text-[#1F2A27]">Hash SHA-256 da Versão Atual:</strong>{' '}
                  {currentSha256}
                </span>
                <span className="text-[9px] text-[#8A9691] shrink-0 font-sans">
                  Imutável nesta versão
                </span>
              </div>
            )}

            {sigEvaluation.isModifiedSinceSigned && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Aviso de Integridade:</strong> O documento foi modificado após a última
                  solicitação. O hash atual difere do registro anterior, invalidando qualquer
                  assinatura pendente. Um novo envio explícito é necessário para assinar esta
                  versão.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Patient metadata box */}
        <div className="p-4 rounded-xl bg-[#F7F9F8] border border-[#E5E9E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[#8A9691]">Paciente:</span>{' '}
            <Link
              to={`/pacientes/${report.patient_id}`}
              className="font-bold text-sm text-[#1F2A27] hover:text-[#0C6B58]"
            >
              {report.expand?.patient_id?.name || 'Paciente'}
            </Link>
            {report.expand?.patient_id?.document && (
              <span className="text-[#5F6E69] font-mono ml-2">
                (CPF: {report.expand?.patient_id?.document})
              </span>
            )}
          </div>
          {report.expand?.exam_id?.exam_date && (
            <div className="text-[#5F6E69]">
              Exame realizado em:{' '}
              <span className="font-semibold text-[#1F2A27]">
                {formatDateBR(report.expand.exam_id.exam_date)}
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <div className="text-center sm:text-left flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1F2A27] uppercase tracking-wide">
            {report.title}
          </h1>
          {report.status === 'Rascunho' || report.is_draft ? (
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded">
              Rascunho (Não finalizado)
            </span>
          ) : (
            <span className="text-xs font-bold text-[#0C6B58] bg-[#E8F3F0] px-2.5 py-1 rounded">
              Finalizado
            </span>
          )}
        </div>

        {/* Report Body (Georgia Serif stack) */}
        <div
          className="font-serif-report text-base text-[#1F2A27] leading-relaxed prose max-w-none pt-2"
          dangerouslySetInnerHTML={{ __html: report.body }}
        />

        {/* Separate conclusion if present */}
        {(report.conclusion || report.structured_data?.conclusion) && (
          <div className="p-4 rounded-xl bg-[#FAFBFB] border-l-4 border-[#0C6B58] border-t border-r border-b border-[#E5E9E7]">
            <span className="font-bold text-sm text-[#0C6B58] uppercase block mb-1">
              Conclusão Diagnóstica
            </span>
            <p className="text-sm font-semibold text-[#1F2A27] whitespace-pre-wrap">
              {report.conclusion || report.structured_data?.conclusion}
            </p>
          </div>
        )}

        {/* Attached Images preview */}
        {images.length > 0 && (
          <div className="pt-6 border-t border-[#E5E9E7] space-y-4">
            <h3 className="font-bold text-sm text-[#0C6B58] uppercase">
              Documentação Fotográfica ({images.length} imagens)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img, i) => (
                <div
                  key={img.id}
                  className="bg-black/90 rounded-lg p-2 flex flex-col items-center border border-[#E5E9E7]"
                >
                  <img
                    src={examImagesService.getImageUrl(img)}
                    alt={img.caption || `Registro ${i + 1}`}
                    className="h-32 object-contain"
                  />
                  <span className="text-[10px] text-gray-300 mt-1 text-center truncate w-full">
                    {img.caption || `Figura ${i + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature Block (bottom) */}
        <div className="pt-12 border-t border-[#E5E9E7] flex flex-col items-center text-center space-y-1.5">
          <div className="w-64 border-t border-[#1F2A27] mb-2" />
          <p className="font-bold text-sm text-[#1F2A27]">
            {report.author_name || user?.professional_name || 'Médico Responsável'}
          </p>
          <p className="text-xs font-semibold text-[#0C6B58]">
            {report.author_crm
              ? `CRM ${report.author_crm_uf ? `${report.author_crm_uf} ` : ''}${report.author_crm}`
              : user?.crm
                ? `CRM ${user?.crm_uf ? `${user?.crm_uf} ` : ''}${user.crm}`
                : 'CRM não informado'}
          </p>
          <p className="text-xs text-[#5F6E69]">
            {user?.professional_title ||
              `Médico / CRM ${report.author_crm_uf || user?.crm_uf ? `${report.author_crm_uf || user?.crm_uf} ` : ''}${report.author_crm || user?.crm || 'Não informado'}`}
          </p>
          <p className="text-[11px] text-[#8A9691] pt-1 flex items-center gap-1 justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0C6B58]" />
            Assinado em {formatDateTimeBR(report.signature_date || report.created)}
          </p>
          <p className="text-[10px] text-[#8A9691] pt-1 italic">{PRELIMINARY_VERSION_DISCLAIMER}</p>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir laudo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá este laudo permanentemente do prontuário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
