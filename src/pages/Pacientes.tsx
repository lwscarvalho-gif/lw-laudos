import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Plus,
  Eye,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Phone,
  Mail,
} from 'lucide-react'
import { patientsService } from '@/services/patients'
import { useRealtime } from '@/hooks/use-realtime'
import type { Patient } from '@/types'
import { formatDateBR, maskCPF, maskPhone, parseLocalYMDToISO } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

export default function Pacientes() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Modal New Patient
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    birth_date: '',
    sex: 'Feminino' as 'Feminino' | 'Masculino' | 'Outro',
    phone: '',
    email: '',
    address: '',
    sus_card: '',
    notes: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Modal Delete Patient
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { toast } = useToast()

  const loadPatients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await patientsService.getList(page, 15, search)
      setPatients(res.items)
      setTotalItems(res.totalItems)
      setTotalPages(res.totalPages || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  // Real-time subscription
  useRealtime<Patient>('patients', () => {
    loadPatients()
  })

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!formData.name.trim()) {
      errs.name = 'Nome completo é obrigatório.'
    }
    if (!formData.document.trim()) {
      errs.document = 'CPF é obrigatório.'
    } else {
      const digits = formData.document.replace(/\D/g, '')
      if (digits.length !== 11) {
        errs.document = 'CPF deve conter 11 dígitos.'
      }
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'E-mail com formato inválido.'
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setSaving(true)
    try {
      await patientsService.create({
        name: formData.name.trim(),
        document: formData.document.trim(),
        birth_date: formData.birth_date ? parseLocalYMDToISO(formData.birth_date) : undefined,
        sex: formData.sex,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        sus_card: formData.sus_card.trim(),
        notes: formData.notes.trim(),
      })
      toast({
        title: 'Paciente cadastrado',
        description: 'Paciente salvo com sucesso.',
      })
      setIsModalOpen(false)
      setFormData({
        name: '',
        document: '',
        birth_date: '',
        sex: 'Feminino',
        phone: '',
        email: '',
        address: '',
        sus_card: '',
        notes: '',
      })
      loadPatients()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível cadastrar o paciente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePatient = async () => {
    if (!patientToDelete) return
    setDeleting(true)
    try {
      await patientsService.delete(patientToDelete.id)
      toast({
        title: 'Paciente excluído',
        description: 'Paciente removido com sucesso.',
      })
      setPatientToDelete(null)
      loadPatients()
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir o paciente.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const startIdx = totalItems === 0 ? 0 : (page - 1) * 15 + 1
  const endIdx = Math.min(page * 15, totalItems)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2A27]">Pacientes</h1>
          <p className="text-sm text-[#5F6E69] mt-0.5">
            Gerencie os prontuários dos seus pacientes
          </p>
        </div>
        <Button
          onClick={() => {
            setFieldErrors({})
            setIsModalOpen(true)
          }}
          className="bg-[#0C6B58] hover:bg-[#0A5949] text-white shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Paciente
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9691]" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Buscar por nome ou documento..."
          className="pl-9 bg-white border-[#E5E9E7]"
        />
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-[#E5E9E7]">
          <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
          <p className="text-sm text-[#5F6E69]">Carregando pacientes...</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center bg-white rounded-xl border border-[#E5E9E7]">
          <div className="w-16 h-16 rounded-full bg-[#E8F3F0] flex items-center justify-center text-[#0C6B58] mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#1F2A27]">
            {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
          </h3>
          <p className="text-sm text-[#5F6E69] max-w-sm mt-1 mb-6">
            {search
              ? 'Tente buscar com outro nome ou número de documento.'
              : 'Cadastre seu primeiro paciente para começar.'}
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Paciente
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-xl border border-[#E5E9E7] shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E9E7] bg-[#F7F9F8]/60 text-xs font-semibold text-[#5F6E69] uppercase tracking-wider">
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">Documento (CPF)</th>
                  <th className="py-3 px-4">Data Nasc.</th>
                  <th className="py-3 px-4">Telefone</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E7]">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F7F9F8]/60 transition">
                    <td className="py-3.5 px-4 font-semibold text-[#1F2A27]">
                      <Link to={`/pacientes/${p.id}`} className="hover:text-[#0C6B58] transition">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-[#5F6E69] font-mono text-xs">{p.document}</td>
                    <td className="py-3.5 px-4 text-[#5F6E69]">{formatDateBR(p.birth_date)}</td>
                    <td className="py-3.5 px-4 text-[#5F6E69]">{p.phone || '—'}</td>
                    <td className="py-3.5 px-4 text-[#5F6E69]">{p.email || '—'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/pacientes/${p.id}`}
                          title="Abrir prontuário"
                          className="p-1.5 text-[#5F6E69] hover:text-[#0C6B58] hover:bg-[#E8F3F0] rounded-md transition"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPatientToDelete(p)}
                          title="Excluir paciente"
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
            {patients.map((p) => (
              <div
                key={p.id}
                className="bg-white p-4 rounded-xl border border-[#E5E9E7] shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      to={`/pacientes/${p.id}`}
                      className="font-bold text-base text-[#1F2A27] hover:text-[#0C6B58]"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs font-mono text-[#5F6E69] mt-0.5">CPF: {p.document}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/pacientes/${p.id}`}
                      className="p-2 text-[#0C6B58] bg-[#E8F3F0] rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPatientToDelete(p)}
                      className="p-2 text-[#DC2626] bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-[#5F6E69] pt-2 border-t border-[#E5E9E7]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#8A9691]" />
                    <span>Nasc: {formatDateBR(p.birth_date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 text-[#8A9691]" />
                    <span className="truncate">{p.phone || '—'}</span>
                  </div>
                  {p.email && (
                    <div className="col-span-2 flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-[#8A9691]" />
                      <span className="truncate">{p.email}</span>
                    </div>
                  )}
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

      {/* Modal New Patient */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Paciente</DialogTitle>
            <DialogDescription>Preencha as informações cadastrais do paciente.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePatient} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="p_name" className="text-xs font-semibold">
                Nome completo *
              </Label>
              <Input
                id="p_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex.: Carlos Eduardo Santos"
                className={fieldErrors.name ? 'border-red-500' : ''}
              />
              {fieldErrors.name && <p className="text-xs text-[#DC2626]">{fieldErrors.name}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p_doc" className="text-xs font-semibold">
                  CPF *
                </Label>
                <Input
                  id="p_doc"
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: maskCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={fieldErrors.document ? 'border-red-500' : ''}
                />
                {fieldErrors.document && (
                  <p className="text-xs text-[#DC2626]">{fieldErrors.document}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p_birth" className="text-xs font-semibold">
                  Data de nascimento
                </Label>
                <Input
                  id="p_birth"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sexo</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(val: 'Feminino' | 'Masculino' | 'Outro') =>
                    setFormData({ ...formData, sex: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p_phone" className="text-xs font-semibold">
                  Telefone
                </Label>
                <Input
                  id="p_phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p_email" className="text-xs font-semibold">
                E-mail
              </Label>
              <Input
                id="p_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="paciente@exemplo.com"
                className={fieldErrors.email ? 'border-red-500' : ''}
              />
              {fieldErrors.email && <p className="text-xs text-[#DC2626]">{fieldErrors.email}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p_sus" className="text-xs font-semibold">
                  Cartão Nacional de Saúde (SUS)
                </Label>
                <Input
                  id="p_sus"
                  value={formData.sus_card}
                  onChange={(e) => setFormData({ ...formData, sus_card: e.target.value })}
                  placeholder="000 0000 0000 0000"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p_addr" className="text-xs font-semibold">
                  Endereço
                </Label>
                <Input
                  id="p_addr"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, número, bairro, cidade..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p_notes" className="text-xs font-semibold">
                Observações clínicas
              </Label>
              <Textarea
                id="p_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Alergias, histórico relevante, observações..."
                rows={3}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
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
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal - Delete Patient */}
      <AlertDialog
        open={!!patientToDelete}
        onOpenChange={(open) => !open && setPatientToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados cadastrais deste paciente serão
              removidos.
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
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
