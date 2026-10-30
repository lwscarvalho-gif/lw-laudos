import React, { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { appointmentsService } from '@/services/appointments'
import { buildAppointmentVoucherHTML } from '@/lib/appointmentVoucherPrinter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Loader2, Play, FileText, Printer, Eye } from 'lucide-react'
import { combineCuiabaDateTimeToISO } from '@/lib/formatters'
import type { Appointment, Patient } from '@/types'

interface E2EVoucherStep {
  title: string
  success: boolean
  details: string
}

export function SimulationVoucherAppointmentE2E() {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<E2EVoucherStep[]>([])
  const [voucherPreviewHtml, setVoucherPreviewHtml] = useState<string | null>(null)

  const runVoucherE2E = async () => {
    setRunning(true)
    const steps: E2EVoucherStep[] = []
    let createdAppointmentId: string | null = null

    try {
      // 1. Autenticar com a conta CONVIDADO (convidado@lwlaudos.local, senha Convidado123)
      let guestUser: any = null
      try {
        const authData = await pb
          .collection('users')
          .authWithPassword('convidado@lwlaudos.local', 'Convidado123')
        guestUser = authData.record
      } catch (authErr) {
        throw new Error(
          `Falha ao autenticar com convidado@lwlaudos.local: ${
            authErr instanceof Error ? authErr.message : String(authErr)
          }`,
        )
      }

      steps.push({
        title: 'Autenticação com Perfil Convidado (convidado@lwlaudos.local)',
        success: Boolean(guestUser && guestUser.email === 'convidado@lwlaudos.local'),
        details: `Usuário autenticado com sucesso: ${guestUser.name} (${guestUser.role}) — ID: ${guestUser.id}.`,
      })

      // 2. Localizar paciente do convidado ou selecionar paciente para o agendamento
      const patientRecords = await pb.collection('patients').getList<Patient>(1, 5, {
        filter: `owner_id = '${guestUser.id}'`,
      })

      let targetPatient: Patient
      if (patientRecords.items.length > 0) {
        targetPatient = patientRecords.items[0]
      } else {
        // Criar paciente sintético se não houver
        targetPatient = await pb.collection('patients').create<Patient>({
          name: 'Ana Carolina Fernandes Mendonça',
          document: '123.456.789-00',
          phone: '(69) 98412-3344',
          sex: 'Feminino',
          owner_id: guestUser.id,
        })
      }

      steps.push({
        title: 'Paciente Identificado para o Agendamento',
        success: Boolean(targetPatient && targetPatient.id),
        details: `Paciente: ${targetPatient.name} (CPF: ${targetPatient.document || 'N/A'}) — ID: ${targetPatient.id}.`,
      })

      // 3. Criar agendamento às 20:00 (Cuiabá UTC-4) com clínica e preparo clínico em destaque
      const appointmentDate = '2026-10-30'
      const appointmentTime = '20:00'
      const startIso = combineCuiabaDateTimeToISO(appointmentDate, appointmentTime)

      const clinicLocation =
        guestUser.clinics_config && guestUser.clinics_config[0]
          ? typeof guestUser.clinics_config[0] === 'string'
            ? guestUser.clinics_config[0]
            : guestUser.clinics_config[0].name
          : 'Gastroimagem'

      const examType = 'Ultrassonografia Abdome Total'
      const examNotes =
        'Jejum absoluto de 8 horas (inclusive líquidos). Bexiga confortavelmente cheia (ingerir 4 copos de água 1 hora antes e não urinar).'

      const createdAppt: Appointment = await appointmentsService.create(
        {
          patient_id: targetPatient.id,
          start_time: startIso,
          duration_minutes: 30,
          exam_type: examType,
          clinic_location: clinicLocation,
          status: 'Agendado',
          notes: examNotes,
          referring_physician: 'Dr. Roberto Albuquerque (CRM RO 7890)',
        },
        targetPatient,
      )

      createdAppointmentId = createdAppt.id

      steps.push({
        title: 'Criação do Agendamento às 20h no Banco de Dados',
        success: Boolean(createdAppt && createdAppt.id),
        details: `Agendamento criado com sucesso! Accession: ${createdAppt.accession_number}, Horário: ${appointmentDate} às ${appointmentTime}, Clínica: ${createdAppt.clinic_location}.`,
      })

      // 4. Gerar HTML do comprovante A4 com motor dedicado de impressão
      const voucherHtml = buildAppointmentVoucherHTML({
        appointment: {
          ...createdAppt,
          expand: { patient_id: targetPatient },
        },
        patient: targetPatient,
      })

      setVoucherPreviewHtml(voucherHtml)

      // 5. Testes de integridade do conteúdo do comprovante:
      // - Deve conter o nome da paciente
      // - Deve conter a clínica
      // - Deve conter a data formatada
      // - Deve conter o horário das 20:00
      // - Deve conter o preparo clínico completo
      // - Deve conter o Accession Number
      // - Deve conter as instruções de documentos
      const hasPatientName = voucherHtml.includes(targetPatient.name)
      const hasClinic = voucherHtml.includes(clinicLocation)
      const hasTime20 = voucherHtml.includes('20:00')
      const hasPrepText = voucherHtml.includes('Jejum absoluto de 8 horas')
      const hasAccession = voucherHtml.includes(createdAppt.accession_number)
      const hasDocInstructions = voucherHtml.includes('Documento oficial com foto')

      const allChecksPass =
        hasPatientName &&
        hasClinic &&
        hasTime20 &&
        hasPrepText &&
        hasAccession &&
        hasDocInstructions

      steps.push({
        title: 'Verificação Textual Completa do Comprovante A4',
        success: allChecksPass,
        details: `Verificação de campos obrigatórios: Nome (${hasPatientName ? 'OK' : 'FALHOU'}), Clínica (${hasClinic ? 'OK' : 'FALHOU'}), Horário 20:00 (${hasTime20 ? 'OK' : 'FALHOU'}), Preparo clínico (${hasPrepText ? 'OK' : 'FALHOU'}), Accession Number (${hasAccession ? 'OK' : 'FALHOU'}), Documentos a levar (${hasDocInstructions ? 'OK' : 'FALHOU'}).`,
      })

      // 6. Validar que o CSS de impressão garante documento autocontido e sem dependência de modal pai
      const hasA4PageStyle = voucherHtml.includes('size: A4 portrait')
      const hasColorAdjust = voucherHtml.includes('print-color-adjust: exact')
      const hasBreakAvoid = voucherHtml.includes('break-inside: avoid')

      steps.push({
        title: 'Conformidade de Engenharia de Impressão (1 Página A4 Sem Fundo Branco)',
        success: hasA4PageStyle && hasColorAdjust && hasBreakAvoid,
        details: `Regras de impressão aplicadas: @page A4 (${hasA4PageStyle ? 'OK' : 'FALHOU'}), Cores preservadas em PDF (${hasColorAdjust ? 'OK' : 'FALHOU'}), Quebra de página evitada (${hasBreakAvoid ? 'OK' : 'FALHOU'}).`,
      })

      // 7. Verificar que o rascunho oficial muvdbwmrw3hagrr permanece intacto
      const draftRecord = await pb.collection('reports').getOne('muvdbwmrw3hagrr')
      const isDraftIntact =
        draftRecord.id === 'muvdbwmrw3hagrr' &&
        draftRecord.status === 'Rascunho' &&
        draftRecord.owner_id === 'kxhlkfxh0yddn64'

      steps.push({
        title: 'Preservação do Rascunho Oficial muvdbwmrw3hagrr',
        success: isDraftIntact,
        details: `Rascunho oficial conferido no banco: ID ${draftRecord.id}, Status: ${draftRecord.status}, Owner: ${draftRecord.owner_id}.`,
      })
    } catch (err: any) {
      console.error('Erro na simulação do comprovante:', err)
      steps.push({
        title: 'Falha na Execução do Fluxo',
        success: false,
        details: err?.message || String(err),
      })
    } finally {
      // 8. Limpeza do agendamento sintético de teste criado para manter banco 100% íntegro
      if (createdAppointmentId) {
        try {
          await pb.collection('appointments').delete(createdAppointmentId)
          steps.push({
            title: 'Limpeza de Registro Temporário',
            success: true,
            details: `Agendamento temporário ${createdAppointmentId} removido do banco. Nenhuma poluição residual.`,
          })
        } catch (cleanupErr) {
          console.warn('Falha na limpeza do agendamento de teste:', cleanupErr)
        }
      }
      setRunning(false)
      setResults(steps)
    }
  }

  return (
    <Card className="border-[#0C6B58]/40 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-[#1F2A27] flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#0C6B58]" />
              Prova E2E: Agendamento das 20h e Comprovante de Impressão (Conta Convidado)
            </CardTitle>
            <CardDescription className="text-xs text-[#5F6E69]">
              Reproduz o cenário do usuário na conta convidado (convidado@lwlaudos.local): cria o
              agendamento às 20h, valida a extração do comprovante A4 com preparo e todos os textos
              clínicos preenchidos, valida as regras de impressão em 1 página e limpa o registro
              temporário.
            </CardDescription>
          </div>
          <Button
            onClick={runVoucherE2E}
            disabled={running}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-9"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Executando Prova...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Executar Prova E2E
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {results.length > 0 && (
        <CardContent className="space-y-3 pt-0">
          <div className="space-y-2">
            {results.map((res, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                  res.success
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-red-50/60 border-red-200'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-semibold">
                    {res.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span className={res.success ? 'text-emerald-900' : 'text-red-900'}>
                      {res.title}
                    </span>
                  </div>
                  <p className="text-[#5F6E69] text-[11px] pl-6">{res.details}</p>
                </div>
                <Badge
                  className={`text-[10px] shrink-0 ${
                    res.success
                      ? 'bg-emerald-100 text-emerald-800 border-none'
                      : 'bg-red-100 text-red-800 border-none'
                  }`}
                >
                  {res.success ? 'Aprovado' : 'Falhou'}
                </Badge>
              </div>
            ))}
          </div>

          {voucherPreviewHtml && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-[#1F2A27] flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#0C6B58]" />
                  Prévia do HTML Renderizado do Comprovante (Texto Completo):
                </span>
                <span className="text-[10px] text-[#5F6E69]">Pronto para impressão A4</span>
              </div>
              <div className="border border-[#D5DED9] rounded-lg overflow-hidden bg-white max-h-80 overflow-y-auto p-4">
                <iframe
                  title="Prévia do Comprovante"
                  srcDoc={voucherPreviewHtml}
                  className="w-full h-96 border-0"
                />
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
