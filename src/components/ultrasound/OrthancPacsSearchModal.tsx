import { useState } from 'react'
import {
  Search,
  Server,
  FolderOpen,
  Download,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { orthancPacsService, OrthancStudy } from '@/services/orthancPacs'

interface OrthancPacsSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportFrames: (blobs: { blob: Blob; fileName: string; caption: string }[]) => Promise<void>
  defaultPatientName?: string
  defaultPatientId?: string
}

export function OrthancPacsSearchModal({
  open,
  onOpenChange,
  onImportFrames,
  defaultPatientName = '',
  defaultPatientId = '',
}: OrthancPacsSearchModalProps) {
  const { toast } = useToast()
  const [config, setConfig] = useState(() => orthancPacsService.getLocalConfig())
  const [patientName, setPatientName] = useState(defaultPatientName)
  const [patientId, setPatientId] = useState(defaultPatientId)
  const [accessionNumber, setAccessionNumber] = useState('')
  const [studyDate, setStudyDate] = useState('')

  const [loading, setLoading] = useState(false)
  const [studies, setStudies] = useState<OrthancStudy[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('')

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setHasSearched(true)
    setSelectedStudyId(null)

    try {
      const results = await orthancPacsService.searchStudies({
        patientName: patientName.trim() || undefined,
        patientId: patientId.trim() || undefined,
        accessionNumber: accessionNumber.trim() || undefined,
        studyDate: studyDate.trim() || undefined,
        serverUrl: config.serverUrl,
      })

      setStudies(results)
      if (results.length === 0) {
        toast({
          title: 'Nenhum estudo encontrado',
          description: 'Nenhum registro retornado pelo Orthanc com os filtros informados.',
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na comunicação'
      toast({
        title: 'Erro ao consultar Orthanc',
        description: `${msg}. Verifique se o Orthanc está iniciado (1-iniciar-orthanc.bat) ou configure o endereço correto.`,
        variant: 'destructive',
      })
      setStudies([])
    } finally {
      setLoading(false)
    }
  }

  const handleImportStudy = async (study: OrthancStudy) => {
    setImporting(true)
    setImportProgress('Consultando instâncias e séries do exame...')

    try {
      // 1. Obtém as instâncias do estudo selecionado
      const instancesRes = await orthancPacsService.getStudyInstances(study.id, config.serverUrl)
      const list = instancesRes.instances || []

      if (list.length === 0) {
        toast({
          title: 'Estudo sem imagens',
          description: 'Este estudo não contém instâncias DICOM válidas para importação.',
          variant: 'destructive',
        })
        setImporting(false)
        return
      }

      setImportProgress(`Baixando e decodificando ${list.length} imagem(ns) do exame...`)
      const importedBlobs: { blob: Blob; fileName: string; caption: string }[] = []

      for (let i = 0; i < list.length; i++) {
        const item = list[i]
        setImportProgress(`Importando frame ${i + 1} de ${list.length}...`)
        try {
          const blob = await orthancPacsService.fetchInstanceBlob(
            item.instanceId,
            0,
            config.serverUrl,
          )
          const desc = item.seriesDescription || study.studyDescription || 'Registro ecográfico'
          importedBlobs.push({
            blob,
            fileName: `pacs_frame_${i + 1}_${item.instanceId.slice(0, 8)}.jpg`,
            caption: `PACS Orthanc: ${desc} (Frame ${i + 1})`,
          })
        } catch (fetchErr) {
          console.warn('Falha ao baixar instância individual:', fetchErr)
        }
      }

      if (importedBlobs.length === 0) {
        throw new Error('Não foi possível baixar nenhum dos frames do exame selecionado.')
      }

      setImportProgress(`Vinculando ${importedBlobs.length} frame(s) ao laudo...`)
      await onImportFrames(importedBlobs)

      toast({
        title: 'Importação concluída',
        description: `${importedBlobs.length} frame(s) do exame de ${study.patientName} importado(s) com sucesso.`,
      })

      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro na importação'
      toast({
        title: 'Falha ao importar imagens',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
      setImportProgress('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-[#E8F3F0] text-[#0C6B58] text-[10px]">
              PACS Orthanc
            </Badge>
            <span className="text-xs text-[#5F6E69]">Ponte DICOM Local / Nuvem</span>
          </div>
          <DialogTitle className="text-lg font-bold text-[#1F2A27] flex items-center gap-2">
            <Server className="w-5 h-5 text-[#0C6B58]" />
            Importar Imagens do PACS (Orthanc)
          </DialogTitle>
          <DialogDescription className="text-xs text-[#5F6E69]">
            Localize os exames armazenados no servidor DICOM Orthanc e importe os frames capturados
            diretamente para a documentação fotográfica deste laudo.
          </DialogDescription>
        </DialogHeader>

        {/* Server & Search Controls */}
        <div className="space-y-4 pt-2">
          {/* Server URL inline control */}
          <div className="p-3 bg-[#F7F9F8] rounded-lg border border-[#E5E9E7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#0C6B58] shrink-0" />
              <span className="font-semibold text-[#1F2A27]">Endereço Orthanc:</span>
              <Input
                value={config.serverUrl}
                onChange={(e) => {
                  const updated = { ...config, serverUrl: e.target.value }
                  setConfig(updated)
                  orthancPacsService.saveLocalConfig(updated)
                }}
                className="h-7 text-xs w-64 bg-white"
                placeholder="http://localhost:8042"
              />
            </div>
            <span className="text-[11px] text-[#5F6E69]">
              Padrão: <code>http://localhost:8042</code>
            </span>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-semibold text-[#1F2A27]">Nome do Paciente:</Label>
              <Input
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Ex.: CARLOS EDUARDO"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#1F2A27]">Accession Number:</Label>
              <Input
                value={accessionNumber}
                onChange={(e) => setAccessionNumber(e.target.value)}
                placeholder="Ex.: LW-20261028"
                className="h-8 text-xs"
              />
            </div>

            <div className="flex items-end">
              <Button
                type="submit"
                disabled={loading || importing}
                className="h-8 w-full bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs gap-1.5"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                Buscar no PACS
              </Button>
            </div>
          </form>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto mt-4 border border-[#E5E9E7] rounded-xl bg-white p-3 space-y-3 min-h-[220px]">
          {loading && (
            <div className="h-44 flex flex-col items-center justify-center gap-2 text-xs text-[#0C6B58]">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Consultando banco de estudos do Orthanc...</span>
            </div>
          )}

          {importing && (
            <div className="h-44 flex flex-col items-center justify-center gap-2 text-xs text-[#0C6B58] bg-[#E8F3F0]/40 rounded-lg p-4">
              <Loader2 className="w-7 h-7 animate-spin" />
              <span className="font-bold text-sm text-[#1F2A27]">Importando do Orthanc</span>
              <span className="text-[#5F6E69] text-center">{importProgress}</span>
            </div>
          )}

          {!loading && !importing && hasSearched && studies.length === 0 && (
            <div className="h-44 flex flex-col items-center justify-center gap-2 text-center text-xs text-[#5F6E69]">
              <AlertCircle className="w-7 h-7 text-amber-500" />
              <span className="font-bold text-[#1F2A27]">Nenhum estudo localizado</span>
              <p className="max-w-md text-[11px]">
                Certifique-se de que o Orthanc local está em execução (porta 8042) e que as imagens
                foram enviadas do aparelho Saevo ou importadas para o PACS.
              </p>
            </div>
          )}

          {!loading && !importing && !hasSearched && (
            <div className="h-44 flex flex-col items-center justify-center gap-2 text-center text-xs text-[#8A9691]">
              <FolderOpen className="w-8 h-8 stroke-1 text-[#8A9691]" />
              <span>
                Digite o nome do paciente ou Accession Number acima e clique em &quot;Buscar no
                PACS&quot;.
              </span>
            </div>
          )}

          {!loading && !importing && studies.length > 0 && (
            <div className="divide-y divide-[#E5E9E7]">
              {studies.map((study) => (
                <div
                  key={study.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F9F8] p-2 rounded-lg transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#1F2A27]">{study.patientName}</span>
                      {study.modality && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-[#0C6B58] border-[#0C6B58]"
                        >
                          {study.modality}
                        </Badge>
                      )}
                      {study.accessionNumber && (
                        <span className="text-[11px] font-mono text-[#5F6E69]">
                          Acc: {study.accessionNumber}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#5F6E69] flex flex-wrap items-center gap-x-4 gap-y-1">
                      {study.studyDescription && (
                        <span>
                          Exame: <strong>{study.studyDescription}</strong>
                        </span>
                      )}
                      {study.studyDate && (
                        <span>
                          Data: {study.studyDate.replace(/(\d{4})(\d{2})(\d{2})/, '$3/$2/$1')}
                        </span>
                      )}
                      {study.patientId && <span>ID / CPF: {study.patientId}</span>}
                      <span>Séries: {study.seriesCount}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleImportStudy(study)}
                      disabled={importing}
                      className="h-8 bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Importar Frames
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
