import React, { useState } from 'react'
import {
  User,
  Shield,
  FileBadge,
  Sliders,
  Save,
  Loader2,
  Lock,
  Mail,
  Upload,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]

export default function Configuracoes() {
  const { user, refreshUser, requestEmailChange } = useAuth()
  const { toast } = useToast()

  // Identification Profile State
  const [professionalName, setProfessionalName] = useState(
    user?.professional_name || user?.name || '',
  )
  const [crm, setCrm] = useState(user?.crm || '')
  const [crmUf, setCrmUf] = useState(user?.crm_uf || 'RO')
  const [professionalTitle, setProfessionalTitle] = useState(user?.professional_title || '')
  const [header, setHeader] = useState(user?.header || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Change Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [sendingEmailChange, setSendingEmailChange] = useState(false)
  const [emailSuccessMessage, setEmailSuccessMessage] = useState<string | null>(null)

  const handleSaveIdentification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSavingProfile(true)
    try {
      await pb.collection('users').update(user.id, {
        professional_name: professionalName.trim(),
        crm: crm.trim(),
        crm_uf: crmUf,
        professional_title: professionalTitle.trim(),
        header: header.trim(),
      })
      await refreshUser()
      toast({
        title: 'Configurações salvas.',
        description: 'Sua identificação profissional foi atualizada com sucesso.',
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar identificação.',
        variant: 'destructive',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (!user) return
    if (!currentPassword) {
      setPasswordError('Informe sua senha atual.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.')
      return
    }

    setSavingPassword(true)
    try {
      await pb.collection('users').update(user.id, {
        oldPassword: currentPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      })
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast({
        title: 'Configurações salvas.',
        description: 'Senha alterada com sucesso.',
      })
    } catch {
      setPasswordError('Senha atual incorreta ou inválida.')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim() || !/\S+@\S+\.\S+/.test(newEmail)) {
      toast({
        title: 'E-mail inválido',
        description: 'Informe um e-mail válido.',
        variant: 'destructive',
      })
      return
    }

    setSendingEmailChange(true)
    try {
      await requestEmailChange(newEmail)
      setEmailSuccessMessage(
        `Enviamos um link de confirmação para ${newEmail}. Ao clicar nele, sua conta será desconectada e você poderá acessar com o novo e-mail.`,
      )
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao solicitar alteração de e-mail.',
        variant: 'destructive',
      })
    } finally {
      setSendingEmailChange(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2A27]">Configurações</h1>
        <p className="text-sm text-[#5F6E69] mt-0.5">
          Gerencie seu perfil, assinatura profissional de laudos e preferências
        </p>
      </div>

      {/* 1. Identificação Profissional (Core Medical Identity) */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-[#E5E9E7] pb-4">
          <div className="w-9 h-9 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
            <FileBadge className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#1F2A27]">Identificação Profissional</h2>
            <p className="text-xs text-[#5F6E69]">
              Estes dados serão automaticamente embutidos no rodapé e cabeçalho dos seus laudos
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveIdentification} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prof_name" className="text-xs font-semibold">
                Nome Profissional (como constará no laudo) *
              </Label>
              <Input
                id="prof_name"
                value={professionalName}
                onChange={(e) => setProfessionalName(e.target.value)}
                placeholder="Ex.: Dr. Lucas Willian da Silva"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prof_title" className="text-xs font-semibold">
                Especialidade / Título Profissional
              </Label>
              <Input
                id="prof_title"
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value)}
                placeholder="Ex.: Médico Radiologista"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="crm_num" className="text-xs font-semibold">
                Número do CRM *
              </Label>
              <Input
                id="crm_num"
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                placeholder="Ex.: 6955"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">UF do CRM *</Label>
              <Select value={crmUf} onValueChange={setCrmUf}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {BRAZILIAN_STATES.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <Label htmlFor="prof_header" className="text-xs font-semibold">
              Cabeçalho Institucional dos Laudos
            </Label>
            <Textarea
              id="prof_header"
              rows={3}
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              placeholder="Ex.: Clínica de Diagnóstico por Imagem — Dr. Lucas Willian da Silva | CRM RO 6955"
            />
            <p className="text-[11px] text-[#8A9691]">
              Texto renderizado no topo de cada laudo gerado ou exportado em PDF.
            </p>
          </div>

          <div className="pt-3 flex justify-end">
            <Button
              type="submit"
              disabled={savingProfile}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar identificação
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Perfil & Senha */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-[#E5E9E7] pb-4">
          <div className="w-9 h-9 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#1F2A27]">Dados de Acesso e Perfil</h2>
            <p className="text-xs text-[#5F6E69]">
              Gerencie seu e-mail cadastrado e senha de login
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome Completo</Label>
              <Input value={user?.name || ''} disabled className="bg-[#F7F9F8]" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">E-mail</Label>
                <button
                  type="button"
                  onClick={() => {
                    setEmailSuccessMessage(null)
                    setEmailModalOpen(true)
                  }}
                  className="text-xs text-[#0C6B58] hover:underline font-semibold"
                >
                  Alterar e-mail
                </button>
              </div>
              <Input value={user?.email || ''} disabled className="bg-[#F7F9F8]" />
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="pt-6 border-t border-[#E5E9E7]">
          <h3 className="font-bold text-sm text-[#1F2A27] mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#0C6B58]" />
            Alterar Senha
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            {passwordError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC2626]">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                Senha alterada com sucesso!
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="curr_pass" className="text-xs font-semibold">
                Senha atual
              </Label>
              <Input
                id="curr_pass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_pass" className="text-xs font-semibold">
                Nova senha (mínimo 8 caracteres)
              </Label>
              <Input
                id="new_pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="conf_pass" className="text-xs font-semibold">
                Confirmar nova senha
              </Label>
              <Input
                id="conf_pass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={savingPassword}
              variant="outline"
              className="border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0]"
            >
              {savingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Salvar nova senha'
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* 3. Preferências e Sistema */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E5E9E7] pb-4">
          <div className="w-9 h-9 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#1F2A27]">Preferências</h2>
            <p className="text-xs text-[#5F6E69]">Configurações regionais e do sistema</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Idioma do Sistema</Label>
            <Input value="Português (Brasil) — pt-BR" disabled className="bg-[#F7F9F8]" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Fuso Horário</Label>
            <Input value="America/Porto_Velho (UTC-4)" disabled className="bg-[#F7F9F8]" />
          </div>
        </div>
      </div>

      {/* Modal Alterar E-mail */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar E-mail da Conta</DialogTitle>
            <DialogDescription>
              Um link de confirmação será enviado para o novo endereço.
            </DialogDescription>
          </DialogHeader>

          {emailSuccessMessage ? (
            <div className="py-4 space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                {emailSuccessMessage}
              </div>
              <DialogFooter>
                <Button onClick={() => setEmailModalOpen(false)}>Entendi</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleRequestEmailChange} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="modal_new_email" className="text-xs font-semibold">
                  Novo E-mail *
                </Label>
                <Input
                  id="modal_new_email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="novo@email.com"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmailModalOpen(false)}
                  disabled={sendingEmailChange}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={sendingEmailChange}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
                >
                  {sendingEmailChange ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Solicitar alteração'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
