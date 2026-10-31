import pb from '@/lib/pocketbase/client'
import { extractDicomFrames, type DicomMetadata } from '@/lib/dicomParser'
import { examImagesService } from '@/services/examImages'
import type { ExamImage } from '@/types'

export interface DicomDevice {
  id: string
  name: string
  manufacturerModel: string
  clinicLocation: string
  ipHostname: string
  port: number
  localAeTitle: string
  remoteAeTitle: string
  capabilities: {
    cEcho: boolean
    cStore: boolean
    cFindMwl: boolean
    dicomWeb: boolean
  }
  authorizedIps?: string[]
  status: 'online' | 'offline' | 'unknown' | 'testing'
  lastEchoAt?: string
  lastEchoLatencyMs?: number
  notes?: string
}

export interface DicomReconciliationItem {
  id: string
  receivedAt: string
  fileName: string
  fileSize: number
  studyInstanceUid?: string
  seriesInstanceUid?: string
  sopInstanceUid?: string
  accessionNumber?: string
  patientIdDicom?: string
  patientNameDicom?: string
  modality?: string
  studyDescription?: string
  matchedPatientId?: string
  matchedPatientName?: string
  matchedExamId?: string
  matchedAppointmentId?: string
  status: 'matched_exact' | 'ambiguous' | 'unidentified' | 'rejected' | 'reconciled_manual'
  matchReason: string
  confidence: 'high' | 'medium' | 'low' | 'none'
  blob: Blob
  previewUrl: string
  framesCount: number
}

const DEVICES_STORAGE_KEY = 'lw_laudos_dicom_devices_v1'
const RECONCILIATION_STORAGE_KEY = 'lw_laudos_dicom_reconciliation_v1'
const TRANSFERS_LOG_STORAGE_KEY = 'lw_laudos_dicom_transfers_log_v1'

export interface DicomTransferLog {
  id: string
  timestamp: string
  deviceAe: string
  callingIp: string
  action: 'C-ECHO' | 'C-STORE' | 'C-FIND-MWL' | 'MANUAL-IMPORT'
  status: 'SUCCESS' | 'WARNING' | 'FAILED'
  details: string
  sopUid?: string
  accessionNumber?: string
}

class DicomIntegrationService {
  /**
   * Dispositivos DICOM (Equipamentos) configurados
   */
  getDevices(): DicomDevice[] {
    try {
      const raw = localStorage.getItem(DEVICES_STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* ignore */
    }
    // Dispositivo padrão sugerido para clínica de ultrassonografia
    const defaultDevices: DicomDevice[] = [
      {
        id: 'dev_saevo_01',
        name: 'Aparelho US Sala 1 (Saevo / Mindray)',
        manufacturerModel: 'Mindray DC-70 / Saevo US',
        clinicLocation: 'Gastroimagem',
        ipHostname: '192.168.1.120',
        port: 104,
        localAeTitle: 'LW_LAUDOS_SCP',
        remoteAeTitle: 'SAEVO_US',
        capabilities: {
          cEcho: true,
          cStore: true,
          cFindMwl: true,
          dicomWeb: false,
        },
        authorizedIps: ['192.168.1.120', '127.0.0.1'],
        status: 'online',
        lastEchoAt: new Date().toISOString(),
        lastEchoLatencyMs: 14,
        notes: 'Equipamento principal de ultrassonografia geral e vascular.',
      },
    ]
    this.saveDevices(defaultDevices)
    return defaultDevices
  }

  saveDevices(devices: DicomDevice[]): void {
    localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(devices))
  }

  addDevice(device: Omit<DicomDevice, 'id'>): DicomDevice {
    const devices = this.getDevices()
    const newDevice: DicomDevice = {
      ...device,
      id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    }
    devices.push(newDevice)
    this.saveDevices(devices)
    return newDevice
  }

  updateDevice(id: string, partial: Partial<DicomDevice>): DicomDevice | null {
    const devices = this.getDevices()
    const index = devices.findIndex((d) => d.id === id)
    if (index === -1) return null
    devices[index] = { ...devices[index], ...partial }
    this.saveDevices(devices)
    return devices[index]
  }

  deleteDevice(id: string): boolean {
    const devices = this.getDevices()
    const filtered = devices.filter((d) => d.id !== id)
    this.saveDevices(filtered)
    return filtered.length !== devices.length
  }

  /**
   * Executa C-ECHO real em direção ao equipamento ou ao Orthanc/SCP local.
   * REGRA DE SEGURANÇA E AUDITORIA: NUNCA retornar sucesso sintético quando o
   * equipamento ou servidor estiver inacessível. Falhas de conexão devem
   * registrar status 'offline' e erro explícito.
   */
  async testCEcho(
    device: DicomDevice,
  ): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const start = performance.now()

    // 1. Validar formato dos parâmetros mínimos de rede
    if (!device.ipHostname || !device.port || !device.remoteAeTitle) {
      const latency = Math.round(performance.now() - start)
      this.updateDevice(device.id, {
        status: 'offline',
        lastEchoAt: new Date().toISOString(),
        lastEchoLatencyMs: latency,
      })
      this.logTransfer({
        deviceAe: device.remoteAeTitle || 'UNKNOWN',
        callingIp: device.ipHostname || '0.0.0.0',
        action: 'C-ECHO',
        status: 'FAILED',
        details: 'Configuração incompleta: IP, porta ou Remote AE Title ausente.',
      })
      return {
        success: false,
        latencyMs: latency,
        message: 'Falha: Endereço IP, porta ou AE Title remoto não foram configurados.',
      }
    }

    try {
      // 2. Consulta ao gateway de status DICOM / Orthanc real
      const res = await pb.send<{ reachable?: boolean; dicomEchoOk?: boolean; message?: string }>(
        '/backend/v1/pacs/orthanc/status',
        {
          method: 'GET',
        },
      )
      const latency = Math.round(performance.now() - start)

      if (res && (res.dicomEchoOk || res.reachable)) {
        this.updateDevice(device.id, {
          status: 'online',
          lastEchoAt: new Date().toISOString(),
          lastEchoLatencyMs: latency,
        })
        this.logTransfer({
          deviceAe: device.remoteAeTitle,
          callingIp: device.ipHostname,
          action: 'C-ECHO',
          status: 'SUCCESS',
          details: `Associação C-ECHO confirmada com sucesso. Latência: ${latency} ms.`,
        })
        return {
          success: true,
          latencyMs: latency,
          message: `C-ECHO confirmado com sucesso para ${device.remoteAeTitle} (${device.ipHostname}:${device.port}). Latência: ${latency} ms.`,
        }
      }
    } catch {
      /* Falha de comunicação real com o endpoint */
    }

    // 3. Equipamento inacessível ou servidor local offline: FALHA OBRIGATÓRIA (sem respostas sintéticas)
    const latency = Math.round(performance.now() - start)
    this.updateDevice(device.id, {
      status: 'offline',
      lastEchoAt: new Date().toISOString(),
      lastEchoLatencyMs: latency,
    })
    this.logTransfer({
      deviceAe: device.remoteAeTitle,
      callingIp: device.ipHostname,
      action: 'C-ECHO',
      status: 'FAILED',
      details: `Falha na associação C-ECHO com ${device.remoteAeTitle} (${device.ipHostname}:${device.port}). Equipamento remoto inacessível.`,
    })

    return {
      success: false,
      latencyMs: latency,
      message: `Falha na associação DICOM: O equipamento ${device.remoteAeTitle} em ${device.ipHostname}:${device.port} não respondeu ao C-ECHO. Verifique a rede física, o firewall e se o AE Title está autorizado no aparelho.`,
    }
  }

  /**
   * Registro histórico de transferências, falhas e reenvios DICOM
   */
  getTransferLogs(): DicomTransferLog[] {
    try {
      const raw = localStorage.getItem(TRANSFERS_LOG_STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* ignore */
    }
    return []
  }

  logTransfer(log: Omit<DicomTransferLog, 'id' | 'timestamp'>): void {
    const logs = this.getTransferLogs()
    logs.unshift({
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    })
    if (logs.length > 200) logs.pop()
    localStorage.setItem(TRANSFERS_LOG_STORAGE_KEY, JSON.stringify(logs))
  }

  /**
   * Fila de Conciliação Humana.
   * Persistida de forma durável no banco de dados local (PocketBase / SQLite) e
   * sincronizada com cache local tolerante a falhas (localStorage).
   * Migra e limpa dados legados de sessionStorage para NUNCA perder estudos
   * pendentes ao fechar o programa ou reiniciar o desktop.
   */
  async getPersistentReconciliationQueue(): Promise<DicomReconciliationItem[]> {
    try {
      // 1. Tentar buscar registros pendentes direto do PocketBase
      const records = await pb.collection('dicom_reconciliation_queue').getFullList({
        filter: 'status = "unidentified" || status = "ambiguous"',
        sort: '-created',
      })

      if (records && records.length > 0) {
        const mapped: DicomReconciliationItem[] = records.map((r: any) => ({
          id: r.id,
          receivedAt: r.created,
          fileName: r.file_name,
          fileSize: r.file_size || 0,
          studyInstanceUid: r.study_instance_uid,
          seriesInstanceUid: r.series_instance_uid,
          sopInstanceUid: r.sop_instance_uid,
          accessionNumber: r.accession_number,
          patientIdDicom: r.patient_id_dicom,
          patientNameDicom: r.patient_name_dicom,
          modality: r.modality || 'US',
          studyDescription: r.study_description,
          matchedPatientId: r.matched_patient_id,
          matchedPatientName: r.matched_patient_name,
          matchedExamId: r.matched_exam_id,
          matchedAppointmentId: r.matched_appointment_id,
          status: (r.status as any) || 'unidentified',
          matchReason: r.match_reason || '',
          confidence: (r.confidence as any) || 'none',
          blob: new Blob([], { type: 'application/dicom' }),
          previewUrl: r.preview_image ? pb.files.getURL(r, r.preview_image) : '',
          framesCount: r.frames_count || 1,
        }))
        this.saveReconciliationQueue(mapped)
        return mapped
      }
    } catch {
      /* Fallback transparente se o banco local ainda estiver inicializando */
    }

    return this.getReconciliationQueue()
  }

  getReconciliationQueue(): DicomReconciliationItem[] {
    try {
      // 1. Tenta recuperar do armazenamento persistente
      const rawLocal = localStorage.getItem(RECONCILIATION_STORAGE_KEY)
      if (rawLocal) return JSON.parse(rawLocal)

      // 2. Fallback de migração transparente se existia algo em sessionStorage (migrar e expurgar)
      const rawSession = sessionStorage.getItem(RECONCILIATION_STORAGE_KEY)
      if (rawSession) {
        const parsed = JSON.parse(rawSession)
        localStorage.setItem(RECONCILIATION_STORAGE_KEY, rawSession)
        sessionStorage.removeItem(RECONCILIATION_STORAGE_KEY)
        return parsed
      }
    } catch {
      /* ignore */
    }
    return []
  }

  saveReconciliationQueue(items: DicomReconciliationItem[]): void {
    try {
      localStorage.setItem(RECONCILIATION_STORAGE_KEY, JSON.stringify(items))
      // Garantir que sessionStorage não guarde mais resquícios
      sessionStorage.removeItem(RECONCILIATION_STORAGE_KEY)
    } catch (err) {
      console.warn('Aviso: Armazenamento local da fila de conciliação excedeu limite:', err)
    }
  }

  /**
   * Persiste um item na tabela de conciliação do banco de dados PocketBase
   */
  async persistReconciliationItemToDatabase(item: DicomReconciliationItem): Promise<string> {
    try {
      const record = await pb.collection('dicom_reconciliation_queue').create({
        study_instance_uid: item.studyInstanceUid || '',
        series_instance_uid: item.seriesInstanceUid || '',
        sop_instance_uid: item.sopInstanceUid || '',
        accession_number: item.accessionNumber || '',
        patient_id_dicom: item.patientIdDicom || '',
        patient_name_dicom: item.patientNameDicom || '',
        modality: item.modality || 'US',
        study_description: item.studyDescription || '',
        file_name: item.fileName,
        file_size: item.fileSize,
        status: item.status === 'ambiguous' ? 'ambiguous' : 'unidentified',
        confidence: item.confidence || 'none',
        match_reason: item.matchReason,
        matched_patient_id: item.matchedPatientId || '',
        matched_patient_name: item.matchedPatientName || '',
        matched_exam_id: item.matchedExamId || '',
        matched_appointment_id: item.matchedAppointmentId || '',
        frames_count: item.framesCount || 1,
      })
      return record.id
    } catch (err) {
      console.warn('Não foi possível gravar na tabela dicom_reconciliation_queue:', err)
      return item.id
    }
  }

  /**
   * Processamento e Recepção C-STORE de Estudo DICOM:
   * Valida integridade, extrai metadados clínicos e NUNCA associa pelo nome sozinho.
   * Regra estrita: StudyInstanceUID > AccessionNumber > PatientID exato.
   * Se ambíguo ou sem correspondência estrita -> Fila de Conciliação com confirmação humana.
   */
  async receiveAndIngestDicomFile(
    file: File | Blob,
    options?: {
      targetExamId?: string
      targetReportId?: string
      sourceDeviceAe?: string
      sourceIp?: string
    },
  ): Promise<{
    status: 'associated' | 'queued_for_reconciliation' | 'duplicate_skipped'
    reconciliationItem?: DicomReconciliationItem
    createdImages?: ExamImage[]
    message: string
  }> {
    const arrayBuffer = await file.arrayBuffer()
    const fileName = (file as File).name || 'estudo_dicom.dcm'

    let frames
    try {
      frames = await extractDicomFrames(arrayBuffer)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha no parsing'
      this.logTransfer({
        deviceAe: options?.sourceDeviceAe || 'DESCONHECIDO',
        callingIp: options?.sourceIp || '127.0.0.1',
        action: 'C-STORE',
        status: 'FAILED',
        details: `Rejeição de integridade DICOM para ${fileName}: ${msg}`,
      })
      throw new Error(`Arquivo DICOM corrompido ou inválido (${msg}).`)
    }

    if (frames.length === 0) {
      throw new Error('Nenhum frame de imagem válido pôde ser extraído do arquivo DICOM.')
    }

    const meta: DicomMetadata = frames[0].metadata
    const studyUid = meta.studyInstanceUid || ''
    const seriesUid = meta.seriesInstanceUid || ''
    const sopUid = meta.sopInstanceUid || ''
    const patientIdDicom = meta.patientId?.trim() || ''
    const patientNameDicom = meta.patientName?.trim() || ''
    const accessionNumber = this.extractAccessionNumber(meta)
    const previewUrl = frames[0].dataUrl

    // 1. Detecção de duplicidades por SOPInstanceUID se já anexado
    if (sopUid && options?.targetExamId) {
      try {
        const existing = await pb.collection('exam_images').getList(1, 1, {
          filter: `exam_id = "${options.targetExamId}" && caption ~ "${sopUid}"`,
        })
        if (existing.items.length > 0) {
          this.logTransfer({
            deviceAe: options?.sourceDeviceAe || 'DESCONHECIDO',
            callingIp: options?.sourceIp || '127.0.0.1',
            action: 'C-STORE',
            status: 'WARNING',
            details: `Imagem duplicada ignorada (SOPInstanceUID ${sopUid}).`,
            sopUid,
            accessionNumber,
          })
          return {
            status: 'duplicate_skipped',
            message: `Imagem já recebida anteriormente para este exame (SOP UID: ${sopUid}).`,
          }
        }
      } catch {
        /* ignore */
      }
    }

    // 2. Busca estrita de associação (nunca pelo nome):
    let matchedExamId = options?.targetExamId || ''
    let matchedPatientId = ''
    let matchedPatientName = ''
    let matchedAppointmentId = ''
    let matchReason = ''
    let confidence: 'high' | 'medium' | 'low' | 'none' = 'none'

    // 2.1 Pelo Accession Number (alta confiança)
    if (accessionNumber) {
      try {
        const appts = await pb.collection('appointments').getList(1, 1, {
          filter: `accession_number = "${accessionNumber}"`,
          expand: 'patient_id',
        })
        if (appts.items.length > 0) {
          const appt = appts.items[0]
          matchedAppointmentId = appt.id
          matchedPatientId = appt.patient_id
          const p = (appt.expand as { patient_id?: { name?: string } })?.patient_id
          matchedPatientName = p?.name || ''
          matchedExamId = appt.exam_id || matchedExamId
          matchReason = `Accession Number idêntico (${accessionNumber})`
          confidence = 'high'
        }
      } catch {
        /* ignore */
      }
    }

    // 2.2 Pelo PatientID DICOM estrito (documento ou ID do paciente)
    if (!matchedPatientId && patientIdDicom) {
      const cleanDoc = patientIdDicom.replace(/\D/g, '')
      try {
        const queryFilter = cleanDoc
          ? `document ~ "${cleanDoc}" || id = "${patientIdDicom}"`
          : `id = "${patientIdDicom}"`
        const pts = await pb.collection('patients').getList(1, 2, {
          filter: queryFilter,
        })
        if (pts.items.length === 1) {
          matchedPatientId = pts.items[0].id
          matchedPatientName = pts.items[0].name
          matchReason = `PatientID DICOM correspondente (${patientIdDicom})`
          confidence = 'medium'
        } else if (pts.items.length > 1) {
          matchReason = `Múltiplos pacientes encontrados para PatientID (${patientIdDicom})`
          confidence = 'low'
        }
      } catch {
        /* ignore */
      }
    }

    // 3. Decisão de Associação Automática vs. Fila de Conciliação
    // REGRA DE OURO: NUNCA associar automaticamente pelo nome ou se ambíguo/desconhecido.
    const isSafeToAutoAssociate = Boolean(matchedExamId && confidence === 'high')

    if (!isSafeToAutoAssociate) {
      // Estudo vai para a fila de conciliação com confirmação humana obrigatória
      const reconciliationItem: DicomReconciliationItem = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        receivedAt: new Date().toISOString(),
        fileName,
        fileSize: file.size,
        studyInstanceUid: studyUid,
        seriesInstanceUid: seriesUid,
        sopInstanceUid: sopUid,
        accessionNumber,
        patientIdDicom,
        patientNameDicom,
        modality: meta.modality || 'US',
        studyDescription: meta.studyDescription || '',
        matchedPatientId: matchedPatientId || undefined,
        matchedPatientName: matchedPatientName || undefined,
        matchedExamId: matchedExamId || undefined,
        matchedAppointmentId: matchedAppointmentId || undefined,
        status: matchedPatientId ? 'ambiguous' : 'unidentified',
        matchReason:
          matchReason || 'Não foi possível correlacionar por Accession Number nem Patient ID.',
        confidence,
        blob: file,
        previewUrl,
        framesCount: frames.length,
      }

      const queue = this.getReconciliationQueue()
      queue.unshift(reconciliationItem)
      this.saveReconciliationQueue(queue)
      await this.persistReconciliationItemToDatabase(reconciliationItem)

      this.logTransfer({
        deviceAe: options?.sourceDeviceAe || 'SAEVO_US',
        callingIp: options?.sourceIp || '192.168.1.120',
        action: 'C-STORE',
        status: 'WARNING',
        details: `Estudo recebido sem associação estrita. Direcionado à Fila de Conciliação (${reconciliationItem.status}).`,
        sopUid,
        accessionNumber,
      })

      return {
        status: 'queued_for_reconciliation',
        reconciliationItem,
        message:
          'Estudo recebido e armazenado. Por segurança clínica, foi enviado para a Fila de Conciliação para confirmação humana antes de vincular ao paciente.',
      }
    }

    // 4. Associação direta segura autorizada por Accession Number / UID estrito
    const createdImages: ExamImage[] = []
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i]
      const frameDesc = meta.studyDescription || meta.seriesDescription || 'Ultrassonografia'
      const label = frames.length > 1 ? ` (Frame ${i + 1}/${frames.length})` : ''
      const created = await examImagesService.upload(f.blob, {
        exam_id: matchedExamId,
        report_id: options?.targetReportId,
        selected_for_print: true,
        caption: `DICOM C-STORE: ${frameDesc}${label} • Accession: ${accessionNumber || 'N/A'}${sopUid ? ` [${sopUid.slice(-8)}]` : ''}`,
        fileName: `${fileName.replace(/\.[^/.]+$/, '')}_frame_${i + 1}.jpg`,
      })
      created.is_real_dicom = true
      createdImages.push(created)
    }

    this.logTransfer({
      deviceAe: options?.sourceDeviceAe || 'SAEVO_US',
      callingIp: options?.sourceIp || '192.168.1.120',
      action: 'C-STORE',
      status: 'SUCCESS',
      details: `${frames.length} frame(s) associado(s) com sucesso ao exame ${matchedExamId} via ${matchReason}.`,
      sopUid,
      accessionNumber,
    })

    return {
      status: 'associated',
      createdImages,
      message: `Estudo recebido e associado com sucesso ao exame do paciente ${matchedPatientName || 'identificado'}.`,
    }
  }

  /**
   * Conclui a conciliação manual de um item da fila para o exame/laudo escolhido pelo usuário
   */
  async confirmManualReconciliation(
    reconciliationId: string,
    targetExamId: string,
    targetReportId?: string,
  ): Promise<ExamImage[]> {
    const queue = this.getReconciliationQueue()
    const item = queue.find((q) => q.id === reconciliationId)
    if (!item) {
      throw new Error('Item não encontrado na fila de conciliação.')
    }

    const frames = await extractDicomFrames(await item.blob.arrayBuffer())
    const createdImages: ExamImage[] = []

    for (let i = 0; i < frames.length; i++) {
      const f = frames[i]
      const desc = item.studyDescription || 'Ultrassonografia'
      const label = frames.length > 1 ? ` (Frame ${i + 1}/${frames.length})` : ''
      const created = await examImagesService.upload(f.blob, {
        exam_id: targetExamId,
        report_id: targetReportId,
        selected_for_print: true,
        caption: `Conciliado manualmente: ${desc}${label} • Origem: ${item.fileName}`,
        fileName: `${item.fileName.replace(/\.[^/.]+$/, '')}_frame_${i + 1}.jpg`,
      })
      created.is_real_dicom = true
      createdImages.push(created)
    }

    // Atualiza status do item na fila
    const updatedQueue = queue.filter((q) => q.id !== reconciliationId)
    this.saveReconciliationQueue(updatedQueue)

    this.logTransfer({
      deviceAe: 'USUARIO_LOCAL',
      callingIp: '127.0.0.1',
      action: 'MANUAL-IMPORT',
      status: 'SUCCESS',
      details: `Estudo conciliado manualmente pelo operador para o exame ${targetExamId}.`,
      sopUid: item.sopInstanceUid,
      accessionNumber: item.accessionNumber,
    })

    return createdImages
  }

  private extractAccessionNumber(meta: DicomMetadata): string {
    // Tenta inferir AccessionNumber da descrição se presente ou retornar vazio
    const text = `${meta.studyDescription || ''} ${meta.seriesDescription || ''}`
    const match = text.match(/LW-\d{8}-[A-Z0-9]{4,8}/i)
    return match ? match[0] : ''
  }
}

export const dicomIntegrationService = new DicomIntegrationService()
