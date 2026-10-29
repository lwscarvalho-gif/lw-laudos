import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Shield,
  UserCheck,
  Plus,
  Send,
  Loader2,
  Trash2,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sliders,
  AlertCircle,
} from 'lucide-react'
import { adminService } from '@/services/admin'
import { useAuth } from '@/contexts/AuthContext'
import type { Invitation, User, UserPermissions } from '@/types'
import { formatDateBR } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

export default function Administracao() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'convites' ? 'convites' : 'equipe'
  const [activeTab, setActiveTab] = useState<'convites' | 'equipe'>(initialTab)

  const { user: currentAdmin } = useAuth()
  const { toast } = useToast()

  // Invitations state
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadingInvites, setLoadingInvites] = useState(true)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('Médico')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({})

  // Team state
  const [team, setTeam] = useState<User[]>([])
  const [loadingTeam, setLoadingTeam] = useState(true)

  // Permissions modal state
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null>(null)
  const [userPerms, setUserPerms] = useState<UserPermissions | null>(null)
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [savingPerms, setSavingPerms] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>('Médico')

  // Delete user modal
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState(false)

  const loadInvitations = useCallback(async () => {
    setLoadingInvites(true)
    try {
      const data = await adminService.getInvitations()
      setInvitations(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingInvites(false)
    }
  }, [])

  const loadTeam = useCallback(async () => {
    setLoadingTeam(true)
    try {
      const data = await adminService.getTeam()
      setTeam(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingTeam(false)
    }
  }, [])

  useEffect(() => {
    loadInvitations()
    loadTeam()
  }, [loadInvitations, loadTeam])

  const handleTabChange = (tab: 'convites' | 'equipe') => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  // Create invite
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!inviteEmail.trim() || !/\S+@\S+\.\S+/.test(inviteEmail)) {
      errs.email = 'Informe um e-mail válido.'
    }
    if (!inviteName.trim()) {
      errs.name = 'Nome do médico é obrigatório.'
    }
    setInviteErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSendingInvite(true)
    try {
      const created = await adminService.createInvitation({
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        role: inviteRole,
      })
      toast({
        title: 'Convite criado',
        description: `Convite enviado para ${created.email}.`,
      })
      setInviteModalOpen(false)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('Médico')
      loadInvitations()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao convidar',
        description: 'Verifique se já não existe convite ativo para este e-mail.',
        variant: 'destructive',
      })
    } finally {
      setSendingInvite(false)
    }
  }

  // Resend invite
  const handleResendInvite = async (inv: Invitation) => {
    try {
      await adminService.resendInvitation(inv.id)
      toast({
        title: 'Convite reenviado',
        description: `Link de convite renovado por mais 7 dias para ${inv.email}.`,
      })
      loadInvitations()
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao reenviar convite.',
        variant: 'destructive',
      })
    }
  }

  // Cancel invite
  const handleCancelInvite = async (id: string) => {
    try {
      await adminService.cancelInvitation(id)
      toast({
        title: 'Convite cancelado',
        description: 'O convite foi excluído do sistema.',
      })
      loadInvitations()
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao cancelar convite.',
        variant: 'destructive',
      })
    }
  }

  // Toggle user active status
  const handleToggleUserActive = async (u: User) => {
    try {
      const updated = await adminService.toggleUserActive(u.id, u.active !== false)
      toast({
        title: updated.active ? 'Médico ativado' : 'Médico desativado',
        description: `A conta de ${u.name} agora está ${updated.active ? 'ativa' : 'inativa'}.`,
      })
      loadTeam()
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao alterar status da conta.',
        variant: 'destructive',
      })
    }
  }

  // Open permissions modal
  const handleOpenPermissions = async (u: User) => {
    setSelectedUserForPerms(u)
    setSelectedRole(u.role || 'Médico')
    setLoadingPerms(true)
    try {
      const perms = await adminService.getUserPermissions(u.id)
      setUserPerms(
        perms || {
          id: '',
          user: u.id,
          can_create_patients: true,
          can_read_patients: true,
          can_update_patients: true,
          can_delete_patients: true,
          can_create_exams: true,
          can_read_exams: true,
          can_update_exams: true,
          can_delete_exams: true,
          can_create_reports: true,
          can_read_reports: true,
          can_update_reports: true,
          can_delete_reports: true,
          can_create_templates: true,
          can_read_templates: true,
          can_update_templates: true,
          can_delete_templates: true,
        },
      )
    } finally {
      setLoadingPerms(false)
    }
  }

  // Save permissions
  const handleSavePermissions = async () => {
    if (!selectedUserForPerms || !userPerms) return
    setSavingPerms(true)
    try {
      // 1. Update role if changed
      if (selectedRole !== selectedUserForPerms.role) {
        await adminService.updateUserRole(selectedUserForPerms.id, selectedRole)
      }
      // 2. Update granular permissions
      await adminService.saveUserPermissions(selectedUserForPerms.id, userPerms)

      toast({
        title: 'Permissões salvas',
        description: 'Configurações de acesso atualizadas com sucesso.',
      })
      setSelectedUserForPerms(null)
      loadTeam()
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar permissões.',
        variant: 'destructive',
      })
    } finally {
      setSavingPerms(false)
    }
  }

  // Delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return
    if (userToDelete.id === currentAdmin?.id) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não pode excluir sua própria conta de administrador.',
        variant: 'destructive',
      })
      setUserToDelete(null)
      return
    }

    setDeletingUser(true)
    try {
      await adminService.deleteUser(userToDelete.id)
      toast({
        title: 'Conta removida',
        description: `A conta de ${userToDelete.name} foi excluída.`,
      })
      setUserToDelete(null)
      loadTeam()
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir a conta do usuário.',
        variant: 'destructive',
      })
    } finally {
      setDeletingUser(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#0C6B58]" />
            <h1 className="text-2xl font-bold text-[#1F2A27]">Administração</h1>
          </div>
          <p className="text-sm text-[#5F6E69] mt-0.5">
            Gerenciamento exclusivo de convites, equipe e permissões de acesso
          </p>
        </div>
        <Button
          onClick={() => {
            setInviteErrors({})
            setInviteModalOpen(true)
          }}
          className="bg-[#0C6B58] hover:bg-[#0A5949] text-white shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Convidar Usuário
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E9E7]">
        <button
          onClick={() => handleTabChange('equipe')}
          className={`py-3 px-6 text-sm font-semibold transition-all relative ${
            activeTab === 'equipe' ? 'text-[#0C6B58]' : 'text-[#5F6E69] hover:text-[#1F2A27]'
          }`}
        >
          Equipe ({team.length})
          {activeTab === 'equipe' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0C6B58]" />
          )}
        </button>
        <button
          onClick={() => handleTabChange('convites')}
          className={`py-3 px-6 text-sm font-semibold transition-all relative ${
            activeTab === 'convites' ? 'text-[#0C6B58]' : 'text-[#5F6E69] hover:text-[#1F2A27]'
          }`}
        >
          Convites ({invitations.length})
          {activeTab === 'convites' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0C6B58]" />
          )}
        </button>
      </div>

      {/* Content Equipe */}
      {activeTab === 'equipe' && (
        <div className="bg-white rounded-xl border border-[#E5E9E7] shadow-sm overflow-hidden">
          {loadingTeam ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
              <p className="text-sm text-[#5F6E69]">Carregando equipe...</p>
            </div>
          ) : team.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#8A9691]">
              Nenhum membro cadastrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E5E9E7] bg-[#F7F9F8]/60 text-xs font-semibold text-[#5F6E69] uppercase tracking-wider">
                    <th className="py-3 px-4">Nome</th>
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">CRM</th>
                    <th className="py-3 px-4">Papel</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Último Acesso</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E7]">
                  {team.map((u) => {
                    const isActive = u.active !== false
                    return (
                      <tr key={u.id} className="hover:bg-[#F7F9F8]/60 transition">
                        <td className="py-3.5 px-4 font-semibold text-[#1F2A27]">
                          {u.professional_name || u.name}
                        </td>
                        <td className="py-3.5 px-4 text-[#5F6E69]">{u.email}</td>
                        <td className="py-3.5 px-4 text-[#5F6E69] font-mono text-xs">
                          {u.crm ? `${u.crm_uf ? `${u.crm_uf} ` : ''}${u.crm}` : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              u.role === 'Administrador' || u.role === 'Administrador Geral'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : u.role === 'Secretaria'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : u.role === 'Gestor'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : u.role === 'Contabilidade'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-teal-50 text-teal-700 border border-teal-200'
                            }`}
                          >
                            {u.role || 'Médico'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#8A9691] text-xs">
                          {formatDateBR(u.updated || u.created)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleUserActive(u)}
                              className="h-8 text-xs border-[#E5E9E7]"
                            >
                              {isActive ? 'Desativar' : 'Ativar'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenPermissions(u)}
                              className="h-8 text-xs border-[#E5E9E7] text-[#0C6B58]"
                            >
                              <Sliders className="w-3.5 h-3.5 mr-1" />
                              Permissões
                            </Button>
                            {u.id !== currentAdmin?.id && (
                              <button
                                type="button"
                                onClick={() => setUserToDelete(u)}
                                className="p-1.5 text-[#8A9691] hover:text-[#DC2626] hover:bg-red-50 rounded-md transition"
                                title="Excluir conta"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Content Convites */}
      {activeTab === 'convites' && (
        <div className="bg-white rounded-xl border border-[#E5E9E7] shadow-sm overflow-hidden">
          {loadingInvites ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
              <p className="text-sm text-[#5F6E69]">Carregando convites...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#8A9691]">Nenhum convite enviado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E5E9E7] bg-[#F7F9F8]/60 text-xs font-semibold text-[#5F6E69] uppercase tracking-wider">
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">Nome</th>
                    <th className="py-3 px-4">Papel</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Data de Envio</th>
                    <th className="py-3 px-4">Link de Acesso</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E7]">
                  {invitations.map((inv) => {
                    const isPending = inv.status === 'Pendente'
                    const inviteUrl = `${window.location.origin}/aceitar-convite?token=${inv.token}`

                    return (
                      <tr key={inv.id} className="hover:bg-[#F7F9F8]/60 transition">
                        <td className="py-3.5 px-4 font-semibold text-[#1F2A27]">{inv.email}</td>
                        <td className="py-3.5 px-4 text-[#5F6E69]">{inv.name}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs px-2 py-0.5 rounded font-medium bg-[#F7F9F8] border border-[#E5E9E7]">
                            {inv.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              inv.status === 'Aceito'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : inv.status === 'Pendente'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#5F6E69] text-xs">
                          {formatDateBR(inv.created)}
                        </td>
                        <td className="py-3.5 px-4">
                          {isPending && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(inviteUrl)
                                toast({
                                  title: 'Link copiado',
                                  description:
                                    'Link do convite copiado para a área de transferência.',
                                })
                              }}
                              className="text-xs text-[#0C6B58] hover:underline font-mono truncate max-w-[140px] block"
                              title="Copiar link do convite"
                            >
                              Copiar link
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendInvite(inv)}
                              disabled={!isPending}
                              className="h-8 text-xs border-[#E5E9E7]"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              Reenviar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelInvite(inv.id)}
                              disabled={!isPending}
                              className="h-8 text-xs border-red-200 text-[#DC2626] hover:bg-red-50"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Convidar Médico */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Médico</DialogTitle>
            <DialogDescription>
              Envie um convite exclusivo de criação de conta individual.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendInvite} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="inv_name" className="text-xs font-semibold">
                Nome completo do médico *
              </Label>
              <Input
                id="inv_name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Ex.: Dr. Roberto Ramos"
                className={inviteErrors.name ? 'border-red-500' : ''}
              />
              {inviteErrors.name && <p className="text-xs text-[#DC2626]">{inviteErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv_email" className="text-xs font-semibold">
                E-mail de destino *
              </Label>
              <Input
                id="inv_email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="medico@hospital.com.br"
                className={inviteErrors.email ? 'border-red-500' : ''}
              />
              {inviteErrors.email && <p className="text-xs text-[#DC2626]">{inviteErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Papel no Sistema</Label>
              <Select value={inviteRole} onValueChange={(val: UserRole) => setInviteRole(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Médico">
                    Médico (agenda individual e laudos clínicos)
                  </SelectItem>
                  <SelectItem value="Secretaria">
                    Secretaria (agenda, pacientes e anexos)
                  </SelectItem>
                  <SelectItem value="Gestor">
                    Gestor (visão gerencial da agenda/unidades)
                  </SelectItem>
                  <SelectItem value="Contabilidade">
                    Contabilidade (relatórios e listagens)
                  </SelectItem>
                  <SelectItem value="Administrador Geral">Administrador Geral</SelectItem>
                  <SelectItem value="Administrador">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteModalOpen(false)}
                disabled={sendingInvite}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={sendingInvite}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
              >
                {sendingInvite ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Convite
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Permissões Granulares */}
      <Dialog
        open={!!selectedUserForPerms}
        onOpenChange={(open) => !open && setSelectedUserForPerms(null)}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Permissões: {selectedUserForPerms?.professional_name || selectedUserForPerms?.name}
            </DialogTitle>
            <DialogDescription>
              Configure o papel e as permissões de acesso do profissional.
            </DialogDescription>
          </DialogHeader>

          {loadingPerms ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-[#0C6B58] animate-spin" />
              <p className="text-xs text-[#5F6E69]">Carregando permissões...</p>
            </div>
          ) : userPerms ? (
            <div className="space-y-6 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Papel do Usuário</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(val: UserRole) => setSelectedRole(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Médico">Médico</SelectItem>
                    <SelectItem value="Secretaria">Secretaria</SelectItem>
                    <SelectItem value="Gestor">Gestor</SelectItem>
                    <SelectItem value="Contabilidade">Contabilidade</SelectItem>
                    <SelectItem value="Administrador Geral">Administrador Geral</SelectItem>
                    <SelectItem value="Administrador">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Granular CRUD switches for 4 entities */}
              <div className="space-y-4 pt-2 border-t border-[#E5E9E7]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5F6E69]">
                  Permissões Granulares por Módulo
                </h4>

                {/* Pacientes */}
                <div className="p-3 bg-[#F7F9F8] rounded-lg border border-[#E5E9E7] space-y-2">
                  <p className="font-semibold text-xs text-[#1F2A27]">Pacientes</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_read_patients ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_read_patients: e.target.checked })
                        }
                      />
                      <span>Visualizar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_create_patients ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_create_patients: e.target.checked })
                        }
                      />
                      <span>Cadastrar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_update_patients ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_update_patients: e.target.checked })
                        }
                      />
                      <span>Editar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_delete_patients ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_delete_patients: e.target.checked })
                        }
                      />
                      <span>Excluir</span>
                    </label>
                  </div>
                </div>

                {/* Exames */}
                <div className="p-3 bg-[#F7F9F8] rounded-lg border border-[#E5E9E7] space-y-2">
                  <p className="font-semibold text-xs text-[#1F2A27]">Exames</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_read_exams ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_read_exams: e.target.checked })
                        }
                      />
                      <span>Visualizar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_create_exams ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_create_exams: e.target.checked })
                        }
                      />
                      <span>Cadastrar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_update_exams ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_update_exams: e.target.checked })
                        }
                      />
                      <span>Editar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_delete_exams ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_delete_exams: e.target.checked })
                        }
                      />
                      <span>Excluir</span>
                    </label>
                  </div>
                </div>

                {/* Laudos */}
                <div className="p-3 bg-[#F7F9F8] rounded-lg border border-[#E5E9E7] space-y-2">
                  <p className="font-semibold text-xs text-[#1F2A27]">Laudos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_read_reports ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_read_reports: e.target.checked })
                        }
                      />
                      <span>Visualizar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_create_reports ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_create_reports: e.target.checked })
                        }
                      />
                      <span>Emitir</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_update_reports ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_update_reports: e.target.checked })
                        }
                      />
                      <span>Editar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_delete_reports ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_delete_reports: e.target.checked })
                        }
                      />
                      <span>Excluir</span>
                    </label>
                  </div>
                </div>

                {/* Modelos */}
                <div className="p-3 bg-[#F7F9F8] rounded-lg border border-[#E5E9E7] space-y-2">
                  <p className="font-semibold text-xs text-[#1F2A27]">Modelos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_read_templates ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_read_templates: e.target.checked })
                        }
                      />
                      <span>Visualizar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_create_templates ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_create_templates: e.target.checked })
                        }
                      />
                      <span>Cadastrar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_update_templates ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_update_templates: e.target.checked })
                        }
                      />
                      <span>Editar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPerms.can_delete_templates ?? true}
                        onChange={(e) =>
                          setUserPerms({ ...userPerms, can_delete_templates: e.target.checked })
                        }
                      />
                      <span>Excluir</span>
                    </label>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedUserForPerms(null)}
                  disabled={savingPerms}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={savingPerms}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
                >
                  {savingPerms ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Permissões'
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal - Delete User */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir médico da equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o acesso de <strong>{userToDelete?.name}</strong> ao sistema
              médico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUser}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteUser()
              }}
              disabled={deletingUser}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              {deletingUser ? 'Excluindo...' : 'Excluir conta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
