import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  Plus,
  Eye,
  Trash2,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  User,
  FileCheck2,
  FileText,
} from 'lucide-react'
import { examsService } from '@/services/exams'
import { reportsService } from '@/services/reports'
import { useRealtime } from '@/hooks/use-realtime'
import type { Exam } from '@/types'
import { formatDateBR } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useToast } from '@/hooks/use-toast'

export default function Exames() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [exams, setExams] = useState<Exam[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [loading, setLoading] = useState(true)

  // Track exams with reports
  const [reportMap, setReportMap] = useState<Record<string, string>>({}) // examId -> reportId

  // Delete modal
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadExams = useCallback(async () => {
    setLoading(true)
    try {
      const res = await examsService.getList(page, 15, search, statusFilter)
      setExams(res.items)
      setTotalItems(res.totalItems)
      setTotalPages(res.totalPages || 1)

      // Query reports for these exams
      const repMap: Record<string, string> = {}
      await Promise.all(
        res.items.map(async (ex) => {
          try {
            const rep = await reportsService.getByExamId(ex.id)
            if (rep) {
              repMap[ex.id] = rep.id
            }
          } catch {
            // ignore
          }
        }),
      )
      setReportMap(repMap)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    loadExams()
  }, [loadExams])

  useRealtime<Exam>('exams', () => loadExams())

  const handleDeleteExam = async () => {
    if (!examToDelete) return
    setDeleting(true)
    try {
      await examsService.delete(examToDelete.id)
      toast({
        title: 'Exame excluído',
        description: 'Registro de exame removido com sucesso.',
      })
      setExamToDelete(null)
      loadExams()
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir o exame.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Concluído':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Concluído
          </span>
        )
      case 'Em análise':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Em análise
          </span>
        )
      case 'Pendente':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Pendente
          </span>
        )
    }
  }

  const startIdx = totalItems === 0 ? 0 : (page - 1) * 15 + 1
  const endIdx = Math.min(page * 15, totalItems)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2A27]">Atendimentos</h1>
          <p className="text-sm text-[#5F6E69] mt-0.5">
            Acompanhe o fluxo de atendimentos clínicos
          </p>
        </div>
        <Button
          onClick={() => navigate('/exames/novo')}
          className="bg-[#0C6B58] hover:bg-[#0A5949] text-white shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Atendimento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9691]" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar por paciente ou tipo de exame..."
            className="pl-9 bg-white border-[#E5E9E7]"
          />
        </div>

        <div className="w-48">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="bg-white border-[#E5E9E7]">
              <SelectValue placeholder="Status do exame" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os status</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Em análise">Em análise</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-[#E5E9E7]">
          <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
          <p className="text-sm text-[#5F6E69]">Carregando exames...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center bg-white rounded-xl border border-[#E5E9E7]">
          <div className="w-16 h-16 rounded-full bg-[#E8F3F0] flex items-center justify-center text-[#0C6B58] mb-4">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#1F2A27]">
            {search || statusFilter !== 'Todos'
              ? 'Nenhum exame encontrado para os filtros'
              : 'Nenhum exame cadastrado'}
          </h3>
          <p className="text-sm text-[#5F6E69] max-w-sm mt-1 mb-6">
            Cadastre os exames dos seus pacientes para gerar laudos.
          </p>
          <Button
            onClick={() => navigate('/exames/novo')}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Exame
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-xl border border-[#E5E9E7] shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E9E7] bg-[#F7F9F8]/60 text-xs font-semibold text-[#5F6E69] uppercase tracking-wider">
                  <th className="py-3 px-4">Paciente</th>
                  <th className="py-3 px-4">Tipo de Exame</th>
                  <th className="py-3 px-4">Data do Exame</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Laudo</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E7]">
                {exams.map((ex) => {
                  const hasReport = !!reportMap[ex.id]
                  return (
                    <tr key={ex.id} className="hover:bg-[#F7F9F8]/60 transition">
                      <td className="py-3.5 px-4 font-semibold text-[#1F2A27]">
                        <Link
                          to={`/pacientes/${ex.patient_id}`}
                          className="hover:text-[#0C6B58] transition"
                        >
                          {ex.expand?.patient_id?.name || 'Paciente'}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-[#1F2A27]">{ex.type}</td>
                      <td className="py-3.5 px-4 text-[#5F6E69]">{formatDateBR(ex.exam_date)}</td>
                      <td className="py-3.5 px-4">{getStatusBadge(ex.status)}</td>
                      <td className="py-3.5 px-4 text-center">
                        {hasReport ? (
                          <Link
                            to={`/laudos/${reportMap[ex.id]}`}
                            title="Ver laudo emitido"
                            className="inline-flex items-center gap-1 text-xs text-[#0C6B58] bg-[#E8F3F0] hover:bg-[#d8ece7] px-2.5 py-1 rounded-full font-medium transition"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            Emitido
                          </Link>
                        ) : (
                          <span className="text-xs text-[#8A9691]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!hasReport && (
                            <Link
                              to={`/laudos/ultrassom?exame=${ex.id}&paciente=${ex.patient_id}`}
                              title="Criar Laudo para este exame"
                              className="inline-flex items-center gap-1 text-xs text-white bg-[#0C6B58] hover:bg-[#0A5949] px-2.5 py-1 rounded-md font-medium transition shadow-xs"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Criar Laudo
                            </Link>
                          )}
                          <Link
                            to={`/exames/${ex.id}`}
                            title="Ver detalhes"
                            className="p-1.5 text-[#5F6E69] hover:text-[#0C6B58] hover:bg-[#E8F3F0] rounded-md transition"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setExamToDelete(ex)}
                            title="Excluir exame"
                            className="p-1.5 text-[#8A9691] hover:text-[#DC2626] hover:bg-red-50 rounded-md transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {exams.map((ex) => {
              const hasReport = !!reportMap[ex.id]
              return (
                <div
                  key={ex.id}
                  className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-[#5F6E69] block">
                        {ex.expand?.patient_id?.name || 'Paciente'}
                      </span>
                      <h3 className="font-bold text-base text-[#1F2A27]">{ex.type}</h3>
                    </div>
                    {getStatusBadge(ex.status)}
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#5F6E69] pt-2 border-t border-[#E5E9E7]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#8A9691]" />
                      <span>{formatDateBR(ex.exam_date)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {hasReport ? (
                        <Link
                          to={`/laudos/${reportMap[ex.id]}`}
                          className="px-2 py-1 text-xs bg-[#E8F3F0] text-[#0C6B58] rounded-md font-medium"
                        >
                          Ver Laudo
                        </Link>
                      ) : (
                        <Link
                          to={`/laudos/ultrassom?exame=${ex.id}&paciente=${ex.patient_id}`}
                          className="px-2 py-1 text-xs bg-[#0C6B58] text-white rounded-md font-medium shadow-xs"
                        >
                          Criar Laudo
                        </Link>
                      )}
                      <Link
                        to={`/exames/${ex.id}`}
                        className="p-1.5 text-[#0C6B58] bg-[#E8F3F0] rounded-md"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setExamToDelete(ex)}
                        className="p-1.5 text-[#DC2626] bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
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

      {/* Confirmation Modal - Delete Exam */}
      <AlertDialog open={!!examToDelete} onOpenChange={(open) => !open && setExamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir exame?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente o exame selecionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteExam()
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
