import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, ShieldCheck, UserCheck, Calendar, FileText } from 'lucide-react'
import { accessLogsService, type AccessLog } from '@/services/accessLogs'
import { formatDateTimeBR } from '@/lib/formatters'

interface AuditLogViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId?: string
  patientName?: string
}

export function AuditLogViewerModal({
  open,
  onOpenChange,
  patientId,
  patientName,
}: AuditLogViewerModalProps) {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    accessLogsService
      .getLogs({ patientId, limit: 100 })
      .then((data) => setLogs(data))
      .finally(() => setLoading(false))
  }, [open, patientId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#0C6B58]">
            <ShieldCheck className="w-5 h-5" />
            <DialogTitle>Registro de Acessos e Auditoria LGPD</DialogTitle>
          </div>
          <DialogDescription>
            {patientName
              ? `Histórico de visualizações e ações de operadores sobre o paciente ${patientName}.`
              : 'Trilha de auditoria das ações e visualizações realizadas no sistema médico.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 pt-2">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-[#0C6B58] animate-spin" />
              <p className="text-xs text-[#5F6E69]">Carregando trilha de auditoria...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8A9691] bg-[#F7F9F8] rounded-lg border border-[#E5E9E7]">
              Nenhum registro de acesso registrado até o momento.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-white rounded-lg border border-[#E5E9E7] shadow-xs text-xs space-y-1 hover:border-[#0C6B58]/40 transition"
              >
                <div className="flex items-center justify-between text-[#1F2A27]">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <UserCheck className="w-3.5 h-3.5 text-[#0C6B58]" />
                    <span>{log.user_name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#E5E9E7] text-[#5F6E69] font-normal">
                      {log.user_role}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8A9691] font-mono">
                    {log.created ? formatDateTimeBR(log.created) : '—'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[#1F2A27]">
                  <span className="font-medium text-[#0C6B58]">{log.action}</span>
                  {log.clinic_location && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                      {log.clinic_location}
                    </span>
                  )}
                </div>

                {log.details && (
                  <p className="text-[11px] text-[#5F6E69] bg-[#F7F9F8] p-1.5 rounded border border-[#E5E9E7]/60">
                    {log.details}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
