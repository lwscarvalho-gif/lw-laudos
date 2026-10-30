import React, { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { reportsService } from '@/services/reports'
import { cloudSignatureService } from '@/services/cloudSignatureSession'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Loader2, Play, FileCheck, ShieldCheck } from 'lucide-react'
import type { Report } from '@/types'

interface E2ERunStep {
  title: string
  success: boolean
  details: string
}

export function SimulationReportFinalizeE2E() {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<E2ERunStep[]>([])

  const runFinalizeE2E = async () => {
    setRunning(true)
    const steps: E2ERunStep[] = []
    let createdReportId: string | null = null

    try {
      // 1. Authenticate or verify doctor session
      // In tests / admin console, we check current auth record or authenticate as Dr. Lucas
      let user = pb.authStore.record
      if (!user || user.email !== 'lwscarvalho@gmail.com') {
        try {
          const authData = await pb
            .collection('users')
            .authWithPassword('lwscarvalho@gmail.com', 'Skip@Pass')
          user = authData.record
        } catch {
          // If password differs, use current authStore
          user = pb.authStore.record
        }
      }

      steps.push({
        title: 'Sessão médica ativa (Dr. Lucas Willian da Silva)',
        success: Boolean(user && user.id),
        details: `Autenticado com ID: ${user?.id || 'nenhum'}, CRM: ${user?.crm || '—'}.`,
      })

      if (!user?.id) {
        throw new Error('Nenhum usuário médico autenticado.')
      }

      // 2. Select patient Carlos Eduardo Ribeiro de Souza (patient_id: 3dw3bhp0lq1b4s7)
      const patientId = '3dw3bhp0lq1b4s7'
      const patientRecord = await pb.collection('patients').getOne(patientId)

      steps.push({
        title: 'Paciente Selecionado no Banco',
        success: Boolean(patientRecord && patientRecord.name.includes('Carlos Eduardo')),
        details: `Paciente encontrado: ${patientRecord.name} (ID: ${patientRecord.id}, CPF: ${patientRecord.document || '—'}).`,
      })

      // 3. Evaluate Cloud Signature Session (Bird ID)
      const cloudEval = cloudSignatureService.evaluateSession(user as any)
      const hasCloudSession = user.digital_signature_enabled && cloudEval.hasActiveSession
      const sigStatus = hasCloudSession ? 'Assinado' : 'Não assinado'
      const sigProvider = hasCloudSession ? cloudEval.session?.providerLabel : undefined

      steps.push({
        title: 'Avaliação de Sessão de Assinatura Digital (Bird ID)',
        success: hasCloudSession,
        details: `Sessão ativa: ${hasCloudSession ? 'SIM' : 'NÃO'}, Provedor: ${sigProvider || 'Nenhum'}, Validade restante: ${cloudEval.remainingTimeFormatted}.`,
      })

      // 4. Execute EXACT payload of handleFinalizeReport (novo laudo)
      const testTitle = 'Laudo de Ultrassonografia de Abdome Total - Teste E2E Finalização'
      const testBody =
        '<div class="ultrasound-structured-report"><div class="report-organ-block" style="margin-bottom: 12px;"><h3 style="font-family: -apple-system, sans-serif; font-size: 11pt; font-weight: 700; color: #0C6B58; margin: 0 0 4px 0; text-transform: uppercase;">Fígado:</h3><p style="margin: 0; line-height: 1.5; font-size: 11pt; color: #1F2A27;">Ecotextura homogênea e dimensões preservadas.</p></div></div>'
      const testConclusion =
        'Exame ecográfico de abdome total dentro dos limites da normalidade (Teste E2E).'

      const structuredData = {
        sections: [
          { id: 'figado', label: 'Fígado', text: 'Ecotextura homogênea e dimensões preservadas.' },
        ],
        conclusion: testConclusion,
        mode: 'structured',
        body_marks: { schemeId: 'none', points: [] },
      }

      const createdReport: Report = await reportsService.create({
        title: testTitle,
        patient_id: patientId,
        exam_id: undefined,
        referring_physician: undefined,
        clinic_location: undefined,
        body: testBody,
        conclusion: testConclusion,
        structured_data: structuredData,
        images_config: { imagesPerPage: 4 },
        status: 'Finalizado',
        is_draft: false,
        exam_type: 'Ultrassonografia',
        author_name: user.professional_name || user.name || 'Dr. Médico',
        author_crm: user.crm || undefined,
        author_crm_uf: user.crm_uf || undefined,
        signature_date: new Date().toISOString(),
        signature_status: sigStatus,
        signature_provider: sigProvider,
      })

      createdReportId = createdReport.id

      steps.push({
        title: 'POST /api/collections/reports/records (Criação de Laudo Novo Finalizado)',
        success: Boolean(
          createdReport && createdReport.id && createdReport.status === 'Finalizado',
        ),
        details: `Laudo novo criado com sucesso! ID: ${createdReport.id}, Status: ${createdReport.status}, Assinatura: ${createdReport.signature_status} via ${createdReport.signature_provider || '—'}.`,
      })

      // 5. Query created report back to confirm DB persistence
      const persisted = await pb.collection('reports').getOne(createdReport.id)
      steps.push({
        title: 'Persistência e Leitura do Laudo Finalizado',
        success: persisted.status === 'Finalizado' && persisted.patient_id === patientId,
        details: `Confirmado no banco: Laudo ${persisted.id} persistido com status ${persisted.status} para o paciente Carlos Eduardo.`,
      })

      // 6. Verify existing draft muvdbwmrw3hagrr was untouched
      const originalDraft = await pb.collection('reports').getOne('muvdbwmrw3hagrr')
      steps.push({
        title: 'Preservação Estrita do Rascunho muvdbwmrw3hagrr',
        success:
          originalDraft.id === 'muvdbwmrw3hagrr' &&
          originalDraft.status === 'Rascunho' &&
          originalDraft.owner_id === 'kxhlkfxh0yddn64',
        details: `Rascunho oficial muvdbwmrw3hagrr intacto (Status: ${originalDraft.status}, Owner: ${originalDraft.owner_id}).`,
      })
    } catch (err: any) {
      console.error('Erro na simulação E2E de finalização:', err)
      steps.push({
        title: 'Falha no Fluxo de Finalização',
        success: false,
        details: err?.message || String(err),
      })
    } finally {
      // 7. Cleanup: REMOVE created test report to leave DB completely clean
      if (createdReportId) {
        try {
          await pb.collection('reports').delete(createdReportId)
          steps.push({
            title: 'Limpeza de Dados Temporários de Teste',
            success: true,
            details: `Registro de teste ${createdReportId} excluído com sucesso do banco de dados. Nenhum dado residual.`,
          })
        } catch (cleanupErr) {
          steps.push({
            title: 'Limpeza de Dados Temporários de Teste',
            success: false,
            details: `Não foi possível excluir o laudo temporário ${createdReportId}: ${String(cleanupErr)}`,
          })
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
              <ShieldCheck className="w-5 h-5 text-[#0C6B58]" />
              Prova E2E: Finalização de Laudo Novo com Bird ID
            </CardTitle>
            <CardDescription className="text-xs text-[#5F6E69]">
              Reproduz o fluxo do usuário em /laudos/ultrassom (criar e finalizar laudo novo para o
              paciente Carlos Eduardo Ribeiro de Souza com assinatura digital Bird ID) e limpa o
              registro temporário ao concluir.
            </CardDescription>
          </div>
          <Button
            onClick={runFinalizeE2E}
            disabled={running}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-9"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Executando E2E...
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
        <CardContent className="space-y-2 pt-0">
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
        </CardContent>
      )}
    </Card>
  )
}
