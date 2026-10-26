import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Informe um e-mail válido.')
      return
    }

    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSubmitted(true)
    } catch {
      // Show same message for security
      setSubmitted(true)
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
          <h1 className="text-xl font-bold text-[#1F2A27]">Recuperar senha</h1>
          <p className="text-sm text-[#5F6E69] mt-1">
            Informe seu e-mail para receber as instruções
          </p>
        </div>

        {submitted ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-xl bg-[#E8F3F0] border border-[#0C6B58]/20 flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-[#0C6B58]" />
              <p className="text-sm text-[#1F2A27] font-medium leading-relaxed">
                Se existir uma conta com este e-mail, enviaremos um link de recuperação.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-semibold text-[#0C6B58] hover:underline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-[#1F2A27]">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {error && <p className="text-xs text-[#DC2626] mt-1">{error}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold py-2.5 rounded-lg shadow-sm mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar link de recuperação'
              )}
            </Button>

            <div className="text-center pt-4 border-t border-[#E5E9E7]">
              <Link
                to="/login"
                className="inline-flex items-center text-xs font-semibold text-[#5F6E69] hover:text-[#0C6B58]"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Voltar para o login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
