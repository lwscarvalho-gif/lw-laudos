import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { adminService } from '@/services/admin'
import pb from '@/lib/pocketbase/client'
import type { Invitation } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function AceitarConvite() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [loadingInvite, setLoadingInvite] = useState(true)
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [crm, setCrm] = useState('')
  const [crmUf, setCrmUf] = useState('RO')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setInviteError('Token de convite ausente.')
      setLoadingInvite(false)
      return
    }

    adminService
      .getInvitationByToken(token)
      .then((inv) => {
        if (!inv) {
          setInviteError('Convite não encontrado ou inválido.')
        } else if (inv.status === 'Aceito') {
          setInviteError('Este convite já foi aceito anteriormente.')
        } else if (inv.status === 'Expirado') {
          setInviteError(
            'Este convite expirou (validade de 7 dias). Solicite um novo envio ao administrador.',
          )
        } else {
          setInvitation(inv)
          setName(inv.name || '')
        }
      })
      .catch(() => {
        setInviteError('Falha ao validar o convite.')
      })
      .finally(() => {
        setLoadingInvite(false)
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!invitation) return

    if (!name.trim()) {
      setError('Informe seu nome completo.')
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    if (password !== passwordConfirm) {
      setError('As senhas não coincidem.')
      return
    }

    setSubmitting(true)
    try {
      // 1. Create user account
      const role = invitation.role
      const isDoctorRole =
        role === 'Médico' || role === 'Administrador' || role === 'Administrador Geral'
      const profName = isDoctorRole
        ? name.startsWith('Dr.') || name.startsWith('Dra.')
          ? name.trim()
          : `Dr. ${name.trim()}`
        : name.trim()

      const newUser = await pb.collection('users').create({
        email: invitation.email,
        emailVisibility: false,
        password,
        passwordConfirm,
        name: name.trim(),
        professional_name: profName,
        role: invitation.role,
        crm: crm.trim(),
        crm_uf: crmUf,
        assigned_doctor: invitation.assigned_doctor || undefined,
        allowed_clinics: invitation.allowed_clinics || undefined,
        active: true,
      })

      // 2. Mark invitation as Aceito
      await pb
        .collection('invitations')
        .update(invitation.id, {
          status: 'Aceito',
        })
        .catch(() => {})

      // 3. Create initial permissions record for the user
      await pb
        .collection('user_permissions')
        .create({
          user: newUser.id,
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
        })
        .catch(() => {})

      // 4. Request email verification
      try {
        await pb.collection('users').requestVerification(invitation.email)
      } catch {
        /* intentionally ignored */
      }

      setSuccess(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar a conta.'
      setError(`Falha ao registrar: ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8F3F0] via-[#F7F9F8] to-[#E8F3F0] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-[#E5E9E7] p-8 animate-fade-in-up">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0C6B58] flex items-center justify-center text-white text-xl font-bold shadow-md mb-3">
            ⚕
          </div>
          <h1 className="text-xl font-bold text-[#1F2A27]">Criar sua conta</h1>
          <p className="text-sm text-[#5F6E69] mt-1">Convite para acesso ao LW LAUDOS</p>
        </div>

        {loadingInvite ? (
          <div className="py-10 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
            <p className="text-sm text-[#5F6E69]">Validando convite...</p>
          </div>
        ) : inviteError ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-amber-600" />
              <p className="text-sm text-amber-900 font-medium leading-relaxed">{inviteError}</p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-semibold text-[#0C6B58] hover:underline"
            >
              Ir para a tela de login
            </Link>
          </div>
        ) : success ? (
          <div className="space-y-6 text-center">
            <div className="p-5 rounded-xl bg-[#E8F3F0] border border-[#0C6B58]/20 flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-[#0C6B58]" />
              <h2 className="text-base font-bold text-[#1F2A27]">Conta criada com sucesso!</h2>
              <p className="text-xs text-[#5F6E69] leading-relaxed">
                Enviamos uma mensagem de confirmação para <strong>{invitation?.email}</strong>. Você
                já pode fazer login na plataforma.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-[#0C6B58] text-white rounded-lg font-semibold hover:bg-[#0A5949] transition shadow-sm"
            >
              Acessar minha conta
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC2626]">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1F2A27]">
                E-mail (definido pelo convite)
              </Label>
              <Input
                type="email"
                value={invitation?.email || ''}
                readOnly
                disabled
                className="bg-[#F7F9F8] text-[#5F6E69] cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-[#1F2A27]">
                Nome completo *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Dr. Roberto Santos"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="crm" className="text-xs font-semibold text-[#1F2A27]">
                  CRM
                </Label>
                <Input
                  id="crm"
                  value={crm}
                  onChange={(e) => setCrm(e.target.value)}
                  placeholder="Ex.: 6955"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="crmUf" className="text-xs font-semibold text-[#1F2A27]">
                  UF
                </Label>
                <Input
                  id="crmUf"
                  value={crmUf}
                  onChange={(e) => setCrmUf(e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="RO"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-[#1F2A27]">
                Senha * (mínimo 8 caracteres)
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A9691] hover:text-[#1F2A27]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="passwordConfirm" className="text-xs font-semibold text-[#1F2A27]">
                Confirmar senha *
              </Label>
              <Input
                id="passwordConfirm"
                type={showPassword ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold py-2.5 rounded-lg shadow-sm mt-4"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta'
              )}
            </Button>

            <div className="text-center pt-3">
              <Link to="/login" className="text-xs text-[#5F6E69] hover:underline">
                Já tem uma conta? Faça login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
