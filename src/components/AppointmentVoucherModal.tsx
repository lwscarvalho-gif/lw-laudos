import React from 'react'
import {
  Printer,
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Appointment, Patient } from '@/types'
import { formatCuiabaDate, formatCuiabaTime } from '@/lib/formatters'
import { PRELIMINARY_VERSION_DISCLAIMER } from '@/lib/pdfGenerator'

interface AppointmentVoucherModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: Appointment | null
  patient?: Patient | null
}

export const AppointmentVoucherModal: React.FC<AppointmentVoucherModalProps> = ({
  open,
  onOpenChange,
  appointment,
  patient,
}) => {
  if (!appointment) return null

  const resolvedPatientName =
    patient?.name ||
    appointment.expand?.patient_id?.name ||
    appointment.patient_name_dicom ||
    'Paciente'
  const resolvedPatientDoc =
    patient?.document ||
    appointment.expand?.patient_id?.document ||
    appointment.patient_id_dicom ||
    ''
  const resolvedSusCard = patient?.sus_card || appointment.expand?.patient_id?.sus_card || ''
  const resolvedPhone = patient?.phone || appointment.expand?.patient_id?.phone || ''
  const resolvedAddress = patient?.address || appointment.expand?.patient_id?.address || ''

  const appointmentDate = appointment.start_time ? formatCuiabaDate(appointment.start_time) : ''
  const appointmentTime = appointment.start_time ? formatCuiabaTime(appointment.start_time) : ''

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:border-none print:shadow-none">
        <DialogHeader className="print:hidden border-b border-[#E5E9E7] pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#E8F3F0] text-[#0C6B58] flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#1F2A27]">
                  Comprovante de Agendamento do Paciente
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5F6E69]">
                  Imprima ou visualize o comprovante com as orientações de preparo clínico
                  prescritas.
                </DialogDescription>
              </div>
            </div>
            <Button
              type="button"
              onClick={handlePrint}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs font-semibold h-8"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Imprimir Comprovante
            </Button>
          </div>
        </DialogHeader>

        {/* Folha de Impressão A4 / Card de visualização */}
        <div
          id="appointment-printable-voucher"
          className="bg-white text-[#1F2A27] font-sans p-6 sm:p-8 rounded-xl border border-[#D5DED9] print:border-none print:p-4 print:m-0 space-y-6"
        >
          {/* Cabeçalho da Unidade / Sistema */}
          <div className="border-b-2 border-[#0C6B58] pb-4 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-[#0C6B58] uppercase block">
                Comprovante de Agendamento de Exame
              </span>
              <h2 className="text-xl font-bold text-[#1F2A27] mt-0.5">
                {appointment.clinic_location || 'Clínica de Atendimento'}
              </h2>
              {appointment.clinic_location?.toLowerCase().includes('samuel') && (
                <p className="text-xs text-[#5F6E69] mt-0.5">
                  Prefeitura Municipal de Mirante da Serra — Sistema Único de Saúde (SUS)
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#71827C] block uppercase font-mono">
                Accession Number
              </span>
              <span className="text-xs font-mono font-bold text-[#0C6B58] bg-[#E8F3F0] px-2 py-0.5 rounded inline-block mt-0.5">
                {appointment.accession_number || 'N/A'}
              </span>
            </div>
          </div>

          {/* Destaque: Data, Hora e Exame */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F4F8F6] p-4 rounded-xl border border-[#D5E5DE]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white border border-[#D5E5DE] text-[#0C6B58] flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#5F6E69] block">
                  Data do Exame
                </span>
                <span className="text-sm font-bold text-[#1F2A27]">{appointmentDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white border border-[#D5E5DE] text-[#0C6B58] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#5F6E69] block">
                  Horário Previsto
                </span>
                <span className="text-sm font-bold text-[#1F2A27]">
                  {appointmentTime}{' '}
                  <span className="text-xs font-normal text-[#5F6E69]">
                    ({appointment.duration_minutes || 30} min)
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:col-span-1">
              <div className="w-10 h-10 rounded-lg bg-white border border-[#D5E5DE] text-[#0C6B58] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="truncate">
                <span className="text-[10px] uppercase font-semibold text-[#5F6E69] block">
                  Local / Unidade
                </span>
                <span
                  className="text-xs font-bold text-[#1F2A27] truncate block"
                  title={appointment.clinic_location}
                >
                  {appointment.clinic_location}
                </span>
              </div>
            </div>
          </div>

          {/* Dados do Paciente e Exame */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5 p-3.5 rounded-lg border border-[#E5E9E7] bg-white">
              <span className="text-[10px] font-bold uppercase text-[#5F6E69] block">
                Identificação do Paciente
              </span>
              <p className="text-sm font-bold text-[#1F2A27]">{resolvedPatientName}</p>
              {resolvedPatientDoc && (
                <p className="text-[#5F6E69]">
                  <span className="font-semibold text-[#1F2A27]">CPF/Documento:</span>{' '}
                  {resolvedPatientDoc}
                </p>
              )}
              {resolvedSusCard && (
                <p className="text-[#5F6E69]">
                  <span className="font-semibold text-[#1F2A27]">Cartão SUS (CNS):</span>{' '}
                  {resolvedSusCard}
                </p>
              )}
              {resolvedPhone && (
                <p className="text-[#5F6E69]">
                  <span className="font-semibold text-[#1F2A27]">Telefone / Contato:</span>{' '}
                  {resolvedPhone}
                </p>
              )}
              {resolvedAddress && (
                <p className="text-[#5F6E69]">
                  <span className="font-semibold text-[#1F2A27]">Endereço:</span> {resolvedAddress}
                </p>
              )}
            </div>

            <div className="space-y-1.5 p-3.5 rounded-lg border border-[#E5E9E7] bg-white">
              <span className="text-[10px] font-bold uppercase text-[#5F6E69] block">
                Procedimento Solicitado
              </span>
              <p className="text-sm font-bold text-[#0C6B58]">{appointment.exam_type}</p>
              {appointment.referring_physician && (
                <p className="text-[#5F6E69]">
                  <span className="font-semibold text-[#1F2A27]">Médico Solicitante:</span>{' '}
                  {appointment.referring_physician}
                </p>
              )}
              <p className="text-[#5F6E69]">
                <span className="font-semibold text-[#1F2A27]">Status do Horário:</span>{' '}
                <span className="font-medium text-[#1F2A27]">{appointment.status}</span>
              </p>
              {(appointment.created_by_name || appointment.created_by_role) && (
                <p className="text-[#5F6E69] pt-1 text-[11px] border-t border-[#F0F2F1] mt-2">
                  <span className="font-semibold text-[#1F2A27]">Agendado por:</span>{' '}
                  {appointment.created_by_name || 'Profissional'}
                  {appointment.created_by_role ? ` (${appointment.created_by_role})` : ''}
                </p>
              )}
            </div>
          </div>

          {/* ORIENTAÇÕES E PREPARO CLÍNICO (DESTAQUE MÁXIMO) */}
          <div className="p-4 sm:p-5 rounded-xl border-2 border-[#0C6B58] bg-[#F7FAF9] space-y-2">
            <div className="flex items-center gap-2 text-[#0C6B58]">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#0C6B58]" />
              <h3 className="font-bold text-xs uppercase tracking-wide">
                Orientações Obrigatórias e Preparo Clínico para o Exame
              </h3>
            </div>

            <div className="text-xs text-[#1F2A27] leading-relaxed whitespace-pre-wrap font-medium bg-white p-3.5 rounded-lg border border-[#D5E2DC]">
              {appointment.notes && appointment.notes.trim() ? (
                appointment.notes
              ) : (
                <span className="text-[#71827C] italic">
                  Comparecer 15 minutos antes do horário agendado munido de documentos pessoais,
                  cartão SUS e exames anteriores.
                </span>
              )}
            </div>

            <div className="text-[11px] text-[#5F6E69] pt-1">
              <span className="font-semibold text-[#1F2A27]">Importante:</span> O cumprimento
              rigoroso do preparo acima é indispensável para a qualidade das imagens e segurança do
              seu diagnóstico. Em caso de dúvidas ou necessidade de reagendamento, avise com
              antecedência.
            </div>
          </div>

          {/* Rodapé institucional com versão preliminar */}
          <div className="border-t border-[#E5E9E7] pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] text-[#8A9691] gap-2">
            <div>
              <span>LW Laudos — Sistema Médico de Laudos e Agendamento</span>
              <span className="mx-1.5">•</span>
              <span>
                Emissão em: {new Date().toLocaleDateString('pt-BR')} às{' '}
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[#5F6E69] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0C6B58]" />
              <span>{PRELIMINARY_VERSION_DISCLAIMER}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="print:hidden border-t border-[#E5E9E7] pt-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="bg-[#0C6B58] hover:bg-[#0A5949] text-white font-semibold"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Imprimir Comprovante
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
