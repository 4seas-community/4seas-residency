// Residency start dates are always the 1st or 15th of a month.
// Generates the next N options from today so the list never goes stale.

export interface StartDateOption {
  value: string // 'YYYY-MM-DD'
  label: string // 'August 1, 2026'
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function getStartDateOptions(count = 6, from = new Date()): StartDateOption[] {
  const options: StartDateOption[] = []
  let year = from.getFullYear()
  let month = from.getMonth()

  while (options.length < count) {
    for (const day of [1, 15]) {
      // Skip dates that are not at least 7 days out — too soon to arrange arrival.
      const candidate = new Date(year, month, day)
      if (candidate.getTime() - from.getTime() < 7 * 24 * 3600 * 1000) continue
      const value = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      options.push({ value, label: `${MONTH_NAMES[month]} ${day}, ${year}` })
      if (options.length >= count) break
    }
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }
  return options
}

export function isValidStartDate(value: string, options: StartDateOption[]): boolean {
  return options.some((o) => o.value === value)
}
