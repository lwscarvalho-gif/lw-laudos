import React from 'react'
import {
  Printer,
  Calendar,
  Clock,
  MapPin,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Heart,
  Sparkles,
  Info,
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
import { printAppointmentVoucher } from '@/lib/appointmentVoucherPrinter'

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

  // Identificação de primeiro nome para saudação calorosa
  const patientFirstName = resolvedPatientName.trim().split(' ')[0] || 'Paciente'

  // Identificação da clínica: HM Samuel Marques dos Santos (SUS) vs clínicas particulares/outras
  const clinicLocationLower = (appointment.clinic_location || '').toLowerCase()
  const isHospitalSamuel = clinicLocationLower.includes('samuel')

  const handlePrint = () => {
    printAppointmentVoucher({
      appointment,
      patient,
    })
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
          className="bg-white text-[#1F2A27] font-sans p-5 sm:p-6 rounded-xl border border-[#D5DED9] print:border-none print:p-2 print:m-0 space-y-3.5 text-[11px]"
        >
          {/* Cabeçalho da Unidade / Sistema */}
          <div className="border-b-2 border-[#0C6B58] pb-2.5 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-[#0C6B58] uppercase block">
                Comprovante de Agendamento de Exame
              </span>
              <h2 className="text-lg font-bold text-[#1F2A27] mt-0.5">
                {appointment.clinic_location || 'Clínica de Atendimento'}
              </h2>
              {isHospitalSamuel && (
                <p className="text-[11px] text-[#5F6E69] mt-0.5">
                  Prefeitura Municipal de Mirante da Serra — Sistema Único de Saúde (SUS)
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-[9px] text-[#71827C] block uppercase font-mono">
                Accession Number
              </span>
              <span className="text-xs font-mono font-bold text-[#0C6B58] bg-[#E8F3F0] px-2 py-0.5 rounded inline-block mt-0.5">
                {appointment.accession_number || 'N/A'}
              </span>
            </div>
          </div>

          {/* Mensagem calorosa de boas-vindas e acolhimento */}
          <div className="bg-[#F0F7F4] border border-[#CDE3DA] rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#0C6B58] text-white flex items-center justify-center shrink-0">
                <Heart className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-[#0C6B58] text-xs">
                  Olá, {patientFirstName}! Estamos à sua espera.
                </p>
                <p className="text-[11px] text-[#4A5954]">
                  Seu exame foi agendado com carinho e nossa equipe está pronta para acolher você.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-[#0C6B58] bg-white px-2 py-1 rounded border border-[#CDE3DA] shrink-0">
              <Sparkles className="w-3 h-3 text-[#0C6B58]" />
              <span>Cuidado e dedicação</span>
            </div>
          </div>

          {/* Destaque: Data, Hora e Local */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#F4F8F6] p-3 rounded-lg border border-[#D5E5DE]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#D5E5DE] text-[#0C6B58] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-semibold text-[#5F6E69] block">
                  Data do Exame
                </span>
                <span className="text-xs font-bold text-[#1F2A27]">{appointmentDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#D5E5DE] text-[#0C6B58] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-semibold text-[#5F6E69] block">
                  Horário Previsto
                </span>
                <span className="text-xs font-bold text-[#1F2A27]">
                  {appointmentTime}{' '}
                  <span className="text-[11px] font-normal text-[#5F6E69]">
                    ({appointment.duration_minutes || 30} min)
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:col-span-1">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#D5E5DE] text-[#0C6B58] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-[9px] uppercase font-semibold text-[#5F6E69] block">
                  Local de Atendimento
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

          {/* Dados do Paciente e Procedimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 p-2.5 rounded-lg border border-[#E5E9E7] bg-white">
              <span className="text-[9px] font-bold uppercase text-[#5F6E69] block">
                Dados do Paciente
              </span>
              <p className="text-xs font-bold text-[#1F2A27]">{resolvedPatientName}</p>
              {resolvedPatientDoc && (
                <p className="text-[#5F6E69]">
                  <span className="font-semibold text-[#1F2A27]">CPF/Documento:</span>{' '}
                  {resolvedPatientDoc}
                </p>
              )}
              {isHospitalSamuel && resolvedSusCard && (
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
                <p className="text-[#5F6E69] truncate" title={resolvedAddress}>
                  <span className="font-semibold text-[#1F2A27]">Endereço:</span> {resolvedAddress}
                </p>
              )}
            </div>

            <div className="space-y-1 p-2.5 rounded-lg border border-[#E5E9E7] bg-white">
              <span className="text-[9px] font-bold uppercase text-[#5F6E69] block">
                Procedimento e Atendimento
              </span>
              <p className="text-xs font-bold text-[#0C6B58]">{appointment.exam_type}</p>
              {appointment.referring_physician && (
                <p className="text-[#5F6E69]">
                  <span className="font-semibold text-[#1F2A27]">Médico Solicitante:</span>{' '}
                  {appointment.referring_physician}
                </p>
              )}
              <p className="text-[#5F6E69]">
                <span className="font-semibold text-[#1F2A27]">Status do Agendamento:</span>{' '}
                <span className="font-medium text-[#1F2A27]">{appointment.status}</span>
              </p>
              {(appointment.created_by_name || appointment.created_by_role) && (
                <p className="text-[#5F6E69] pt-1 text-[10px] border-t border-[#F0F2F1] mt-1">
                  <span className="font-semibold text-[#1F2A27]">Agendado com carinho por:</span>{' '}
                  {appointment.created_by_name || 'Profissional da Equipe'}
                  {appointment.created_by_role ? ` (${appointment.created_by_role})` : ''}
                </p>
              )}
            </div>
          </div>

          {/* ORIENTAÇÕES E PREPARO CLÍNICO (DESTAQUE ACOLHEDOR E CLARO) */}
          <div className="p-3 sm:p-3.5 rounded-lg border-2 border-[#0C6B58] bg-[#F7FAF9] space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#0C6B58]">
              <Info className="w-4 h-4 shrink-0 text-[#0C6B58]" />
              <h3 className="font-bold text-[11px] uppercase tracking-wide">
                Como se Preparar para o Seu Exame
              </h3>
            </div>

            <div className="text-[11px] text-[#1F2A27] leading-relaxed whitespace-pre-wrap font-medium bg-white p-2.5 rounded-md border border-[#D5E2DC]">
              {appointment.notes && appointment.notes.trim() ? (
                appointment.notes
              ) : (
                <span className="text-[#5F6E69]">
                  Pedimos a gentileza de chegar cerca de 15 minutos antes do horário marcado,
                  trazendo seus documentos e exames anteriores. Não é necessário jejum ou preparo
                  especial, apenas mantenha sua hidratação habitual.
                </span>
              )}
            </div>

            <div className="text-[10px] text-[#4F5E59] pt-0.5 leading-snug">
              <span className="font-semibold text-[#0C6B58]">Dica importante:</span> Seguir com
              carinho estas orientações garante que seu exame tenha imagens bem nítidas e um
              resultado ainda mais seguro. Se tiver qualquer dúvida ou precisar reagendar, fale
              conosco com antecedência — teremos muita satisfação em ajudar!
            </div>
          </div>

          {/* RECOMENDAÇÕES DE DOCUMENTOS A LEVAR (DINÂMICO CONFORME A CLÍNICA) */}
          <div className="p-3 rounded-lg border border-[#D5DED9] bg-white space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#1F2A27]">
              <FileText className="w-4 h-4 shrink-0 text-[#0C6B58]" />
              <h3 className="font-bold text-[11px] uppercase tracking-wide text-[#0C6B58]">
                O Que Trazer no Dia do Exame
              </h3>
            </div>
            <ul className="text-[10.5px] text-[#33423E] space-y-1 list-disc list-inside">
              <li>
                <span className="font-semibold text-[#1F2A27]">Documento oficial com foto:</span> RG
                ou CNH original (do paciente ou responsável legal em caso de menores).
              </li>
              {isHospitalSamuel ? (
                <li>
                  <span className="font-semibold text-[#1F2A27]">Cartão do SUS (CNS):</span>{' '}
                  obrigatório para atendimento pelo SUS no HM Samuel Marques dos Santos, juntamente
                  com comprovante de residência atualizado.
                </li>
              ) : (
                <li>
                  <span className="font-semibold text-[#1F2A27]">
                    Cartão do Convênio (se houver):
                  </span>{' '}
                  carteirinha física ou digital atualizada do seu plano de saúde, caso o atendimento
                  seja por convênio médico credenciado.
                </li>
              )}
              <li>
                <span className="font-semibold text-[#1F2A27]">
                  Pedido / Solicitação médica original:
                </span>{' '}
                com carimbo e assinatura do médico solicitante.
              </li>
              <li>
                <span className="font-semibold text-[#1F2A27]">
                  Exames anteriores da mesma região:
                </span>{' '}
                ultrassonografias, tomografias, mamografias ou biópsias anteriores para estudo
                comparativo fundamental pelo médico examinador.
              </li>
              {appointment.exam_type?.toLowerCase().includes('obstétric') ||
              appointment.exam_type?.toLowerCase().includes('morfológic') ||
              appointment.exam_type?.toLowerCase().includes('gesta') ? (
                <li className="text-[#0C6B58] font-medium">
                  <span className="font-bold">Caderneta da Gestante / Pré-natal:</span> não se
                  esqueça de trazer sua caderneta e os ultrassons anteriores desta gestação.
                </li>
              ) : null}
            </ul>
          </div>

          {/* Rodapé institucional com versão preliminar */}
          <div className="border-t border-[#E5E9E7] pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[9px] text-[#8A9691] gap-1.5">
            <div>
              <span>LW Laudos — Sistema Médico de Laudos e Agendamento</span>
              <span className="mx-1">•</span>
              <span>
                Emissão em: {new Date().toLocaleDateString('pt-BR')} às{' '}
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[#5F6E69] font-medium">
              <ShieldCheck className="w-3 h-3 text-[#0C6B58]" />
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
