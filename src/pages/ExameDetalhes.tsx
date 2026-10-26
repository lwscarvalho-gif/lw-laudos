import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  User,
  Trash2,
  FileText,
  FileCheck2,
  Loader2,
  Save,
  CheckCircle2,
} from 'lucide-react'
import { examsService } from '@/services/exams'
import { reportsService } from '@/services/reports'
import { patientsService } from '@/services/patients'
import { useRealtime } from '@/hooks/use-realtime'
import type { Exam, Report, ExamStatus, Patient } from '@/types'
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
import { useToast } from '@/hooks/use-toast'

export default function ExameDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [exam, setExam] = useState<Exam | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit states
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [type, setType] = useState('')
  const [examDate, setExamDate] = useState('')
  const [status, setStatus] = useState<ExamStatus>('Pendente')
  const [indication, setIndication] = useState('')
  const [technicalNotes, setTechnicalNotes] = useState('')

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const ex = await examsService.getById(id)
      setExam(ex)
      setType(ex.type)
      setExamDate(ex.exam_date ? ex.exam_date.slice(0, 10) : '')
      setStatus(ex.status)
      setIndication(ex.indication || '')
      setTechnicalNotes(ex.technical_notes || '')

      // Check if report exists
      const rep = await reportsService.getByExamId(id)
      setReport(rep)
    } catch {
      toast({
        title: 'Erro',
        description: 'Exame não encontrado.',
        variant: 'destructive',
      })
      navigate('/exames')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime<Exam>('exams', () => loadData())
  useRealtime<Report>('reports', () => loadData())

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    setSaving(true)
    try {
      const updated = await examsService.update(id, {
        type: type.trim(),
        exam_date: new Date(examDate).toISOString(),
        status,
        indication: indication.trim(),
        technical_notes: technicalNotes.trim(),
      })
      setExam(updated)
      setIsEditing(false)
      toast({
        title: 'Exame atualizado',
        description: 'Informações salvas com sucesso.',
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar o exame.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await examsService.delete(id)
      toast({
        title: 'Exame excluído',
        description: 'Registro removido com sucesso.',
      })
      navigate('/exames')
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir o exame.',
        variant: 'destructive',
      })
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
        <p className="text-sm text-[#5F6E69]">Carregando exame...</p>
      </div>
    )
  }

  if (!exam) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/exames')}
            className="border-[#E5E9E7] text-[#5F6E69] hover:text-[#1F2A27]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#1F2A27]">{exam.type}</h1>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  exam.status === 'Concluído'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : exam.status === 'Em análise'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {exam.status}
              </span>
            </div>
            <p className="text-xs text-[#5F6E69] mt-0.5">
              Paciente:{' '}
              <Link
                to={`/pacientes/${exam.patient_id}`}
                className="font-semibold text-[#0C6B58] hover:underline"
              >
                {exam.expand?.patient_id?.name || 'Ver paciente'}
              </Link>{' '}
              • Realizado em: {formatDateBR(exam.exam_date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {report ? (
            <Button
              onClick={() => navigate(`/laudos/${report.id}`)}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white shadow-sm"
            >
              <FileCheck2 className="w-4 h-4 mr-1.5" />
              Ver Laudo
            </Button>
          ) : (
            <Button
              onClick={() => navigate(`/laudos/novo?exame=${exam.id}`)}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white shadow-sm"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Criar Laudo
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
            className="border-[#E5E9E7]"
          >
            {isEditing ? 'Cancelar Edição' : 'Editar'}
          </Button>

          <Button
            variant="outline"
            onClick={() => setDeleteModalOpen(true)}
            className="border-red-200 text-[#DC2626] hover:bg-red-50 hover:text-[#DC2626]"
            title="Excluir exame"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm">
        {isEditing ? (
          <form onSubmit={handleUpdate} className="space-y-5">
            <h3 className="text-base font-bold text-[#1F2A27] border-b border-[#E5E9E7] pb-3">
              Editar Detalhes do Exame
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="ed_type" className="text-xs font-semibold">
                Tipo de Exame *
              </Label>
              <Input id="ed_type" value={type} onChange={(e) => setType(e.target.value)} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ed_date" className="text-xs font-semibold">
                  Data do Exame *
                </Label>
                <Input
                  id="ed_date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status do Exame</Label>
                <Select value={status} onValueChange={(val: ExamStatus) => setStatus(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Em análise">Em análise</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ed_ind" className="text-xs font-semibold">
                Indicação Clínica
              </Label>
              <Textarea
                id="ed_ind"
                rows={3}
                value={indication}
                onChange={(e) => setIndication(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ed_tech" className="text-xs font-semibold">
                Observações Técnicas
              </Label>
              <Textarea
                id="ed_tech"
                rows={3}
                value={technicalNotes}
                onChange={(e) => setTechnicalNotes(e.target.value)}
              />
            </div>

            <div className="pt-4 border-t border-[#E5E9E7] flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-[#E5E9E7]">
              <div>
                <p className="text-xs text-[#8A9691] font-semibold uppercase tracking-wider">
                  Paciente
                </p>
                <Link
                  to={`/pacientes/${exam.patient_id}`}
                  className="font-bold text-base text-[#1F2A27] hover:text-[#0C6B58] inline-block mt-1"
                >
                  {exam.expand?.patient_id?.name || 'Não vinculado'}
                </Link>
                {exam.expand?.patient_id?.document && (
                  <p className="text-xs font-mono text-[#5F6E69] mt-0.5">
                    CPF: {exam.expand?.patient_id?.document}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-[#8A9691] font-semibold uppercase tracking-wider">
                  Data de Realização
                </p>
                <p className="font-semibold text-base text-[#1F2A27] mt-1">
                  {formatDateBR(exam.exam_date)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-[#8A9691] font-semibold uppercase tracking-wider">
                Indicação Clínica
              </p>
              <p className="text-sm text-[#1F2A27] mt-2 whitespace-pre-wrap leading-relaxed">
                {exam.indication || 'Nenhuma indicação clínica descrita.'}
              </p>
            </div>

            <div>
              <p className="text-xs text-[#8A9691] font-semibold uppercase tracking-wider">
                Observações Técnicas
              </p>
              <p className="text-sm text-[#1F2A27] mt-2 whitespace-pre-wrap leading-relaxed">
                {exam.technical_notes || 'Nenhuma observação técnica registrada.'}
              </p>
            </div>

            {/* Linked report notice */}
            {report && (
              <div className="p-4 rounded-xl bg-[#E8F3F0] border border-[#0C6B58]/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0C6B58] text-white flex items-center justify-center">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#1F2A27]">{report.title}</h4>
                    <p className="text-xs text-[#5F6E69]">
                      Laudado por {report.author_name || 'Médico'} em{' '}
                      {formatDateBR(report.signature_date || report.created)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/laudos/${report.id}`)}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
                >
                  Abrir Laudo
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal - Delete Exam */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir exame?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita e removerá este registro permanentemente.
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
