import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function ConfirmEmailChange() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const { confirmEmailChange } = useAuth()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('Token de alteração ausente.')
      return
    }

    if (!password) {
      setError('Informe sua senha para confirmar a troca de e-mail.')
      return
    }

    setLoading(true)
    try {
      const ok = await confirmEmailChange(token, password)
      if (ok) {
        setSuccess(true)
      } else {
        setError('Token inválido ou senha incorreta.')
      }
    } catch {
      setError('Falha ao confirmar a alteração de e-mail.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8F3F0] via-[#F7F9F8] to-[#E8F3F0] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-[#E5E9E7] p-8 animate-fade-in-up">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0C6B58] flex items-center justify-center text-white text-xl font-bold shadow-md mb-3">
            ⚕
          </div>
          <h1 className="text-xl font-bold text-[#1F2A27]">Confirmar alteração de e-mail</h1>
          <p className="text-sm text-[#5F6E69] mt-1">Digite sua senha para finalizar a troca</p>
        </div>

        {success ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-xl bg-[#E8F3F0] border border-[#0C6B58]/20 flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-[#0C6B58]" />
              <p className="text-sm text-[#1F2A27] font-semibold">E-mail atualizado com sucesso!</p>
              <p className="text-xs text-[#5F6E69]">
                Você foi desconectado por segurança. Acesse sua conta com o novo e-mail.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-[#0C6B58] text-white rounded-lg font-semibold hover:bg-[#0A5949] transition shadow-sm"
            >
              Ir para o Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!token && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Token ausente na URL. Verifique o link recebido por e-mail.</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC2626]">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-[#1F2A27]">
                Senha atual da conta
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha atual"
                  className="pr-10"
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

            <Button
              type="submit"
              disabled={loading || !token}
              className="w-full bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold py-2.5 rounded-lg shadow-sm mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirmando...
                </>
              ) : (
                'Finalizar alteração'
              )}
            </Button>

            <div className="text-center pt-3">
              <Link to="/login" className="text-xs text-[#5F6E69] hover:underline">
                Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
