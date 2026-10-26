import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { examsService } from '@/services/exams'
import { patientsService } from '@/services/patients'
import type { Patient, ExamStatus } from '@/types'
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
import { useToast } from '@/hooks/use-toast'

const EXAM_TYPE_SUGGESTIONS = [
  'Ressonância Magnética',
  'Tomografia Computadorizada',
  'Raio-X',
  'Ultrassom',
  'Mamografia',
  'Densitometria Óssea',
  'Eletrocardiograma',
  'Ecocardiograma',
  'Endoscopia Digestiva Alta',
  'Colonoscopia',
]

export default function ExameNovo() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefilledPatientId = searchParams.get('paciente') || ''

  const { toast } = useToast()

  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)

  const [patientId, setPatientId] = useState(prefilledPatientId)
  const [type, setType] = useState('')
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<ExamStatus>('Pendente')
  const [indication, setIndication] = useState('')
  const [technicalNotes, setTechnicalNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    patientsService
      .getAll()
      .then((pts) => {
        setPatients(pts)
        if (prefilledPatientId && !patientId) {
          setPatientId(prefilledPatientId)
        }
      })
      .finally(() => setLoadingPatients(false))
  }, [prefilledPatientId, patientId])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!patientId) errs.patientId = 'Selecione o paciente.'
    if (!type.trim()) errs.type = 'Tipo de exame é obrigatório.'
    if (!examDate) errs.examDate = 'Data do exame é obrigatória.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const created = await examsService.create({
        patient_id: patientId,
        type: type.trim(),
        exam_date: new Date(examDate).toISOString(),
        status,
        indication: indication.trim(),
        technical_notes: technicalNotes.trim(),
      })
      toast({
        title: 'Exame cadastrado',
        description: 'Exame registrado com sucesso.',
      })
      navigate(`/exames/${created.id}`)
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao cadastrar o exame.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/exames')}
          className="border-[#E5E9E7] text-[#5F6E69] hover:text-[#1F2A27]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#1F2A27]">Novo Exame</h1>
          <p className="text-sm text-[#5F6E69] mt-0.5">
            Cadastre uma solicitação ou realização de exame diagnóstico
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1F2A27]">Paciente *</Label>
            {loadingPatients ? (
              <div className="h-10 flex items-center text-xs text-[#5F6E69]">
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#0C6B58]" />
                Carregando pacientes...
              </div>
            ) : patients.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                <span>Nenhum paciente cadastrado para associar ao exame.</span>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => navigate('/pacientes')}
                  className="h-7 text-xs bg-white"
                >
                  Cadastrar Paciente
                </Button>
              </div>
            ) : (
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger className={fieldErrors.patientId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o paciente..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.document ? `(CPF: ${p.document})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {fieldErrors.patientId && (
              <p className="text-xs text-[#DC2626]">{fieldErrors.patientId}</p>
            )}
          </div>

          {/* Exam Type with datalist suggestions */}
          <div className="space-y-1.5">
            <Label htmlFor="exam_type" className="text-xs font-semibold text-[#1F2A27]">
              Tipo de Exame *
            </Label>
            <Input
              id="exam_type"
              list="exam-type-suggestions"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Digite ou selecione (ex.: Ressonância Magnética, Ultrassom...)"
              className={fieldErrors.type ? 'border-red-500' : ''}
            />
            <datalist id="exam-type-suggestions">
              {EXAM_TYPE_SUGGESTIONS.map((sug) => (
                <option key={sug} value={sug} />
              ))}
            </datalist>
            {fieldErrors.type && <p className="text-xs text-[#DC2626]">{fieldErrors.type}</p>}
          </div>

          {/* Date and Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="exam_date" className="text-xs font-semibold text-[#1F2A27]">
                Data do Exame *
              </Label>
              <Input
                id="exam_date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className={fieldErrors.examDate ? 'border-red-500' : ''}
              />
              {fieldErrors.examDate && (
                <p className="text-xs text-[#DC2626]">{fieldErrors.examDate}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1F2A27]">Status inicial</Label>
              <Select value={status} onValueChange={(val: ExamStatus) => setStatus(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em análise">Em análise</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clinical Indication */}
          <div className="space-y-1.5">
            <Label htmlFor="indication" className="text-xs font-semibold text-[#1F2A27]">
              Indicação Clínica
            </Label>
            <Textarea
              id="indication"
              rows={3}
              value={indication}
              onChange={(e) => setIndication(e.target.value)}
              placeholder="Sintomas, suspeita diagnóstica, motivo da solicitação..."
            />
          </div>

          {/* Technical Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="tech_notes" className="text-xs font-semibold text-[#1F2A27]">
              Observações Técnicas
            </Label>
            <Textarea
              id="tech_notes"
              rows={3}
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              placeholder="Equipamento utilizado, protocolo de aquisição, contraste, janela..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E9E7]">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/exames')}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando exame...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Exame
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
