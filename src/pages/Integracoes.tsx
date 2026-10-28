import React from 'react'
import {
  Network,
  Radio,
  FileSpreadsheet,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Info,
  Server,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Integracoes() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant="secondary"
            className="bg-[#E8F3F0] text-[#0C6B58] text-xs font-semibold px-2.5 py-0.5"
          >
            LW Laudos • Conectividade
          </Badge>
          <span className="text-xs text-[#5F6E69]">• Núcleo Cloud Independente</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1F2A27]">Integrações de Equipamentos e DICOM</h1>
        <p className="text-sm text-[#5F6E69] mt-0.5">
          Arquitetura para ponte local com equipamentos de ultrassonografia e importação de exames
        </p>
      </div>

      {/* Cloud Independence Notice */}
      <div className="p-4 rounded-xl bg-white border border-[#E5E9E7] shadow-sm flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center shrink-0">
          <Server className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <span className="font-bold text-sm text-[#1F2A27] block">
            Operação Cloud 100% Autônoma
          </span>
          <p className="text-[#5F6E69] leading-relaxed">
            O Sistema Médico funciona de forma plenamente autônoma na nuvem. A elaboração de laudos,
            o banco de frases, os modelos e o anexo de imagens operam sem dependência de conexão com
            redes locais hospitalares.
          </p>
        </div>
      </div>

      {/* Detailed Technical Explanation: DICOM Images vs DICOM SR */}
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
              Trata-se da capacidade de receber arquivos de imagem bruta ou multiframe diretamente
              do equipamento de ultrassom via protocolo DICOM C-STORE (porta 104 ou 11112).
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

        {/* Card 2: DICOM SR (Medidas e Relatórios Estruturados) */}
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
              Capacidade <strong>distinta das imagens</strong>. Permite extrair tabelas de
              biometria, calipers e medidas calculadas feitas no próprio console do aparelho (ex.:
              diâmetro do fígado, espessura cortical renal, volume de vesícula).
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

      {/* Equipment Compatibility Roadmap & Saevo FT412 */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E9E7]">
          <div className="w-9 h-9 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#1F2A27]">
              Ponte Local Hospitalar e Fabricantes Homologáveis
            </h2>
            <p className="text-xs text-[#5F6E69]">
              Arquitetura de conexão com consoles de ultrassom via agente leve local
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-[#5F6E69] leading-relaxed">
          <p>
            Para interligação com equipamentos como <strong>Saevo FT412</strong>, GE Logiq /
            Voluson, Mindray DC, Samsung Medison e Philips Affiniti, será disponibilizado um serviço
            de ponte leve instalável no computador da clínica (PACS Bridge).
          </p>

          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>Transparência de Compatibilidade Técnica</span>
            </div>
            <p className="text-amber-900/90 text-xs leading-relaxed">
              O sistema <strong>não promete compatibilidade universal pré-validada</strong> sem os
              testes de conformidade DICOM Conformance Statement específicos de cada versão de
              firmware do fabricante. No momento, o status de integração direta por rede é{' '}
              <strong>"Não configurado"</strong>. Nenhuma conexão simulada foi injetada.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3 rounded-lg border border-[#E5E9E7] bg-[#F7F9F8]">
              <span className="font-bold text-[#1F2A27] block mb-1">Saevo (FT412 e linha)</span>
              <span className="text-[11px] text-[#5F6E69]">
                Configuração pendente de IP local e AE Title do equipamento.
              </span>
            </div>

            <div className="p-3 rounded-lg border border-[#E5E9E7] bg-[#F7F9F8]">
              <span className="font-bold text-[#1F2A27] block mb-1">GE Healthcare</span>
              <span className="text-[11px] text-[#5F6E69]">
                Aguardando credenciais DICOM Store SCP da rede interna.
              </span>
            </div>

            <div className="p-3 rounded-lg border border-[#E5E9E7] bg-[#F7F9F8]">
              <span className="font-bold text-[#1F2A27] block mb-1">Mindray / Samsung</span>
              <span className="text-[11px] text-[#5F6E69]">
                Ponte DICOM SR planejada para sincronização biométrica.
              </span>
            </div>
          </div>
        </div>

        {/* Current Workflow Alternative */}
        <div className="p-4 rounded-xl bg-[#E8F3F0] border border-[#CDE3DC] flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="font-bold text-xs text-[#0C6B58] block">
              Como anexar imagens hoje:
            </span>
            <span className="text-xs text-[#33413B]">
              Exporte capturas JPG/PNG no pendrive ou rede local do equipamento e faça o upload
              direto na galeria do laudo.
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => window.history.back()}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs shrink-0"
          >
            Voltar ao Editor
          </Button>
        </div>
      </div>
    </div>
  )
}
