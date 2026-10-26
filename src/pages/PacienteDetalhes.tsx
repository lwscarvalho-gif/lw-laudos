import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  FileText,
  User,
  Trash2,
  Plus,
  Loader2,
  Save,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { patientsService } from '@/services/patients'
import { examsService } from '@/services/exams'
import { reportsService } from '@/services/reports'
import { useRealtime } from '@/hooks/use-realtime'
import type { Patient, Exam, Report } from '@/types'
import { formatDateBR, maskCPF, maskPhone } from '@/lib/formatters'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function PacienteDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [exams, setExams] = useState<Exam[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  // Edit patient form
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    birth_date: '',
    sex: 'Feminino' as 'Feminino' | 'Masculino' | 'Outro',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })
  const [savingPatient, setSavingPatient] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [p, ex, rep] = await Promise.all([
        patientsService.getById(id),
        examsService.getByPatientId(id),
        reportsService.getByPatientId(id),
      ])
      setPatient(p)
      setExams(ex)
      setReports(rep)

      setFormData({
        name: p.name || '',
        document: p.document || '',
        birth_date: p.birth_date ? p.birth_date.slice(0, 10) : '',
        sex: (p.sex as 'Feminino' | 'Masculino' | 'Outro') || 'Feminino',
        phone: p.phone || '',
        email: p.email || '',
        address: p.address || '',
        notes: p.notes || '',
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Paciente não encontrado ou sem permissão de acesso.',
        variant: 'destructive',
      })
      navigate('/pacientes')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime updates
  useRealtime<Patient>('patients', () => loadData())
  useRealtime<Exam>('exams', () => loadData())
  useRealtime<Report>('reports', () => loadData())

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    const errs: Record<string, string> = {}
    if (!formData.name.trim()) errs.name = 'Nome completo é obrigatório.'
    if (!formData.document.trim()) errs.document = 'CPF é obrigatório.'
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'E-mail inválido.'

    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSavingPatient(true)
    try {
      const updated = await patientsService.update(id, {
        name: formData.name.trim(),
        document: formData.document.trim(),
        birth_date: formData.birth_date ? new Date(formData.birth_date).toISOString() : undefined,
        sex: formData.sex,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        notes: formData.notes.trim(),
      })
      setPatient(updated)
      toast({
        title: 'Dados atualizados',
        description: 'As alterações do paciente foram salvas.',
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar as informações do paciente.',
        variant: 'destructive',
      })
    } finally {
      setSavingPatient(false)
    }
  }

  const handleDeletePatient = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await patientsService.delete(id)
      toast({
        title: 'Paciente excluído',
        description: 'Paciente, exames e laudos vinculados foram removidos.',
      })
      navigate('/pacientes')
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o paciente.',
        variant: 'destructive',
      })
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
        <p className="text-sm text-[#5F6E69]">Carregando prontuário...</p>
      </div>
    )
  }

  if (!patient) return null

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top back & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/pacientes')}
            className="border-[#E5E9E7] text-[#5F6E69] hover:text-[#1F2A27]"
            title="Voltar para lista"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#1F2A27]">{patient.name}</h1>
              <Badge variant="outline" className="text-xs bg-[#E8F3F0] text-[#0C6B58] border-none">
                Prontuário Ativo
              </Badge>
            </div>
            <p className="text-xs text-[#5F6E69] font-mono mt-0.5">CPF: {patient.document}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate(`/exames/novo?paciente=${patient.id}`)}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Exame
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteModalOpen(true)}
            className="border-red-200 text-[#DC2626] hover:bg-red-50 hover:text-[#DC2626]"
            title="Excluir paciente"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados" className="space-y-6">
        <TabsList className="bg-white border border-[#E5E9E7] p-1 rounded-xl">
          <TabsTrigger
            value="dados"
            className="data-[state=active]:bg-[#0C6B58] data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2"
          >
            <User className="w-4 h-4 mr-1.5" />
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger
            value="exames"
            className="data-[state=active]:bg-[#0C6B58] data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2"
          >
            <ClipboardList className="w-4 h-4 mr-1.5" />
            Exames ({exams.length})
          </TabsTrigger>
          <TabsTrigger
            value="laudos"
            className="data-[state=active]:bg-[#0C6B58] data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Laudos ({reports.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Dados Pessoais */}
        <TabsContent
          value="dados"
          className="bg-white p-6 rounded-xl border border-[#E5E9E7] shadow-sm"
        >
          <form onSubmit={handleUpdatePatient} className="space-y-5">
            <h3 className="text-base font-bold text-[#1F2A27] border-b border-[#E5E9E7] pb-3">
              Ficha Cadastral do Paciente
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="det_name" className="text-xs font-semibold">
                  Nome completo *
                </Label>
                <Input
                  id="det_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={fieldErrors.name ? 'border-red-500' : ''}
                />
                {fieldErrors.name && <p className="text-xs text-[#DC2626]">{fieldErrors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="det_doc" className="text-xs font-semibold">
                  CPF *
                </Label>
                <Input
                  id="det_doc"
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: maskCPF(e.target.value) })}
                  maxLength={14}
                  className={fieldErrors.document ? 'border-red-500' : ''}
                />
                {fieldErrors.document && (
                  <p className="text-xs text-[#DC2626]">{fieldErrors.document}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="det_birth" className="text-xs font-semibold">
                  Data de nascimento
                </Label>
                <Input
                  id="det_birth"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sexo</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(val: 'Feminino' | 'Masculino' | 'Outro') =>
                    setFormData({ ...formData, sex: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="det_phone" className="text-xs font-semibold">
                  Telefone
                </Label>
                <Input
                  id="det_phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                  maxLength={15}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="det_email" className="text-xs font-semibold">
                  E-mail
                </Label>
                <Input
                  id="det_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={fieldErrors.email ? 'border-red-500' : ''}
                />
                {fieldErrors.email && <p className="text-xs text-[#DC2626]">{fieldErrors.email}</p>}
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <Label htmlFor="det_address" className="text-xs font-semibold">
                  Endereço residencial
                </Label>
                <Input
                  id="det_address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <Label htmlFor="det_notes" className="text-xs font-semibold">
                  Observações e histórico clínico
                </Label>
                <Textarea
                  id="det_notes"
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5E9E7] flex justify-end">
              <Button
                type="submit"
                disabled={savingPatient}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold"
              >
                {savingPatient ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar alterações
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Tab 2: Exames */}
        <TabsContent value="exames" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1F2A27]">
              Histórico de Exames ({exams.length})
            </h3>
            <Button
              size="sm"
              onClick={() => navigate(`/exames/novo?paciente=${patient.id}`)}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Exame
            </Button>
          </div>

          {exams.length === 0 ? (
            <div className="bg-white p-10 rounded-xl border border-[#E5E9E7] text-center">
              <ClipboardList className="w-10 h-10 text-[#8A9691] mx-auto mb-2" />
              <p className="font-semibold text-sm text-[#1F2A27]">Nenhum exame cadastrado</p>
              <p className="text-xs text-[#5F6E69] mt-1 mb-4">
                Cadastre o primeiro exame deste paciente.
              </p>
              <Button
                size="sm"
                onClick={() => navigate(`/exames/novo?paciente=${patient.id}`)}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
              >
                Adicionar Exame
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E9E7] shadow-sm overflow-hidden divide-y divide-[#E5E9E7]">
              {exams.map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => navigate(`/exames/${ex.id}`)}
                  className="p-4 flex items-center justify-between hover:bg-[#F7F9F8] cursor-pointer transition"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-[#1F2A27]">{ex.type}</p>
                    <div className="flex items-center gap-3 text-xs text-[#5F6E69]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#8A9691]" />
                        {formatDateBR(ex.exam_date)}
                      </span>
                      {ex.indication && (
                        <span className="truncate max-w-md hidden sm:inline">
                          Indicação: {ex.indication}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        ex.status === 'Concluído'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : ex.status === 'Em análise'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {ex.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Laudos */}
        <TabsContent value="laudos" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1F2A27]">
              Laudos Emitidos ({reports.length})
            </h3>
            <Button
              size="sm"
              onClick={() => navigate(`/laudos/novo?paciente=${patient.id}`)}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Laudo
            </Button>
          </div>

          {reports.length === 0 ? (
            <div className="bg-white p-10 rounded-xl border border-[#E5E9E7] text-center">
              <FileText className="w-10 h-10 text-[#8A9691] mx-auto mb-2" />
              <p className="font-semibold text-sm text-[#1F2A27]">Nenhum laudo emitido</p>
              <p className="text-xs text-[#5F6E69] mt-1 mb-4">
                Emita o primeiro laudo médico para este paciente.
              </p>
              <Button
                size="sm"
                onClick={() => navigate(`/laudos/novo?paciente=${patient.id}`)}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
              >
                Criar Laudo
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E9E7] shadow-sm overflow-hidden divide-y divide-[#E5E9E7]">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => navigate(`/laudos/${rep.id}`)}
                  className="p-4 flex items-center justify-between hover:bg-[#F7F9F8] cursor-pointer transition"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-[#1F2A27]">{rep.title}</p>
                    <div className="flex items-center gap-3 text-xs text-[#5F6E69]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#8A9691]" />
                        {formatDateBR(rep.signature_date || rep.created)}
                      </span>
                      {rep.author_name && <span>Assinado por: {rep.author_name}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-[#0C6B58]">
                    Visualizar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Excluir paciente permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Atenção: Esta ação é definitiva e removerá o prontuário de{' '}
                <strong>{patient.name}</strong>, juntamente com todos os seus{' '}
                <strong>{exams.length} exame(s)</strong> e{' '}
                <strong>{reports.length} laudo(s)</strong> associados.
              </p>
              <p className="font-semibold text-xs text-red-600">Esta ação não pode ser desfeita.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeletePatient()
              }}
              disabled={deleting}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              {deleting ? 'Excluindo...' : 'Sim, excluir tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
