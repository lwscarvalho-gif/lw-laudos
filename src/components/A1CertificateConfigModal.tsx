import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FileKey,
  ShieldCheck,
  Lock,
  Upload,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Trash2,
} from 'lucide-react'
import {
  doctorA1CertificateService,
  parseAndValidatePfxFile,
  type ActiveA1CertificateInfo,
} from '@/services/doctorA1Certificate'
import { useToast } from '@/hooks/use-toast'

interface A1CertificateConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  currentCert: ActiveA1CertificateInfo | null
  onConfigured: (cert: ActiveA1CertificateInfo) => void
  onRemoved?: () => void
}

export function A1CertificateConfigModal({
  open,
  onOpenChange,
  userId,
  currentCert,
  onConfigured,
  onRemoved,
}: A1CertificateConfigModalProps) {
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [validating, setValidating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!/\.(pfx|p12)$/i.test(file.name)) {
        setErrorMsg('Por favor selecione um arquivo de certificado com extensão .pfx ou .p12.')
        setSelectedFile(null)
        return
      }
      setSelectedFile(file)
      setErrorMsg(null)
    }
  }

  const handleValidateAndSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setErrorMsg('Selecione o arquivo do certificado digital A1 (.pfx / .p12).')
      return
    }
    if (!password.trim()) {
      setErrorMsg('Informe a senha do certificado digital A1.')
      return
    }

    setValidating(true)
    setErrorMsg(null)

    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const certInfo = await parseAndValidatePfxFile(arrayBuffer, password, selectedFile.name)

      // Salva no IndexedDB local do navegador do médico
      await doctorA1CertificateService.saveCertificate(userId, certInfo, arrayBuffer)

      toast({
        title: 'Certificado A1 ativado com sucesso!',
        description: `Certificado de ${certInfo.commonName} pronto para assinar laudos neste computador.`,
      })

      onConfigured(certInfo)
      onOpenChange(false)
      setSelectedFile(null)
      setPassword('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao validar o certificado.'
      setErrorMsg(msg)
    } finally {
      setValidating(false)
    }
  }

  const handleRemove = async () => {
    try {
      await doctorA1CertificateService.removeCertificate(userId)
      toast({
        title: 'Certificado removido',
        description: 'O certificado digital foi removido do armazenamento local deste navegador.',
      })
      if (onRemoved) onRemoved()
      onOpenChange(false)
    } catch {
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover o certificado do navegador.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#0C6B58] mb-1">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Segurança & Ética Médica • LGPD
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-[#1F2A27]">
            {currentCert ? 'Gerenciar Certificado Digital A1' : 'Configurar Certificado Digital A1'}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#5F6E69] leading-relaxed">
            O certificado A1 (.pfx/.p12) e a chave privada do médico permanecem{' '}
            <strong>exclusivamente neste navegador</strong>. Nenhuma chave privada é enviada ao
            servidor ou armazenada na nuvem.
          </DialogDescription>
        </DialogHeader>

        {currentCert && (
          <div className="p-3.5 bg-[#F4F9F7] rounded-xl border border-[#D1E5DE] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#0C6B58] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Certificado Ativo no Navegador
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Remover
              </Button>
            </div>
            <div className="space-y-1 text-[#33413B]">
              <p>
                <strong>Titular / CN:</strong> {currentCert.commonName}
              </p>
              {currentCert.cpf && (
                <p>
                  <strong>CPF:</strong> {currentCert.cpf}
                </p>
              )}
              {currentCert.email && (
                <p>
                  <strong>E-mail:</strong> {currentCert.email}
                </p>
              )}
              <p className="text-[11px] text-[#5F6E69]">
                Emissor: {currentCert.issuer} • Serial: {currentCert.serialNumber}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleValidateAndSave} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="pfx_file" className="text-xs font-semibold text-[#1F2A27]">
              {currentCert
                ? 'Substituir por outro arquivo (.pfx / .p12)'
                : 'Arquivo do Certificado A1 (.pfx / .p12) *'}
            </Label>
            <div className="border-2 border-dashed border-[#D1E5DE] rounded-xl p-4 text-center hover:bg-[#F9FCFA] transition cursor-pointer relative">
              <input
                id="pfx_file"
                type="file"
                accept=".pfx,.p12,application/x-pkcs12"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center gap-1.5 text-xs text-[#5F6E69]">
                {selectedFile ? (
                  <>
                    <FileKey className="w-6 h-6 text-[#0C6B58]" />
                    <span className="font-semibold text-[#1F2A27]">{selectedFile.name}</span>
                    <span className="text-[11px] text-[#8A9691]">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-[#8A9691]" />
                    <span className="font-semibold text-[#1F2A27]">
                      Clique para selecionar o arquivo .pfx ou .p12
                    </span>
                    <span className="text-[11px] text-[#8A9691]">
                      Certificado ICP-Brasil padrão A1
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pfx_password" className="text-xs font-semibold text-[#1F2A27]">
              Senha do Certificado Digital *
            </Label>
            <div className="relative">
              <Input
                id="pfx_password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setErrorMsg(null)
                }}
                placeholder="Digite a senha de proteção do arquivo..."
                className="text-xs pr-8"
              />
              <Lock className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A9691]" />
            </div>
            <p className="text-[11px] text-[#8A9691]">
              A senha é usada no navegador apenas para abrir o contêiner e validar os dados.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs border-[#E5E9E7]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={validating || !selectedFile || !password}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs font-semibold"
            >
              {validating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Validando Certificado...
                </>
              ) : (
                'Validar e Ativar Certificado'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
