import { useState, useEffect, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { clinicManagementService, type ClinicProcedure } from '@/services/clinicManagement'
import { Star, Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface UnifiedProcedureSelectProps {
  clinicLocation?: string
  value: string
  onChange: (value: string, procedure?: ClinicProcedure) => void
  className?: string
  placeholder?: string
}

const FAVORITES_STORAGE_KEY = 'lw_laudos_procedure_favorites'

export function UnifiedProcedureSelect({
  clinicLocation,
  value,
  onChange,
  className = '',
  placeholder = 'Selecione ou busque o procedimento...',
}: UnifiedProcedureSelectProps) {
  const [procedures, setProcedures] = useState<ClinicProcedure[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    let active = true
    setLoading(true)
    const effectiveClinic = clinicLocation || 'HM Samuel Marques dos Santos'
    clinicManagementService
      .getProcedures(effectiveClinic)
      .then((list) => {
        if (!active) return
        const activeOnly = list.filter((p) => p.is_active)
        setProcedures(activeOnly)
      })
      .catch(() => {
        if (active) setProcedures([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [clinicLocation])

  const toggleFavorite = (procName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setFavorites((prev) => {
      const updated = prev.includes(procName)
        ? prev.filter((p) => p !== procName)
        : [...prev, procName]
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated))
      } catch {
        /* ignore */
      }
      return updated
    })
  }

  // Ordenação alfabética com favoritos primeiro e busca sem acentos
  const filteredSortedProcedures = useMemo(() => {
    const normSearch = search
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()

    const list = procedures.filter((p) => {
      if (!normSearch) return true
      const normName = p.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      const normCode = (p.internal_code || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      return normName.includes(normSearch) || normCode.includes(normSearch)
    })

    return list.sort((a, b) => {
      const favA = favorites.includes(a.name) ? 1 : 0
      const favB = favorites.includes(b.name) ? 1 : 0
      if (favA !== favB) return favB - favA // favoritos primeiro
      return a.name.localeCompare(b.name, 'pt-BR')
    })
  }, [procedures, search, favorites])

  return (
    <div className={`relative ${className}`}>
      {loading ? (
        <div className="h-9 flex items-center px-3 border border-[#E5E9E7] rounded-md text-xs text-[#5F6E69] bg-white">
          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-[#0C6B58]" />
          Carregando catálogo de procedimentos...
        </div>
      ) : (
        <Select
          value={value}
          onValueChange={(val) => {
            const found = procedures.find((p) => p.name === val)
            onChange(val, found)
          }}
        >
          <SelectTrigger className="bg-white border-[#E5E9E7] text-xs">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="max-h-72 text-xs">
            <div className="p-1.5 border-b border-[#E5E9E7]">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-2.5 text-[#8A9691]" />
                <Input
                  placeholder="Filtrar por nome ou código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 pl-6 text-[11px] bg-[#FAFBFB] border-[#E5E9E7]"
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            {filteredSortedProcedures.map((p) => {
              const isFav = favorites.includes(p.name)
              return (
                <SelectItem key={p.id} value={p.name}>
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="font-medium text-[#1F2A27]">{p.name}</span>
                    <div className="flex items-center gap-1.5">
                      {p.internal_code && (
                        <span className="text-[10px] text-[#8A9691] font-mono">
                          [{p.internal_code}]
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(p.name, e)}
                        className="text-[#8A9691] hover:text-amber-500 focus:outline-none"
                        title={isFav ? 'Remover dos favoritos' : 'Favoritar procedimento'}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isFav ? 'text-amber-500 fill-amber-500' : 'text-[#A0ABA7]'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
