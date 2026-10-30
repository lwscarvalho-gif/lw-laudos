import pb from '@/lib/pocketbase/client'

export interface OrthancConfig {
  serverUrl: string
  aet?: string
  username?: string
  password?: string
  isAutoImportEnabled?: boolean
}

const LOCAL_STORAGE_KEY = 'lw_laudos_orthanc_config_v1'

export interface OrthancStatusResponse {
  configured: boolean
  serverUrl: string | null
  reachable: boolean
  systemInfo?: {
    Name?: string
    Version?: string
    DicomAet?: string
    DicomPort?: number
    HttpPort?: number
  } | null
  error?: string | null
  message: string
}

export interface OrthancStudy {
  id: string
  patientName: string
  patientId: string
  patientBirthDate?: string
  patientSex?: string
  studyDate: string
  studyTime?: string
  studyDescription: string
  accessionNumber: string
  modality: string
  seriesCount: number
}

export interface OrthancSearchResponse {
  count: number
  studies: OrthancStudy[]
}

export interface OrthancStudyInstancesResponse {
  studyId: string
  instancesCount: number
  instances: Array<{
    instanceId: string
    seriesId: string
    modality: string
    seriesDescription: string
  }>
}

export const orthancPacsService = {
  getLocalConfig(): OrthancConfig {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (raw) {
        return JSON.parse(raw)
      }
    } catch {
      /* intentionally ignored */
    }
    return {
      serverUrl: 'http://localhost:8042',
      aet: 'LW-ORTHO',
      username: '',
      password: '',
      isAutoImportEnabled: false,
    }
  },

  saveLocalConfig(config: OrthancConfig): OrthancConfig {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config))
    return config
  },

  async getStatus(): Promise<OrthancStatusResponse> {
    const config = this.getLocalConfig()
    try {
      const res = await pb.send<OrthancStatusResponse>('/backend/v1/pacs/orthanc/status', {
        method: 'GET',
      })
      // If backend has no env var ORTHANC_URL, inform with local config awareness
      if (!res.configured && config.serverUrl) {
        return {
          ...res,
          serverUrl: config.serverUrl,
          message: `Orthanc configurado localmente (${config.serverUrl}). Use o botão de busca ou teste de conectividade.`,
        }
      }
      return res
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na requisição'
      return {
        configured: false,
        serverUrl: config.serverUrl || null,
        reachable: false,
        message: `Serviço do Orthanc indisponível: ${msg}`,
        error: msg,
      }
    }
  },

  async searchStudies(params: {
    patientName?: string
    patientId?: string
    accessionNumber?: string
    studyDate?: string
    serverUrl?: string
  }): Promise<OrthancStudy[]> {
    const config = this.getLocalConfig()
    const serverUrl = params.serverUrl || config.serverUrl || 'http://localhost:8042'

    const res = await pb.send<OrthancSearchResponse>('/backend/v1/pacs/orthanc/search', {
      method: 'POST',
      body: {
        patientName: params.patientName,
        patientId: params.patientId,
        accessionNumber: params.accessionNumber,
        studyDate: params.studyDate,
        serverUrl: serverUrl,
      },
    })

    return res.studies || []
  },

  async getStudyInstances(
    studyId: string,
    serverUrl?: string,
  ): Promise<OrthancStudyInstancesResponse> {
    const config = this.getLocalConfig()
    const finalServerUrl = serverUrl || config.serverUrl || 'http://localhost:8042'

    return pb.send<OrthancStudyInstancesResponse>('/backend/v1/pacs/orthanc/study-instances', {
      method: 'POST',
      body: {
        studyId: studyId,
        serverUrl: finalServerUrl,
      },
    })
  },

  getInstanceRenderUrl(instanceId: string, frame = 0, serverUrl?: string): string {
    const config = this.getLocalConfig()
    const finalServerUrl = serverUrl || config.serverUrl || 'http://localhost:8042'
    const baseUrl = pb.baseUrl.replace(/\/+$/, '')
    const token = pb.authStore.token
    return `${baseUrl}/backend/v1/pacs/orthanc/render-instance?instanceId=${encodeURIComponent(instanceId)}&frame=${frame}&serverUrl=${encodeURIComponent(finalServerUrl)}&token=${encodeURIComponent(token)}`
  },

  async fetchInstanceBlob(instanceId: string, frame = 0, serverUrl?: string): Promise<Blob> {
    const config = this.getLocalConfig()
    const finalServerUrl = serverUrl || config.serverUrl || 'http://localhost:8042'
    const token = pb.authStore.token
    const baseUrl = pb.baseUrl.replace(/\/+$/, '')
    const url = `${baseUrl}/backend/v1/pacs/orthanc/render-instance?instanceId=${encodeURIComponent(instanceId)}&frame=${frame}&serverUrl=${encodeURIComponent(finalServerUrl)}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Falha ao baixar imagem do Orthanc (HTTP ${response.status})`)
    }

    return response.blob()
  },
}
