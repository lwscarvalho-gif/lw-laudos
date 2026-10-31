import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { clinicManagementService, type ClinicProcedure } from '@/services/clinicManagement'
import { Loader2 } from 'lucide-react'

interface ClinicProcedureSelectProps {
  clinicLocation: string
  value: string
  onChange: (value: string, procedure?: ClinicProcedure) => void
  className?: string
  placeholder?: string
}

export function ClinicProcedureSelect({
  clinicLocation,
  value,
  onChange,
  className = '',
  placeholder = 'Selecione o procedimento da unidade...',
}: ClinicProcedureSelectProps) {
  const [procedures, setProcedures] = useState<ClinicProcedure[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    const effectiveClinic = clinicLocation || 'HM Samuel Marques dos Santos'
    clinicManagementService
      .getProcedures(effectiveClinic)
      .then((list) => {
        if (!active) return
        // Filtra apenas ativos
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

  return (
    <div className={`relative ${className}`}>
      {loading ? (
        <div className="h-9 flex items-center px-3 border border-[#E5E9E7] rounded-md text-xs text-[#5F6E69] bg-white">
          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-[#0C6B58]" />
          Carregando procedimentos ativos...
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
          <SelectContent className="max-h-64 text-xs">
            {procedures.map((p) => (
              <SelectItem key={p.id} value={p.name}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="font-medium text-[#1F2A27]">{p.name}</span>
                  {p.internal_code && (
                    <span className="text-[10px] text-[#8A9691] font-mono">
                      [{p.internal_code}]
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
