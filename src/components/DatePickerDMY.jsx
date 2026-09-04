/**
 * DatePickerDMY — date picker hiển thị theo thứ tự Ngày / Tháng / Năm
 * Props:
 *   value    : string "YYYY-MM-DD"
 *   onChange : (newValue: string) => void
 *   minYear  : number (optional, default now-1)
 *   maxYear  : number (optional, default now+1)
 */
export default function DatePickerDMY({ value, onChange, minYear, maxYear }) {
  const now = new Date()
  const min = minYear ?? now.getFullYear() - 2
  const max = maxYear ?? now.getFullYear() + 1

  // Parse current value
  const [y, m, d] = value ? value.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1, now.getDate()]

  const daysInMonth = new Date(y, m, 0).getDate()

  function emit(newY, newM, newD) {
    // Clamp day to valid range
    const maxD = new Date(newY, newM, 0).getDate()
    const safeD = Math.min(newD, maxD)
    onChange(
      `${newY}-${String(newM).padStart(2, '0')}-${String(safeD).padStart(2, '0')}`
    )
  }

  const years = []
  for (let yr = max; yr >= min; yr--) years.push(yr)

  const selectStyle = {
    padding: '10px 8px',
    borderRadius: '10px',
    border: '1.5px solid var(--line)',
    background: 'var(--paper-raised)',
    color: 'var(--ink)',
    fontWeight: '600',
    fontSize: '13.5px',
    outline: 'none',
    cursor: 'pointer',
    flex: 1,
  }

  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {/* Day */}
      <select
        value={d}
        onChange={(e) => emit(y, m, Number(e.target.value))}
        style={selectStyle}
        title="Ngày"
      >
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
          <option key={day} value={day}>
            Ngày {String(day).padStart(2, '0')}
          </option>
        ))}
      </select>

      {/* Month */}
      <select
        value={m}
        onChange={(e) => emit(y, Number(e.target.value), d)}
        style={selectStyle}
        title="Tháng"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => (
          <option key={mo} value={mo}>
            Tháng {mo}
          </option>
        ))}
      </select>

      {/* Year */}
      <select
        value={y}
        onChange={(e) => emit(Number(e.target.value), m, d)}
        style={selectStyle}
        title="Năm"
      >
        {years.map((yr) => (
          <option key={yr} value={yr}>
            Năm {yr}
          </option>
        ))}
      </select>
    </div>
  )
}
