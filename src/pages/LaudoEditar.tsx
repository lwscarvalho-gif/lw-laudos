import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { reportsService } from '@/services/reports'
import { patientsService } from '@/services/patients'
import { useAuth } from '@/contexts/AuthContext'
import type { Patient, Report } from '@/types'
import RichTextEditor from '@/components/RichTextEditor'
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

export default function LaudoEditar() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState<Patient[]>([])
  const [report, setReport] = useState<Report | null>(null)

  const [title, setTitle] = useState('')
  const [patientId, setPatientId] = useState('')
  const [body, setBody] = useState('')

  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!id) return
    Promise.all([reportsService.getById(id), patientsService.getAll()])
      .then(([rep, pts]) => {
        setReport(rep)
        setPatients(pts)
        setTitle(rep.title)
        setPatientId(rep.patient_id)
        setBody(rep.body)
      })
      .catch(() => {
        toast({
          title: 'Erro',
          description: 'Laudo não encontrado.',
          variant: 'destructive',
        })
        navigate('/laudos')
      })
      .finally(() => setLoading(false))
  }, [id, navigate, toast])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Título é obrigatório.'
    if (!patientId) errs.patientId = 'Selecione o paciente.'
    const textOnly = body.replace(/<[^>]*>/g, '').trim()
    if (!textOnly) errs.body = 'Conteúdo do laudo não pode estar vazio.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !validate()) return

    setSaving(true)
    try {
      await reportsService.update(id, {
        title: title.trim(),
        patient_id: patientId,
        body,
      })
      toast({
        title: 'Laudo salvo com sucesso.',
        description: 'As alterações do laudo foram salvas.',
      })
      navigate(`/laudos/${id}`)
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar as alterações do laudo.',
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
        <p className="text-sm text-[#5F6E69]">Carregando editor...</p>
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
            onClick={() => navigate(`/laudos/${id}`)}
            className="border-[#E5E9E7] text-[#5F6E69] hover:text-[#1F2A27]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#1F2A27]">Editar Laudo</h1>
            <p className="text-sm text-[#5F6E69] mt-0.5">
              Atualize as informações clínicas do laudo emitido
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/laudos/${id}`)}
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
                Salvar alterações
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="ed_title" className="text-xs font-semibold text-[#1F2A27]">
            Título do laudo *
          </Label>
          <Input
            id="ed_title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldErrors.title ? 'border-red-500' : ''}
          />
          {fieldErrors.title && <p className="text-xs text-[#DC2626]">{fieldErrors.title}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#1F2A27]">Paciente *</Label>
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger className={fieldErrors.patientId ? 'border-red-500' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} {p.document ? `(${p.document})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 pt-2">
          <Label className="text-xs font-semibold text-[#1F2A27]">
            Conteúdo Clínico do Laudo *
          </Label>
          <RichTextEditor value={body} onChange={setBody} minHeight="400px" />
          {fieldErrors.body && <p className="text-xs text-[#DC2626]">{fieldErrors.body}</p>}
        </div>
      </div>
    </div>
  )
}
