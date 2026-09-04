// ISO-8601 week number helpers. Week starts Monday.
// Returns { week, year } where "year" is the ISO week-year (matters for
// the last/first days of Dec/Jan).
export function getISOWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return { week, year: d.getUTCFullYear() }
}

// Returns the Monday and Sunday of the given ISO week/year
export function getWeekDateRange(week, year) {
  // Find Jan 4 of that year (always in week 1)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  // Monday of week 1
  const week1Mon = new Date(jan4)
  week1Mon.setUTCDate(jan4.getUTCDate() - jan4Day + 1)
  // Monday of target week
  const monday = new Date(week1Mon)
  monday.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7)
  // Sunday of target week
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  const fmt = (d) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  return { from: fmt(monday), to: fmt(sunday) }
}

export function formatDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatTimeStr(date = new Date()) {
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

export function formatMonthStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function formatMoney(n) {
  return n.toLocaleString('vi-VN') + 'đ'
}

// Build a list of the last N iso weeks (for dropdown selectors), most recent first.
export function recentWeeks(n = 12) {
  const result = []
  const seen = new Set()
  const cursor = new Date()
  for (let i = 0; i < n * 8 && result.length < n; i++) {
    const { week, year } = getISOWeek(cursor)
    const key = `${year}-${week}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push({ week, year })
    }
    cursor.setDate(cursor.getDate() - 7)
  }
  return result
}
