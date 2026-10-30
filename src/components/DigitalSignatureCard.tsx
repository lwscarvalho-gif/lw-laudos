import React, { useState, useEffect, useCallback } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { FileKey, ShieldCheck, CheckCircle2, FileSignature, Settings2, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import {
  doctorA1CertificateService,
  type ActiveA1CertificateInfo,
} from '@/services/doctorA1Certificate'
import { A1CertificateConfigModal } from '@/components/A1CertificateConfigModal'
import { useToast } from '@/hooks/use-toast'

export function DigitalSignatureCard() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()

  const [enabled, setEnabled] = useState<boolean>(() => Boolean(user?.digital_signature_enabled))
  const [certInfo, setCertInfo] = useState<ActiveA1CertificateInfo | null>(null)
  const [loadingCert, setLoadingCert] = useState(true)
  const [updatingPref, setUpdatingPref] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  // Sincroniza estado inicial com a preferência do perfil do médico
  useEffect(() => {
    setEnabled(Boolean(user?.digital_signature_enabled))
  }, [user?.digital_signature_enabled])

  const loadCert = useCallback(async () => {
    if (!user?.id) return
    setLoadingCert(true)
    try {
      const cert = await doctorA1CertificateService.getCertificateInfo(user.id)
      setCertInfo(cert)
    } finally {
      setLoadingCert(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadCert()
  }, [loadCert])

  const persistPreference = async (newState: boolean) => {
    if (!user?.id) return
    setUpdatingPref(true)
    try {
      await pb.collection('users').update(user.id, {
        digital_signature_enabled: newState,
      })
      setEnabled(newState)
      if (refreshUser) {
        await refreshUser()
      }
      toast({
        title: newState ? 'Assinatura digital ativada' : 'Assinatura digital desativada',
        description: newState
          ? 'Seus laudos agora sairão com identificação e assinatura digital do certificado A1.'
          : 'Seus laudos retornaram à modalidade de assinatura manual após impressão.',
      })
    } catch {
      toast({
        title: 'Erro ao salvar preferência',
        description: 'Não foi possível atualizar a preferência no servidor.',
        variant: 'destructive',
      })
    } finally {
      setUpdatingPref(false)
    }
  }

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      // Se não há certificado configurado no navegador, abre o modal de configuração antes de ativar
      if (!certInfo) {
        setModalOpen(true)
        return
      }
      // Se já tem certificado, ativa diretamente
      await persistPreference(true)
    } else {
      // Desativa
      await persistPreference(false)
    }
  }

  const handleCertificateConfigured = async (cert: ActiveA1CertificateInfo) => {
    setCertInfo(cert)
    // Uma vez configurado o certificado, ativa a chave no perfil do médico
    await persistPreference(true)
  }

  const handleCertificateRemoved = async () => {
    setCertInfo(null)
    // Se o certificado foi removido, desliga a chave no perfil
    await persistPreference(false)
  }

  return (
    <>
      <div
        className={`bg-white rounded-xl border p-4 sm:p-5 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          enabled ? 'border-[#0C6B58]/40 bg-[#FAFDFB]' : 'border-[#E5E9E7]'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              enabled ? 'bg-[#E8F3F0] text-[#0C6B58]' : 'bg-[#F7F9F8] text-[#8A9691]'
            }`}
          >
            {enabled ? <FileSignature className="w-5 h-5" /> : <FileKey className="w-5 h-5" />}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#1F2A27]">Assinatura digital</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${
                  enabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {enabled ? 'LIGADA' : 'DESLIGADA'}
              </span>
            </div>

            <p className="text-xs text-[#5F6E69] leading-relaxed">
              {enabled ? 'Laudos saem assinados digitalmente' : 'Assinatura manual após impressão'}
            </p>

            {certInfo && (
              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-[#0C6B58]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate max-w-[260px] sm:max-w-md font-medium">
                  Certificado A1: {certInfo.commonName}
                </span>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="text-[11px] text-[#5F6E69] hover:text-[#0C6B58] underline ml-1 inline-flex items-center gap-0.5"
                  title="Gerenciar certificado"
                >
                  <Settings2 className="w-3 h-3" />
                  Gerenciar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5E9E7]">
          {updatingPref && <Loader2 className="w-4 h-4 text-[#0C6B58] animate-spin" />}
          <div className="flex items-center gap-2">
            <label
              htmlFor="digital_sig_switch"
              className="text-xs font-semibold text-[#1F2A27] cursor-pointer select-none"
            >
              {enabled ? 'Ativa' : 'Inativa'}
            </label>
            <Switch
              id="digital_sig_switch"
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={updatingPref || loadingCert}
              className="data-[state=checked]:bg-[#0C6B58]"
            />
          </div>

          {!certInfo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(true)}
              className="text-xs h-8 border-[#D1E5DE] text-[#0C6B58] hover:bg-[#E8F3F0]"
            >
              <FileKey className="w-3.5 h-3.5 mr-1" />
              Configurar A1
            </Button>
          )}
        </div>
      </div>

      {user?.id && (
        <A1CertificateConfigModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          userId={user.id}
          currentCert={certInfo}
          onConfigured={handleCertificateConfigured}
          onRemoved={handleCertificateRemoved}
        />
      )}
    </>
  )
}
