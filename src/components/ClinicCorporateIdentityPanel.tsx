import React, { useState } from 'react'
import { Building2, Save, Upload, Trash2, MapPin, Phone, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import type { ClinicCorporateIdentity, User } from '@/types'

interface ClinicCorporateIdentityPanelProps {
  user: User | null
  onUpdated?: () => void
}

export function ClinicCorporateIdentityPanel({
  user,
  onUpdated,
}: ClinicCorporateIdentityPanelProps) {
  const { toast } = useToast()

  const initialIdentity: ClinicCorporateIdentity = (() => {
    if (!user?.clinic_corporate_identity) {
      return {
        fantasyName: 'Clínica Médica de Ultrassonografia',
        corporateReason: '',
        cnpj: '',
        address: '',
        phone: '',
        headerText: '',
        footerText: '',
      }
    }
    if (typeof user.clinic_corporate_identity === 'string') {
      try {
        return JSON.parse(user.clinic_corporate_identity)
      } catch {
        // fallback
      }
    }
    return user.clinic_corporate_identity as ClinicCorporateIdentity
  })()

  const [fantasyName, setFantasyName] = useState(initialIdentity.fantasyName || '')
  const [corporateReason, setCorporateReason] = useState(initialIdentity.corporateReason || '')
  const [cnpj, setCnpj] = useState(initialIdentity.cnpj || '')
  const [address, setAddress] = useState(initialIdentity.address || '')
  const [phone, setPhone] = useState(initialIdentity.phone || '')
  const [headerText, setHeaderText] = useState(initialIdentity.headerText || '')
  const [footerText, setFooterText] = useState(initialIdentity.footerText || '')
  const [logoDataUrl, setLogoDataUrl] = useState(initialIdentity.logoDataUrl || '')
  const [saving, setSaving] = useState(false)

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O logotipo deve ter no máximo 2MB.',
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setLogoDataUrl(reader.result as string)
      toast({
        title: 'Logotipo carregado',
        description: 'Imagem do logotipo pronta para salvar. Disponível offline no laudo.',
      })
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      const payload: ClinicCorporateIdentity = {
        fantasyName,
        corporateReason,
        cnpj,
        address,
        phone,
        headerText,
        footerText,
        logoDataUrl,
      }

      await pb.collection('users').update(user.id, {
        clinic_corporate_identity: payload,
      })

      toast({
        title: 'Identidade da clínica salva',
        description:
          'Os dados institucionais e o logotipo foram vinculados e estarão presentes nos cabeçalhos e laudos.',
      })
      if (onUpdated) onUpdated()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar identidade',
        description: err.message || 'Falha ao atualizar dados.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9E7] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-[#1F2A27]">
                Identidade Institucional da Clínica (LW LAUDOS)
              </h2>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                Personalização de Documentos
              </span>
            </div>
            <p className="text-xs text-[#5F6E69]">
              Configure os dados cadastrais, logotipo exclusivo, cabeçalho e rodapé oficial para
              emissão de laudos e comprovantes.
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs font-semibold shrink-0"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {saving ? 'Salvando...' : 'Salvar Identidade'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Logotipo da Clínica */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-[#1F2A27] block">
            Logotipo Oficial da Clínica
          </Label>
          <div className="w-full h-36 rounded-xl border-2 border-dashed border-[#C8DFD7] bg-[#FAFCFB] flex flex-col items-center justify-center p-3 relative overflow-hidden">
            {logoDataUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={logoDataUrl}
                  alt="Logotipo Clínica"
                  className="max-h-full max-w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setLogoDataUrl('')}
                  className="absolute top-1 right-1 p-1 bg-white/90 text-red-600 rounded-full shadow hover:bg-white"
                  title="Remover logotipo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <Building2 className="w-8 h-8 text-[#8A9691] mx-auto" />
                <span className="text-[11px] text-[#5F6E69] block">Nenhum logotipo anexado</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex-1">
              <span className="inline-flex items-center justify-center w-full px-3 py-1.5 text-xs font-medium text-[#0C6B58] bg-[#E8F3F0] hover:bg-[#d8ece6] rounded-md cursor-pointer border border-[#0C6B58]/30 transition">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Selecionar Imagem (PNG/JPG)
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-[10px] text-[#8A9691] leading-tight">
            Armazenamento local persistente: a imagem fica disponível mesmo offline para inserção no
            PDF.
          </p>
        </div>

        {/* Dados Cadastrais */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1F2A27]">
                Nome Fantasia da Clínica
              </Label>
              <Input
                value={fantasyName}
                onChange={(e) => setFantasyName(e.target.value)}
                placeholder="Ex.: Centro de Diagnóstico por Imagem"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1F2A27]">Razão Social</Label>
              <Input
                value={corporateReason}
                onChange={(e) => setCorporateReason(e.target.value)}
                placeholder="Ex.: CDI Serviços Médicos Ltda."
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1F2A27]">CNPJ</Label>
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1F2A27] flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#0C6B58]" />
                Telefone / WhatsApp
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(65) 3000-0000"
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1F2A27] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#0C6B58]" />
              Endereço Completo da Unidade
            </Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Av. Principal, 1000 - Sala 101, Cuiabá - MT"
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Cabeçalho e Rodapé dos Laudos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#E5E9E7]">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#1F2A27] flex items-center gap-1">
            <FileText className="w-3 h-3 text-[#0C6B58]" />
            Texto Institucional do Cabeçalho
          </Label>
          <Textarea
            rows={2}
            value={headerText}
            onChange={(e) => setHeaderText(e.target.value)}
            placeholder="Ex.: Responsável Técnico: Dr. Nome - CRM 1234. Equipamento: GE Voluson E8."
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#1F2A27] flex items-center gap-1">
            <FileText className="w-3 h-3 text-[#0C6B58]" />
            Texto do Rodapé Oficial dos Laudos
          </Label>
          <Textarea
            rows={2}
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="Ex.: Laudo emitido por LW LAUDOS. Resultado disponível para consulta online."
            className="text-xs"
          />
        </div>
      </div>
    </div>
  )
}
