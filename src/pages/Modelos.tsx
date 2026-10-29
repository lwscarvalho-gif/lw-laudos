import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Layers,
  Plus,
  Copy,
  Edit2,
  Trash2,
  FileText,
  Loader2,
  Tag,
  Search,
  Settings2,
  Filter,
  CheckCircle2,
} from 'lucide-react'
import { templatesService } from '@/services/templates'
import { specialtiesService } from '@/services/specialties'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import type { Template, MedicalSpecialty } from '@/types'
import { formatDateBR } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { SpecialtyManagerDialog } from '@/components/SpecialtyManagerDialog'
import { useToast } from '@/hooks/use-toast'

export default function Modelos() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'gerais' ? 'gerais' : 'meus'

  const [activeTab, setActiveTab] = useState<'meus' | 'gerais'>(initialTab)
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('todas')
  const [searchQuery, setSearchQuery] = useState('')
  const [specialtiesManagerOpen, setSpecialtiesManagerOpen] = useState(false)

  const { user, isAdmin } = useAuth()
  const { toast } = useToast()

  const [myTemplates, setMyTemplates] = useState<Template[]>([])
  const [generalTemplates, setGeneralTemplates] = useState<Template[]>([])
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([])
  const [loading, setLoading] = useState(true)

  // Copying
  const [copyingId, setCopyingId] = useState<string | null>(null)

  // Deleting
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [mine, generals, specs] = await Promise.all([
        templatesService.getMyTemplates(),
        templatesService.getGeneralTemplates(),
        specialtiesService.getAll(),
      ])
      setMyTemplates(mine)
      setGeneralTemplates(generals)
      setSpecialties(specs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime<Template>('templates', () => loadData())
  useRealtime<MedicalSpecialty>('medical_specialties', () => loadData())

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
        description: 'Modelo copiado para seus modelos particulares preservando a especialidade.',
      })
      handleTabChange('meus')
      loadData()
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
      loadData()
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

  // Specialty map helper
  const specialtyMap = useMemo(() => {
    const map = new Map<string, MedicalSpecialty>()
    specialties.forEach((s) => map.set(s.id, s))
    return map
  }, [specialties])

  const getSpecialtyName = (tpl: Template) => {
    if (tpl.expand?.specialty_id?.name) return tpl.expand.specialty_id.name
    if (tpl.specialty_id && specialtyMap.has(tpl.specialty_id)) {
      return specialtyMap.get(tpl.specialty_id)!.name
    }
    return 'Geral / Sem especialidade'
  }

  // Active list according to tab
  const currentList = activeTab === 'meus' ? myTemplates : generalTemplates

  // Count per specialty for the active tab
  const specialtyCounts = useMemo(() => {
    const counts: Record<string, number> = { todas: currentList.length, unclassified: 0 }
    specialties.forEach((s) => {
      counts[s.id] = 0
    })

    currentList.forEach((tpl) => {
      if (!tpl.specialty_id) {
        counts.unclassified = (counts.unclassified || 0) + 1
      } else {
        counts[tpl.specialty_id] = (counts[tpl.specialty_id] || 0) + 1
      }
    })

    return counts
  }, [currentList, specialties])

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return currentList.filter((tpl) => {
      // Specialty filter
      if (selectedSpecialty !== 'todas') {
        if (selectedSpecialty === 'unclassified') {
          if (tpl.specialty_id) return false
        } else if (tpl.specialty_id !== selectedSpecialty) {
          return false
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = tpl.title.toLowerCase().includes(q)
        const matchDesc = tpl.description?.toLowerCase().includes(q)
        const specName = getSpecialtyName(tpl).toLowerCase()
        const matchSpec = specName.includes(q)
        if (!matchTitle && !matchDesc && !matchSpec) return false
      }

      return true
    })
  }, [currentList, selectedSpecialty, searchQuery, specialtyMap])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2A27]">Modelos de Laudo</h1>
          <p className="text-sm text-[#5F6E69] mt-0.5">
            Organize seus modelos por especialidade médica e agilize a emissão clínica
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setSpecialtiesManagerOpen(true)}
              className="border-[#0C6B58] text-[#0C6B58] hover:bg-[#E8F3F0] text-xs h-9"
            >
              <Settings2 className="w-3.5 h-3.5 mr-1.5" />
              Gerenciar Especialidades
            </Button>
          )}
          <Button
            onClick={() => navigate('/modelos/novo')}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white shadow-sm h-9 text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Modelo
          </Button>
        </div>
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

      {/* Search and Specialty Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9691]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar modelo por título, descrição ou especialidade..."
              className="pl-9 text-xs h-9 bg-white"
            />
          </div>

          <div className="text-xs text-[#5F6E69] flex items-center gap-1.5 self-end sm:self-auto">
            <span>Exibindo:</span>
            <span className="font-bold text-[#1F2A27]">
              {filteredTemplates.length} de {currentList.length} modelos
            </span>
          </div>
        </div>

        {/* Specialty Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedSpecialty('todas')}
            className={`px-3 py-1.5 rounded-full font-medium transition shrink-0 flex items-center gap-1.5 ${
              selectedSpecialty === 'todas'
                ? 'bg-[#0C6B58] text-white shadow-sm'
                : 'bg-white border border-[#E5E9E7] text-[#5F6E69] hover:border-[#0C6B58] hover:text-[#0C6B58]'
            }`}
          >
            <span>Todas as Especialidades</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedSpecialty === 'todas'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#F2F5F4] text-[#5F6E69]'
              }`}
            >
              {specialtyCounts.todas || 0}
            </span>
          </button>

          {specialties.map((spec) => {
            const count = specialtyCounts[spec.id] || 0
            const isSelected = selectedSpecialty === spec.id
            return (
              <button
                key={spec.id}
                type="button"
                onClick={() => setSelectedSpecialty(spec.id)}
                className={`px-3 py-1.5 rounded-full font-medium transition shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0C6B58] text-white shadow-sm'
                    : 'bg-white border border-[#E5E9E7] text-[#5F6E69] hover:border-[#0C6B58] hover:text-[#0C6B58]'
                }`}
              >
                <span>{spec.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#F2F5F4] text-[#5F6E69]'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}

          {specialtyCounts.unclassified > 0 && (
            <button
              type="button"
              onClick={() => setSelectedSpecialty('unclassified')}
              className={`px-3 py-1.5 rounded-full font-medium transition shrink-0 flex items-center gap-1.5 ${
                selectedSpecialty === 'unclassified'
                  ? 'bg-[#0C6B58] text-white shadow-sm'
                  : 'bg-white border border-[#E5E9E7] text-[#5F6E69] hover:border-[#0C6B58] hover:text-[#0C6B58]'
              }`}
            >
              <span>Sem especialidade</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedSpecialty === 'unclassified'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F2F5F4] text-[#5F6E69]'
                }`}
              >
                {specialtyCounts.unclassified}
              </span>
            </button>
          )}
        </div>
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
              Você pode criar seus próprios modelos organizados por especialidade ou copiar um dos
              modelos gerais disponíveis na outra aba.
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
        ) : filteredTemplates.length === 0 ? (
          <div className="py-12 px-4 text-center bg-white rounded-xl border border-[#E5E9E7]">
            <Tag className="w-8 h-8 text-[#8A9691] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-[#1F2A27]">
              Nenhum modelo encontrado com estes filtros
            </p>
            <p className="text-xs text-[#5F6E69] mt-1 mb-4">
              Tente selecionar outra especialidade médica ou limpar o termo de busca.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedSpecialty('todas')
                setSearchQuery('')
              }}
              className="text-xs text-[#0C6B58] border-[#0C6B58]"
            >
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((tpl) => {
              const specName = getSpecialtyName(tpl)
              const hasSpecialty = !!tpl.specialty_id

              return (
                <div
                  key={tpl.id}
                  className="bg-white p-5 rounded-xl border border-[#E5E9E7] shadow-sm flex flex-col justify-between hover:shadow-md transition group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                          hasSpecialty
                            ? 'bg-[#E8F3F0] text-[#0C6B58] border border-[#0C6B58]/20'
                            : 'bg-[#F2F5F4] text-[#5F6E69]'
                        }`}
                      >
                        <Tag className="w-3 h-3" />
                        {specName}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[#1F2A27] line-clamp-1">{tpl.title}</h3>
                    {tpl.description && (
                      <p className="text-xs text-[#5F6E69] mt-1 line-clamp-1">{tpl.description}</p>
                    )}
                    <p className="text-xs text-[#8A9691] mt-3 line-clamp-3 leading-relaxed font-serif-report bg-[#F7F9F8] p-2.5 rounded-lg border border-[#E5E9E7]">
                      {getCleanPreview(tpl.body)}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#E5E9E7] flex items-center justify-between text-xs text-[#5F6E69]">
                    <span>{formatDateBR(tpl.created)}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/laudos/novo?modelo=${tpl.id}`)}
                        className="bg-[#0C6B58] hover:bg-[#0A5949] text-white h-7 text-xs px-2.5"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Usar
                      </Button>
                      <button
                        type="button"
                        onClick={() => navigate(`/modelos/${tpl.id}/editar`)}
                        className="p-1.5 text-[#5F6E69] hover:text-[#0C6B58] hover:bg-[#E8F3F0] rounded-md transition"
                        title="Editar modelo e especialidade"
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
              )
            })}
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
            O administrador ainda não publicou modelos institucionais organizados por especialidade.
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
      ) : filteredTemplates.length === 0 ? (
        <div className="py-12 px-4 text-center bg-white rounded-xl border border-[#E5E9E7]">
          <Tag className="w-8 h-8 text-[#8A9691] mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-[#1F2A27]">
            Nenhum modelo geral encontrado com estes filtros
          </p>
          <p className="text-xs text-[#5F6E69] mt-1 mb-4">
            Tente selecionar outra especialidade médica ou limpar o termo de busca.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedSpecialty('todas')
              setSearchQuery('')
            }}
            className="text-xs text-[#0C6B58] border-[#0C6B58]"
          >
            Limpar Filtros
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((tpl) => {
            const specName = getSpecialtyName(tpl)
            const hasSpecialty = !!tpl.specialty_id

            return (
              <div
                key={tpl.id}
                className="bg-white p-5 rounded-xl border border-[#E5E9E7] shadow-sm flex flex-col justify-between hover:shadow-md transition relative"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                        hasSpecialty
                          ? 'bg-[#E8F3F0] text-[#0C6B58] border border-[#0C6B58]/20'
                          : 'bg-[#F2F5F4] text-[#5F6E69]'
                      }`}
                    >
                      <Tag className="w-3 h-3" />
                      {specName}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0C6B58] bg-[#E8F3F0] px-2 py-0.5 rounded-full">
                      Modelo Geral
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-[#1F2A27] line-clamp-1">{tpl.title}</h3>
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

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/laudos/novo?modelo=${tpl.id}`)}
                      className="border-[#0C6B58] text-[#0C6B58] h-8 text-xs px-2.5 hover:bg-[#E8F3F0]"
                      title="Criar laudo com este modelo institucional"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" />
                      Criar Laudo
                    </Button>

                    {/* Admin actions on general templates */}
                    {isAdmin && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Specialty Manager Dialog */}
      <SpecialtyManagerDialog
        open={specialtiesManagerOpen}
        onOpenChange={setSpecialtiesManagerOpen}
        specialties={specialties}
        onSpecialtiesChange={loadData}
      />

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
