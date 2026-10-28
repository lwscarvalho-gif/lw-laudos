import React, { useState } from 'react'
import {
  FileSpreadsheet,
  HardDrive,
  AlertCircle,
  Server,
  Cpu,
  ShieldCheck,
  Globe,
  Wifi,
  WifiOff,
  ExternalLink,
  Layers,
  Lock,
  CheckCircle2,
  FileCheck2,
  HelpCircle,
  Database,
  FlaskConical,
  Play,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { runSyntheticArchitectureTests, SyntheticTestResult } from '@/lib/syntheticSignatureTests'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  digitalSignatureService,
  DigitalSignatureProviderId,
  SUPPORTED_PROVIDERS,
} from '@/services/digitalSignature'
import { useNetworkStatus, getSystemServicesList } from '@/lib/networkStatus'
import { useToast } from '@/hooks/use-toast'

export default function Integracoes() {
  const { toast } = useToast()
  const { isOnline } = useNetworkStatus()

  // Assinatura Digital state
  const [sigConfig, setSigConfig] = useState(() => digitalSignatureService.getConfig())
  const currentProvider =
    SUPPORTED_PROVIDERS.find((p) => p.id === sigConfig.selectedProvider) || SUPPORTED_PROVIDERS[0]

  const handleToggleSignature = (enabled: boolean) => {
    const updated = digitalSignatureService.saveConfig({ enabled })
    setSigConfig(updated)
    toast({
      title: enabled ? 'Módulo de Assinatura ativado' : 'Módulo de Assinatura desativado',
      description: enabled
        ? 'A emissão de laudos continuará autônoma; o módulo apresentará o estado dos certificados nos relatórios.'
        : 'Assinatura digital desativada por padrão. Laudos e PDFs continuam sendo emitidos normalmente.',
    })
  }

  const handleProviderChange = (providerId: string) => {
    const updated = digitalSignatureService.saveConfig({
      selectedProvider: providerId as DigitalSignatureProviderId,
    })
    setSigConfig(updated)
    toast({
      title: 'Provedor selecionado',
      description: `Adaptador ajustado para ${updated.selectedProvider.toUpperCase()}. Nenhuma chave é transmitida pelo frontend.`,
    })
  }

  const systemServices = getSystemServicesList(isOnline, sigConfig.enabled)

  // Synthetic Architecture Tests State
  const [runningTests, setRunningTests] = useState(false)
  const [testResults, setTestResults] = useState<SyntheticTestResult[] | null>(null)

  const handleRunTests = async () => {
    setRunningTests(true)
    try {
      const res = await runSyntheticArchitectureTests()
      setTestResults(res)
      toast({
        title: 'Bateria de testes executada',
        description:
          'Os testes arquiteturais com fixtures sintéticas foram validados no navegador.',
      })
    } catch {
      toast({
        title: 'Erro na execução',
        description: 'Falha ao rodar testes sintéticos.',
        variant: 'destructive',
      })
    } finally {
      setRunningTests(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant="secondary"
            className="bg-[#E8F3F0] text-[#0C6B58] text-xs font-semibold px-2.5 py-0.5"
          >
            LW Laudos • Conectividade & Infraestrutura
          </Badge>
          <span className="text-xs text-[#5F6E69]">• Núcleo Local e Provedores Cloud</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1F2A27]">
          Integrações, Assinatura Digital e DICOM
        </h1>
        <p className="text-sm text-[#5F6E69] mt-0.5">
          Configuração de PSCs ICP-Brasil, ponte hospitalar de ultrassom e estado de conectividade
          autônoma
        </p>
      </div>

      {/* Network & Local Autonomy Notice */}
      <div className="p-4 rounded-xl bg-white border border-[#E5E9E7] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#1F2A27]">Operação Localmente Autônoma</span>
              <Badge
                variant="outline"
                className={
                  isOnline
                    ? 'border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px]'
                    : 'border-amber-300 text-amber-800 bg-amber-50 text-[10px]'
                }
              >
                {isOnline ? (
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-emerald-600" /> Interface de Rede Ativa
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <WifiOff className="w-3 h-3 text-amber-600" /> Rede Externa Indisponível
                  </span>
                )}
              </Badge>
            </div>
            <p className="text-[#5F6E69] leading-relaxed max-w-2xl">
              O núcleo clínico (editor estruturado de ultrassonografia, banco de frases, rascunhos,
              imagens, compilação de PDF real e impressão) roda de forma <strong>autônoma</strong>.
              Acesso à internet pública é exigido <strong>apenas</strong> para serviços em nuvem
              (como PSCs ICP-Brasil e IA).
            </p>
          </div>
        </div>

        <div className="text-[11px] text-[#8A9691] shrink-0 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0">
          <span className="block font-semibold text-[#1F2A27]">Separação de Camadas</span>
          <span>Core local independente</span>
        </div>
      </div>

      {/* SEÇÃO 1: MÓDULO DE ASSINATURA DIGITAL (PARTE 1 DO REQUISITO) */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E9E7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-[#1F2A27]">
                  Assinatura Digital ICP-Brasil (Opcional)
                </h2>
                <Badge
                  variant="outline"
                  className={
                    sigConfig.enabled
                      ? 'border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px]'
                      : 'border-slate-300 text-slate-600 bg-slate-50 text-[10px]'
                  }
                >
                  {sigConfig.enabled ? 'Módulo Habilitado' : 'Desativado por Padrão'}
                </Badge>
              </div>
              <p className="text-xs text-[#5F6E69]">
                Integração com Prestadores de Serviços de Confiança (VIDaaS, Bird ID, SafeID,
                SerproID, RemoteID)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Label
              htmlFor="sig-toggle"
              className="text-xs font-semibold text-[#1F2A27] cursor-pointer"
            >
              Ativar Assinatura Digital
            </Label>
            <Switch
              id="sig-toggle"
              checked={sigConfig.enabled}
              onCheckedChange={handleToggleSignature}
            />
          </div>
        </div>

        {/* Informative notice about security & immutable PDF rules */}
        <div className="p-4 rounded-xl bg-[#F7F9F8] border border-[#E5E9E7] text-xs text-[#5F6E69] space-y-2">
          <div className="flex items-center gap-2 font-semibold text-[#1F2A27]">
            <Lock className="w-4 h-4 text-[#0C6B58]" />
            <span>Arquitetura de Segurança e Imutabilidade Legal</span>
          </div>
          <p className="leading-relaxed">
            1. <strong>Emissão sem bloqueio:</strong> Laudos finalizados e download de PDF real
            continuam plenamente funcionais mesmo com a assinatura desativada ou offline.
            <br />
            2. <strong>Ação explícita sobre hash imutável:</strong> A assinatura incide estritamente
            sobre o digest criptográfico SHA-256 do arquivo.
            <br />
            3. <strong>Proteção contra alteração posterior:</strong> Qualquer edição no laudo gera
            uma nova versão com novo hash e <strong>invalida imediatamente</strong> solicitações
            pendentes.
            <br />
            4. <strong>Chaves seguras:</strong> Nenhuma chave privada ou senha é armazenada no
            navegador (localStorage).
          </p>
        </div>

        {/* Configuration grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Provider Selector */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-[#1F2A27] block">
              Escolha do Provedor de Certificado
            </Label>
            <Select
              value={sigConfig.selectedProvider}
              onValueChange={handleProviderChange}
              disabled={!sigConfig.enabled}
            >
              <SelectTrigger className="text-xs bg-white">
                <SelectValue placeholder="Selecione o provedor" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_PROVIDERS.map((prov) => (
                  <SelectItem key={prov.id} value={prov.id} className="text-xs">
                    {prov.name} {prov.type === 'local_token' ? '(Futuro)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Provider details card */}
            <div className="p-3.5 bg-white rounded-lg border border-[#E5E9E7] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1F2A27]">{currentProvider.psc}</span>
                <Badge
                  variant="outline"
                  className={
                    currentProvider.requiresInternet
                      ? 'border-blue-200 text-blue-800 bg-blue-50 text-[10px]'
                      : 'border-emerald-200 text-emerald-800 bg-emerald-50 text-[10px]'
                  }
                >
                  {currentProvider.requiresInternet
                    ? 'PSC em Nuvem (Exige Internet)'
                    : 'Operação Local'}
                </Badge>
              </div>
              <p className="text-[#5F6E69] text-[11px] leading-relaxed">
                {currentProvider.description}
              </p>
              <p className="text-[10px] text-[#8A9691] pt-1">
                Nota técnica: {currentProvider.note}
              </p>
              <div className="pt-2">
                <a
                  href={currentProvider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#0C6B58] hover:underline font-semibold"
                >
                  Especificação oficial do provedor
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Module States Preview */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-[#1F2A27] block">
              Estados do Módulo (Rigorosos em Português)
            </Label>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg border border-[#E5E9E7] bg-white flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#1F2A27] block">Não configurado</span>
                  <span className="text-[11px] text-[#5F6E69]">
                    Padrão atual: canal/credencial não ativados no backend.
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="border-slate-300 text-slate-700 bg-slate-50 text-[10px]"
                >
                  Padrão
                </Badge>
              </div>

              <div className="p-2.5 rounded-lg border border-[#E5E9E7] bg-white flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#1F2A27] block">Requer internet</span>
                  <span className="text-[11px] text-[#5F6E69]">
                    Exibido quando o PSC em nuvem é acionado sem conexão pública.
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="border-amber-300 text-amber-800 bg-amber-50 text-[10px]"
                >
                  Sem Internet
                </Badge>
              </div>

              <div className="p-2.5 rounded-lg border border-[#E5E9E7] bg-white flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#1F2A27] block">Pendente</span>
                  <span className="text-[11px] text-[#5F6E69]">
                    Solicitação enviada, aguardando aprovação no app móvel.
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="border-blue-300 text-blue-800 bg-blue-50 text-[10px]"
                >
                  Aguardando
                </Badge>
              </div>

              <div className="p-2.5 rounded-lg border border-[#E5E9E7] bg-white flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#1F2A27] block">Falhou</span>
                  <span className="text-[11px] text-[#5F6E69]">
                    Rejeição no PSC, expiração de PKCE ou divergência de canal.
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="border-red-300 text-red-800 bg-red-50 text-[10px]"
                >
                  Erro
                </Badge>
              </div>

              <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-emerald-950 block">Assinado</span>
                  <span className="text-[11px] text-emerald-800">
                    Apenas com certificado qualificado ICP-Brasil válido.
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-300 text-emerald-800 bg-white text-[10px]"
                >
                  Validação ITI
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Validation rule notice */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block">Regra de integridade estrita:</span>
            <p className="text-amber-900/90 leading-relaxed">
              O sistema <strong>NÃO simula assinatura</strong> e{' '}
              <strong>NÃO trata imagens de rubrica como certificado digital</strong>. O estado
              "Assinado" só é computado após verificação criptográfica real de carimbo e envelope
              CMS/RAW da ICP-Brasil auditável em{' '}
              <a
                href="https://validar.iti.gov.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                validar.iti.gov.br
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO 1.5: BATERIA DE TESTES ARQUITETURAIS COM FIXTURES SINTÉTICAS (PARTE 3 DO REQUISITO) */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E9E7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[#1F2A27]">
                Validação com Fixtures Sintéticas (Auditoria de Regras)
              </h2>
              <p className="text-xs text-[#5F6E69]">
                Testes sem dados clínicos, sem certificados reais e sem contratação de provedor
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
            {runningTests ? 'Executando testes...' : 'Rodar Testes Sintéticos'}
          </Button>
        </div>

        <div className="p-3.5 bg-[#F7F9F8] rounded-xl border border-[#E5E9E7] text-xs text-[#5F6E69]">
          <span className="font-semibold text-[#1F2A27] block mb-1">
            Escopo verificado por execução de código no cliente:
          </span>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <strong>Regra 1:</strong> Assinatura desativada não bloqueia salvar/finalizar/exportar
              PDF;
            </li>
            <li>
              <strong>Regra 2:</strong> Estado offline bloqueia SOMENTE serviços cloud
              (assinatura/IA), mantendo editor, rascunhos, banco, PDF e impressão funcionais;
            </li>
            <li>
              <strong>Regra 3:</strong> Documento alterado invalida solicitação de assinatura
              anterior (nova hash ≠ hash solicitado).
            </li>
          </ul>
        </div>

        {testResults && (
          <div className="space-y-3 pt-2">
            <span className="font-bold text-xs text-[#1F2A27] block">
              Resultados da Execução em Tempo Real:
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
      </div>

      {/* SEÇÃO 2: SERVIÇOS DO SISTEMA — SEPARAÇÃO CLARA NUVEM × LOCAL (PARTE 2 DO REQUISITO) */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E9E7]">
          <div className="w-10 h-10 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#1F2A27]">
              Matriz de Serviços: Execução Local vs. Dependências Cloud
            </h2>
            <p className="text-xs text-[#5F6E69]">
              Identificação exata de componentes auto-hospedáveis e serviços externos opcionais
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#E5E9E7]">
          {systemServices.map((svc) => (
            <div
              key={svc.id}
              className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#1F2A27]">{svc.name}</span>
                  <Badge
                    variant="outline"
                    className={
                      svc.category === 'local_core'
                        ? 'border-emerald-200 text-emerald-800 bg-emerald-50 text-[10px]'
                        : 'border-slate-300 text-slate-700 bg-slate-50 text-[10px]'
                    }
                  >
                    {svc.category === 'local_core'
                      ? 'Núcleo Local (100% Autônomo)'
                      : 'Nuvem Opcional'}
                  </Badge>
                </div>
                <p className="text-[#5F6E69] leading-relaxed">{svc.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className={
                    svc.status === 'Ativo'
                      ? 'border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px]'
                      : svc.status === 'Requer internet'
                        ? 'border-amber-300 text-amber-800 bg-amber-50 text-[10px]'
                        : 'border-slate-300 text-slate-600 bg-slate-100 text-[10px]'
                  }
                >
                  {svc.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO 3: DICOM & EQUIPAMENTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: DICOM Imagens */}
        <div className="bg-white p-6 rounded-xl border border-[#E5E9E7] shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-[#0C6B58]" />
                <h2 className="font-bold text-base text-[#1F2A27]">DICOM Imagens (Store SCP)</h2>
              </div>
              <Badge
                variant="outline"
                className="text-amber-800 border-amber-300 bg-amber-50 text-[10px]"
              >
                Não configurado
              </Badge>
            </div>

            <p className="text-xs text-[#5F6E69] leading-relaxed">
              Capacidade de receber capturas diretamente do console de ultrassom via protocolo DICOM
              C-STORE.
            </p>

            <div className="p-3 bg-[#F7F9F8] rounded-lg border border-[#E5E9E7] text-xs space-y-1">
              <span className="font-semibold text-[#1F2A27] block">Capacidade Técnica:</span>
              <ul className="list-disc pl-4 text-[#5F6E69] space-y-1">
                <li>Recepção de fotogramas congelados do exame</li>
                <li>Conversão de frames para JPG/PNG de alta resolução</li>
                <li>Armazenamento seguro atrelado ao prontuário</li>
              </ul>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E9E7] text-[11px] text-[#8A9691]">
            Depende de nó receptor local (DICOM C-STORE SCP).
          </div>
        </div>

        {/* Card 2: DICOM SR */}
        <div className="bg-white p-6 rounded-xl border border-[#E5E9E7] shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#0C6B58]" />
                <h2 className="font-bold text-base text-[#1F2A27]">
                  DICOM SR (Structured Reporting)
                </h2>
              </div>
              <Badge
                variant="outline"
                className="text-amber-800 border-amber-300 bg-amber-50 text-[10px]"
              >
                Não configurado
              </Badge>
            </div>

            <p className="text-xs text-[#5F6E69] leading-relaxed">
              Permite extrair tabelas de biometria e medidas numéricas reais do console do aparelho.
            </p>

            <div className="p-3 bg-[#F7F9F8] rounded-lg border border-[#E5E9E7] text-xs space-y-1">
              <span className="font-semibold text-[#1F2A27] block">Capacidade Técnica:</span>
              <ul className="list-disc pl-4 text-[#5F6E69] space-y-1">
                <li>Importação automática de medidas numéricas reais</li>
                <li>Preenchimento de campos variáveis sem digitação manual</li>
                <li>Zero risco de inferência fictícia de diagnósticos</li>
              </ul>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E9E7] text-[11px] text-[#8A9691]">
            Exige suporte a DICOM SR licenciado no equipamento do fabricante.
          </div>
        </div>
      </div>
    </div>
  )
}
