import type { BodyMarkPoint, BodyMarkSchemeId } from '@/types'
import { ANATOMICAL_SCHEMES } from './schemes'

/**
 * Builds standard clinical SVG string with crisp vector lines, anatomic labels
 * in Portuguese, and numbered marker badges. Pure standalone SVG without external assets.
 */
export function buildBodyMarkSvgString(
  schemeId: BodyMarkSchemeId,
  points: BodyMarkPoint[] = [],
  options: {
    width?: number
    height?: number
    activePointId?: string
    showBackground?: boolean
  } = {},
): string {
  const width = options.width || 600
  const height = options.height || 450
  const showBg = options.showBackground !== false

  if (schemeId === 'none') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="${showBg ? '#F8FAF9' : 'none'}" rx="8" />
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="14" fill="#8A9691">
        Nenhum esquema anatômico selecionado
      </text>
    </svg>`
  }

  let anatomyContent = ''
  switch (schemeId) {
    case 'mama_bilateral':
      anatomyContent = renderBilateralBreastSvg()
      break
    case 'mama_direita':
      anatomyContent = renderBreastSvg(true)
      break
    case 'mama_esquerda':
      anatomyContent = renderBreastSvg(false)
      break
    case 'utero_transvaginal':
      anatomyContent = renderUterusSvg(points)
      break
    case 'ombro_articular':
      anatomyContent = renderShoulderSvg()
      break
    case 'tireoide':
      anatomyContent = renderThyroidSvg()
      break
    case 'abdome_fatia':
      anatomyContent = renderAbdomenSvg()
      break
    default:
      anatomyContent = ''
  }

  const markersContent = points
    .map((pt) => {
      const px = Math.round(pt.x * 600)
      const py = Math.round(pt.y * 450)
      const isActive = pt.id === options.activePointId

      const fill = isActive ? '#0C6B58' : '#DC2626'
      const stroke = '#FFFFFF'
      const ring = isActive
        ? `<circle cx="${px}" cy="${py}" r="17" fill="none" stroke="#0C6B58" stroke-width="2.5" stroke-dasharray="3,2" opacity="0.8"/>`
        : ''

      // Custom badge if it is a DIU marker
      const isDiuMarker =
        pt.deviceStatus === 'Mal posicionado' || pt.deviceStatus === 'Normoposicionado'
      const diuBadge = isDiuMarker
        ? `<path d="M ${px - 6} ${py - 12} L ${px + 6} ${py - 12} M ${px} ${py - 12} L ${px} ${py - 2}" stroke="#B45309" stroke-width="2" stroke-linecap="round"/>`
        : ''

      return `
        <g class="body-mark-point" data-id="${pt.id}" transform="translate(0, 0)">
          ${ring}
          <circle cx="${px}" cy="${py}" r="13" fill="${fill}" stroke="${stroke}" stroke-width="2.2" filter="drop-shadow(0px 2px 3px rgba(0,0,0,0.25))" />
          <text x="${px}" y="${py + 4.5}" text-anchor="middle" font-family="-apple-system, sans-serif" font-weight="bold" font-size="11" fill="#FFFFFF">${pt.number}</text>
          ${diuBadge}
        </g>
      `
    })
    .join('')

  const schemeMeta = ANATOMICAL_SCHEMES[schemeId]
  const titleText = schemeMeta ? schemeMeta.title : ''
  const subText = schemeMeta ? schemeMeta.subtitle : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="${width}" height="${height}" style="user-select:none;">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FBFDFD"/>
        <stop offset="100%" stop-color="#F2F6F5"/>
      </linearGradient>
      <linearGradient id="organGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#E9F3F0"/>
        <stop offset="100%" stop-color="#D7E7E2"/>
      </linearGradient>
      <linearGradient id="muscleGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#F5EFEA"/>
        <stop offset="100%" stop-color="#E8DDD2"/>
      </linearGradient>
      <linearGradient id="boneGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FCFCFC"/>
        <stop offset="100%" stop-color="#E7ECE9"/>
      </linearGradient>
    </defs>
    ${showBg ? '<rect width="600" height="450" fill="url(#bgGrad)" stroke="#D6DDD9" stroke-width="1.2" rx="10"/>' : ''}
    
    <!-- Title banner inside SVG -->
    <g id="header">
      <rect x="16" y="14" width="568" height="34" rx="6" fill="#FFFFFF" stroke="#E2E8E5" stroke-width="1" />
      <circle cx="32" cy="31" r="5" fill="#0C6B58" />
      <text x="46" y="35" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="700" font-size="12" fill="#0C6B58" letter-spacing="0.5">ESQUEMA ANATÔMICO: ${titleText.toUpperCase()}</text>
      <text x="570" y="35" text-anchor="end" font-family="-apple-system, sans-serif" font-size="9" fill="#718079">LW Laudos • Body Mark</text>
    </g>

    <!-- Anatomical illustration layer -->
    <g id="anatomy" transform="translate(0, 10)">
      ${anatomyContent}
    </g>

    <!-- Markers layer -->
    <g id="markers">
      ${markersContent}
    </g>

    <!-- Footer caption hint -->
    <text x="300" y="440" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="8.5" fill="#8A9691">
      ${subText}
    </text>
  </svg>`
}

/**
 * BILATERAL BREASTS (MAMA DIREITA + MAMA ESQUERDA SIMULTÂNEAS)
 */
function renderBilateralBreastSvg(): string {
  // Coordenadas centrais das duas mamas na mesma prancha
  const cy = 230
  const rBreast = 100
  const rClock = 78

  // Mama Direita (cx = 170)
  const cxR = 170
  let clockR = ''
  for (let h = 1; h <= 12; h++) {
    const angleRad = ((h * 30 - 90) * Math.PI) / 180
    const nx = cxR + rClock * Math.cos(angleRad)
    const ny = cy + rClock * Math.sin(angleRad) + 3
    clockR += `
      <circle cx="${nx}" cy="${ny - 3}" r="6.5" fill="#FFFFFF" stroke="#0C6B58" stroke-width="0.8" opacity="0.9"/>
      <text x="${nx}" y="${ny}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="7.5" font-weight="700" fill="#0C6B58">${h}h</text>
    `
  }

  // Mama Esquerda (cx = 430)
  const cxL = 430
  let clockL = ''
  for (let h = 1; h <= 12; h++) {
    const angleRad = ((h * 30 - 90) * Math.PI) / 180
    const nx = cxL + rClock * Math.cos(angleRad)
    const ny = cy + rClock * Math.sin(angleRad) + 3
    clockL += `
      <circle cx="${nx}" cy="${ny - 3}" r="6.5" fill="#FFFFFF" stroke="#0C6B58" stroke-width="0.8" opacity="0.9"/>
      <text x="${nx}" y="${ny}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="7.5" font-weight="700" fill="#0C6B58">${h}h</text>
    `
  }

  return `
    <g id="bilateral-breast-anatomy">
      <!-- Mama Direita (MD) -->
      <g id="mama-direita-bilat">
        <circle cx="${cxR}" cy="${cy}" r="${rBreast}" fill="url(#organGrad)" stroke="#0C6B58" stroke-width="2" />
        <circle cx="${cxR}" cy="${cy}" r="55" fill="none" stroke="#B8CCC5" stroke-width="1" stroke-dasharray="2,2"/>
        <line x1="${cxR - rBreast - 10}" y1="${cy}" x2="${cxR + rBreast + 10}" y2="${cy}" stroke="#0C6B58" stroke-width="1.2" />
        <line x1="${cxR}" y1="${cy - rBreast - 10}" x2="${cxR}" y2="${cy + rBreast + 10}" stroke="#0C6B58" stroke-width="1.2" />
        <circle cx="${cxR}" cy="${cy}" r="18" fill="#D3B89C" stroke="#A78263" stroke-width="1.2" />
        <circle cx="${cxR}" cy="${cy}" r="7" fill="#8F6244" />
        <text x="${cxR}" y="${cy + 2.5}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="6" font-weight="bold" fill="#FFFFFF">MD</text>
        ${clockR}
        <rect x="${cxR - 70}" y="${cy - rBreast - 32}" width="140" height="18" rx="4" fill="#0C6B58" />
        <text x="${cxR}" y="${cy - rBreast - 20}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9" font-weight="bold" fill="#FFFFFF">MAMA DIREITA (MD)</text>
        <text x="${cxR - 55}" y="${cy - 60}" font-family="-apple-system, sans-serif" font-size="8" font-weight="bold" fill="#0C6B58">QSL</text>
        <text x="${cxR + 35}" y="${cy - 60}" font-family="-apple-system, sans-serif" font-size="8" font-weight="bold" fill="#0C6B58">QSM</text>
        <text x="${cxR - 55}" y="${cy + 68}" font-family="-apple-system, sans-serif" font-size="8" font-weight="bold" fill="#0C6B58">QIL</text>
        <text x="${cxR + 35}" y="${cy + 68}" font-family="-apple-system, sans-serif" font-size="8" font-weight="bold" fill="#0C6B58">QIM</text>
      </g>

      <!-- Divisória Esternal Central -->
      <line x1="300" y1="100" x2="300" y2="380" stroke="#CCD7D3" stroke-width="1.5" stroke-dasharray="4,3" />
      <rect x="260" y="235" width="80" height="16" rx="3" fill="#FFFFFF" stroke="#CCD7D3" stroke-width="1" />
      <text x="300" y="246" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="7.5" font-weight="bold" fill="#718079">ESTERNO</text>

      <!-- Mama Esquerda (ME) -->
      <g id="mama-esquerda-bilat">
        <circle cx="${cxL}" cy="${cy}" r="${rBreast}" fill="url(#organGrad)" stroke="#0C6B58" stroke-width="2" />
        <circle cx="${cxL}" cy="${cy}" r="55" fill="none" stroke="#B8CCC5" stroke-width="1" stroke-dasharray="2,2"/>
        <line x1="${cxL - rBreast - 10}" y1="${cy}" x2="${cxL + rBreast + 10}" y2="${cy}" stroke="#0C6B58" stroke-width="1.2" />
        <line x1="${cxL}" y1="${cy - rBreast - 10}" x2="${cxL}" y2="${cy + rBreast + 10}" stroke="#0C6B58" stroke-width="1.2" />
        <circle cx="${cxL}" cy="${cy}" r="18" fill="#D3B89C" stroke="#A78263" stroke-width="1.2" />
        <circle cx="${cxL}" cy="${cy}" r="7" fill="#8F6244" />
        <text x="${cxL}" y="${cy + 2.5}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="6" font-weight="bold" fill="#FFFFFF">ME</text>
        ${clockL}
        <rect x="${cxL - 70}" y="${cy - rBreast - 32}" width="140" height="18" rx="4" fill="#0C6B58" />
        <text x="${cxL}" y="${cy - rBreast - 20}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9" font-weight="bold" fill="#FFFFFF">MAMA ESQUERDA (ME)</text>
        <text x="${cxL - 55}" y="${cy - 60}" font-family="-apple-system, sans-serif" font-size="8" font-weight="bold" fill="#0C6B58">QSM</text>
        <text x="${cxL + 35}" y="${cy - 60}" font-family="-apple-system, sans-serif" font-size="8" font-weight="bold" fill="#0C6B58">QSL</text>
        <text x="${cxL - 55}" y="${cy + 68}" font-family="-apple-system, sans-serif" font-size="8" font-weight="bold" fill="#0C6B58">QIM</text>
        <text x="${cxL + 35}" y="${cy + 68}" font-family="-apple-system, sans-serif" font-size="8" font-weight="bold" fill="#0C6B58">QIL</text>
      </g>
    </g>
  `
}

/**
 * BREAST (MAMA DIREITA / MAMA ESQUERDA)
 * Divided into 4 quadrants with 1-12 clock scale around the nipple.
 */
function renderBreastSvg(isRight: boolean): string {
  // Center of breast nipple
  const cx = 300
  const cy = 235
  const rBreast = 150
  const rInner = 90
  const rClock = 118

  // Quadrant labels:
  // For RIGHT breast: lateral is to the viewer's LEFT (patient's right), medial is viewer's RIGHT.
  // For LEFT breast: medial is viewer's LEFT, lateral is viewer's RIGHT.
  const qTopMed = isRight ? 'QSM (Superomedial)' : 'QSL (Superolateral)'
  const qTopLat = isRight ? 'QSL (Superolateral)' : 'QSM (Superomedial)'
  const qBotMed = isRight ? 'QIM (Inferomedial)' : 'QIL (Inferolateral)'
  const qBotLat = isRight ? 'QIL (Inferolateral)' : 'QIM (Inferomedial)'

  const sideLabel = isRight ? 'MAMA DIREITA (MD)' : 'MAMA ESQUERDA (ME)'
  const medialSideNote = isRight
    ? '← Lateral (Axilar) | Medial (Esternal) →'
    : '← Medial (Esternal) | Lateral (Axilar) →'

  // Clock numbers around the nipple (1 to 12)
  let clockNumbers = ''
  for (let h = 1; h <= 12; h++) {
    const angleRad = ((h * 30 - 90) * Math.PI) / 180
    const nx = cx + rClock * Math.cos(angleRad)
    const ny = cy + rClock * Math.sin(angleRad) + 4
    clockNumbers += `
      <g>
        <circle cx="${nx}" cy="${ny - 4}" r="9" fill="#FFFFFF" stroke="#0C6B58" stroke-width="1" opacity="0.85"/>
        <text x="${nx}" y="${ny}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="10" font-weight="700" fill="#0C6B58">${h}h</text>
      </g>
    `
  }

  // Radiating hour ticks
  let hourTicks = ''
  for (let h = 1; h <= 12; h++) {
    const angleRad = ((h * 30 - 90) * Math.PI) / 180
    const x1 = cx + 32 * Math.cos(angleRad)
    const y1 = cy + 32 * Math.sin(angleRad)
    const x2 = cx + (rBreast - 4) * Math.cos(angleRad)
    const y2 = cy + (rBreast - 4) * Math.sin(angleRad)
    hourTicks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#D1DDD8" stroke-width="1" stroke-dasharray="3,3"/>`
  }

  return `
    <g id="breast-anatomy">
      <!-- Outer contour & axillary tail of Spence -->
      ${
        isRight
          ? `<path d="M ${cx - 70} ${cy - 120} C ${cx - 150} ${cy - 160} ${cx - 200} ${cy - 130} ${cx - 180} ${cy - 70} C ${cx - 160} ${cy - 20} ${cx - 170} ${cy + 60} ${cx - 100} ${cy + 130} C ${cx - 30} ${cy + 160} ${cx + 70} ${cy + 160} ${cx + 140} ${cy + 110} C ${cx + 180} ${cy + 50} ${cx + 170} ${cy - 50} ${cx + 120} ${cy - 110} C ${cx + 60} ${cy - 150} ${cx - 20} ${cy - 150} ${cx - 70} ${cy - 120} Z" fill="url(#organGrad)" stroke="#0C6B58" stroke-width="2.5" />`
          : `<path d="M ${cx + 70} ${cy - 120} C ${cx + 150} ${cy - 160} ${cx + 200} ${cy - 130} ${cx + 180} ${cy - 70} C ${cx + 160} ${cy - 20} ${cx + 170} ${cy + 60} ${cx + 100} ${cy + 130} C ${cx + 30} ${cy + 160} ${cx - 70} ${cy + 160} ${cx - 140} ${cy + 110} C ${cx - 180} ${cy + 50} ${cx - 170} ${cy - 50} ${cx - 120} ${cy - 110} C ${cx - 60} ${cy - 150} ${cx + 20} ${cy - 150} ${cx + 70} ${cy - 120} Z" fill="url(#organGrad)" stroke="#0C6B58" stroke-width="2.5" />`
      }

      <!-- Concentric distance guide rings (2cm, 4cm, 6cm approx) -->
      <circle cx="${cx}" cy="${cy}" r="45" fill="none" stroke="#B8CCC5" stroke-width="1" stroke-dasharray="2,2"/>
      <circle cx="${cx}" cy="${cy}" r="${rInner}" fill="none" stroke="#B8CCC5" stroke-width="1.2" stroke-dasharray="3,3"/>
      <circle cx="${cx}" cy="${cy}" r="${rBreast - 12}" fill="none" stroke="#B8CCC5" stroke-width="1" stroke-dasharray="4,4"/>

      <!-- Radiating hour lines -->
      ${hourTicks}

      <!-- 4 Quadrants main orthogonal axes -->
      <line x1="${cx - rBreast - 20}" y1="${cy}" x2="${cx + rBreast + 20}" y2="${cy}" stroke="#0C6B58" stroke-width="1.8" />
      <line x1="${cx}" y1="${cy - rBreast - 20}" x2="${cx}" y2="${cy + rBreast + 20}" stroke="#0C6B58" stroke-width="1.8" />

      <!-- Areola and Papilla (Nipple) -->
      <circle cx="${cx}" cy="${cy}" r="28" fill="#D3B89C" stroke="#A78263" stroke-width="1.5" opacity="0.8" />
      <circle cx="${cx}" cy="${cy}" r="11" fill="#8F6244" stroke="#5E3F28" stroke-width="1.5" />
      <text x="${cx}" y="${cy + 3}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="8" font-weight="bold" fill="#FFFFFF">PAPILA</text>

      <!-- Quadrant labels with background plates -->
      <!-- Top Left (viewer) -->
      <rect x="${cx - 155}" y="${cy - 110}" width="120" height="18" rx="4" fill="#FFFFFF" stroke="#0C6B58" stroke-width="1" opacity="0.95"/>
      <text x="${cx - 95}" y="${cy - 97}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9" font-weight="700" fill="#0C6B58">${qTopLat}</text>

      <!-- Top Right (viewer) -->
      <rect x="${cx + 35}" y="${cy - 110}" width="120" height="18" rx="4" fill="#FFFFFF" stroke="#0C6B58" stroke-width="1" opacity="0.95"/>
      <text x="${cx + 95}" y="${cy - 97}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9" font-weight="700" fill="#0C6B58">${qTopMed}</text>

      <!-- Bottom Left (viewer) -->
      <rect x="${cx - 155}" y="${cy + 92}" width="120" height="18" rx="4" fill="#FFFFFF" stroke="#0C6B58" stroke-width="1" opacity="0.95"/>
      <text x="${cx - 95}" y="${cy + 105}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9" font-weight="700" fill="#0C6B58">${qBotLat}</text>

      <!-- Bottom Right (viewer) -->
      <rect x="${cx + 35}" y="${cy + 92}" width="120" height="18" rx="4" fill="#FFFFFF" stroke="#0C6B58" stroke-width="1" opacity="0.95"/>
      <text x="${cx + 95}" y="${cy + 105}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9" font-weight="700" fill="#0C6B58">${qBotMed}</text>

      <!-- Clock badges -->
      ${clockNumbers}

      <!-- Header banner for side -->
      <rect x="${cx - 110}" y="48" width="220" height="22" rx="4" fill="#0C6B58" />
      <text x="${cx}" y="63" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF">${sideLabel}</text>
      <text x="${cx}" y="80" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="8.5" font-weight="600" fill="#5F6E69">${medialSideNote}</text>
    </g>
  `
}

/**
 * UTERUS & TRANSVAGINAL ULTRASOUND SCHEME (WITH DIU SHAPE & STATUS)
 */
function renderUterusSvg(points: BodyMarkPoint[]): string {
  // Check if any mark has malpositioned or normopositioned DIU
  const diuMark = points.find(
    (p) => p.deviceStatus === 'Mal posicionado' || p.deviceStatus === 'Normoposicionado',
  )
  const isMalpositioned = diuMark?.deviceStatus === 'Mal posicionado'
  const diuColor = isMalpositioned ? '#DC2626' : '#0C6B58'
  const diuStatusText = diuMark
    ? `DIU: ${diuMark.deviceStatus?.toUpperCase()}`
    : 'DIU (Dispositivo Intrauterino): Marque a posição no endométrio'

  return `
    <g id="uterus-anatomy">
      <!-- Fallopian tubes and ovaries -->
      <!-- Left tube (viewer left) -->
      <path d="M 230 145 C 180 130 140 140 110 165 C 100 175 95 195 110 205 C 125 210 135 190 145 180 C 170 160 205 165 235 168" fill="none" stroke="#A85751" stroke-width="3" stroke-linecap="round" />
      <ellipse cx="95" cy="205" rx="26" ry="17" fill="#F8E8E6" stroke="#A85751" stroke-width="1.8" />
      <text x="95" y="209" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="8.5" font-weight="700" fill="#A85751">Ovário D</text>

      <!-- Right tube (viewer right) -->
      <path d="M 370 145 C 420 130 460 140 490 165 C 500 175 505 195 490 205 C 475 210 465 190 455 180 C 430 160 395 165 365 168" fill="none" stroke="#A85751" stroke-width="3" stroke-linecap="round" />
      <ellipse cx="505" cy="205" rx="26" ry="17" fill="#F8E8E6" stroke="#A85751" stroke-width="1.8" />
      <text x="505" y="209" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="8.5" font-weight="700" fill="#A85751">Ovário E</text>

      <!-- Uterine Body and Fundus (Miometrium) -->
      <path d="M 235 150 C 255 125 345 125 365 150 C 390 185 375 250 350 280 C 340 295 335 320 332 355 C 330 368 270 368 268 355 C 265 320 260 295 250 280 C 225 250 210 185 235 150 Z"
        fill="url(#muscleGrad)" stroke="#0C6B58" stroke-width="2.5" />

      <!-- Endometrial Cavity (Central lumen) -->
      <path d="M 268 165 C 280 155 320 155 332 165 C 335 180 325 220 310 245 C 304 255 303 295 303 335 L 297 335 C 297 295 296 255 290 245 C 275 220 265 180 268 165 Z"
        fill="#FFFFFF" stroke="#B87D7D" stroke-width="2" />

      <!-- Cervical Canal & Os -->
      <rect x="288" y="335" width="24" height="25" fill="#E8DDD2" stroke="#0C6B58" stroke-width="1.5" />
      <line x1="300" y1="335" x2="300" y2="360" stroke="#B87D7D" stroke-width="2" />

      <!-- Ideal DIU representation in fundo uterino (reference outline) -->
      <g opacity="0.6">
        <path d="M 285 178 L 315 178 M 300 178 L 300 212" stroke="#0C6B58" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="300" cy="178" r="2.5" fill="#0C6B58" />
        <line x1="300" y1="212" x2="297" y2="240" stroke="#718079" stroke-width="1" stroke-dasharray="2,2" />
      </g>

      <!-- Anatomical Labels -->
      <rect x="250" y="98" width="100" height="18" rx="4" fill="#FFFFFF" stroke="#0C6B58" stroke-width="1" />
      <text x="300" y="111" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9" font-weight="700" fill="#0C6B58">Fundo Uterino</text>

      <text x="210" y="225" text-anchor="end" font-family="-apple-system, sans-serif" font-size="9" font-weight="600" fill="#1F2A27">Miométrio</text>
      <line x1="214" y1="222" x2="242" y2="222" stroke="#1F2A27" stroke-width="1" />

      <text x="390" y="210" text-anchor="start" font-family="-apple-system, sans-serif" font-size="9" font-weight="600" fill="#B87D7D">Endométrio</text>
      <line x1="386" y1="207" x2="320" y2="207" stroke="#B87D7D" stroke-width="1" />

      <text x="390" y="350" text-anchor="start" font-family="-apple-system, sans-serif" font-size="9" font-weight="600" fill="#1F2A27">Colo Uterino / Canal</text>
      <line x1="386" y1="347" x2="315" y2="347" stroke="#1F2A27" stroke-width="1" />

      <!-- DIU status banner at bottom -->
      <rect x="110" y="380" width="380" height="26" rx="6" fill="${isMalpositioned ? '#FEF2F2' : '#F0FDF4'}" stroke="${diuColor}" stroke-width="1.2" />
      <text x="300" y="397" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="10" font-weight="bold" fill="${diuColor}">
        ${diuStatusText}
      </text>
    </g>
  `
}

/**
 * SHOULDER JOINT & ROTATOR CUFF SCHEME (4 ROTATOR TENDONS LABELED)
 */
function renderShoulderSvg(): string {
  return `
    <g id="shoulder-anatomy">
      <!-- Clavicle and Acromion -->
      <path d="M 120 110 C 180 100 260 102 320 120 C 340 125 365 140 375 160 C 375 175 360 185 340 180 C 315 175 270 170 230 172"
        fill="url(#boneGrad)" stroke="#4A5568" stroke-width="2" />
      <text x="210" y="125" font-family="-apple-system, sans-serif" font-size="9" font-weight="700" fill="#4A5568">Clavícula / Acrômio</text>

      <!-- Glenoid & Scapula outline -->
      <path d="M 180 175 C 210 180 235 200 240 230 C 245 260 230 310 200 360 C 180 390 140 370 130 330 C 120 280 135 200 180 175 Z"
        fill="url(#boneGrad)" stroke="#4A5568" stroke-width="2" />
      <text x="175" y="280" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9" font-weight="700" fill="#718079">Escápula</text>

      <!-- Humerus head and shaft -->
      <path d="M 320 190 C 360 170 415 190 430 230 C 445 270 435 295 410 310 L 400 400 L 340 400 L 335 305 C 310 290 295 260 300 230 C 305 205 315 195 320 190 Z"
        fill="url(#boneGrad)" stroke="#2D3748" stroke-width="2.5" />
      <text x="370" y="370" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="10" font-weight="700" fill="#2D3748">Úmero</text>

      <!-- Tendon 1: SUPRAESPINHAL (Top of greater tuberosity) -->
      <path d="M 230 160 C 270 155 310 160 355 185 C 365 192 370 205 365 215 C 355 210 320 185 240 180 Z"
        fill="#FED7AA" stroke="#C2410C" stroke-width="2.2" />
      <!-- Tendon 1 label badge -->
      <rect x="360" y="130" width="160" height="24" rx="4" fill="#FFFFFF" stroke="#C2410C" stroke-width="1.2" />
      <line x1="360" y1="142" x2="335" y2="175" stroke="#C2410C" stroke-width="1.5" />
      <circle cx="335" cy="175" r="3" fill="#C2410C" />
      <text x="440" y="146" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9.5" font-weight="bold" fill="#C2410C">1. Supraespinhal</text>

      <!-- Tendon 2: INFRAESPINHAL (Posterior facet) -->
      <path d="M 190 215 C 240 210 320 220 380 235 C 390 240 385 255 375 255 C 330 245 250 235 190 235 Z"
        fill="#FDE68A" stroke="#B45309" stroke-width="2" />
      <!-- Tendon 2 label badge -->
      <rect x="420" y="225" width="150" height="24" rx="4" fill="#FFFFFF" stroke="#B45309" stroke-width="1.2" />
      <line x1="420" y1="237" x2="385" y2="242" stroke="#B45309" stroke-width="1.5" />
      <circle cx="385" cy="242" r="3" fill="#B45309" />
      <text x="495" y="241" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9.5" font-weight="bold" fill="#B45309">2. Infraespinhal</text>

      <!-- Tendon 3: SUBESCAPULAR (Lesser tuberosity, anterior) -->
      <path d="M 170 250 C 220 250 270 245 325 240 C 335 240 340 260 330 268 C 280 275 220 280 170 275 Z"
        fill="#DDD6FE" stroke="#6D28D9" stroke-width="2" />
      <!-- Tendon 3 label badge -->
      <rect x="50" y="220" width="140" height="24" rx="4" fill="#FFFFFF" stroke="#6D28D9" stroke-width="1.2" />
      <line x1="190" y1="232" x2="235" y2="255" stroke="#6D28D9" stroke-width="1.5" />
      <circle cx="235" cy="255" r="3" fill="#6D28D9" />
      <text x="120" y="236" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9.5" font-weight="bold" fill="#6D28D9">3. Subescapular</text>

      <!-- Tendon 4: CABO LONGO DO BÍCEPS (Bicipital groove) -->
      <path d="M 335 200 C 340 220 345 260 345 340" fill="none" stroke="#0C6B58" stroke-width="4.5" stroke-linecap="round" />
      <!-- Tendon 4 label badge -->
      <rect x="50" y="310" width="170" height="24" rx="4" fill="#FFFFFF" stroke="#0C6B58" stroke-width="1.2" />
      <line x1="220" y1="322" x2="340" y2="300" stroke="#0C6B58" stroke-width="1.5" />
      <circle cx="340" cy="300" r="3" fill="#0C6B58" />
      <text x="135" y="326" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9" font-weight="bold" fill="#0C6B58">4. Bíceps (Cabo Longo)</text>
    </g>
  `
}

/**
 * THYROID (TIREOIDE: LÓBULO D, LÓBULO E, ISTMO)
 */
function renderThyroidSvg(): string {
  return `
    <g id="thyroid-anatomy">
      <!-- Trachea (Cartilage rings background) -->
      <g opacity="0.6">
        <path d="M 270 120 L 330 120 M 270 150 L 330 150 M 270 180 L 330 180 M 270 210 L 330 210 M 270 240 L 330 240 M 270 270 L 330 270 M 270 300 L 330 300 M 270 330 L 330 330"
          stroke="#94A3B8" stroke-width="4" stroke-linecap="round" />
        <rect x="275" y="110" width="50" height="240" fill="none" stroke="#CBD5E1" stroke-width="1.5" />
      </g>
      <text x="300" y="110" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="8.5" font-weight="700" fill="#64748B">Traqueia</text>

      <!-- Common Carotid Artery (Right & Left) -->
      <circle cx="150" cy="230" r="16" fill="#FEE2E2" stroke="#DC2626" stroke-width="2" />
      <text x="150" y="234" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="8" font-weight="bold" fill="#DC2626">Carótida D</text>

      <circle cx="450" cy="230" r="16" fill="#FEE2E2" stroke="#DC2626" stroke-width="2" />
      <text x="450" y="234" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="8" font-weight="bold" fill="#DC2626">Carótida E</text>

      <!-- Thyroid: Right Lobe (viewer left) -->
      <path d="M 265 180 C 235 150 175 160 170 210 C 165 260 190 310 240 315 C 265 315 270 280 270 250 C 270 220 270 190 265 180 Z"
        fill="url(#organGrad)" stroke="#0C6B58" stroke-width="2.5" />

      <!-- Isthmus -->
      <path d="M 265 240 C 285 248 315 248 335 240 L 335 270 C 315 278 285 278 265 270 Z"
        fill="url(#organGrad)" stroke="#0C6B58" stroke-width="2.2" />

      <!-- Thyroid: Left Lobe (viewer right) -->
      <path d="M 335 180 C 365 150 425 160 430 210 C 435 260 410 310 360 315 C 335 315 330 280 330 250 C 330 220 330 190 335 180 Z"
        fill="url(#organGrad)" stroke="#0C6B58" stroke-width="2.5" />

      <!-- Labels -->
      <rect x="130" y="335" width="130" height="24" rx="4" fill="#FFFFFF" stroke="#0C6B58" stroke-width="1" />
      <text x="195" y="351" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="10" font-weight="bold" fill="#0C6B58">Lobo Direito</text>

      <rect x="245" y="295" width="110" height="22" rx="4" fill="#FFFFFF" stroke="#0C6B58" stroke-width="1" />
      <text x="300" y="310" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9.5" font-weight="bold" fill="#0C6B58">Istmo</text>

      <rect x="340" y="335" width="130" height="24" rx="4" fill="#FFFFFF" stroke="#0C6B58" stroke-width="1" />
      <text x="405" y="351" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="10" font-weight="bold" fill="#0C6B58">Lobo Esquerdo</text>

      <!-- Transverse & Longitudinal axes note -->
      <text x="300" y="390" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9" fill="#5F6E69">
        Corte Transversal Cervical Anterior • Parênquima Normoecogênico Homogêneo
      </text>
    </g>
  `
}

/**
 * ABDOMINAL SLICE SCHEME (LIVER, GALLBLADDER, PANCREAS, SPLEEN, KIDNEYS, BLADDER)
 */
function renderAbdomenSvg(): string {
  return `
    <g id="abdomen-anatomy">
      <!-- Abdominal perimeter contour -->
      <path d="M 120 120 C 200 90 400 90 480 120 C 530 170 540 270 500 350 C 440 400 160 400 100 350 C 60 270 70 170 120 120 Z"
        fill="#FAFDFB" stroke="#D1DDD8" stroke-width="2" stroke-dasharray="4,4" />

      <!-- Spine / Vertebra center -->
      <circle cx="300" cy="270" r="22" fill="#E2E8F0" stroke="#64748B" stroke-width="2" />
      <text x="300" y="274" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="8" font-weight="bold" fill="#64748B">Coluna</text>

      <!-- Aorta & Vena Cava -->
      <circle cx="280" cy="240" r="10" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.8" />
      <text x="280" y="243" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="6.5" font-weight="bold" fill="#DC2626">AO</text>

      <circle cx="316" cy="240" r="11" fill="#E0F2FE" stroke="#0284C7" stroke-width="1.8" />
      <text x="316" y="243" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="6.5" font-weight="bold" fill="#0284C7">VCI</text>

      <!-- FÍGADO (Liver - Large, occupying viewer left / patient's right) -->
      <path d="M 120 150 C 160 110 280 115 340 140 C 330 190 290 230 220 235 C 160 235 125 210 110 185 C 105 168 115 155 120 150 Z"
        fill="#F3E8E2" stroke="#8D5B4C" stroke-width="2.5" />
      <text x="210" y="165" font-family="-apple-system, sans-serif" font-size="11" font-weight="bold" fill="#8D5B4C">Fígado</text>

      <!-- VESÍCULA BILIAR (Gallbladder) -->
      <path d="M 230 215 C 245 205 260 215 255 230 C 250 245 235 245 228 235 Z"
        fill="#DCFCE7" stroke="#16A34A" stroke-width="2" />
      <text x="245" y="260" font-family="-apple-system, sans-serif" font-size="8.5" font-weight="bold" fill="#16A34A">Vesícula</text>

      <!-- PÂNCREAS (Pancreas) -->
      <path d="M 250 190 C 280 180 340 175 375 195 C 380 205 340 210 300 205 C 265 205 250 200 250 190 Z"
        fill="#FEF3C7" stroke="#D97706" stroke-width="2" />
      <text x="320" y="195" font-family="-apple-system, sans-serif" font-size="9" font-weight="bold" fill="#D97706">Pâncreas</text>

      <!-- BAÇO (Spleen - Viewer right / patient's left) -->
      <path d="M 430 160 C 475 170 485 220 460 245 C 440 250 420 220 420 190 C 420 175 425 165 430 160 Z"
        fill="#EDE9FE" stroke="#7C3AED" stroke-width="2.2" />
      <text x="450" y="205" font-family="-apple-system, sans-serif" font-size="10" font-weight="bold" fill="#7C3AED">Baço</text>

      <!-- RIM DIREITO (Right kidney - viewer left, posterior) -->
      <path d="M 140 250 C 170 235 185 265 180 305 C 175 330 150 335 135 315 C 120 295 125 265 140 250 Z"
        fill="#E0F2FE" stroke="#0369A1" stroke-width="2.2" />
      <text x="155" y="295" font-family="-apple-system, sans-serif" font-size="9" font-weight="bold" fill="#0369A1">Rim D</text>

      <!-- RIM ESQUERDO (Left kidney - viewer right, posterior) -->
      <path d="M 420 250 C 445 235 460 265 455 305 C 450 330 425 335 410 315 C 395 295 400 265 420 250 Z"
        fill="#E0F2FE" stroke="#0369A1" stroke-width="2.2" />
      <text x="430" y="295" font-family="-apple-system, sans-serif" font-size="9" font-weight="bold" fill="#0369A1">Rim E</text>

      <!-- BEXIGA (Bladder - Lower pelvis) -->
      <ellipse cx="300" cy="355" rx="42" ry="22" fill="#FEF9C3" stroke="#CA8A04" stroke-width="2.2" />
      <text x="300" y="360" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9.5" font-weight="bold" fill="#CA8A04">Bexiga</text>
    </g>
  `
}

/**
 * Converts the generated SVG string into a JPEG Uint8Array through an in-memory
 * HTML5 Canvas so the binary PDF builder can embed it directly without external libraries.
 */
export async function renderSvgToJpegBytes(
  svgString: string,
  width = 1200,
  height = 900,
): Promise<{ width: number; height: number; jpegBytes: Uint8Array } | null> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return null
  }

  return new Promise((resolve) => {
    try {
      const img = new Image()
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            URL.revokeObjectURL(url)
            resolve(null)
            return
          }

          // Crisp white background
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)

          const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
          URL.revokeObjectURL(url)

          const base64 = dataUrl.split(',')[1]
          const binStr = atob(base64)
          const bytes = new Uint8Array(binStr.length)
          for (let i = 0; i < binStr.length; i++) {
            bytes[i] = binStr.charCodeAt(i)
          }

          resolve({
            width,
            height,
            jpegBytes: bytes,
          })
        } catch (err) {
          console.warn('Erro ao desenhar SVG em canvas:', err)
          URL.revokeObjectURL(url)
          resolve(null)
        }
      }

      img.onerror = (err) => {
        console.warn('Erro ao carregar SVG:', err)
        URL.revokeObjectURL(url)
        resolve(null)
      }

      img.src = url
    } catch (err) {
      console.warn('Falha geral em renderSvgToJpegBytes:', err)
      resolve(null)
    }
  })
}
