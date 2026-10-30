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

      // 4. Montar laudo ultrassonográfico completo sintético (Tudo Normal) com body > 5000 caracteres
      // Cenário real da v0.0.41: laudo com todos os órgãos preenchidos somando HTML descritivo extenso
      const syntheticOrgans = [
        {
          id: 'figado',
          label: 'Fígado',
          text: 'Fígado com contornos regulares, bordas afiladas e dimensões normais (lobo direito medindo 14,2 cm e lobo esquerdo 7,8 cm no eixo longitudinal). Ecotextura do parênquima hepático homogênea, com padrão ecogênico habitual, sem evidência de esteatose hepática. Ausência de lesões nodulares sólidas ou císticas, coleções peri-hepáticas ou sinais de dilatação de vias biliares intra-hepáticas. Veia porta com calibre normal (1,0 cm) e trajeto anatômico preservado, sem sinais de trombose luminal. Veias hepáticas pérvias, com calibre e trajeto normais.',
        },
        {
          id: 'vias_biliares',
          label: 'Vias Biliares',
          text: 'Vias biliares intra e extra-hepáticas de calibre preservado, sem sinais de ectasia ou dilatação segmentar. Ducto colédoco com trajeto anatômico habitual, calibre normal medindo aproximadamente 3,8 mm no seu segmento retroduodenal visualizado, apresentando lúmen anecóico livre de cálculos, barro biliar ou formações endoluminais anômalas.',
        },
        {
          id: 'vesicula',
          label: 'Vesícula Biliar',
          text: 'Vesícula biliar normodistendida, topografia anatômica preservada, contornos nítidos e regulares. Paredes finas, lisas e ecogênicas, medindo cerca de 1,9 mm de espessura (valores de referência: até 3,0 mm), sem sinais de espessamento difuso, hiperemia parietal ao Doppler ou desdobramento de camadas. Conteúdo intraluminal puramente anecóico, sem evidência de cálculos, microcálculos móveis, barro biliar estratificado ou pólipos parietais fixos. Sinal de Murphy ultrassonográfico negativo.',
        },
        {
          id: 'pancreas',
          label: 'Pâncreas',
          text: 'Pâncreas com visualização adequada em topografia epigástrica e retrocavidade dos epíplons. Cabeça, colo, corpo e cauda com morfologia habitual, contornos regulares e dimensões preservadas (diâmetro anteroposterior da cabeça medindo 2,1 cm, corpo 1,4 cm e cauda 1,8 cm). Ecotextura do parênquima pancreático homogênea, isoecóica em relação ao tecido adjacente, sem sinais de lipomatose acentuada. Não se observam massas sólidas expansivas, cistos, calcificações grosseiras ou coleções peripancreáticas. Ducto pancreático principal (Wirsung) pérvio, calibre fino e uniforme, medindo 1,5 mm.',
        },
        {
          id: 'baco',
          label: 'Baço',
          text: 'Baço com localização, conformação e orientação espacial anatômicas normais no hipocôndrio esquerdo. Contornos lisos e regulares. Dimensões normais, medindo 10,4 cm no maior eixo longitudinal (índice esplênico dentro da faixa da normalidade). Parênquima esplênico homogêneo, com ecogenicidade habitual finamente granular, sem lesões focais sólidas, formações císticas congênitas ou adquiridas, calcificações focais ou hematomas subcapsulares. Veia esplênica pérvia e de calibre anatômico preservado no hilo esplênico.',
        },
        {
          id: 'rim_direito',
          label: 'Rim Direito',
          text: 'Rim direito localizado em loja renal direita com mobilidade respiratória preservada. Contornos lisos e nítidos, eixo longitudinal anatômico mantido. Dimensões preservadas, medindo 10,8 cm no eixo longitudinal por 4,6 cm no eixo transversal e espessura cortical de 1,6 cm. Relação córtico-medular nítida e preservada. Ecogenicidade do córtex renal habitual e comparável ao parênquima hepático adjacente. Seio renal com padrão ecogênico normal, sem evidência de dilatação pielocalicial (hidronefrose ausente). Ausência de cálculos acústicos calcificados no parênquima renal ou no sistema coletor. Sem evidência de cistos corticais simples ou lesões expansivas sólidas vascularizadas.',
        },
        {
          id: 'rim_esquerdo',
          label: 'Rim Esquerdo',
          text: 'Rim esquerdo em loja renal esquerda, orientado normalmente. Contornos regulares e preservados. Dimensões normais, medindo 11,1 cm no eixo longitudinal por 4,8 cm no eixo transversal com espessura do córtex renal de 1,7 cm. Diferenciação córtico-medular perfeitamente preservada. Ausência de ectasia do sistema pielocalicinal ou retenção de urina no bacinete renal. Não foram detectadas imagens nodulares com sombra acústica posterior sugestivas de litíase renal. Ausência de cistos renais ou massas sólidas perirrenais.',
        },
        {
          id: 'bexiga',
          label: 'Bexiga',
          text: 'Bexiga urinária com repleção satisfatória no momento do exame ecográfico. Paredes finas, lisas e regulares, com espessura uniforme medindo 2,2 mm, sem divertículos de pulsão, trabeculações de esforço parietal ou vegetações endovesicais. Conteúdo intraluminal inteiramente anecóico e límpido, livre de litíase vesical móvel, sedimento ecogênico particulado ou coágulos organizados. Jatos uretéricos bilaterais documentados simetricamente ao mapeamento por fluxo em cores Doppler.',
        },
        {
          id: 'aorta_cava',
          label: 'Grandes Vasos e Retroperitônio',
          text: 'Aorta abdominal visualizada desde a bifurcação diafragmática até as ilíacas comuns, com trajeto retilíneo e calibre fisiológico preservado (1,7 cm no segmento suprarrenal e 1,4 cm no segmento infra-renal). Ausência de dilatações aneurismáticas segmentares, dissecções luminais ou placas parietais de ateroma complicadas. Veia cava inferior com calibre habitual e colapsabilidade respiratória fisiológica preservada. Não se identificam linfonodomegalias retroperitoneais nas cadeias paraórticas, retrocavais ou mesentéricas.',
        },
        {
          id: 'outros',
          label: 'Cavidade Abdominal e Parede',
          text: 'Não há evidência de líquido livre na cavidade peritoneal, recessos subfrênicos, espaços sub-hepáticos (espaço de Morrison), goteiras parietocólicas direita e esquerda ou fundo de saco pélvico (espaço de Douglas). As alças intestinais visualizadas apresentam peristaltismo ativo e paredes de espessura conservada, sem distensão patológica gasosa ou líquida. Parede abdominal sem descontinuidades aponeuróticas ou evidência de hérnias incisionais ou umbilicais redutíveis.',
        },
      ]

      let fullGeneratedBodyHtml = '<div class="ultrasound-structured-report">'
      syntheticOrgans.forEach((org) => {
        fullGeneratedBodyHtml += `<div class="report-organ-block" style="margin-bottom: 12px;"><h3 style="font-family: -apple-system, sans-serif; font-size: 11pt; font-weight: 700; color: #0C6B58; margin: 0 0 4px 0; text-transform: uppercase;">${org.label}:</h3><p style="margin: 0; line-height: 1.5; font-size: 11pt; color: #1F2A27;">${org.text.replace(/\n/g, '<br/>')}</p></div>`
      })
      fullGeneratedBodyHtml += '</div>'

      const testTitle = 'Laudo de Ultrassonografia de Abdome Total - Teste E2E Finalização v0.0.41'
      const testBody = fullGeneratedBodyHtml
      const testConclusion =
        'Exame ecográfico de abdome total dentro dos padrões ecográficos normais para a faixa etária. Ausência de alterações organomegálicas, lesões focais ou sinais de hipertensão portal ou litíase visceral.'

      const bodyLength = testBody.length

      steps.push({
        title: 'Verificação de Tamanho do Body Clínico (> 5.000 caracteres)',
        success: bodyLength > 5000,
        details: `Corpo do laudo ultrassonográfico completo possui ${bodyLength} caracteres (limite anterior: 5.000; novo limite migrado: 100.000).`,
      })

      const structuredData = {
        sections: syntheticOrgans,
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
              Prova E2E: Finalização de Laudo Novo (Tudo Normal &gt; 5.000 chars + Bird ID)
            </CardTitle>
            <CardDescription className="text-xs text-[#5F6E69]">
              Reproduz o fluxo do Dr. Lucas em /laudos/ultrassom (laudo novo com todos os órgãos
              preenchidos via Tudo Normal, body HTML sintético &gt; 5.000 caracteres, assinatura
              Bird ID) e limpa o registro temporário ao concluir.
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
