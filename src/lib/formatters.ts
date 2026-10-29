// Formats CPF: 000.000.000-00
export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

// Formats Phone: (00) 00000-0000 or (00) 0000-0000
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

// Formats Date string to pt-BR (DD/MM/YYYY)
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  } catch {
    return dateStr
  }
}

// Formats Date with time (DD/MM/YYYY às HH:mm)
export function formatDateTimeBR(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// Returns current local civil date formatted as YYYY-MM-DD
export function getLocalTodayYMD(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Converts a local civil date input (YYYY-MM-DD) into an ISO string preserving the local civil calendar day (noon UTC)
export function parseLocalYMDToISO(ymd: string): string {
  if (!ymd) return ''
  const parts = ymd.split('-')
  if (parts.length === 3) {
    const year = Number(parts[0])
    const month = Number(parts[1]) - 1
    const day = Number(parts[2])
    // Use UTC noon to guarantee safety across timezones from UTC-12 to UTC+12
    const d = new Date(Date.UTC(year, month, day, 12, 0, 0))
    return d.toISOString()
  }
  return new Date(ymd).toISOString()
}

// Timezone default for user (America/Cuiaba - UTC-4)
export const CLINIC_TIMEZONE = 'America/Cuiaba'

// Get today's YMD in America/Cuiaba timezone
export function getCuiabaTodayYMD(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date()) // Returns YYYY-MM-DD
}

// Format an ISO string to Cuiaba date (DD/MM/YYYY)
export function formatCuiabaDate(isoDateStr?: string | null): string {
  if (!isoDateStr) return '—'
  try {
    const d = new Date(isoDateStr)
    if (isNaN(d.getTime())) return isoDateStr
    return d.toLocaleDateString('pt-BR', { timeZone: CLINIC_TIMEZONE })
  } catch {
    return isoDateStr
  }
}

// Format an ISO string to Cuiaba time (HH:mm)
export function formatCuiabaTime(isoDateStr?: string | null): string {
  if (!isoDateStr) return '—'
  try {
    const d = new Date(isoDateStr)
    if (isNaN(d.getTime())) return isoDateStr
    return d.toLocaleTimeString('pt-BR', {
      timeZone: CLINIC_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return isoDateStr
  }
}

// Format an ISO string to Cuiaba DateTime (DD/MM/YYYY às HH:mm)
export function formatCuiabaDateTime(isoDateStr?: string | null): string {
  if (!isoDateStr) return '—'
  try {
    const d = new Date(isoDateStr)
    if (isNaN(d.getTime())) return isoDateStr
    return d.toLocaleString('pt-BR', {
      timeZone: CLINIC_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return isoDateStr
  }
}

// Converts local civil date (YYYY-MM-DD) + time (HH:mm) in America/Cuiaba (UTC-4) to an ISO string
export function combineCuiabaDateTimeToISO(ymd: string, timeStr: string = '08:00'): string {
  if (!ymd) return ''
  const [year, month, day] = ymd.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)
  // America/Cuiaba is standard UTC-4 without daylight saving time in Brazil
  // So offset is -04:00. In UTC hours: hour + 4
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour + 4, minute, 0))
  return utcDate.toISOString()
}

// Formats patient full name into standard DICOM PN format: LASTNAME^FIRSTNAME [MIDDLENAMES]
export function formatDicomPatientName(rawName?: string | null): string {
  if (!rawName) return ''
  const trimmed = rawName.trim().toUpperCase()
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]
  const lastName = parts[parts.length - 1]
  const firstAndMiddle = parts.slice(0, parts.length - 1).join(' ')
  return `${lastName}^${firstAndMiddle}`
}

// Relative time in Portuguese (ex.: "há 2 dias", "hoje", "ontem")
export function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const now = new Date()
    const target = new Date(dateStr)
    const diffMs = now.getTime() - target.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours <= 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60))
        return diffMins <= 1 ? 'agora mesmo' : `há ${diffMins} minutos`
      }
      return diffHours === 1 ? 'há 1 hora' : `há ${diffHours} horas`
    }
    if (diffDays === 1) return 'ontem'
    if (diffDays < 7) return `há ${diffDays} dias`
    if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semanas`
    return formatDateBR(dateStr)
  } catch {
    return dateStr
  }
}
