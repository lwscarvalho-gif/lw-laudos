import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const { confirmVerification } = useAuth()

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Token de verificação não informado.')
      return
    }

    confirmVerification(token)
      .then((ok) => {
        if (ok) {
          setSuccess(true)
        } else {
          setError('Token inválido ou expirado.')
        }
      })
      .catch(() => {
        setError('Falha ao confirmar o e-mail.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token, confirmVerification])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8F3F0] via-[#F7F9F8] to-[#E8F3F0] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-[#E5E9E7] p-8 text-center animate-fade-in-up">
        <div className="w-12 h-12 rounded-2xl bg-[#0C6B58] flex items-center justify-center text-white text-xl font-bold shadow-md mx-auto mb-4">
          ⚕
        </div>
        <h1 className="text-xl font-bold text-[#1F2A27] mb-2">Confirmação de E-mail</h1>

        {loading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
            <p className="text-sm text-[#5F6E69]">Validando seu e-mail...</p>
          </div>
        ) : success ? (
          <div className="space-y-6 mt-4">
            <div className="p-4 rounded-xl bg-[#E8F3F0] border border-[#0C6B58]/20 flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-[#0C6B58]" />
              <p className="text-sm text-[#1F2A27] font-semibold">E-mail confirmado com sucesso!</p>
              <p className="text-xs text-[#5F6E69]">Sua conta está ativa e pronta para uso.</p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-[#0C6B58] text-white rounded-lg font-semibold hover:bg-[#0A5949] transition"
            >
              Ir para o Login
            </Link>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col items-center gap-3">
              <XCircle className="w-10 h-10 text-[#DC2626]" />
              <p className="text-sm text-[#DC2626] font-semibold">
                Não foi possível confirmar o e-mail.
              </p>
              <p className="text-xs text-[#5F6E69]">
                {error || 'O link pode ter expirado ou já ter sido utilizado.'}
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-white border border-[#E5E9E7] text-[#1F2A27] rounded-lg font-semibold hover:bg-[#F7F9F8] transition"
            >
              Voltar ao Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
