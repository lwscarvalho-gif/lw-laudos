import { useState } from 'react'
import {
  FileSpreadsheet,
  HardDrive,
  Radio,
  Server,
  ShieldCheck,
  Wifi,
  WifiOff,
  ExternalLink,
  Lock,
  Database,
  Info,
  ArrowRight,
  Code,
  CheckCircle2,
} from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'geral' | 'worklist'>('geral')

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
        ? 'Estrutura ativada nas preferências. A emissão de laudos e exportação de PDF permanecem disponíveis.'
        : 'Assinatura digital desativada. Laudos e PDFs continuam sendo emitidos normalmente.',
    })
  }

  const handleProviderChange = (providerId: string) => {
    const updated = digitalSignatureService.saveConfig({
      selectedProvider: providerId as DigitalSignatureProviderId,
    })
    setSigConfig(updated)
    toast({
      title: 'Provedor selecionado',
      description: `Adaptador ajustado para ${updated.selectedProvider.toUpperCase()}. Nenhuma credencial é armazenada no navegador.`,
    })
  }

  const systemServices = getSystemServicesList(isOnline, sigConfig.enabled)

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant="secondary"
            className="bg-[#E8F3F0] text-[#0C6B58] text-xs font-semibold px-2.5 py-0.5"
          >
            LW Laudos • Integrações e Infraestrutura
          </Badge>
          <span className="text-xs text-[#5F6E69]">• Preparação de Serviços e Conectividade</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1F2A27]">
          Integrações, Assinatura Digital e DICOM
        </h1>
        <p className="text-sm text-[#5F6E69] mt-0.5">
          Estado dos serviços em nuvem, preparação para futura instalação local e conectividade
          hospitalar
        </p>
      </div>

      {/* Network & Environment Notice */}
      <div className="p-4 rounded-xl bg-white border border-[#E5E9E7] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#1F2A27]">
                Ambiente atual: Nuvem / Preparação para instalação local
              </span>
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
              Neste ambiente de nuvem, a aplicação opera conectada ao backend remoto. A arquitetura
              foi preparada para futura execução local (banco, autenticação, storage, compilação de
              PDF real e impressão física). A implantação e homologação em servidor local físico da
              clínica está com status <strong>Instalação local pendente</strong>.
            </p>
          </div>
        </div>

        <div className="text-[11px] text-[#8A9691] shrink-0 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0">
          <span className="block font-semibold text-[#1F2A27]">Ambiente Cloud</span>
          <span>Deploy de prévia</span>
        </div>
      </div>

      {/* Tabs Selector: Geral & Assinatura vs Worklist DICOM */}
      <div className="flex border-b border-[#E5E9E7] gap-4">
        <button
          onClick={() => setActiveTab('geral')}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'geral'
              ? 'border-[#0C6B58] text-[#0C6B58]'
              : 'border-transparent text-[#5F6E69] hover:text-[#1F2A27]'
          }`}
        >
          <Server className="w-4 h-4" />
          Serviços, Assinatura & Implantação
        </button>
        <button
          onClick={() => setActiveTab('worklist')}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'worklist'
              ? 'border-[#0C6B58] text-[#0C6B58]'
              : 'border-transparent text-[#5F6E69] hover:text-[#1F2A27]'
          }`}
        >
          <Radio className="w-4 h-4" />
          Worklist DICOM (MWL) & Orthanc
          <Badge
            variant="outline"
            className="border-amber-300 text-amber-800 bg-amber-50 text-[10px] ml-1"
          >
            Ponte local pendente
          </Badge>
        </button>
      </div>

      {activeTab === 'worklist' ? (
        /* ABA WORKLIST DICOM */
        <div className="space-y-6">
          {/* Factual status alert */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Status Honesto da Conexão MWL: Não configurado — ponte local pendente</span>
            </div>
            <p className="leading-relaxed">
              Servidores em nuvem não expõem portas TCP locais (ex.: porta 104 ou 4242) na intranet
              das clínicas e não respondem C-FIND diretamente aos aparelhos de imagem. Por decisão
              técnica de arquitetura, a worklist é servida por uma instância local do{' '}
              <strong>Orthanc</strong> instalada na rede de cada clínica, abastecida por um agente
              sincronizador local (script Python incluído no repositório em{' '}
              <code>tools/mwl_bridge/bridge.py</code>) que consulta periodicamente a nuvem. Nenhuma
              alegação de compatibilidade física validada com fabricantes é simulada aqui.
            </p>
          </div>

          {/* Diagrama da Arquitetura Real */}
          <div className="bg-white p-6 rounded-xl border border-[#E5E9E7] shadow-sm space-y-4">
            <h2 className="font-bold text-base text-[#1F2A27] flex items-center gap-2">
              <Radio className="w-5 h-5 text-[#0C6B58]" />
              Fluxo da Arquitetura Real: Nuvem → Ponte Local → Orthanc → Aparelho
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-4 rounded-xl bg-[#F7F9F8] border border-[#E5E9E7] space-y-2">
                <span className="font-bold text-[#0C6B58] block uppercase text-[10px] tracking-wider">
                  Etapa 1 • Nuvem
                </span>
                <span className="font-bold text-[#1F2A27] block">Sistema LW Laudos</span>
                <p className="text-[#5F6E69] text-[11px] leading-relaxed">
                  Médico agenda a consulta na /agenda. O sistema gera automaticamente o
                  AccessionNumber único e os campos estruturados DICOM (PatientName, ID, Nascimento,
                  Sexo, Procedimento).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F7F9F8] border border-[#E5E9E7] space-y-2">
                <span className="font-bold text-[#0C6B58] block uppercase text-[10px] tracking-wider">
                  Etapa 2 • Rede Local
                </span>
                <span className="font-bold text-[#1F2A27] block">Agente da Ponte</span>
                <p className="text-[#5F6E69] text-[11px] leading-relaxed">
                  Script leve (<code>bridge.py</code>) em execução contínua no computador da clínica
                  consulta o endpoint <code>/backend/v1/mwl/appointments</code> autenticado pelo
                  token do médico.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F7F9F8] border border-[#E5E9E7] space-y-2">
                <span className="font-bold text-[#0C6B58] block uppercase text-[10px] tracking-wider">
                  Etapa 3 • Servidor Local
                </span>
                <span className="font-bold text-[#1F2A27] block">Orthanc + Plugin MWL</span>
                <p className="text-[#5F6E69] text-[11px] leading-relaxed">
                  O Orthanc roda na rede local da clínica (porta TCP 104 / 4242). O agente grava os
                  arquivos <code>.dump</code> / <code>.wl</code> na pasta vigiada pelo plugin
                  Worklists do Orthanc.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F7F9F8] border border-[#E5E9E7] space-y-2">
                <span className="font-bold text-[#0C6B58] block uppercase text-[10px] tracking-wider">
                  Etapa 4 • Console
                </span>
                <span className="font-bold text-[#1F2A27] block">Aparelho de Ultrassom</span>
                <p className="text-[#5F6E69] text-[11px] leading-relaxed">
                  GE, Philips, Mindray, Samsung ou SonoSite dispara C-FIND SCP no IP local do
                  Orthanc. Os dados do paciente surgem na tela do aparelho sem digitação manual.
                </p>
              </div>
            </div>
          </div>

          {/* Configuração em Duas Clínicas */}
          <div className="bg-white p-6 rounded-xl border border-[#E5E9E7] shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-[#1F2A27]">
              Operação em Duas Unidades (HM Samuel Marques dos Santos e Gastroimagem)
            </h3>
            <p className="text-xs text-[#5F6E69] leading-relaxed">
              Como nenhuma das duas clínicas possui servidor MWL aberto para os agendamentos do
              médico, cada unidade recebe a sua própria instalação local do Orthanc. Ambas apontam
              para o mesmo aplicativo em nuvem, filtrando exclusivamente a unidade correspondente
              via parâmetro <code>?clinic=HM Samuel Marques dos Santos</code> ou{' '}
              <code>?clinic=Gastroimagem</code>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-3.5 rounded-lg border border-[#E5E9E7] bg-[#F7F9F8] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1F2A27]">
                    Unidade 1: HM Samuel Marques dos Santos
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Orthanc Local A
                  </Badge>
                </div>
                <p className="text-[#5F6E69] text-[11px]">
                  Filtro do agente: <code>--clinic &quot;HM Samuel Marques dos Santos&quot;</code>.
                  Os agendamentos com CPF e SUS desta unidade são transmitidos apenas aos aparelhos
                  do Hospital Municipal.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-[#E5E9E7] bg-[#F7F9F8] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1F2A27]">Unidade 2: Gastroimagem</span>
                  <Badge variant="outline" className="text-[10px]">
                    Orthanc Local B
                  </Badge>
                </div>
                <p className="text-[#5F6E69] text-[11px]">
                  Filtro do agente: <code>--clinic &quot;Gastroimagem&quot;</code>. Permite manter a
                  agenda unificada do médico na nuvem sem misturar pacientes entre os aparelhos
                  físicos.
                </p>
              </div>
            </div>
          </div>

          {/* Endpoint de Integração & Documentação */}
          <div className="bg-white p-6 rounded-xl border border-[#E5E9E7] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#1F2A27]">
                  Especificação Técnica do Endpoint e Guia de Instalação
                </h3>
                <p className="text-xs text-[#5F6E69] mt-0.5">
                  Detalhes para implementação e homologação pelo suporte de TI da clínica
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#F7F9F8] rounded-lg border border-[#E5E9E7] space-y-2 text-xs font-mono">
              <div className="text-[#0C6B58] font-bold">GET /backend/v1/mwl/appointments</div>
              <div className="text-[#5F6E69] space-y-1 text-[11px]">
                <div>
                  Cabeçalho: <code>Authorization: Bearer &lt;seu_token_mwl&gt;</code>
                </div>
                <div>
                  Parâmetros opcionais:{' '}
                  <code>?clinic=Gastroimagem&since=2025-01-01T00:00:00Z&status=Agendado</code>
                </div>
                <div>
                  Retorno: Array com tags DICOM (0010,0010), (0010,0020), (0008,0050),
                  (0040,0100)...
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href="/docs/GUIA_WORKLIST_ORTHANC.md"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0C6B58] hover:underline"
              >
                <Code className="w-3.5 h-3.5" />
                Abrir Guia Completo Orthanc (docs/GUIA_WORKLIST_ORTHANC.md)
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* ABA GERAL: ASSINATURA, SERVIÇOS E DICOM IMAGENS */
        <div className="space-y-8">
          {/* SEÇÃO 1: MÓDULO DE ASSINATURA DIGITAL (ESTRUTURA PREPARADA / NÃO CONFIGURADO) */}
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E9E7]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-[#1F2A27]">
                      Assinatura Digital (Estrutura Preparada)
                    </h2>
                    <Badge
                      variant="outline"
                      className="border-amber-300 text-amber-800 bg-amber-50 text-[10px]"
                    >
                      Não configurado
                    </Badge>
                  </div>
                  <p className="text-xs text-[#5F6E69]">
                    Módulo estrutural para integração com provedores de certificados digitais. Sem
                    integração criptográfica homologada ativa.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <Label
                  htmlFor="sig-toggle"
                  className="text-xs font-semibold text-[#1F2A27] cursor-pointer"
                >
                  Habilitar Módulo nas Preferências
                </Label>
                <Switch
                  id="sig-toggle"
                  checked={sigConfig.enabled}
                  onCheckedChange={handleToggleSignature}
                />
              </div>
            </div>

            {/* Factual security notice */}
            <div className="p-4 rounded-xl bg-[#F7F9F8] border border-[#E5E9E7] text-xs text-[#5F6E69] space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[#1F2A27]">
                <Lock className="w-4 h-4 text-[#0C6B58]" />
                <span>Estrutura de Segurança e Hashing Técnico</span>
              </div>
              <p className="leading-relaxed">
                1. <strong>Emissão sem bloqueio:</strong> Laudos finalizados e download de PDF real
                funcionam normalmente sem necessidade de assinatura digital configurada.
                <br />
                2. <strong>Cálculo técnico de hash:</strong> O sistema está preparado para operar
                sobre uma versão imutável do PDF e seu digest SHA-256 gerado no cliente.
                <br />
                3. <strong>Detecção técnica de alteração:</strong> Caso o conteúdo do laudo seja
                modificado, um novo hash SHA-256 é calculado automaticamente, invalidando qualquer
                hash registrado anteriormente.
                <br />
                4. <strong>Gestão de chaves:</strong> Nenhuma chave privada ou certificado é
                armazenado no navegador. A integração final dependerá da configuração de canal
                seguro no backend ou agente local.
              </p>
            </div>

            {/* Configuration grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Provider Selector */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-[#1F2A27] block">
                  Provedores Mapeados para Integração Futura
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
                        {prov.name} {prov.type === 'local_token' ? '(Local)' : ''}
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
                      className="border-slate-300 text-slate-700 bg-slate-50 text-[10px]"
                    >
                      {currentProvider.requiresInternet
                        ? 'Provedor Remoto (Requer Conexão)'
                        : 'Padrão Local'}
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
                      Documentação técnica de referência
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Module States Preview */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-[#1F2A27] block">
                  Estados do Módulo de Assinatura
                </Label>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-[#E5E9E7] bg-white flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#1F2A27] block">Não configurado</span>
                      <span className="text-[11px] text-[#5F6E69]">
                        Estado padrão: credenciais e canal seguro não configurados no servidor.
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-amber-300 text-amber-800 bg-amber-50 text-[10px]"
                    >
                      Padrão atual
                    </Badge>
                  </div>

                  <div className="p-2.5 rounded-lg border border-[#E5E9E7] bg-white flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#1F2A27] block">Requer internet</span>
                      <span className="text-[11px] text-[#5F6E69]">
                        Aplicável caso um provedor remoto seja acionado sem conectividade de rede
                        ativa.
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-slate-300 text-slate-700 bg-slate-50 text-[10px]"
                    >
                      Sem Rede
                    </Badge>
                  </div>

                  <div className="p-2.5 rounded-lg border border-[#E5E9E7] bg-white flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#1F2A27] block">Pendente</span>
                      <span className="text-[11px] text-[#5F6E69]">
                        Solicitação enviada ao provedor, aguardando resposta no canal de
                        autenticação.
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
                        Rejeição do canal, tempo limite esgotado ou erro de comunicação.
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-red-300 text-red-800 bg-red-50 text-[10px]"
                    >
                      Erro
                    </Badge>
                  </div>

                  <div className="p-2.5 rounded-lg border border-[#E5E9E7] bg-white flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#1F2A27] block">Assinado</span>
                      <span className="text-[11px] text-[#5F6E69]">
                        Exige validação criptográfica real via canal configurado.
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-slate-300 text-slate-700 bg-slate-50 text-[10px]"
                    >
                      Pós-validação
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Factual status notice */}
            <div className="p-3.5 bg-[#F7F9F8] border border-[#E5E9E7] rounded-xl flex items-start gap-2.5 text-xs text-[#5F6E69]">
              <Info className="w-4 h-4 text-[#0C6B58] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-[#1F2A27] block">
                  Situação atual da integração:
                </span>
                <p className="leading-relaxed">
                  O sistema não possui canal de assinatura criptográfica homologado ativo neste
                  momento e apresenta o status <strong>Não configurado</strong> por padrão. Imagens
                  de rubrica visual não são tratadas como certificados digitais.
                </p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: SERVIÇOS DO SISTEMA — STATUS REAL NO AMBIENTE ATUAL */}
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#E5E9E7]">
              <div className="w-10 h-10 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-[#1F2A27]">
                  Matriz de Serviços e Status de Implantação
                </h2>
                <p className="text-xs text-[#5F6E69]">
                  Situação dos módulos no ambiente atual e preparação para instalação local
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
                            ? 'border-[#C8DFD7] text-[#0C6B58] bg-[#E8F3F0] text-[10px]'
                            : 'border-slate-300 text-slate-700 bg-slate-50 text-[10px]'
                        }
                      >
                        {svc.category === 'local_core'
                          ? 'Portável para Local'
                          : 'Serviço Remoto Opcional'}
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
                          : svc.status === 'Instalação local pendente'
                            ? 'border-amber-300 text-amber-800 bg-amber-50 text-[10px]'
                            : svc.status === 'Não configurado'
                              ? 'border-amber-300 text-amber-800 bg-amber-50 text-[10px]'
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

          {/* SEÇÃO 3: DICOM & EQUIPAMENTOS (MANTIDOS NÃO CONECTADOS / NÃO CONFIGURADOS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: DICOM Imagens & PACS Orthanc */}
            <div className="bg-white p-6 rounded-xl border border-[#E5E9E7] shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-[#0C6B58]" />
                    <h2 className="font-bold text-base text-[#1F2A27]">
                      PACS Orthanc & DICOM Local (.dcm)
                    </h2>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[#0C6B58] border-[#0C6B58]/30 bg-[#E8F3F0] text-[10px]"
                  >
                    Ativo no Editor
                  </Badge>
                </div>

                <p className="text-xs text-[#5F6E69] leading-relaxed">
                  Ingestão direta de arquivos DICOM (.dcm) pelo navegador com extração de frames
                  reais e integração com servidor PACS Orthanc local ou nuvem via API segura.
                </p>

                <div className="p-3 bg-[#F7F9F8] rounded-lg border border-[#E5E9E7] text-xs space-y-1">
                  <span className="font-semibold text-[#1F2A27] block">
                    Recursos Implementados:
                  </span>
                  <ul className="list-disc pl-4 text-[#5F6E69] space-y-1">
                    <li>
                      Upload direto de arquivos DICOM (.dcm/.dicom) com extração de multi-frames
                    </li>
                    <li>Busca de estudos no Orthanc por Paciente, CPF, Data ou Accession Number</li>
                    <li>Importação com 1 clique direto para o anexo fotográfico do laudo</li>
                    <li>Omissão automática da nota ilustrativa para frames DICOM reais no PDF</li>
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E9E7] text-[11px] text-[#0C6B58] font-medium flex items-center justify-between">
                <span>Disponível no editor (/laudos/ultrassom)</span>
                <span className="font-mono text-[10px] text-[#5F6E69]">
                  Padrão: http://localhost:8042
                </span>
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
                  Estrutura preparada para receber biometria e medidas numéricas diretamente do
                  aparelho de ultrassom.
                </p>

                <div className="p-3 bg-[#F7F9F8] rounded-lg border border-[#E5E9E7] text-xs space-y-1">
                  <span className="font-semibold text-[#1F2A27] block">
                    Capacidade Técnica Mapeada:
                  </span>
                  <ul className="list-disc pl-4 text-[#5F6E69] space-y-1">
                    <li>Importação de medições biométricas registradas no console</li>
                    <li>Preenchimento estruturado de campos numéricos</li>
                    <li>Operação baseada em dados explícitos do equipamento</li>
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E9E7] text-[11px] text-[#8A9691]">
                Não conectado neste ambiente. Exige licença DICOM SR ativa no aparelho da clínica.
              </div>
            </div>
            {/* fim card SR */}
          </div>
          {/* fim grid DICOM */}
        </div> /* fim activeTab === geral */
      )}
    </div>
  )
}
