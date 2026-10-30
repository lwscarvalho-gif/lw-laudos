import React, { useState, useEffect, useCallback } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Settings2,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { cloudSignatureService } from '@/services/cloudSignatureSession'
import {
  doctorA1CertificateService,
  type ActiveA1CertificateInfo,
} from '@/services/doctorA1Certificate'
import { DigitalSignatureActivationModal } from '@/components/DigitalSignatureActivationModal'
import { useToast } from '@/hooks/use-toast'

export function DigitalSignatureCard() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [updatingPref, setUpdatingPref] = useState(false)
  const [certA1, setCertA1] = useState<ActiveA1CertificateInfo | null>(null)

  // Avaliação da sessão em nuvem
  const evalResult = cloudSignatureService.evaluateSession(user)
  const isEnabled = Boolean(user?.digital_signature_enabled) && !evalResult.isExpired

  // Carrega certificado A1 local do médico
  const loadCertA1 = useCallback(async () => {
    if (!user?.id) return
    try {
      const c = await doctorA1CertificateService.getCertificateInfo(user.id)
      setCertA1(c)
    } catch {
      // safe
    }
  }, [user?.id])

  useEffect(() => {
    loadCertA1()
  }, [loadCertA1])

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      // Se não tem sessão ativa nem certificado A1, abre o modal de ativação no estilo GeriaTools
      if (!evalResult.hasActiveSession && !certA1) {
        setModalOpen(true)
        return
      }
      // Se já tem sessão ou A1 válido, reativa no perfil
      if (!user?.id) return
      setUpdatingPref(true)
      try {
        await pb.collection('users').update(user.id, {
          digital_signature_enabled: true,
        })
        if (refreshUser) await refreshUser()
        toast({
          title: 'Assinatura digital ativada',
          description: evalResult.session
            ? `Sessão ativa via ${evalResult.session.providerLabel}. Laudos sairão assinados.`
            : 'Assinatura via certificado A1 ativada.',
        })
      } catch {
        toast({
          title: 'Erro ao ativar',
          description: 'Não foi possível atualizar a preferência no servidor.',
          variant: 'destructive',
        })
      } finally {
        setUpdatingPref(false)
      }
    } else {
      // Desliga chave e encerra sessão
      if (!user?.id) return
      setUpdatingPref(true)
      try {
        await cloudSignatureService.deactivateSession(user)
        if (refreshUser) await refreshUser()
        toast({
          title: 'Assinatura digital desativada',
          description:
            'Sessão encerrada. Seus laudos retornaram à modalidade de assinatura manual.',
        })
      } catch {
        toast({
          title: 'Erro ao desativar',
          description: 'Falha ao encerrar sessão no servidor.',
          variant: 'destructive',
        })
      } finally {
        setUpdatingPref(false)
      }
    }
  }

  // Label de status descritivo
  let statusBadge = 'DESLIGADA'
  let statusDetail = 'Assinatura manual após impressão'
  let subInfo: React.ReactNode = null

  if (isEnabled && evalResult.session) {
    statusBadge = `${evalResult.session.providerLabel.toUpperCase()} · VALE ATÉ ${new Date(
      evalResult.session.expiresAt,
    ).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
    statusDetail = `Sessão ativa em nuvem (${evalResult.remainingTimeFormatted})`
    subInfo = (
      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-[#0C6B58]">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="font-semibold">
          {evalResult.session.providerLabel}: válido até {evalResult.expiresAtFormatted}
        </span>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="text-[11px] text-[#5F6E69] hover:text-[#0C6B58] underline ml-1 inline-flex items-center gap-0.5"
        >
          <Settings2 className="w-3 h-3" />
          Trocar
        </button>
      </div>
    )
  } else if (isEnabled && certA1) {
    statusBadge = 'CERTIFICADO A1'
    statusDetail = `Arquivo local: ${certA1.commonName}`
    subInfo = (
      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-[#0C6B58]">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="truncate max-w-xs font-semibold">A1: {certA1.commonName}</span>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="text-[11px] text-[#5F6E69] hover:text-[#0C6B58] underline ml-1 inline-flex items-center gap-0.5"
        >
          <Settings2 className="w-3 h-3" />
          Gerenciar
        </button>
      </div>
    )
  } else if (evalResult.isExpired) {
    statusBadge = 'EXPIRADA'
    statusDetail = 'Sessão expirou. Reative com novo código para assinar.'
    subInfo = (
      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-700">
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="font-medium">
          A sessão anterior expirou em {evalResult.expiresAtFormatted}.
        </span>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="text-[11px] text-[#0C6B58] hover:underline font-bold ml-1"
        >
          Reativar agora
        </button>
      </div>
    )
  }

  return (
    <>
      <div
        className={`bg-white rounded-xl border p-4 sm:p-5 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isEnabled
            ? 'border-[#0C6B58]/40 bg-[#FAFDFB]'
            : evalResult.isExpired
              ? 'border-amber-300 bg-amber-50/30'
              : 'border-[#E5E9E7]'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isEnabled
                ? 'bg-[#E8F3F0] text-[#0C6B58]'
                : evalResult.isExpired
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-[#F7F9F8] text-[#8A9691]'
            }`}
          >
            {isEnabled ? (
              <ShieldCheck className="w-5 h-5" />
            ) : evalResult.isExpired ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-[#1F2A27]">Assinatura digital</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide ${
                  isEnabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : evalResult.isExpired
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {statusBadge}
              </span>
            </div>

            <p className="text-xs text-[#5F6E69] leading-relaxed">{statusDetail}</p>

            {subInfo}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5E9E7]">
          {updatingPref && <Loader2 className="w-4 h-4 text-[#0C6B58] animate-spin" />}

          <div className="flex items-center gap-2">
            <label
              htmlFor="digital_sig_switch"
              className="text-xs font-semibold text-[#1F2A27] cursor-pointer select-none"
            >
              {isEnabled ? 'Ativa' : 'Inativa'}
            </label>
            <Switch
              id="digital_sig_switch"
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={updatingPref}
              className="data-[state=checked]:bg-[#0C6B58]"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="text-xs h-8 border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            {isEnabled ? 'Trocar Provedor' : 'Escolher Provedor'}
          </Button>
        </div>
      </div>

      <DigitalSignatureActivationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => {
          loadCertA1()
        }}
      />
    </>
  )
}
