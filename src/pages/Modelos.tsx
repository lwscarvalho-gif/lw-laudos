import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Layers,
  Plus,
  Copy,
  Edit2,
  Trash2,
  FileText,
  Loader2,
  Calendar,
  Sparkles,
  ShieldAlert,
} from 'lucide-react'
import { templatesService } from '@/services/templates'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import type { Template } from '@/types'
import { formatDateBR } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

export default function Modelos() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'gerais' ? 'gerais' : 'meus'

  const [activeTab, setActiveTab] = useState<'meus' | 'gerais'>(initialTab)
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()

  const [myTemplates, setMyTemplates] = useState<Template[]>([])
  const [generalTemplates, setGeneralTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  // Copying
  const [copyingId, setCopyingId] = useState<string | null>(null)

  // Deleting
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const [mine, generals] = await Promise.all([
        templatesService.getMyTemplates(),
        templatesService.getGeneralTemplates(),
      ])
      setMyTemplates(mine)
      setGeneralTemplates(generals)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  useRealtime<Template>('templates', () => loadTemplates())

  const handleTabChange = (tab: 'meus' | 'gerais') => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const handleCopyGeneralTemplate = async (tpl: Template) => {
    setCopyingId(tpl.id)
    try {
      await templatesService.copyToMyTemplates(tpl)
      toast({
        title: 'Modelo copiado',
        description: 'Modelo copiado para seus modelos.',
      })
      handleTabChange('meus')
      loadTemplates()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o modelo.',
        variant: 'destructive',
      })
    } finally {
      setCopyingId(null)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return
    setDeleting(true)
    try {
      await templatesService.delete(templateToDelete.id)
      toast({
        title: 'Modelo excluído',
        description: 'Modelo removido com sucesso.',
      })
      setTemplateToDelete(null)
      loadTemplates()
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao remover o modelo.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const getCleanPreview = (html: string) => {
    const text = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text.slice(0, 80) + (text.length > 80 ? '...' : '')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2A27]">Modelos de Laudo</h1>
          <p className="text-sm text-[#5F6E69] mt-0.5">
            Padronize e agilize a emissão de laudos com modelos reutilizáveis
          </p>
        </div>
        <Button
          onClick={() => navigate('/modelos/novo')}
          className="bg-[#0C6B58] hover:bg-[#0A5949] text-white shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Modelo
        </Button>
      </div>

      {/* Segmented Control Tabs */}
      <div className="flex border-b border-[#E5E9E7]">
        <button
          onClick={() => handleTabChange('meus')}
          className={`py-3 px-6 text-sm font-semibold transition-all relative ${
            activeTab === 'meus' ? 'text-[#0C6B58]' : 'text-[#5F6E69] hover:text-[#1F2A27]'
          }`}
        >
          Meus Modelos ({myTemplates.length})
          {activeTab === 'meus' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0C6B58] transition-all" />
          )}
        </button>
        <button
          onClick={() => handleTabChange('gerais')}
          className={`py-3 px-6 text-sm font-semibold transition-all relative ${
            activeTab === 'gerais' ? 'text-[#0C6B58]' : 'text-[#5F6E69] hover:text-[#1F2A27]'
          }`}
        >
          Modelos Gerais ({generalTemplates.length})
          {activeTab === 'gerais' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0C6B58] transition-all" />
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-[#E5E9E7]">
          <Loader2 className="w-8 h-8 text-[#0C6B58] animate-spin" />
          <p className="text-sm text-[#5F6E69]">Carregando modelos...</p>
        </div>
      ) : activeTab === 'meus' ? (
        /* Meus Modelos Tab */
        myTemplates.length === 0 ? (
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center bg-white rounded-xl border border-[#E5E9E7]">
            <div className="w-16 h-16 rounded-full bg-[#E8F3F0] flex items-center justify-center text-[#0C6B58] mb-4">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-[#1F2A27]">
              Nenhum modelo particular cadastrado
            </h3>
            <p className="text-sm text-[#5F6E69] max-w-sm mt-1 mb-6">
              Você pode criar seus próprios modelos ou copiar um dos modelos gerais disponíveis na
              outra aba.
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => handleTabChange('gerais')}
                className="border-[#0C6B58] text-[#0C6B58]"
              >
                Ver Modelos Gerais
              </Button>
              <Button
                onClick={() => navigate('/modelos/novo')}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Criar Modelo
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {myTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white p-5 rounded-xl border border-[#E5E9E7] shadow-sm flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <h3 className="font-bold text-base text-[#1F2A27] line-clamp-1">{tpl.title}</h3>
                  {tpl.description && (
                    <p className="text-xs text-[#5F6E69] mt-1 line-clamp-1">{tpl.description}</p>
                  )}
                  <p className="text-xs text-[#8A9691] mt-3 line-clamp-3 leading-relaxed font-serif-report bg-[#F7F9F8] p-2.5 rounded-lg border border-[#E5E9E7]">
                    {getCleanPreview(tpl.body)}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#E5E9E7] flex items-center justify-between text-xs text-[#5F6E69]">
                  <span>Criado em {formatDateBR(tpl.created)}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/laudos/novo?modelo=${tpl.id}`)}
                      className="bg-[#0C6B58] hover:bg-[#0A5949] text-white h-7 text-xs px-2.5"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" />
                      Criar Laudo
                    </Button>
                    <button
                      type="button"
                      onClick={() => navigate(`/modelos/${tpl.id}/editar`)}
                      className="p-1.5 text-[#5F6E69] hover:text-[#0C6B58] hover:bg-[#E8F3F0] rounded-md transition"
                      title="Editar modelo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateToDelete(tpl)}
                      className="p-1.5 text-[#8A9691] hover:text-[#DC2626] hover:bg-red-50 rounded-md transition"
                      title="Excluir modelo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : /* Modelos Gerais Tab */
      generalTemplates.length === 0 ? (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center bg-white rounded-xl border border-[#E5E9E7]">
          <div className="w-16 h-16 rounded-full bg-[#E8F3F0] flex items-center justify-center text-[#0C6B58] mb-4">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#1F2A27]">Nenhum modelo geral publicado</h3>
          <p className="text-sm text-[#5F6E69] max-w-sm mt-1 mb-6">
            O administrador ainda não publicou modelos institucionais.
          </p>
          {isAdmin && (
            <Button
              onClick={() => navigate('/modelos/novo?tipo=geral')}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Publicar Modelo Geral
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {generalTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white p-5 rounded-xl border border-[#E5E9E7] shadow-sm flex flex-col justify-between hover:shadow-md transition relative"
            >
              <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-[#0C6B58] bg-[#E8F3F0] px-2 py-0.5 rounded-full">
                Modelo Geral
              </span>

              <div>
                <h3 className="font-bold text-base text-[#1F2A27] line-clamp-1 pr-24">
                  {tpl.title}
                </h3>
                {tpl.description && (
                  <p className="text-xs text-[#5F6E69] mt-1 line-clamp-1">{tpl.description}</p>
                )}
                <p className="text-xs text-[#8A9691] mt-3 line-clamp-3 leading-relaxed font-serif-report bg-[#F7F9F8] p-2.5 rounded-lg border border-[#E5E9E7]">
                  {getCleanPreview(tpl.body)}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-[#E5E9E7] flex items-center justify-between">
                <Button
                  size="sm"
                  onClick={() => handleCopyGeneralTemplate(tpl)}
                  disabled={copyingId === tpl.id}
                  className="bg-[#0C6B58] hover:bg-[#0A5949] text-white h-8 text-xs font-semibold px-3 shadow-sm"
                >
                  {copyingId === tpl.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Copiando...
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Usar (Copiar)
                    </>
                  )}
                </Button>

                {/* Admin actions on general templates */}
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/modelos/${tpl.id}/editar`)}
                      className="p-1.5 text-[#5F6E69] hover:text-[#0C6B58] hover:bg-[#E8F3F0] rounded-md transition"
                      title="Editar modelo geral"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateToDelete(tpl)}
                      className="p-1.5 text-[#8A9691] hover:text-[#DC2626] hover:bg-red-50 rounded-md transition"
                      title="Excluir modelo geral"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal - Delete Template */}
      <AlertDialog
        open={!!templateToDelete}
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Laudos já criados a partir deste modelo não serão alterados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteTemplate()
              }}
              disabled={deleting}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
