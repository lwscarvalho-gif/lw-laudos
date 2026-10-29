import React, { useState } from 'react'
import {
  FlaskConical,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ArrowLeft,
  Code2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { runSyntheticArchitectureTests, SyntheticTestResult } from '@/lib/syntheticSignatureTests'
import { runGeriatricCalculationFixtures, type FixtureTestResult } from '@/lib/geriatricFixtures'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function DiagnosticoDesenvolvimento() {
  const { toast } = useToast()
  const [runningTests, setRunningTests] = useState(false)
  const [testResults, setTestResults] = useState<SyntheticTestResult[] | null>(null)
  const [geriatricResults, setGeriatricResults] = useState<FixtureTestResult[] | null>(null)

  const handleRunTests = async () => {
    setRunningTests(true)
    try {
      const res = await runSyntheticArchitectureTests()
      setTestResults(res)
      const gerRes = runGeriatricCalculationFixtures()
      setGeriatricResults(gerRes)
      toast({
        title: 'Verificação concluída',
        description:
          'Testes sintéticos de regras e instrumentos geriátricos executados em memória.',
      })
    } catch {
      toast({
        title: 'Erro na execução',
        description: 'Falha ao rodar verificação lógica.',
        variant: 'destructive',
      })
    } finally {
      setRunningTests(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/integracoes"
          className="inline-flex items-center gap-1.5 text-xs text-[#5F6E69] hover:text-[#0C6B58] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Integrações
        </Link>
        <Badge
          variant="outline"
          className="text-[11px] font-mono border-amber-300 bg-amber-50 text-amber-800"
        >
          Área Restrita de Diagnóstico Técnico
        </Badge>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant="secondary"
            className="bg-[#E8F3F0] text-[#0C6B58] text-xs font-semibold px-2.5 py-0.5"
          >
            Diagnóstico de Desenvolvimento
          </Badge>
          <span className="text-xs text-[#5F6E69]">• Apenas verificação interna de fixtures</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1F2A27]">
          Validação Sintética de Regras em Navegador
        </h1>
        <p className="text-sm text-[#5F6E69] mt-0.5">
          Execução de testes lógicos no cliente para conferência de regras de hashing e estruturas
          de dados.
        </p>
      </div>

      {/* Critical Clarification Notice */}
      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-950">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Aviso técnico importante — Ambiente e Escopo dos Testes:</span>
        </div>
        <p className="leading-relaxed">
          Esta bateria{' '}
          <strong>NÃO é um teste real de banco de dados, autenticação ou storage offline</strong>.
          Trata-se exclusivamente de uma{' '}
          <strong>
            verificação de regras lógicas e fixtures sintéticas em memória no navegador
          </strong>
          . A execução com sucesso destes testes no navegador{' '}
          <strong>NÃO comprova homologação offline</strong> nem existência de servidor local
          instalado no ambiente físico.
        </p>
      </div>

      {/* Action panel */}
      <div className="bg-white p-6 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E9E7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[#1F2A27]">Bateria de Fixtures Sintéticas</h2>
              <p className="text-xs text-[#5F6E69]">
                Sem dados clínicos de pacientes, sem certificados ICP e sem chamada a servidores
                locais
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleRunTests}
            disabled={runningTests}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-9 font-semibold shrink-0"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            {runningTests ? 'Executando verificação...' : 'Executar Testes Sintéticos'}
          </Button>
        </div>

        <div className="p-3.5 bg-[#F7F9F8] rounded-xl border border-[#E5E9E7] text-xs text-[#5F6E69]">
          <div className="flex items-center gap-1.5 font-semibold text-[#1F2A27] mb-1">
            <Code2 className="w-3.5 h-3.5 text-[#0C6B58]" />
            <span>Escopo lógico verificado em memória no cliente:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Regra 1:</strong> Módulo desativado por padrão mantém emissão e gera digest de
              fixture sintética;
            </li>
            <li>
              <strong>Regra 2:</strong> Catálogo de serviços reflete preparação de 5 itens locais e
              simula bloqueio de chamada remota quando sem conexão;
            </li>
            <li>
              <strong>Regra 3:</strong> Alteração de conteúdo sintético altera digest SHA-256 e
              invalida hash pendente no estado local.
            </li>
          </ul>
        </div>

        {testResults && (
          <div className="space-y-3 pt-2">
            <span className="font-bold text-xs text-[#1F2A27] block">
              Resultados da Verificação em Navegador:
            </span>
            <div className="space-y-2.5">
              {testResults.map((t) => (
                <div
                  key={t.testId}
                  className={`p-3.5 rounded-lg border text-xs flex items-start gap-3 ${
                    t.passed
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-red-50/60 border-red-200 text-red-950'
                  }`}
                >
                  {t.passed ? (
                    <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <span className="font-bold block">{t.title}</span>
                    <p className="text-[11px] opacity-90 leading-relaxed">{t.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {geriatricResults && (
          <div className="space-y-3 pt-4 border-t border-[#E5E9E7]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#1F2A27] block">
                Validação de Cálculos Geriátricos (GeriTools / Fixtures Sintéticas):
              </span>
              <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                {geriatricResults.filter((g) => g.passed).length}/{geriatricResults.length}{' '}
                aprovados
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {geriatricResults.map((g, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                    g.passed
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                      : 'bg-red-50/50 border-red-200 text-red-950'
                  }`}
                >
                  {g.passed ? (
                    <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <span className="font-bold block">
                      [{g.instrument}] {g.caseName}
                    </span>
                    <p className="text-[10px] text-[#5F6E69]">
                      Esperado: {g.expected} | Recebido: {g.received}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-[11px] text-[#8A9691] flex items-center gap-1.5 pt-2 border-t border-[#E5E9E7]">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>
            Esta página destina-se a fins de diagnóstico técnico de desenvolvimento (rota direta
            /diagnostico).
          </span>
        </div>
      </div>
    </div>
  )
}
