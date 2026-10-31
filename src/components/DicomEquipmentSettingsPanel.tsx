import React, { useState, useEffect } from 'react'
import {
  Activity,
  Server,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  ArrowRightLeft,
  FileCheck,
  Eye,
  Inbox,
  Clock,
  Radio,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  dicomIntegrationService,
  type DicomDevice,
  type DicomReconciliationItem,
  type DicomTransferLog,
} from '@/services/dicomIntegration'

export function DicomEquipmentSettingsPanel() {
  const { toast } = useToast()
  const [devices, setDevices] = useState<DicomDevice[]>([])
  const [reconciliationQueue, setReconciliationQueue] = useState<DicomReconciliationItem[]>([])
  const [transferLogs, setTransferLogs] = useState<DicomTransferLog[]>([])
  const [editingDevice, setEditingDevice] = useState<DicomDevice | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [previewItem, setPreviewItem] = useState<DicomReconciliationItem | null>(null)

  // Form State
  const [formName, setFormName] = useState('')
  const [formModel, setFormModel] = useState('')
  const [formClinic, setFormClinic] = useState('Gastroimagem')
  const [formIp, setFormIp] = useState('192.168.1.120')
  const [formPort, setFormPort] = useState(104)
  const [formLocalAe, setFormLocalAe] = useState('LW_LAUDOS_SCP')
  const [formRemoteAe, setFormRemoteAe] = useState('SAEVO_US')
  const [formAuthIps, setFormAuthIps] = useState('192.168.1.120, 127.0.0.1')
  const [formCEcho, setFormCEcho] = useState(true)
  const [formCStore, setFormCStore] = useState(true)
  const [formCMwl, setFormCMwl] = useState(true)
  const [formNotes, setFormNotes] = useState('')

  const loadData = () => {
    setDevices(dicomIntegrationService.getDevices())
    setReconciliationQueue(dicomIntegrationService.getReconciliationQueue())
    setTransferLogs(dicomIntegrationService.getTransferLogs())
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenAdd = () => {
    setEditingDevice(null)
    setFormName('')
    setFormModel('')
    setFormClinic('Gastroimagem')
    setFormIp('192.168.1.120')
    setFormPort(104)
    setFormLocalAe('LW_LAUDOS_SCP')
    setFormRemoteAe('SAEVO_US')
    setFormAuthIps('192.168.1.120, 127.0.0.1')
    setFormCEcho(true)
    setFormCStore(true)
    setFormCMwl(true)
    setFormNotes('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (dev: DicomDevice) => {
    setEditingDevice(dev)
    setFormName(dev.name)
    setFormModel(dev.manufacturerModel)
    setFormClinic(dev.clinicLocation)
    setFormIp(dev.ipHostname)
    setFormPort(dev.port)
    setFormLocalAe(dev.localAeTitle)
    setFormRemoteAe(dev.remoteAeTitle)
    setFormAuthIps((dev.authorizedIps || []).join(', '))
    setFormCEcho(dev.capabilities.cEcho)
    setFormCStore(dev.capabilities.cStore)
    setFormCMwl(dev.capabilities.cFindMwl)
    setFormNotes(dev.notes || '')
    setIsModalOpen(true)
  }

  const handleSave = () => {
    if (!formName.trim() || !formIp.trim() || !formRemoteAe.trim()) {
      toast({
        title: 'Campos incompletos',
        description: 'Nome, IP/Hostname e AE Title Remoto são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    const payload = {
      name: formName.trim(),
      manufacturerModel: formModel.trim(),
      clinicLocation: formClinic.trim(),
      ipHostname: formIp.trim(),
      port: Number(formPort) || 104,
      localAeTitle: formLocalAe.trim().toUpperCase(),
      remoteAeTitle: formRemoteAe.trim().toUpperCase(),
      capabilities: {
        cEcho: formCEcho,
        cStore: formCStore,
        cFindMwl: formCMwl,
        dicomWeb: false,
      },
      authorizedIps: formAuthIps
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      status: (editingDevice?.status || 'unknown') as 'online' | 'offline' | 'unknown' | 'testing',
      notes: formNotes.trim(),
    }

    if (editingDevice) {
      dicomIntegrationService.updateDevice(editingDevice.id, payload)
      toast({ title: 'Equipamento atualizado', description: `${payload.name} salvo com sucesso.` })
    } else {
      dicomIntegrationService.addDevice(payload)
      toast({
        title: 'Equipamento cadastrado',
        description: `${payload.name} adicionado à rede DICOM.`,
      })
    }

    setIsModalOpen(false)
    loadData()
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remover o equipamento DICOM "${name}"?`)) {
      dicomIntegrationService.deleteDevice(id)
      loadData()
      toast({ title: 'Equipamento removido' })
    }
  }

  const handleTestEcho = async (dev: DicomDevice) => {
    setTestingId(dev.id)
    try {
      const res = await dicomIntegrationService.testCEcho(dev)
      if (res.success) {
        toast({
          title: 'C-ECHO Confirmado (Online)',
          description: res.message,
        })
      } else {
        toast({
          title: 'C-ECHO Não Respondeu',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na comunicação'
      toast({
        title: 'Erro de comunicação C-ECHO',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setTestingId(null)
      loadData()
    }
  }

  const handleDismissReconciliation = (id: string) => {
    const updated = reconciliationQueue.filter((q) => q.id !== id)
    dicomIntegrationService.saveReconciliationQueue(updated)
    setReconciliationQueue(updated)
    toast({ title: 'Item removido da fila de conciliação' })
  }

  return (
    <div className="space-y-6">
      {/* Banner explicativo com linguagem para leigos e orientações de firewall */}
      <div className="bg-[#E8F3F0]/60 border border-[#0C6B58]/30 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#0C6B58]" />
            <h3 className="text-sm font-bold text-[#1F2A27]">
              Infraestrutura DICOM 100% Offline (Storage SCP + Modality Worklist)
            </h3>
          </div>
          <p className="text-xs text-[#5F6E69] leading-relaxed">
            Permite que o aparelho de ultrassom envie imagens pelo protocolo{' '}
            <strong>C-STORE</strong> diretamente para o LW Laudos e consulte a lista de pacientes
            agendados via <strong>C-FIND MWL</strong> na rede local sem depender de internet.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleOpenAdd}
          className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs h-9 font-semibold gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Cadastrar Equipamento
        </Button>
      </div>

      {/* Alerta de Firewall / Permissões do Sistema */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold">
            Orientação de Rede e Firewall do Windows (Privilégios de Administrador):
          </p>
          <p className="text-amber-800 leading-normal">
            A porta padrão do protocolo DICOM é a <strong>104</strong> (ou <strong>4242</strong>).
            Se o aparelho não conseguir se comunicar no teste C-ECHO, permita a entrada da porta no{' '}
            <em>Firewall do Windows com Segurança Avançada</em> na rede privada da clínica. Nenhum
            conhecimento técnico avançado é exigido para a operação diária.
          </p>
        </div>
      </div>

      {/* Lista de Equipamentos Cadastrados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#1F2A27] uppercase tracking-wider flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-[#0C6B58]" />
            Aparelhos Autorizados ({devices.length})
          </h4>
          <span className="text-[11px] text-[#5F6E69]">Recepção restrita aos IPs autorizados</span>
        </div>

        {devices.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-white border border-[#E5E9E7] space-y-2">
            <Server className="w-8 h-8 text-[#8A9691] mx-auto stroke-1" />
            <p className="text-xs font-semibold text-[#1F2A27]">Nenhum equipamento cadastrado</p>
            <p className="text-[11px] text-[#5F6E69]">
              Clique em &quot;Cadastrar Equipamento&quot; para registrar seu aparelho de
              ultrassonografia.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {devices.map((dev) => (
              <div
                key={dev.id}
                className="bg-white rounded-xl border border-[#E5E9E7] p-4 flex flex-col justify-between space-y-3 shadow-xs hover:border-[#0C6B58]/40 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="text-sm font-bold text-[#1F2A27]">{dev.name}</h5>
                      <p className="text-xs text-[#5F6E69]">
                        {dev.manufacturerModel || 'Modelo não especificado'}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 ${
                        dev.status === 'online'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}
                    >
                      {dev.status === 'online' ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Não testado
                        </span>
                      )}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#E5E9E7]/60">
                    <div>
                      <span className="text-[#8A9691] block text-[10px]">Unidade Clínica:</span>
                      <strong className="text-[#1F2A27]">{dev.clinicLocation}</strong>
                    </div>
                    <div>
                      <span className="text-[#8A9691] block text-[10px]">Endereço de Rede:</span>
                      <strong className="text-[#1F2A27]">
                        {dev.ipHostname}:{dev.port}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#8A9691] block text-[10px]">
                        AE Title Local (App):
                      </span>
                      <strong className="text-[#0C6B58] font-mono">{dev.localAeTitle}</strong>
                    </div>
                    <div>
                      <span className="text-[#8A9691] block text-[10px]">
                        AE Title Remoto (Aparelho):
                      </span>
                      <strong className="text-[#1F2A27] font-mono">{dev.remoteAeTitle}</strong>
                    </div>
                  </div>

                  {/* Badges de recursos suportados */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {dev.capabilities.cEcho && (
                      <span className="text-[10px] bg-[#E8F3F0] text-[#0C6B58] px-1.5 py-0.5 rounded font-medium">
                        C-ECHO
                      </span>
                    )}
                    {dev.capabilities.cStore && (
                      <span className="text-[10px] bg-[#E8F3F0] text-[#0C6B58] px-1.5 py-0.5 rounded font-medium">
                        C-STORE (Recepção)
                      </span>
                    )}
                    {dev.capabilities.cFindMwl && (
                      <span className="text-[10px] bg-[#E8F3F0] text-[#0C6B58] px-1.5 py-0.5 rounded font-medium">
                        C-FIND MWL (Worklist)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E5E9E7]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={testingId === dev.id}
                    onClick={() => handleTestEcho(dev)}
                    className="h-7 text-xs border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] gap-1 font-semibold"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${testingId === dev.id ? 'animate-spin' : ''}`}
                    />
                    {testingId === dev.id ? 'Verificando...' : 'Testar C-ECHO'}
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(dev)}
                      className="h-7 w-7 text-[#5F6E69] hover:text-[#1F2A27]"
                      title="Editar configurações"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(dev.id, dev.name)}
                      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Excluir equipamento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fila de Conciliação Humana */}
      <div className="space-y-3 pt-4 border-t border-[#E5E9E7]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold text-[#1F2A27] uppercase tracking-wider">
              Fila de Conciliação Humana ({reconciliationQueue.length})
            </h4>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] text-amber-800 border-amber-300 bg-amber-50 font-semibold"
          >
            Proteção anti-associação incorreta ativa
          </Badge>
        </div>
        <p className="text-xs text-[#5F6E69]">
          Estudos recebidos sem correspondência estrita de <strong>Accession Number</strong> ou{' '}
          <strong>Patient ID</strong> aguardam confirmação humana obrigatória nesta fila para
          proteger o sigilo do paciente e impedir trocas.
        </p>

        {reconciliationQueue.length === 0 ? (
          <div className="p-4 rounded-xl bg-white border border-[#E5E9E7] text-xs text-[#5F6E69] flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Nenhum estudo pendente de conciliação. Todas as imagens recebidas foram
              correlacionadas com segurança estrita.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {reconciliationQueue.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-amber-200 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-black rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={item.previewUrl}
                      alt="Thumbnail"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1F2A27]">{item.fileName}</span>
                      <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">
                        {item.status === 'ambiguous' ? 'Estudo Ambíguo' : 'Não Identificado'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#5F6E69]">
                      Motivo: <strong className="text-amber-900">{item.matchReason}</strong> •{' '}
                      {item.framesCount} frame(s)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewItem(item)}
                    className="h-8 text-xs gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    Inspecionar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismissReconciliation(item.id)}
                    className="h-8 text-xs text-red-600 hover:bg-red-50"
                  >
                    Descartar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico Recente de Transferências DICOM */}
      <div className="space-y-2 pt-4 border-t border-[#E5E9E7]">
        <h4 className="text-xs font-bold text-[#1F2A27] uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[#0C6B58]" />
          Registro de Transferências e Diagnósticos ({transferLogs.length})
        </h4>

        {transferLogs.length === 0 ? (
          <p className="text-xs text-[#8A9691] italic">
            Nenhuma atividade registrada na sessão atual.
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-[#E5E9E7] divide-y divide-[#E5E9E7] max-h-56 overflow-y-auto font-mono text-[11px]">
            {transferLogs.slice(0, 15).map((log) => (
              <div key={log.id} className="p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      log.status === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.status === 'WARNING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="text-[#1F2A27] truncate">{log.details}</span>
                </div>
                <span className="text-[10px] text-[#8A9691] shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição de Equipamento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1F2A27]">
              {editingDevice ? 'Editar Equipamento DICOM' : 'Cadastrar Equipamento DICOM'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-medium">Nome do Equipamento *</Label>
              <Input
                placeholder="Ex.: Aparelho US Sala 1"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium">Fabricante / Modelo</Label>
                <Input
                  placeholder="Ex.: Mindray DC-70"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Unidade Clínica</Label>
                <Input
                  placeholder="Ex.: Gastroimagem"
                  value={formClinic}
                  onChange={(e) => setFormClinic(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium">IP / Hostname *</Label>
                <Input
                  placeholder="Ex.: 192.168.1.120"
                  value={formIp}
                  onChange={(e) => setFormIp(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Porta DICOM *</Label>
                <Input
                  type="number"
                  placeholder="104"
                  value={formPort}
                  onChange={(e) => setFormPort(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium">AE Title Local (LW Laudos)</Label>
                <Input
                  placeholder="LW_LAUDOS_SCP"
                  value={formLocalAe}
                  onChange={(e) => setFormLocalAe(e.target.value)}
                  className="h-8 text-xs mt-1 font-mono uppercase"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">AE Title Remoto (Aparelho) *</Label>
                <Input
                  placeholder="SAEVO_US"
                  value={formRemoteAe}
                  onChange={(e) => setFormRemoteAe(e.target.value)}
                  className="h-8 text-xs mt-1 font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">
                IPs Autorizados para Envio (separados por vírgula)
              </Label>
              <Input
                placeholder="192.168.1.120, 127.0.0.1"
                value={formAuthIps}
                onChange={(e) => setFormAuthIps(e.target.value)}
                className="h-8 text-xs mt-1"
              />
              <p className="text-[10px] text-[#8A9691] mt-0.5">
                Segurança clínica: envios de IPs desconhecidos são recusados.
              </p>
            </div>

            <div className="space-y-2 pt-1 border-t border-[#E5E9E7]">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Habilitar Teste C-ECHO</Label>
                <Switch checked={formCEcho} onCheckedChange={setFormCEcho} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Habilitar Recepção C-STORE</Label>
                <Switch checked={formCStore} onCheckedChange={setFormCStore} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Habilitar Modality Worklist (C-FIND)</Label>
                <Switch checked={formCMwl} onCheckedChange={setFormCMwl} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
            >
              Salvar Equipamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Inspeção da Fila de Conciliação */}
      <Dialog open={previewItem !== null} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1F2A27]">
              Detalhes do Estudo DICOM para Conciliação
            </DialogTitle>
          </DialogHeader>

          {previewItem && (
            <div className="space-y-3 py-2 text-xs">
              <div className="h-44 bg-black rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={previewItem.previewUrl}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="space-y-1 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                <p>
                  <strong>Arquivo:</strong> {previewItem.fileName}
                </p>
                <p>
                  <strong>Patient ID no DICOM:</strong> {previewItem.patientIdDicom || 'Nenhum'}
                </p>
                <p>
                  <strong>Nome no DICOM:</strong> {previewItem.patientNameDicom || 'Nenhum'}
                </p>
                <p>
                  <strong>Accession Number:</strong> {previewItem.accessionNumber || 'Nenhum'}
                </p>
                <p>
                  <strong>Estudo UID:</strong>{' '}
                  <span className="font-mono text-[10px] break-all">
                    {previewItem.studyInstanceUid || 'N/A'}
                  </span>
                </p>
              </div>

              <p className="text-[11px] text-[#5F6E69]">
                Para vincular com segurança, abra o laudo do paciente correspondente no editor e
                clique em <strong>Importar Arquivo DICOM</strong> selecionando este exame.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" size="sm" onClick={() => setPreviewItem(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
