import React, { useState, useEffect } from 'react'
import {
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  FolderArchive,
  FileCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { localBackupService, type BackupMetadata } from '@/services/localBackupService'

export function LocalBackupPanel() {
  const { toast } = useToast()
  const [backups, setBackups] = useState<BackupMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [restoringKey, setRestoringKey] = useState<string | null>(null)
  const [confirmModalKey, setConfirmModalKey] = useState<string | null>(null)

  const loadBackups = async () => {
    setLoading(true)
    try {
      const list = await localBackupService.listBackups()
      setBackups(list)
    } catch {
      // ignora
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBackups()
  }, [])

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      await localBackupService.createConsistentBackup('lwlaudos_db')
      toast({
        title: 'Backup concluído com sucesso',
        description: 'Um snapshot consistente do banco de dados e metadados foi gerado.',
      })
      await loadBackups()
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar backup',
        description:
          err.message || 'Falha ao acionar a API de backup do PocketBase. Verifique privilégios.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (key: string) => {
    setRestoringKey(key)
    try {
      await localBackupService.restoreBackup(key)
      toast({
        title: 'Restauração concluída',
        description: 'O banco de dados foi restaurado para o ponto selecionado.',
      })
      setConfirmModalKey(null)
    } catch (err: any) {
      toast({
        title: 'Falha na restauração',
        description: err.message || 'Não foi possível restaurar o backup.',
        variant: 'destructive',
      })
    } finally {
      setRestoringKey(null)
    }
  }

  const handleExportJson = async () => {
    try {
      const jsonStr = await localBackupService.exportPortableConfigs()
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lw_laudos_modelos_configs_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({
        title: 'Exportação concluída',
        description: 'Arquivo JSON com modelos e preferências baixado com sucesso.',
      })
    } catch {
      toast({
        title: 'Falha na exportação',
        description: 'Não foi possível exportar os modelos.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E9E7] shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9E7] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-[#1F2A27]">
                Backup e Restauração Local (PocketBase / SQLite)
              </h2>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                Mecanismo Consistente
              </span>
            </div>
            <p className="text-xs text-[#5F6E69]">
              Geração de cópias de segurança sem travamento de arquivos SQLite e restauração
              assistida.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            className="text-xs border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0]"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Exportar Modelos/JSON
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleCreateBackup}
            disabled={creating}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs font-semibold"
          >
            <HardDrive className="w-3.5 h-3.5 mr-1.5" />
            {creating ? 'Gerando snapshot...' : 'Criar Novo Backup Agora'}
          </Button>
        </div>
      </div>

      {/* Lista de Backups */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#1F2A27] flex items-center gap-1.5">
            <FolderArchive className="w-4 h-4 text-[#0C6B58]" />
            Snapshots Disponíveis ({backups.length})
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={loadBackups}
            className="h-7 text-xs text-[#5F6E69]"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar lista
          </Button>
        </div>

        {backups.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-[#FAFCFB] border border-[#E5E9E7] text-xs text-[#5F6E69] space-y-1">
            <p className="font-semibold text-[#1F2A27]">
              Nenhum snapshot de backup registrado ainda.
            </p>
            <p className="text-[11px] text-[#8A9691]">
              Clique em "Criar Novo Backup Agora" para gerar um arquivo seguro do banco de dados e
              arquivos locais.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {backups.map((b) => (
              <div
                key={b.key}
                className="p-3 rounded-lg border border-[#E5E9E7] bg-[#FAFCFB] flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-white border border-[#D6DDD9] flex items-center justify-center text-[#0C6B58]">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#1F2A27] block">{b.key}</span>
                    <span className="text-[10px] text-[#8A9691]">
                      Criado em: {new Date(b.created).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmModalKey(b.key)}
                    className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                  >
                    Restaurar Ponto
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmação de Restauração Assistida */}
      {confirmModalKey && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-3 animate-in fade-in-50">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Confirmação de Restauração de Banco de Dados
          </div>
          <p className="text-amber-800 leading-relaxed text-[11px]">
            Você está prestes a restaurar o ponto <strong>{confirmModalKey}</strong>. Esta ação
            substituirá os dados atuais pelo conteúdo salvo no backup. Dados posteriores ao snapshot
            serão revertidos.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmModalKey(null)}
              className="h-7 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleRestore(confirmModalKey)}
              disabled={Boolean(restoringKey)}
              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {restoringKey ? 'Restaurando...' : 'Confirmar e Restaurar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
