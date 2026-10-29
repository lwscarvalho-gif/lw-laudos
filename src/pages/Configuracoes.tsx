import React, { useState, useRef, useMemo } from 'react'
import {
  User,
  Shield,
  FileBadge,
  Sliders,
  Save,
  Loader2,
  Lock,
  Mail,
  Upload,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  Trash2,
  ShieldCheck,
  Server,
  Wifi,
  WifiOff,
  Radio,
  Key,
  Copy,
  RefreshCw,
  Plus,
  ClipboardList,
  Edit2,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  digitalSignatureService,
  SUPPORTED_PROVIDERS,
  DigitalSignatureProviderId,
} from '@/services/digitalSignature'
import { useNetworkStatus } from '@/lib/networkStatus'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { ExamPreparation } from '@/types'
import { examPreparationsService } from '@/services/examPreparations'

const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]

export default function Configuracoes() {
  const { user, refreshUser, requestEmailChange } = useAuth()
  const { toast } = useToast()

  // Identification Profile State
  const [professionalName, setProfessionalName] = useState(
    user?.professional_name || user?.name || '',
  )
  const [crm, setCrm] = useState(user?.crm || '')
  const [crmUf, setCrmUf] = useState(user?.crm_uf || 'RO')
  const [professionalTitle, setProfessionalTitle] = useState(user?.professional_title || '')
  const [header, setHeader] = useState(user?.header || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Logo upload state
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(() => {
    if (user?.logo) {
      return pb.files.getURL(user as unknown as Record<string, unknown>, user.logo)
    }
    return null
  })

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Change Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [sendingEmailChange, setSendingEmailChange] = useState(false)
  const [emailSuccessMessage, setEmailSuccessMessage] = useState<string | null>(null)

  // DICOM Worklist / Clinics Preferences
  const [mwlToken, setMwlToken] = useState(user?.mwl_token || '')
  const [generatingToken, setGeneratingToken] = useState(false)
  const [clinicsList, setClinicsList] = useState<string[]>(() => {
    const defaultList = ['HM Samuel Marques dos Santos', 'Gastroimagem']
    if (!user?.clinics_config) return defaultList
    let list: string[] = []
    if (Array.isArray(user.clinics_config)) {
      list = user.clinics_config
    } else {
      try {
        const parsed = JSON.parse(user.clinics_config)
        if (Array.isArray(parsed)) list = parsed
      } catch {
        /* intentionally ignored */
      }
    }
    if (list.length > 0) {
      return list.map((c) =>
        c === 'Clínica Principal' || c === 'Principal' ? 'HM Samuel Marques dos Santos' : c,
      )
    }
    return defaultList
  })
  const [newClinicName, setNewClinicName] = useState('')
  const [savingClinics, setSavingClinics] = useState(false)

  // Default appointment duration state
  const [defaultDuration, setDefaultDuration] = useState<number>(
    user?.default_appointment_duration || 30,
  )
  const [savingDuration, setSavingDuration] = useState(false)

  // Exam preparations management state
  const [preparations, setPreparations] = useState<ExamPreparation[]>([])
  const [loadingPreparations, setLoadingPreparations] = useState(false)
  const [prepModalOpen, setPrepModalOpen] = useState(false)
  const [editingPrep, setEditingPrep] = useState<ExamPreparation | null>(null)
  const [prepExamType, setPrepExamType] = useState('')
  const [prepSpecialty, setPrepSpecialty] = useState('')
  const [prepInstructions, setPrepInstructions] = useState('')
  const [prepGeneralNotice, setPrepGeneralNotice] = useState('')
  const [savingPrep, setSavingPrep] = useState(false)
  const [prepSearchQuery, setPrepSearchQuery] = useState('')

  const loadPreparations = React.useCallback(async () => {
    setLoadingPreparations(true)
    try {
      const data = await examPreparationsService.getAll()
      setPreparations(data)
    } catch {
      /* intentionally ignored */
    } finally {
      setLoadingPreparations(false)
    }
  }, [])

  React.useEffect(() => {
    loadPreparations()
  }, [loadPreparations])

  const openNewPrepModal = () => {
    setEditingPrep(null)
    setPrepExamType('')
    setPrepSpecialty('Ultrassonografia')
    setPrepInstructions('')
    setPrepGeneralNotice(
      'Trazer exames anteriores, documentos pessoais, cartão SUS e chegar 15 minutos antes do horário agendado.',
    )
    setPrepModalOpen(true)
  }

  const openEditPrepModal = (item: ExamPreparation) => {
    setEditingPrep(item)
    setPrepExamType(item.exam_type)
    setPrepSpecialty(item.specialty || '')
    setPrepInstructions(item.instructions)
    setPrepGeneralNotice(item.general_notice || '')
    setPrepModalOpen(true)
  }

  const handleSavePrep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prepExamType.trim() || !prepInstructions.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o tipo de exame e as instruções de preparo.',
        variant: 'destructive',
      })
      return
    }

    setSavingPrep(true)
    try {
      if (editingPrep) {
        await examPreparationsService.update(editingPrep.id, {
          exam_type: prepExamType.trim(),
          specialty: prepSpecialty.trim() || undefined,
          instructions: prepInstructions.trim(),
          general_notice: prepGeneralNotice.trim() || undefined,
        })
        toast({
          title: 'Preparo atualizado',
          description: `Instruções de "${prepExamType}" salvas com sucesso.`,
        })
      } else {
        await examPreparationsService.create({
          exam_type: prepExamType.trim(),
          specialty: prepSpecialty.trim() || undefined,
          instructions: prepInstructions.trim(),
          general_notice: prepGeneralNotice.trim() || undefined,
          is_active: true,
        })
        toast({
          title: 'Preparo cadastrado',
          description: `Novo preparo para "${prepExamType}" cadastrado.`,
        })
      }
      setPrepModalOpen(false)
      loadPreparations()
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o preparo do exame.',
        variant: 'destructive',
      })
    } finally {
      setSavingPrep(false)
    }
  }

  const filteredPreparations = useMemo(() => {
    if (!prepSearchQuery.trim()) return preparations
    const q = prepSearchQuery.toLowerCase()
    return preparations.filter(
      (p) =>
        p.exam_type.toLowerCase().includes(q) ||
        (p.specialty && p.specialty.toLowerCase().includes(q)) ||
        p.instructions.toLowerCase().includes(q),
    )
  }, [preparations, prepSearchQuery])

  // Digital Signature Preferences
  const { isOnline } = useNetworkStatus()
  const [sigConfig, setSigConfig] = useState(() => digitalSignatureService.getConfig())

  const handleToggleSignature = (enabled: boolean) => {
    const updated = digitalSignatureService.saveConfig({ enabled })
    setSigConfig(updated)
    toast({
      title: enabled ? 'Módulo de Assinatura ativado' : 'Módulo de Assinatura desativado',
      description: enabled
        ? 'Assinatura digital ativada nas preferências. A emissão de laudos e exportação de PDF continuam funcionando normalmente.'
        : 'Desativado por padrão. Laudos e PDFs continuam funcionando normalmente.',
    })
  }

  const handleSignatureProviderChange = (providerId: string) => {
    const updated = digitalSignatureService.saveConfig({
      selectedProvider: providerId as DigitalSignatureProviderId,
    })
    setSigConfig(updated)
    toast({
      title: 'Provedor atualizado',
      description: `Adaptador de assinatura ajustado para ${updated.selectedProvider.toUpperCase()}.`,
    })
  }

  // Upload Logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Limit format: PNG / JPEG
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      toast({
        title: 'Formato inválido',
        description: 'O logotipo deve ser um arquivo de imagem nos formatos PNG ou JPEG.',
        variant: 'destructive',
      })
      if (logoInputRef.current) logoInputRef.current.value = ''
      return
    }

    // Limit size: ~2 MB
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Tamanho excedido',
        description: 'O arquivo de logotipo deve ter no máximo 2 MB.',
        variant: 'destructive',
      })
      if (logoInputRef.current) logoInputRef.current.value = ''
      return
    }

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const updated = await pb.collection('users').update(user.id, formData)
      await refreshUser()
      if (updated.logo) {
        setLogoPreviewUrl(pb.files.getURL(updated, updated.logo))
      }
      toast({
        title: 'Logotipo atualizado',
        description: 'Seu logotipo foi salvo e será exibido no cabeçalho dos laudos.',
      })
    } catch {
      toast({
        title: 'Erro no envio',
        description: 'Falha ao enviar o logotipo. Verifique sua conexão e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  // Remove Logo
  const handleRemoveLogo = async () => {
    if (!user) return
    setUploadingLogo(true)
    try {
      await pb.collection('users').update(user.id, {
        logo: null,
      })
      await refreshUser()
      setLogoPreviewUrl(null)
      toast({
        title: 'Logotipo removido',
        description: 'O cabeçalho voltará a usar a marca tipográfica provisória LW Laudos.',
      })
    } catch {
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover o logotipo no servidor.',
        variant: 'destructive',
      })
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const handleSaveIdentification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSavingProfile(true)
    try {
      await pb.collection('users').update(user.id, {
        professional_name: professionalName.trim(),
        crm: crm.trim(),
        crm_uf: crmUf,
        professional_title: professionalTitle.trim(),
        header: header.trim(),
      })
      await refreshUser()
      toast({
        title: 'Configurações salvas.',
        description: 'Sua identificação profissional foi atualizada com sucesso.',
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar identificação.',
        variant: 'destructive',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (!user) return
    if (!currentPassword) {
      setPasswordError('Informe sua senha atual.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.')
      return
    }

    setSavingPassword(true)
    try {
      await pb.collection('users').update(user.id, {
        oldPassword: currentPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      })
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast({
        title: 'Configurações salvas.',
        description: 'Senha alterada com sucesso.',
      })
    } catch {
      setPasswordError('Senha atual incorreta ou inválida.')
    } finally {
      setSavingPassword(false)
    }
  }

  // Generate / Renew MWL Token
  const handleGenerateMwlToken = async () => {
    if (!user) return
    setGeneratingToken(true)
    try {
      // 32-char cryptographically safe random token
      const array = new Uint8Array(24)
      window.crypto.getRandomValues(array)
      const tokenStr = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')

      await pb.collection('users').update(user.id, {
        mwl_token: tokenStr,
      })
      await refreshUser()
      setMwlToken(tokenStr)
      toast({
        title: 'Token de Worklist gerado',
        description: 'Utilize este token no script da ponte local (Orthanc) na clínica.',
      })
    } catch {
      toast({
        title: 'Erro ao gerar token',
        description: 'Falha ao atualizar token MWL no servidor.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingToken(false)
    }
  }

  // Revoke MWL Token
  const handleRevokeMwlToken = async () => {
    if (!user) return
    setGeneratingToken(true)
    try {
      await pb.collection('users').update(user.id, {
        mwl_token: '',
      })
      await refreshUser()
      setMwlToken('')
      toast({
        title: 'Token revogado',
        description: 'A ponte local não terá mais acesso até que um novo token seja gerado.',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao revogar token',
        description: 'Falha ao revogar token no servidor.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingToken(false)
    }
  }
  // Add Clinic
  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newClinicName.trim()) return

    const trimmed = newClinicName.trim()
    if (clinicsList.includes(trimmed)) {
      toast({
        title: 'Clínica já cadastrada',
        description: 'Esta unidade já consta na sua lista.',
        variant: 'destructive',
      })
      return
    }

    const updatedList = [...clinicsList, trimmed]
    setSavingClinics(true)
    try {
      await pb.collection('users').update(user.id, {
        clinics_config: updatedList,
      })
      await refreshUser()
      setClinicsList(updatedList)
      setNewClinicName('')
      toast({
        title: 'Unidade adicionada',
        description: `"${trimmed}" agora está disponível na sua agenda e ponte MWL.`,
      })
    } catch {
      toast({
        title: 'Erro ao salvar unidade',
        description: 'Falha ao salvar lista de clínicas.',
        variant: 'destructive',
      })
    } finally {
      setSavingClinics(false)
    }
  }

  // Remove Clinic
  const handleSaveDuration = async () => {
    if (!user) return
    setSavingDuration(true)
    try {
      await pb.collection('users').update(user.id, {
        default_appointment_duration: Number(defaultDuration),
      })
      await refreshUser()
      toast({
        title: 'Duração padrão salva',
        description: `Seus agendamentos agora terão ${defaultDuration} minutos como padrão na grade.`,
      })
    } catch {
      toast({
        title: 'Erro ao salvar duração',
        description: 'Falha ao atualizar duração padrão.',
        variant: 'destructive',
      })
    } finally {
      setSavingDuration(false)
    }
  }

  const handleRemoveClinic = async (clinicNameToRemove: string) => {
    if (!user) return
    if (clinicsList.length <= 1) {
      toast({
        title: 'Mínimo de uma clínica',
        description: 'Mantenha pelo menos uma unidade cadastrada.',
        variant: 'destructive',
      })
      return
    }

    const updatedList = clinicsList.filter((c) => c !== clinicNameToRemove)
    setSavingClinics(true)
    try {
      await pb.collection('users').update(user.id, {
        clinics_config: updatedList,
      })
      await refreshUser()
      setClinicsList(updatedList)
      toast({
        title: 'Unidade removida',
        description: `"${clinicNameToRemove}" foi removida da sua lista.`,
      })
    } catch {
      toast({
        title: 'Erro ao remover unidade',
        description: 'Falha ao atualizar lista no servidor.',
        variant: 'destructive',
      })
    } finally {
      setSavingClinics(false)
    }
  }

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim() || !/\S+@\S+\.\S+/.test(newEmail)) {
      toast({
        title: 'E-mail inválido',
        description: 'Informe um e-mail válido.',
        variant: 'destructive',
      })
      return
    }

    setSendingEmailChange(true)
    try {
      await requestEmailChange(newEmail)
      setEmailSuccessMessage(
        `Enviamos um link de confirmação para ${newEmail}. Ao clicar nele, sua conta será desconectada e você poderá acessar com o novo e-mail.`,
      )
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao solicitar alteração de e-mail.',
        variant: 'destructive',
      })
    } finally {
      setSendingEmailChange(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2A27]">Configurações</h1>
        <p className="text-sm text-[#5F6E69] mt-0.5">
          Gerencie seu perfil, assinatura profissional de laudos e preferências
        </p>
      </div>

      {/* 1. Identificação Profissional (Core Medical Identity) */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-[#E5E9E7] pb-4">
          <div className="w-9 h-9 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
            <FileBadge className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#1F2A27]">Identificação Profissional</h2>
            <p className="text-xs text-[#5F6E69]">
              Estes dados serão automaticamente embutidos no rodapé e cabeçalho dos seus laudos
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveIdentification} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prof_name" className="text-xs font-semibold">
                Nome Profissional (como constará no laudo) *
              </Label>
              <Input
                id="prof_name"
                value={professionalName}
                onChange={(e) => setProfessionalName(e.target.value)}
                placeholder="Ex.: Dr. Lucas Willian da Silva"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prof_title" className="text-xs font-semibold">
                Especialidade / Título Profissional
              </Label>
              <Input
                id="prof_title"
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value)}
                placeholder="Ex.: Médico / CRM 6955"
              />
              <p className="text-[11px] text-[#8A9691]">
                Caso não informado, o laudo exibirá por padrão &quot;Médico / CRM&quot;.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="crm_num" className="text-xs font-semibold">
                Número do CRM *
              </Label>
              <Input
                id="crm_num"
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                placeholder="Ex.: 6955"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">UF do CRM *</Label>
              <Select value={crmUf} onValueChange={setCrmUf}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {BRAZILIAN_STATES.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <Label htmlFor="prof_header" className="text-xs font-semibold">
              Cabeçalho Institucional dos Laudos
            </Label>
            <Textarea
              id="prof_header"
              rows={3}
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              placeholder="Ex.: Clínica de Diagnóstico por Imagem — Dr. Lucas Willian da Silva | CRM RO 6955"
            />
            <p className="text-[11px] text-[#8A9691]">
              Texto renderizado no topo de cada laudo gerado ou exportado em PDF.
            </p>
          </div>

          {/* Logotipo do Médico */}
          <div className="space-y-3 pt-4 border-t border-[#E5E9E7]">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-[#1F2A27] flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#0C6B58]" />
                  Logotipo do Médico / Clínica
                </Label>
                <p className="text-[11px] text-[#5F6E69] mt-0.5">
                  Exibido no cabeçalho do PDF e da prévia impressa do laudo. Se não enviado, será
                  mantida a marca tipográfica provisória &quot;LW Laudos&quot;.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-[#E5E9E7] bg-[#F7F9F8]">
              {/* Preview Box */}
              <div className="w-40 h-20 bg-white rounded-lg border border-[#D6DDD9] flex items-center justify-center overflow-hidden p-2">
                {logoPreviewUrl ? (
                  <img
                    src={logoPreviewUrl}
                    alt="Prévia do Logotipo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <span className="block font-bold text-xs text-[#0C6B58] tracking-wider">
                      LW LAUDOS
                    </span>
                    <span className="block text-[8px] text-[#8A9691] uppercase">
                      Marca Provisória
                    </span>
                  </div>
                )}
              </div>

              {/* Upload & Remove Controls with Visible Native Input */}
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Native visible file input */}
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png,image/jpeg"
                    disabled={uploadingLogo}
                    className="text-xs text-[#1F2A27] file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0C6B58] file:text-white hover:file:bg-[#0A5949] cursor-pointer"
                  />

                  {logoPreviewUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={uploadingLogo}
                      className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Remover logotipo
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-[#8A9691]">
                  Formatos aceitos: PNG ou JPEG (máximo 2 MB). Não distorce a proporção original.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <Button
              type="submit"
              disabled={savingProfile}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar identificação
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Perfil & Senha */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-[#E5E9E7] pb-4">
          <div className="w-9 h-9 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#1F2A27]">Dados de Acesso e Perfil</h2>
            <p className="text-xs text-[#5F6E69]">
              Gerencie seu e-mail cadastrado e senha de login
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome Completo</Label>
              <Input value={user?.name || ''} disabled className="bg-[#F7F9F8]" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">E-mail</Label>
                <button
                  type="button"
                  onClick={() => {
                    setEmailSuccessMessage(null)
                    setEmailModalOpen(true)
                  }}
                  className="text-xs text-[#0C6B58] hover:underline font-semibold"
                >
                  Alterar e-mail
                </button>
              </div>
              <Input value={user?.email || ''} disabled className="bg-[#F7F9F8]" />
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="pt-6 border-t border-[#E5E9E7]">
          <h3 className="font-bold text-sm text-[#1F2A27] mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#0C6B58]" />
            Alterar Senha
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            {passwordError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC2626]">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                Senha alterada com sucesso!
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="curr_pass" className="text-xs font-semibold">
                Senha atual
              </Label>
              <Input
                id="curr_pass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_pass" className="text-xs font-semibold">
                Nova senha (mínimo 8 caracteres)
              </Label>
              <Input
                id="new_pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="conf_pass" className="text-xs font-semibold">
                Confirmar nova senha
              </Label>
              <Input
                id="conf_pass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={savingPassword}
              variant="outline"
              className="border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0]"
            >
              {savingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Salvar nova senha'
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* 3. Preferências de Assinatura Digital (Opcional) */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9E7] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[#1F2A27]">
                Assinatura Digital (Estrutura Preparada)
              </h2>
              <p className="text-xs text-[#5F6E69]">
                Não configurado por padrão. Não bloqueia a emissão de laudos nem o download de PDF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Label
              htmlFor="pref-sig-toggle"
              className="text-xs font-semibold text-[#1F2A27] cursor-pointer"
            >
              Ativar Assinatura Digital
            </Label>
            <Switch
              id="pref-sig-toggle"
              checked={sigConfig.enabled}
              onCheckedChange={handleToggleSignature}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Provedor Homologável</Label>
            <Select
              value={sigConfig.selectedProvider}
              onValueChange={handleSignatureProviderChange}
              disabled={!sigConfig.enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-[#8A9691]">
              VIDaaS, Bird ID, SafeID, SerproID e RemoteID via API segura backend.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Estado de Conexão com Nuvem</Label>
            <div className="p-2.5 rounded-lg border border-[#E5E9E7] bg-[#F7F9F8] flex items-center justify-between text-xs">
              <span className="text-[#5F6E69]">Interface de Rede:</span>
              <span className="font-bold text-[#1F2A27] flex items-center gap-1.5">
                {isOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                    Ativa (Pronto para PSCs)
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                    Offline (Laudos locais OK)
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] text-[#8A9691]">
              Rede externa afeta apenas serviços remotos; elaboração clínica permanece funcional.
            </p>
          </div>
        </div>
      </div>

      {/* 3.1 DICOM Modality Worklist (MWL) & Clínicas do Médico */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9E7] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-[#1F2A27]">
                  Worklist DICOM & Unidades de Atendimento
                </h2>
                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-semibold">
                  {mwlToken ? 'Token Ativo' : 'Não configurado — ponte local pendente'}
                </span>
              </div>
              <p className="text-xs text-[#5F6E69]">
                Integração da agenda com o servidor Orthanc local instalado nas suas clínicas
              </p>
            </div>
          </div>
        </div>

        {/* Token Management */}
        <div className="space-y-4 p-4 rounded-xl bg-[#F7F9F8] border border-[#E5E9E7]">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#1F2A27] flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#0C6B58]" />
                Token de Acesso da Ponte Local (Por Médico)
              </Label>
              <p className="text-[11px] text-[#5F6E69] leading-relaxed max-w-xl">
                O agente da clínica (script Python na rede local do Orthanc) utiliza este token para
                consultar exclusivamente os seus agendamentos nesta nuvem via endpoint seguro.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {mwlToken ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateMwlToken}
                    disabled={generatingToken}
                    className="text-xs h-8 border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0]"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Renovar Token
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRevokeMwlToken}
                    disabled={generatingToken}
                    className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Revogar
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerateMwlToken}
                  disabled={generatingToken}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-8 font-semibold"
                >
                  <Key className="w-3.5 h-3.5 mr-1.5" />
                  Gerar Token MWL
                </Button>
              )}
            </div>
          </div>

          {mwlToken ? (
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center gap-2">
                <Input
                  value={mwlToken}
                  readOnly
                  className="font-mono text-xs bg-white text-[#1F2A27] tracking-wider"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(mwlToken)
                    toast({ title: 'Token copiado para a área de transferência' })
                  }}
                  className="shrink-0 h-9 w-9 border-[#E5E9E7]"
                  title="Copiar token"
                >
                  <Copy className="w-4 h-4 text-[#5F6E69]" />
                </Button>
              </div>
              <p className="text-[10px] text-[#8A9691]">
                Endpoint da nuvem:{' '}
                <code className="bg-white px-1.5 py-0.5 rounded border border-[#E5E9E7]">
                  GET /backend/v1/mwl/appointments
                </code>
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 text-xs text-amber-900">
              Nenhum token gerado. Clique em &quot;Gerar Token MWL&quot; para permitir que o Orthanc
              local busque sua agenda de exames.
            </div>
          )}
        </div>

        {/* Duração Padrão do Atendimento da Agenda */}
        <div className="space-y-3 pt-2 border-b border-[#E5E9E7] pb-5">
          <div>
            <Label className="text-xs font-semibold text-[#1F2A27]">
              Duração Padrão do Atendimento por Paciente
            </Label>
            <p className="text-[11px] text-[#5F6E69] mt-0.5">
              Defina o tempo padrão que você deseja dedicar a cada paciente na sua agenda (a grade
              de horários refletirá esse intervalo).
            </p>
          </div>

          <div className="flex items-center gap-3 max-w-sm">
            <Select
              value={String(defaultDuration)}
              onValueChange={(val) => setDefaultDuration(Number(val))}
            >
              <SelectTrigger className="w-48 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 minutos</SelectItem>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="20">20 minutos</SelectItem>
                <SelectItem value="30">30 minutos (padrão)</SelectItem>
                <SelectItem value="40">40 minutos</SelectItem>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">60 minutos (1 hora)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              size="sm"
              disabled={savingDuration}
              onClick={handleSaveDuration}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs shrink-0"
            >
              {savingDuration ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Duração'
              )}
            </Button>
          </div>
        </div>

        {/* Configuração das Clínicas / Locais */}
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-semibold text-[#1F2A27]">
              Unidades / Clínicas Cadastradas (Duas ou mais)
            </Label>
            <p className="text-[11px] text-[#5F6E69] mt-0.5">
              Cadastre as clínicas onde você atende (ex.: HM Samuel Marques dos Santos,
              Gastroimagem). Cada agendamento é vinculado a uma unidade.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {clinicsList.map((clinic) => (
                <div
                  key={clinic}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F7F9F8] border border-[#E5E9E7] text-xs font-semibold text-[#1F2A27]"
                >
                  <span>{clinic}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveClinic(clinic)}
                    disabled={savingClinics}
                    className="text-[#8A9691] hover:text-red-600 ml-1"
                    title={`Remover ${clinic}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddClinic} className="flex items-center gap-2 max-w-md pt-2">
              <Input
                value={newClinicName}
                onChange={(e) => setNewClinicName(e.target.value)}
                placeholder="Nome da clínica (ex.: Gastroimagem)"
                className="text-xs bg-white"
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={savingClinics || !newClinicName.trim()}
                className="text-xs shrink-0 border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0]"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* 3.2 Catálogo de Preparos de Exames */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9E7] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-[#1F2A27]">
                  Preparos de Exames (Catálogo Clínico)
                </h2>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                  {preparations.length} tipos cadastrados
                </span>
              </div>
              <p className="text-xs text-[#5F6E69]">
                Orientações clínicas aplicadas automaticamente ao agendar exames e no comprovante do
                paciente
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={openNewPrepModal}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs font-semibold shrink-0"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Novo Preparo
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Input
              value={prepSearchQuery}
              onChange={(e) => setPrepSearchQuery(e.target.value)}
              placeholder="Buscar preparo por exame ou especialidade..."
              className="text-xs max-w-sm bg-[#F7F9F8]"
            />
            <span className="text-[11px] text-[#8A9691]">
              Preenchimento automático na tela /agenda
            </span>
          </div>

          {loadingPreparations ? (
            <div className="p-8 text-center text-xs text-[#5F6E69] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#0C6B58]" />
              Carregando catálogo de preparos...
            </div>
          ) : filteredPreparations.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-[#F7F9F8] border border-[#E5E9E7] text-xs text-[#5F6E69]">
              Nenhum preparo encontrado para os termos da busca.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredPreparations.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-[#E5E9E7] bg-[#FAFCFB] hover:border-[#0C6B58]/40 transition-colors flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-[#1F2A27]">{item.exam_type}</h4>
                        {item.specialty && (
                          <span className="inline-block text-[10px] font-medium text-[#0C6B58] bg-[#E8F3F0] px-1.5 py-0.5 rounded mt-0.5">
                            {item.specialty}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditPrepModal(item)}
                        className="h-7 w-7 text-[#5F6E69] hover:text-[#0C6B58]"
                        title="Editar preparo"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <p className="text-[11px] text-[#42524D] mt-2 leading-relaxed bg-white p-2.5 rounded-lg border border-[#EAEFEA]">
                      <span className="font-semibold text-[#1F2A27]">Preparo: </span>
                      {item.instructions}
                    </p>

                    {item.general_notice && (
                      <p className="text-[10px] text-[#71827C] mt-1.5">
                        <span className="font-semibold text-[#5F6E69]">Geral: </span>
                        {item.general_notice}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Adicionar / Editar Preparo */}
      <Dialog open={prepModalOpen} onOpenChange={setPrepModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPrep ? 'Editar Preparo de Exame' : 'Novo Preparo de Exame'}
            </DialogTitle>
            <DialogDescription>
              Configure as instruções que serão sugeridas ao agendar este exame.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePrep} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de Exame *</Label>
              <Input
                value={prepExamType}
                onChange={(e) => setPrepExamType(e.target.value)}
                placeholder="Ex.: Ultrassonografia Abdome Total"
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Especialidade / Grupo</Label>
              <Input
                value={prepSpecialty}
                onChange={(e) => setPrepSpecialty(e.target.value)}
                placeholder="Ex.: Ultrassonografia Geral, Ginecologia, Obstetrícia..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Instruções Específicas de Preparo Clínico *
              </Label>
              <Textarea
                rows={4}
                value={prepInstructions}
                onChange={(e) => setPrepInstructions(e.target.value)}
                placeholder="Ex.: Jejum absoluto de 8 horas. Bexiga cheia (beber 1L de água 1 hora antes)..."
                className="text-xs leading-relaxed"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Orientações Gerais do Paciente</Label>
              <Textarea
                rows={2}
                value={prepGeneralNotice}
                onChange={(e) => setPrepGeneralNotice(e.target.value)}
                placeholder="Ex.: Trazer exames anteriores, documentos e chegar com 15 min de antecedência."
                className="text-xs leading-relaxed"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrepModalOpen(false)}
                disabled={savingPrep}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingPrep}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold"
              >
                {savingPrep ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Preparo'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Preferências e Sistema */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E5E9E7] pb-4">
          <div className="w-9 h-9 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#1F2A27]">Preferências</h2>
            <p className="text-xs text-[#5F6E69]">Configurações regionais e do sistema</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Idioma do Sistema</Label>
            <Input value="Português (Brasil) — pt-BR" disabled className="bg-[#F7F9F8]" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Fuso Horário</Label>
            <Input value="America/Cuiaba (UTC-4)" disabled className="bg-[#F7F9F8]" />
          </div>
        </div>
      </div>

      {/* Modal Alterar E-mail */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar E-mail da Conta</DialogTitle>
            <DialogDescription>
              Um link de confirmação será enviado para o novo endereço.
            </DialogDescription>
          </DialogHeader>

          {emailSuccessMessage ? (
            <div className="py-4 space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                {emailSuccessMessage}
              </div>
              <DialogFooter>
                <Button onClick={() => setEmailModalOpen(false)}>Entendi</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleRequestEmailChange} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="modal_new_email" className="text-xs font-semibold">
                  Novo E-mail *
                </Label>
                <Input
                  id="modal_new_email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="novo@email.com"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmailModalOpen(false)}
                  disabled={sendingEmailChange}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={sendingEmailChange}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
                >
                  {sendingEmailChange ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Solicitar alteração'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
