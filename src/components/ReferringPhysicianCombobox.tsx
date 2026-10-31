import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { User, Plus, Check } from 'lucide-react'
import {
  referringPhysiciansService,
  normalizePhysicianName,
  type ReferringPhysician,
} from '@/services/referringPhysicians'

interface ReferringPhysicianComboboxProps {
  value: string
  onChange: (value: string) => void
  clinicLocation?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  autoFocus?: boolean
}

export function ReferringPhysicianCombobox({
  value,
  onChange,
  clinicLocation,
  placeholder = 'Buscar ou cadastrar médico solicitante...',
  className = '',
  disabled = false,
}: ReferringPhysicianComboboxProps) {
  const [searchTerm, setSearchTerm] = useState(value || '')
  const [suggestions, setSuggestions] = useState<ReferringPhysician[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSearchTerm(value || '')
  }, [value])

  // Busca sugestões normalizadas
  useEffect(() => {
    let active = true
    if (!searchTerm.trim()) {
      referringPhysiciansService.getAll(clinicLocation).then((all) => {
        if (active) setSuggestions(all.slice(0, 8))
      })
      return
    }

    const timer = setTimeout(() => {
      referringPhysiciansService.search(searchTerm, clinicLocation).then((res) => {
        if (active) setSuggestions(res)
      })
    }, 180)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [searchTerm, clinicLocation])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (doc: ReferringPhysician) => {
    setSearchTerm(doc.name)
    onChange(doc.name)
    setIsOpen(false)
  }

  const handleQuickCreate = async () => {
    const trimmed = searchTerm.trim()
    if (!trimmed) return
    setCreating(true)
    try {
      const created = await referringPhysiciansService.createQuick(trimmed, {
        clinicLocation,
      })
      setSearchTerm(created.name)
      onChange(created.name)
      setIsOpen(false)
    } catch (err) {
      console.error(err)
      // Se falhar o backend, propaga o texto livre digitado
      onChange(trimmed)
      setIsOpen(false)
    } finally {
      setCreating(false)
    }
  }

  const normalizedInput = normalizePhysicianName(searchTerm)
  const hasExactMatch = suggestions.some(
    (s) =>
      s.name_normalized === normalizedInput ||
      s.name.trim().toLowerCase() === searchTerm.trim().toLowerCase(),
  )

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          type="text"
          value={searchTerm}
          disabled={disabled}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            onChange(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="text-xs bg-white pr-8"
        />
        <User className="w-3.5 h-3.5 text-[#8A9691] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white rounded-lg border border-[#E5E9E7] shadow-lg text-xs divide-y divide-[#E5E9E7]">
          {suggestions.length > 0 && (
            <div className="py-1">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A9691] bg-[#F7F9F8]">
                Médicos Solicitantes Cadastrados
              </div>
              {suggestions.map((doc) => {
                const isSelected = doc.name.toLowerCase() === (value || '').toLowerCase()
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleSelect(doc)}
                    className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#E8F3F0] transition group"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#1F2A27] group-hover:text-[#0C6B58]">
                        {doc.name}
                      </span>
                      {doc.clinic_location && (
                        <span className="text-[10px] text-[#8A9691]">{doc.clinic_location}</span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#0C6B58]" />}
                  </button>
                )
              })}
            </div>
          )}

          {/* Opção de Cadastro Rápido com 1 único campo (nome digitado) */}
          {searchTerm.trim().length > 1 && !hasExactMatch && (
            <div className="p-2 bg-[#F7F9F8]">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={creating}
                onClick={handleQuickCreate}
                className="w-full h-8 text-xs font-semibold justify-center text-[#0C6B58] border-[#0C6B58]/30 hover:bg-[#E8F3F0]"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Cadastrar solicitante &quot;{searchTerm.trim()}&quot;
              </Button>
            </div>
          )}

          {suggestions.length === 0 && !searchTerm.trim() && (
            <div className="p-3 text-center text-[#8A9691] text-[11px]">
              Nenhum médico solicitante recente. Digite para buscar ou cadastrar.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
