import pb from '@/lib/pocketbase/client'

export interface ReferringPhysician {
  id: string
  name: string
  name_normalized: string
  clinic_location?: string
  created_by_id?: string
  created_by_name?: string
  notes?: string
  created?: string
  updated?: string
}

export function normalizePhysicianName(name: string): string {
  if (!name) return ''
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[.\-_]/g, ' ') // pontuações viram espaço
    .replace(/\s+/g, ' ') // normaliza espaços múltiplos
}

class ReferringPhysiciansService {
  async search(query: string, clinicLocation?: string): Promise<ReferringPhysician[]> {
    try {
      const normalized = normalizePhysicianName(query)
      let filter = ''
      if (normalized) {
        filter = `name_normalized ~ "${normalized}" || name ~ "${query.trim()}"`
      }
      if (clinicLocation) {
        const clinicFilter = `clinic_location = "${clinicLocation}" || clinic_location = ""`
        filter = filter ? `(${filter}) && (${clinicFilter})` : clinicFilter
      }

      const res = await pb.collection('referring_physicians').getList<ReferringPhysician>(1, 20, {
        filter: filter || undefined,
        sort: 'name',
      })
      return res.items
    } catch (err) {
      console.error('Erro ao buscar médicos solicitantes:', err)
      return []
    }
  }

  async getAll(clinicLocation?: string): Promise<ReferringPhysician[]> {
    try {
      let filter = ''
      if (clinicLocation) {
        filter = `clinic_location = "${clinicLocation}" || clinic_location = ""`
      }
      const records = await pb.collection('referring_physicians').getFullList<ReferringPhysician>({
        filter: filter || undefined,
        sort: 'name',
      })
      return records
    } catch (err) {
      console.error('Erro ao listar médicos solicitantes:', err)
      return []
    }
  }

  async findExactOrNormalized(
    name: string,
    clinicLocation?: string,
  ): Promise<ReferringPhysician | null> {
    const norm = normalizePhysicianName(name)
    if (!norm) return null
    try {
      let filter = `name_normalized = "${norm}"`
      if (clinicLocation) {
        filter += ` && (clinic_location = "${clinicLocation}" || clinic_location = "")`
      }
      const record = await pb
        .collection('referring_physicians')
        .getFirstListItem<ReferringPhysician>(filter)
      return record
    } catch {
      return null
    }
  }

  async createQuick(
    name: string,
    options?: {
      clinicLocation?: string
      createdById?: string
      createdByName?: string
      notes?: string
    },
  ): Promise<ReferringPhysician> {
    const cleanName = name.trim()
    const norm = normalizePhysicianName(cleanName)

    // Antes de criar, verifica correspondência exata normalizada para evitar duplicatas
    const existing = await this.findExactOrNormalized(cleanName, options?.clinicLocation)
    if (existing) {
      return existing
    }

    const payload: Partial<ReferringPhysician> = {
      name: cleanName,
      name_normalized: norm,
      clinic_location: options?.clinicLocation || '',
      created_by_id: options?.createdById,
      created_by_name: options?.createdByName,
      notes: options?.notes || '',
    }

    return await pb.collection('referring_physicians').create<ReferringPhysician>(payload)
  }
}

export const referringPhysiciansService = new ReferringPhysiciansService()
