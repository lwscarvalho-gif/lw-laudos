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
