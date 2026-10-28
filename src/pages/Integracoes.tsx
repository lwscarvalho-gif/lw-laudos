import { useState } from 'react'
import {
  FileSpreadsheet,
  HardDrive,
  Server,
  ShieldCheck,
  Wifi,
  WifiOff,
  ExternalLink,
  Lock,
  Database,
  Info,
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
            2. <strong>Cálculo técnico de hash:</strong> O sistema está preparado para operar sobre
            uma versão imutável do PDF e seu digest SHA-256 gerado no cliente.
            <br />
            3. <strong>Detecção técnica de alteração:</strong> Caso o conteúdo do laudo seja
            modificado, um novo hash SHA-256 é calculado automaticamente, invalidando qualquer hash
            registrado anteriormente.
            <br />
            4. <strong>Gestão de chaves:</strong> Nenhuma chave privada ou certificado é armazenado
            no navegador. A integração final dependerá da configuração de canal seguro no backend ou
            agente local.
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
                    Aplicável caso um provedor remoto seja acionado sem conectividade de rede ativa.
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
                    Solicitação enviada ao provedor, aguardando resposta no canal de autenticação.
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
            <span className="font-bold text-[#1F2A27] block">Situação atual da integração:</span>
            <p className="leading-relaxed">
              O sistema não possui canal de assinatura criptográfica homologado ativo neste momento
              e apresenta o status <strong>Não configurado</strong> por padrão. Imagens de rubrica
              visual não são tratadas como certificados digitais.
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
              Estrutura preparada para receber capturas diretamente do console de ultrassom via
              protocolo DICOM C-STORE.
            </p>

            <div className="p-3 bg-[#F7F9F8] rounded-lg border border-[#E5E9E7] text-xs space-y-1">
              <span className="font-semibold text-[#1F2A27] block">
                Capacidade Técnica Mapeada:
              </span>
              <ul className="list-disc pl-4 text-[#5F6E69] space-y-1">
                <li>Recepção de fotogramas congelados do exame</li>
                <li>Conversão de frames para JPG/PNG de alta resolução</li>
                <li>Armazenamento de imagens atrelado ao laudo</li>
              </ul>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E9E7] text-[11px] text-[#8A9691]">
            Não conectado neste ambiente. Depende de receptor configurado na rede local.
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
              Estrutura preparada para receber biometria e medidas numéricas diretamente do aparelho
              de ultrassom.
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
      </div>
    </div>
  )
}
