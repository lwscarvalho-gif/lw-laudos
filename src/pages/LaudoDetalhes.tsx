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
} from 'lucide-react'
import { reportsService } from '@/services/reports'
import { useAuth } from '@/contexts/AuthContext'
import type { Report } from '@/types'
import { formatDateBR, formatDateTimeBR } from '@/lib/formatters'
import { printReportPDF } from '@/lib/pdfGenerator'
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
  const [loading, setLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadReport = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const rep = await reportsService.getById(id)
      setReport(rep)
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

  const handleDownloadPDF = () => {
    if (!report) return
    printReportPDF({
      title: report.title,
      patientName: report.expand?.patient_id?.name || 'Paciente',
      patientDocument: report.expand?.patient_id?.document,
      examDate: formatDateBR(report.expand?.exam_id?.exam_date || report.created),
      bodyHtml: report.body,
      authorName: report.author_name || user?.professional_name || 'Médico Responsável',
      authorCrm: report.author_crm || user?.crm,
      authorCrmUf: report.author_crm_uf || user?.crm_uf,
      authorTitle: user?.professional_title,
      headerText: user?.header,
      signatureDate: report.signature_date || report.created,
    })
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
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white shadow-sm font-semibold"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Baixar PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/laudos/${report.id}/editar`)}
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
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1F2A27] uppercase tracking-wide">
            {report.title}
          </h1>
        </div>

        {/* Report Body (Georgia Serif stack) */}
        <div
          className="font-serif-report text-base text-[#1F2A27] leading-relaxed prose max-w-none pt-2"
          dangerouslySetInnerHTML={{ __html: report.body }}
        />

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
          {user?.professional_title && (
            <p className="text-xs text-[#5F6E69]">{user.professional_title}</p>
          )}
          <p className="text-[11px] text-[#8A9691] pt-1 flex items-center gap-1 justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0C6B58]" />
            Assinado em {formatDateTimeBR(report.signature_date || report.created)}
          </p>
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
