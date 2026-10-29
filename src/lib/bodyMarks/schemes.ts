import type { BodyMarkPoint, BodyMarkSchemeId } from '@/types'

export interface AnatomicalSchemeDefinition {
  id: BodyMarkSchemeId
  title: string
  subtitle: string
  organScope: string
  defaultSide?: 'Direito' | 'Esquerdo' | 'Bilateral' | 'Não se aplica'
  supportsClockHour?: boolean
  supportsQuadrants?: boolean
  supportsDistance?: boolean
  supportsDIU?: boolean
  supportsTendons?: boolean
}

export const ANATOMICAL_SCHEMES: Record<
  Exclude<BodyMarkSchemeId, 'none'>,
  AnatomicalSchemeDefinition
> = {
  mama_direita: {
    id: 'mama_direita',
    title: 'Mama Direita',
    subtitle: 'Divisão em 4 quadrantes e escala horária 1–12 em torno da papila',
    organScope: 'Mama',
    defaultSide: 'Direito',
    supportsClockHour: true,
    supportsQuadrants: true,
    supportsDistance: true,
  },
  mama_esquerda: {
    id: 'mama_esquerda',
    title: 'Mama Esquerda',
    subtitle: 'Divisão em 4 quadrantes e escala horária 1–12 em torno da papila',
    organScope: 'Mama',
    defaultSide: 'Esquerdo',
    supportsClockHour: true,
    supportsQuadrants: true,
    supportsDistance: true,
  },
  utero_transvaginal: {
    id: 'utero_transvaginal',
    title: 'Útero e Pelve (Ultrassom Transvaginal / DIU)',
    subtitle: 'Corpo, fundo e colo uterino, endométrio e posicionamento de DIU',
    organScope: 'Pelve feminina',
    defaultSide: 'Não se aplica',
    supportsDIU: true,
  },
  ombro_articular: {
    id: 'ombro_articular',
    title: 'Articulação do Ombro (Manguito Rotador)',
    subtitle: 'Tendões supraespinhal, infraespinhal, subescapular e bíceps longo',
    organScope: 'Articular',
    defaultSide: 'Direito',
    supportsTendons: true,
  },
  tireoide: {
    id: 'tireoide',
    title: 'Tireoide (Lóbulo D, E e Istmo)',
    subtitle: 'Visão transversal e longitudinal dos lobos e istmo tireoidiano',
    organScope: 'Cervical',
    defaultSide: 'Bilateral',
  },
  abdome_fatia: {
    id: 'abdome_fatia',
    title: 'Fatia Abdominal Simplificada',
    subtitle: 'Fígado, vesícula biliar, pâncreas, baço, rins D/E e bexiga',
    organScope: 'Abdome',
    defaultSide: 'Bilateral',
  },
}

export const TENDON_OPTIONS = [
  'Supraespinhal',
  'Infraespinhal',
  'Subescapular',
  'Tendão longo do bíceps',
  'Outro',
] as const

export const LESION_GRADE_OPTIONS = [
  'Grau 1 (leve)',
  'Grau 2 (moderada)',
  'Grau 3 (grave)',
  'Ruptura parcial',
  'Ruptura completa',
  'Não se aplica',
] as const

export const QUADRANT_OPTIONS = [
  'Superomedial',
  'Superolateral',
  'Inferomedial',
  'Inferolateral',
  'Retroareolar',
  'Não se aplica',
] as const

export const DEVICE_STATUS_OPTIONS = [
  'Normoposicionado',
  'Mal posicionado',
  'Não se aplica',
] as const
