import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Shield,
  ShieldCheck,
  Loader2,
  FileKey,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { cloudSignatureService, CLOUD_PROVIDERS } from '@/services/cloudSignatureSession'
import { A1CertificateConfigModal } from '@/components/A1CertificateConfigModal'
import {
  doctorA1CertificateService,
  type ActiveA1CertificateInfo,
} from '@/services/doctorA1Certificate'
import pb from '@/lib/pocketbase/client'

interface DigitalSignatureActivationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Mascara o CPF no formato 000.•••.•••-00 ou similar amigável
 */
function maskCpfPartial(cpf?: string): string {
  if (!cpf) return '•••.•••.•••-••'
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) {
    return cpf
  }
  return `${digits.slice(0, 3)}.•••.•••-${digits.slice(9, 11)}`
}

export function DigitalSignatureActivationModal({
  open,
  onOpenChange,
  onSuccess,
}: DigitalSignatureActivationModalProps) {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Seleção de aba/provedor: 'birdid' (default) ou 'vidaas' ou 'a1'
  const [selectedProvider, setSelectedProvider] = useState<'birdid' | 'vidaas'>('birdid')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [a1ModalOpen, setA1ModalOpen] = useState(false)
  const [currentA1Cert, setCurrentA1Cert] = useState<ActiveA1CertificateInfo | null>(null)

  // Ao abrir ou mudar de usuário, checa se há certificado A1 cadastrado
  React.useEffect(() => {
    if (user?.id) {
      doctorA1CertificateService.getCertificateInfo(user.id).then((cert) => {
        setCurrentA1Cert(cert)
      })
    }
  }, [user?.id, open])

  const crmDisplay = user?.crm
    ? `CRM ${user.crm_uf ? `${user.crm_uf} ` : ''}${user.crm}`
    : 'CRM não cadastrado'

  const cpfDisplay = user?.cpf ? `CPF ${maskCpfPartial(user.cpf)}` : 'CPF não informado'

  const handleActivateCloud = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!code.trim()) {
      toast({
        title: 'Código obrigatório',
        description: `Digite o código gerado no aplicativo do ${CLOUD_PROVIDERS[selectedProvider].name}.`,
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const session = await cloudSignatureService.activateSession(
        user,
        selectedProvider,
        code.trim(),
      )
      if (refreshUser) {
        await refreshUser()
      }
      toast({
        title: `Assinatura digital ativada via ${session.providerLabel}`,
        description: `Sua sessão está ativa até ${new Date(session.expiresAt).toLocaleDateString('pt-BR')}. Todo documento emitido sairá assinado.`,
      })
      setCode('')
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao ativar sessão de assinatura.'
      toast({
        title: 'Não foi possível ativar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleA1Configured = async (cert: ActiveA1CertificateInfo) => {
    setCurrentA1Cert(cert)
    if (!user) return
    // Ativa chave no perfil do médico
    await pb.collection('users').update(user.id, {
      digital_signature_enabled: true,
    })
    if (refreshUser) await refreshUser()
    toast({
      title: 'Certificado A1 ativado',
      description: `Certificado ${cert.commonName} vinculado ao seu navegador. Laudos sairão assinados via A1.`,
    })
    onOpenChange(false)
    if (onSuccess) onSuccess()
  }

  const handleA1Removed = async () => {
    setCurrentA1Cert(null)
    if (!user) return
    await pb.collection('users').update(user.id, {
      digital_signature_enabled: false,
    })
    if (refreshUser) await refreshUser()
  }

  const handleGoToSettings = () => {
    onOpenChange(false)
    navigate('/configuracoes')
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-6 sm:p-7 rounded-2xl bg-white border-[#E5E9E7] shadow-xl">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold text-[#1F2A27]">
                Escolha seu certificado digital
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#5F6E69] leading-relaxed">
              Ative uma vez. Os documentos emitidos serão assinados enquanto a sessão estiver
              válida:
              <strong> 7 dias no Bird ID</strong>, <strong>24 h nas outras certificadoras</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Botões seletores de provedor no modelo exato do GeriaTools */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setSelectedProvider('birdid')
                setCode('')
              }}
              className={`py-3 px-4 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 ${
                selectedProvider === 'birdid'
                  ? 'bg-[#1F2A27] text-white border-[#1F2A27] shadow-sm'
                  : 'bg-[#F7F9F8] text-[#1F2A27] border-[#E5E9E7] hover:bg-gray-100'
              }`}
            >
              <span className="text-sm">Bird ID</span>
              <span
                className={`text-[10px] font-normal ${
                  selectedProvider === 'birdid' ? 'text-emerald-300' : 'text-[#5F6E69]'
                }`}
              >
                Vale 7 dias
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedProvider('vidaas')
                setCode('')
              }}
              className={`py-3 px-4 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 relative ${
                selectedProvider === 'vidaas'
                  ? 'bg-[#1F2A27] text-white border-[#1F2A27] shadow-sm'
                  : 'bg-[#F7F9F8] text-[#1F2A27] border-[#E5E9E7] hover:bg-gray-100'
              }`}
            >
              <span className="text-sm">VIDaaS</span>
              <span
                className={`text-[10px] font-medium ${
                  selectedProvider === 'vidaas' ? 'text-emerald-300' : 'text-[#0C6B58]'
                }`}
              >
                Gratuito via CRM • 24 h
              </span>
            </button>
          </div>

          {/* Linha de identificação do médico (CRM · CPF · link corrigir) */}
          <div className="flex items-center justify-between text-xs text-[#5F6E69] pt-1 px-1 border-b border-[#E5E9E7] pb-3">
            <div className="flex items-center gap-2 truncate font-medium">
              <span className="text-[#1F2A27] font-semibold">{crmDisplay}</span>
              <span>·</span>
              <span>{cpfDisplay}</span>
            </div>
            <button
              type="button"
              onClick={handleGoToSettings}
              className="text-[#0C6B58] hover:underline font-semibold text-xs shrink-0 inline-flex items-center gap-1 ml-2"
              title="Corrigir CRM ou CPF nas configurações"
            >
              corrigir
            </button>
          </div>

          {/* Formulário de ativação por código */}
          <form onSubmit={handleActivateCloud} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="cloud_sig_code"
                className="text-[11px] font-bold text-[#8A9691] tracking-wider uppercase block"
              >
                {CLOUD_PROVIDERS[selectedProvider].codeLabel}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="cloud_sig_code"
                  type="text"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="font-mono text-base tracking-widest text-[#1F2A27] h-11"
                />
                <Button
                  type="submit"
                  disabled={submitting || !code.trim()}
                  className="h-11 px-5 bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold shrink-0"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      Ativando...
                    </>
                  ) : (
                    'Ativar'
                  )}
                </Button>
              </div>
            </div>

            {/* Nota de validade no estilo GeriaTools */}
            <p className="text-xs text-[#5F6E69]">
              {selectedProvider === 'birdid' ? (
                <>
                  <strong className="text-[#1F2A27]">Vale 7 dias:</strong> todo documento que você
                  emitir sai assinado.
                </>
              ) : (
                <>
                  <strong className="text-[#1F2A27]">Vale 24 horas:</strong> renovável diariamente
                  via código VIDaaS gratuito pelo CFM.
                </>
              )}
            </p>
          </form>

          {/* Alternativa A1 Local (arquivo .pfx/.p12) sem regressão */}
          <div className="pt-3 border-t border-[#E5E9E7] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8A9691] font-medium">Outra modalidade de certificado:</span>
              <button
                type="button"
                onClick={() => setA1ModalOpen(true)}
                className="text-[#0C6B58] hover:underline font-semibold inline-flex items-center gap-1"
              >
                <FileKey className="w-3.5 h-3.5" />
                Certificado A1 (arquivo .pfx)
              </button>
            </div>

            {currentA1Cert && (
              <div className="p-2.5 rounded-lg bg-[#E8F3F0]/60 border border-[#D1E5DE] text-xs text-[#0C6B58] flex items-center justify-between">
                <span className="truncate">
                  A1 instalado: <strong>{currentA1Cert.commonName}</strong>
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                  Pronto
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal clássico de A1 caso o médico deseje configurar por arquivo */}
      {user?.id && (
        <A1CertificateConfigModal
          open={a1ModalOpen}
          onOpenChange={setA1ModalOpen}
          userId={user.id}
          currentCert={currentA1Cert}
          onConfigured={handleA1Configured}
          onRemoved={handleA1Removed}
        />
      )}
    </>
  )
}
