import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  Plus,
  Eye,
  Edit2,
  Download,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Layers,
} from 'lucide-react'
import { reportsService } from '@/services/reports'
import { useRealtime } from '@/hooks/use-realtime'
import type { Report } from '@/types'
import { formatDateBR } from '@/lib/formatters'
import { printReportPDF } from '@/lib/pdfGenerator'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default function Laudos() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [reports, setReports] = useState<Report[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [reportToDelete, setReportToDelete] = useState<Report | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await reportsService.getList(page, 15, search)
      setReports(res.items)
      setTotalItems(res.totalItems)
      setTotalPages(res.totalPages || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  useRealtime<Report>('reports', () => loadReports())

  const handleDeleteReport = async () => {
    if (!reportToDelete) return
    setDeleting(true)
    try {
      await reportsService.delete(reportToDelete.id)
      toast({
        title: 'Laudo excluído',
        description: 'Registro de laudo removido com sucesso.',
      })
      setReportToDelete(null)
      loadReports()
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir o laudo.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleDownloadPDF = (rep: Report) => {
    printReportPDF({
      title: rep.title,
      patientName: rep.expand?.patient_id?.name || 'Paciente',
      patientDocument: rep.expand?.patient_id?.document,
      examDate: formatDateBR(rep.expand?.exam_id?.exam_date || rep.created),
      bodyHtml: rep.body,
      authorName: rep.author_name || user?.professional_name || user?.name || 'Médico Responsável',
      authorCrm: rep.author_crm || user?.crm,
      authorCrmUf: rep.author_crm_uf || user?.crm_uf,
      authorTitle: user?.professional_title,
      headerText: user?.header,
      signatureDate: rep.signature_date || rep.created,
    })
  }

  const startIdx = totalItems === 0 ? 0 : (page - 1) * 15 + 1
  const endIdx = Math.min(page * 15, totalItems)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2A27]">Laudos</h1>
          <p className="text-sm text-[#5F6E69] mt-0.5">
            Emita, visualize e gerencie seus laudos médicos com assinatura
          </p>
        </div>
        <Button
          onClick={() => navigate('/laudos/novo')}
          className="bg-[#0C6B58] hover:bg-[#0A5949] text-white shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Laudo
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9691]" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Buscar por paciente ou título..."
          className="pl-9 bg-white border-[#E5E9E7]"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-[#E5E9E7]">
          <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
          <p className="text-sm text-[#5F6E69]">Carregando laudos...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center bg-white rounded-xl border border-[#E5E9E7]">
          <div className="w-16 h-16 rounded-full bg-[#E8F3F0] flex items-center justify-center text-[#0C6B58] mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#1F2A27]">
            {search ? 'Nenhum laudo encontrado' : 'Nenhum laudo criado.'}
          </h3>
          <p className="text-sm text-[#5F6E69] max-w-sm mt-1 mb-6">
            Crie seu primeiro laudo a partir de um exame ou modelo pré-formatado.
          </p>
          <Button
            onClick={() => navigate('/laudos/novo')}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Laudo
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-xl border border-[#E5E9E7] shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E9E7] bg-[#F7F9F8]/60 text-xs font-semibold text-[#5F6E69] uppercase tracking-wider">
                  <th className="py-3 px-4">Título</th>
                  <th className="py-3 px-4">Paciente</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Modelo</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E7]">
                {reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-[#F7F9F8]/60 transition">
                    <td className="py-3.5 px-4 font-semibold text-[#1F2A27]">
                      <Link to={`/laudos/${rep.id}`} className="hover:text-[#0C6B58] transition">
                        {rep.title}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-[#5F6E69]">
                      <Link
                        to={`/pacientes/${rep.patient_id}`}
                        className="hover:underline text-[#1F2A27]"
                      >
                        {rep.expand?.patient_id?.name || 'Paciente'}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-[#5F6E69]">
                      {formatDateBR(rep.signature_date || rep.created)}
                    </td>
                    <td className="py-3.5 px-4 text-[#5F6E69]">
                      {rep.expand?.template_id?.title ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-[#F7F9F8] px-2 py-0.5 rounded border border-[#E5E9E7]">
                          <Layers className="w-3 h-3 text-[#0C6B58]" />
                          {rep.expand.template_id.title}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/laudos/${rep.id}`}
                          title="Abrir laudo"
                          className="p-1.5 text-[#5F6E69] hover:text-[#0C6B58] hover:bg-[#E8F3F0] rounded-md transition"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/laudos/${rep.id}/editar`}
                          title="Editar laudo"
                          className="p-1.5 text-[#5F6E69] hover:text-[#0C6B58] hover:bg-[#E8F3F0] rounded-md transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(rep)}
                          title="Baixar PDF"
                          className="p-1.5 text-[#5F6E69] hover:text-[#0C6B58] hover:bg-[#E8F3F0] rounded-md transition"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setReportToDelete(rep)}
                          title="Excluir laudo"
                          className="p-1.5 text-[#8A9691] hover:text-[#DC2626] hover:bg-red-50 rounded-md transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      to={`/laudos/${rep.id}`}
                      className="font-bold text-base text-[#1F2A27] hover:text-[#0C6B58]"
                    >
                      {rep.title}
                    </Link>
                    <p className="text-xs text-[#5F6E69] mt-0.5">
                      Paciente: {rep.expand?.patient_id?.name || 'Paciente'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#5F6E69] pt-2 border-t border-[#E5E9E7]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#8A9691]" />
                    <span>{formatDateBR(rep.signature_date || rep.created)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDownloadPDF(rep)}
                      className="p-1.5 text-[#0C6B58] bg-[#E8F3F0] rounded-md"
                      title="Baixar PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/laudos/${rep.id}`}
                      className="p-1.5 text-[#0C6B58] bg-[#E8F3F0] rounded-md"
                      title="Abrir"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/laudos/${rep.id}/editar`}
                      className="p-1.5 text-[#5F6E69] bg-[#F7F9F8] rounded-md"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setReportToDelete(rep)}
                      className="p-1.5 text-[#DC2626] bg-red-50 rounded-md"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-[#5F6E69]">
            <span>
              Mostrando {startIdx}–{endIdx} de {totalItems}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className="h-8 border-[#E5E9E7]"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <span className="px-2 font-medium">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages}
                className="h-8 border-[#E5E9E7]"
              >
                Próxima
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal - Delete Report */}
      <AlertDialog
        open={!!reportToDelete}
        onOpenChange={(open) => !open && setReportToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir laudo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá este laudo permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteReport()
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
