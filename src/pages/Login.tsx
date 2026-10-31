import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/painel'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const errs: { email?: string; password?: string } = {}
    if (!email.trim()) {
      errs.email = 'Informe o seu e-mail.'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'E-mail com formato inválido.'
    }
    if (!password) {
      errs.password = 'Informe a sua senha.'
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBanner(null)

    if (!validate()) return

    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch {
      setErrorBanner('E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8F3F0] via-[#F7F9F8] to-[#E8F3F0] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-[#E5E9E7] p-8 animate-fade-in-up">
        {/* Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#0C6B58] flex items-center justify-center text-white text-2xl font-bold shadow-md mb-3">
            ⚕
          </div>
          <h1 className="text-xl font-bold text-[#1F2A27]">LW LAUDOS</h1>
          <p className="text-sm text-[#5F6E69] mt-1">Sistema Médico de Ultrassonografia e Laudos</p>
        </div>

        {/* Error Banner */}
        {errorBanner && (
          <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-[#DC2626] flex items-center gap-2">
            <span className="font-semibold">Erro:</span> {errorBanner}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-[#1F2A27]">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }}
              placeholder="seu@email.com"
              className={fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
              autoComplete="email"
            />
            {fieldErrors.email && (
              <p className="text-xs text-[#DC2626] mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-[#1F2A27]">
                Senha
              </Label>
              <Link
                to="/forgot-password"
                className="text-xs text-[#0C6B58] hover:underline font-medium"
              >
                Esqueci minha senha
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password)
                    setFieldErrors((prev) => ({ ...prev, password: undefined }))
                }}
                placeholder="••••••••"
                className={`pr-10 ${fieldErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                autoComplete="current-password"
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
            {fieldErrors.password && (
              <p className="text-xs text-[#DC2626] mt-1">{fieldErrors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold py-2.5 rounded-lg shadow-sm mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>

        <div className="mt-8 pt-4 border-t border-[#E5E9E7] text-center">
          <p className="text-xs text-[#8A9691]">
            A criação de contas é realizada exclusivamente por convite do administrador.
          </p>
        </div>
      </div>
    </div>
  )
}
