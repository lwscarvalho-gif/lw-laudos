import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, Tag } from 'lucide-react'
import { templatesService } from '@/services/templates'
import { specialtiesService } from '@/services/specialties'
import { useAuth } from '@/contexts/AuthContext'
import RichTextEditor from '@/components/RichTextEditor'
import type { Template, MedicalSpecialty } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

export default function ModeloEditar() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState<Template | null>(null)
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [specialtyId, setSpecialtyId] = useState<string>('none')
  const [type, setType] = useState<'particular' | 'geral'>('particular')
  const [body, setBody] = useState('')

  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!id) return
    Promise.all([templatesService.getById(id), specialtiesService.getActive()])
      .then(([tpl, specs]) => {
        setTemplate(tpl)
        setSpecialties(specs)
        setTitle(tpl.title)
        setDescription(tpl.description || '')
        setSpecialtyId(tpl.specialty_id || 'none')
        setType(tpl.is_general ? 'geral' : 'particular')
        setBody(tpl.body)
      })
      .catch(() => {
        toast({
          title: 'Erro',
          description: 'Modelo não encontrado.',
          variant: 'destructive',
        })
        navigate('/modelos')
      })
      .finally(() => setLoading(false))
  }, [id, navigate, toast])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Título é obrigatório.'
    const textOnly = body.replace(/<[^>]*>/g, '').trim()
    if (!textOnly) errs.body = 'Conteúdo do modelo não pode estar vazio.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !validate()) return

    setSaving(true)
    try {
      await templatesService.update(id, {
        title: title.trim(),
        description: description.trim(),
        body,
        is_general: isAdmin ? type === 'geral' : false,
        specialty_id: specialtyId !== 'none' ? specialtyId : undefined,
      })
      toast({
        title: 'Modelo atualizado',
        description:
          'As alterações e a especialidade foram salvas. Cópias já feitas por outros médicos não foram afetadas.',
      })
      navigate('/modelos')
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar o modelo.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
        <p className="text-sm text-[#5F6E69]">Carregando modelo...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/modelos')}
            className="border-[#E5E9E7] text-[#5F6E69] hover:text-[#1F2A27]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#1F2A27]">Editar Modelo</h1>
            <p className="text-sm text-[#5F6E69] mt-0.5">
              Edite a estrutura padrão do modelo de laudo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/modelos')}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="ed_tpl_title" className="text-xs font-semibold text-[#1F2A27]">
            Título do Modelo *
          </Label>
          <Input
            id="ed_tpl_title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldErrors.title ? 'border-red-500' : ''}
          />
          {fieldErrors.title && <p className="text-xs text-[#DC2626]">{fieldErrors.title}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-1">
            <Label className="text-xs font-semibold text-[#1F2A27] flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-[#0C6B58]" />
              Especialidade Médica
            </Label>
            <Select value={specialtyId} onValueChange={setSpecialtyId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a especialidade..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geral / Sem especialidade</SelectItem>
                {specialties.map((spec) => (
                  <SelectItem key={spec.id} value={spec.id}>
                    {spec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-1">
            <Label className="text-xs font-semibold text-[#1F2A27]">Tipo de Modelo</Label>
            {isAdmin ? (
              <Select value={type} onValueChange={(val: 'particular' | 'geral') => setType(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="particular">Particular</SelectItem>
                  <SelectItem value="geral">Geral (publicado para todos)</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input value="Particular" disabled className="bg-[#F7F9F8] text-[#5F6E69]" />
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="ed_tpl_desc" className="text-xs font-semibold text-[#1F2A27]">
              Descrição curta
            </Label>
            <Input
              id="ed_tpl_desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <Label className="text-xs font-semibold text-[#1F2A27]">
            Corpo do Modelo (Rich Text) *
          </Label>
          <RichTextEditor value={body} onChange={setBody} minHeight="400px" />
          {fieldErrors.body && <p className="text-xs text-[#DC2626]">{fieldErrors.body}</p>}
        </div>
      </div>
    </div>
  )
}
