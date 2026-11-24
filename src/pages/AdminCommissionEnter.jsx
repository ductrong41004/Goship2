import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db, col } from '../firebase'
import { formatMoney } from '../utils/date'
import DatePickerDMY from '../components/DatePickerDMY'

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function AdminCommissionEnter() {
  const [employees, setEmployees] = useState([])
  const [selectedUid, setSelectedUid] = useState('')
  const [commDate, setCommDate] = useState(todayStr())
  const [revenueInput, setRevenueInput] = useState('')
  const [rate, setRate] = useState('10')
  const [note, setNote] = useState('')
  const [isPenalty, setIsPenalty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState({ type: '', text: '' })

  // Records already entered for the selected date (all employees)
  const [dayRecords, setDayRecords] = useState([])

  // Load employees
  useEffect(() => {
    const q = query(collection(db, col('users')), where('role', '==', 'employee'))
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'))
      setEmployees(list)
    })
  }, [])

  // Auto-select first employee
  useEffect(() => {
    if (employees.length > 0 && !selectedUid) {
      setSelectedUid(employees[0].uid)
    }
  }, [employees, selectedUid])

  // Load all commissions for selected date
  useEffect(() => {
    if (!commDate) return
    const yearMonth = commDate.slice(0, 7)
    const dayNum = Number(commDate.split('-')[2])
    const q = query(
      collection(db, col('commissions')),
      where('yearMonth', '==', yearMonth),
      where('day', '==', dayNum)
    )
    return onSnapshot(q, (snap) => {
      setDayRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [commDate])

  // Set of uids already entered for this date
  const enteredUids = useMemo(() => new Set(dayRecords.map((r) => r.uid)), [dayRecords])

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.uid === selectedUid),
    [employees, selectedUid]
  )

  const isDucTrong = selectedEmployee?.username === 'dtrong'

  const revenue = useMemo(() => {
    const n = parseFloat(revenueInput)
    if (isNaN(n) || n <= 0) return 0
    return n * 1000
  }, [revenueInput])

  const penalty = 0
  const effectiveRate = isDucTrong ? 15 : (parseFloat(rate) || 10)
  const calculatedCommission = (revenue * (effectiveRate / 100)) - penalty

  // Check if selected employee already has entry for this date
  const existingRecord = useMemo(
    () => dayRecords.find((r) => r.uid === selectedUid),
    [dayRecords, selectedUid]
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus({ type: '', text: '' })
    if (!selectedUid) {
      setStatus({ type: 'error', text: 'Vui lòng chọn nhân viên.' })
      return
    }
    if (revenue <= 0 && !isPenalty) {
      setStatus({ type: 'error', text: 'Vui lòng nhập doanh thu hoặc chọn Offline / Nghỉ.' })
      return
    }
    setSaving(true)
    try {
      const docId = `${selectedUid}_${commDate}`
      await setDoc(doc(db, col('commissions'), docId), {
        uid: selectedUid,
        employeeName: selectedEmployee?.name || selectedUid,
        date: commDate,
        day: Number(commDate.split('-')[2]),
        yearMonth: commDate.slice(0, 7),
        revenue: isPenalty ? 0 : revenue,
        rate: effectiveRate,
        commission: isPenalty ? 0 : calculatedCommission,
        isPenalty: isPenalty,
        note: note.trim(),
        enteredBy: 'admin',
      })
      setStatus({ type: 'success', text: `✓ Đã lưu hoa hồng cho ${selectedEmployee?.name}: ${formatMoney(isPenalty ? 0 : calculatedCommission)}` })
      setRevenueInput('')
      setNote('')
      setIsPenalty(false)
      setRate('10')
    } catch (err) {
      console.error(err)
      setStatus({ type: 'error', text: 'Lưu thất bại. Vui lòng thử lại.' })
    } finally {
      setSaving(false)
    }
  }

  const notEnteredList = useMemo(
    () => employees.filter((e) => !enteredUids.has(e.uid)),
    [employees, enteredUids]
  )
  const enteredList = useMemo(
    () => employees.filter((e) => enteredUids.has(e.uid)),
    [employees, enteredUids]
  )

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="section-header" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', letterSpacing: '-0.3px', color: 'var(--navy)' }}>
            Nhập Hoa Hồng
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Admin nhập giúp nhân viên
          </p>
        </div>
        <Link
          to="/admin/commission/history"
          style={{
            fontSize: '13px', fontWeight: '600', color: 'var(--navy)',
            textDecoration: 'none', padding: '7px 14px',
            border: '1px solid var(--line)', borderRadius: '8px',
            background: 'var(--paper-raised)', whiteSpace: 'nowrap',
          }}
        >
          Lịch sử →
        </Link>
      </div>

      {/* ── Status chips: entered / not entered ── */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
          Trạng thái ngày {commDate.split('-').reverse().join('/')}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '12px', fontWeight: '700', padding: '3px 12px',
            borderRadius: '20px', background: 'rgba(26,122,76,0.1)',
            color: 'var(--success)', border: '1px solid rgba(26,122,76,0.25)',
          }}>
            ✅ Đã nhập: {enteredList.length} người
          </span>
          <span style={{
            fontSize: '12px', fontWeight: '700', padding: '3px 12px',
            borderRadius: '20px',
            background: notEnteredList.length > 0 ? 'rgba(220,53,69,0.08)' : 'rgba(100,100,100,0.08)',
            color: notEnteredList.length > 0 ? 'var(--error)' : 'var(--ink-soft)',
            border: `1px solid ${notEnteredList.length > 0 ? 'rgba(220,53,69,0.3)' : 'var(--line)'}`,
          }}>
            ⚠️ Chưa nhập: {notEnteredList.length} người
          </span>
        </div>
        {notEnteredList.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
            {notEnteredList.map((emp) => (
              <button
                key={emp.uid}
                type="button"
                onClick={() => setSelectedUid(emp.uid)}
                style={{
                  fontSize: '12px', fontWeight: '600', padding: '4px 12px',
                  borderRadius: '20px', cursor: 'pointer',
                  background: selectedUid === emp.uid ? 'var(--navy)' : 'var(--paper)',
                  color: selectedUid === emp.uid ? '#fff' : 'var(--ink)',
                  border: `1.5px solid ${selectedUid === emp.uid ? 'var(--navy)' : 'var(--line)'}`,
                  transition: 'all 0.15s',
                }}
              >
                {emp.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Entry Form ── */}
      <div className="card add-bill-card">
        <form onSubmit={handleSubmit} className="stack">

          {/* Employee select */}
          <label className="field">
            <span>Nhân viên</span>
            <select
              value={selectedUid}
              onChange={(e) => {
                setSelectedUid(e.target.value)
                setStatus({ type: '', text: '' })
              }}
              required
            >
              <option value="">— Chọn nhân viên —</option>
              {employees.map((emp) => (
                <option key={emp.uid} value={emp.uid}>
                  {emp.name}{enteredUids.has(emp.uid) ? ' ✅' : ' ⚠️'}
                </option>
              ))}
            </select>
          </label>

          {/* Warning if already entered */}
          {existingRecord && (
            <div style={{
              background: existingRecord.enteredBy === 'admin'
                ? 'rgba(245,158,11,0.1)'
                : 'rgba(59,130,246,0.1)',
              border: existingRecord.enteredBy === 'admin'
                ? '1px solid rgba(245,158,11,0.4)'
                : '1px solid rgba(59,130,246,0.3)',
              borderRadius: '10px', padding: '10px 14px',
              fontSize: '13px', fontWeight: '600',
              color: existingRecord.enteredBy === 'admin' ? '#92400E' : '#1e40af',
            }}>
              {existingRecord.enteredBy === 'admin'
                ? `⚠️ Admin đã nhập ngày này — ${formatMoney(existingRecord.revenue)} × ${existingRecord.rate}% = ${formatMoney(existingRecord.commission)}. Lưu sẽ ghi đè.`
                : `ℹ️ Nhân viên đã tự nhập ngày này — ${formatMoney(existingRecord.revenue)} × ${existingRecord.rate}% = ${formatMoney(existingRecord.commission)}. Lưu sẽ ghi đè và khoá nhân viên.`
              }
            </div>
          )}

          {/* Date */}
          <label className="field">
            <span>Ngày (Ngày / Tháng / Năm)</span>
            <DatePickerDMY
              value={commDate}
              onChange={(v) => {
                setCommDate(v)
                setStatus({ type: '', text: '' })
              }}
            />
          </label>

          {/* Revenue */}
          <label className="field">
            <span>Doanh thu <span className="muted">(VD: 500 = 500.000đ)</span></span>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={revenueInput}
                onChange={(e) => setRevenueInput(e.target.value.replace(/\D/g, ''))}
                placeholder="500"
                disabled={isPenalty}
                style={{ paddingRight: revenueInput ? '130px' : '14px', width: '100%', opacity: isPenalty ? 0.6 : 1 }}
              />
              {parseFloat(revenueInput) > 0 && (
                <span style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '13px', color: 'var(--blue)', fontWeight: '600',
                  pointerEvents: 'none',
                }}>
                  = {formatMoney(parseFloat(revenueInput) * 1000)}
                </span>
              )}
            </div>
          </label>

          {/* Rate */}
          <label className="field">
            <span>% Hoa hồng <span className="muted">(mặc định 10%)</span></span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                value={isDucTrong ? '15' : rate}
                onChange={(e) => setRate(e.target.value)}
                min="0" max="100" step="0.5"
                disabled={isPenalty || isDucTrong}
                style={{ flex: 1, opacity: (isPenalty || isDucTrong) ? 0.6 : 1 }}
              />
              {isDucTrong ? (
                <span style={{ fontSize: '13px', color: 'var(--navy)', fontWeight: '700', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--navy)', background: 'rgba(27,35,80,0.08)' }}>
                  Boi hàn quốc cố định 15%
                </span>
              ) : (
                [10, 20].map((r) => (
                  <button
                    key={r} type="button"
                    onClick={() => setRate(String(r))}
                    disabled={isPenalty}
                    style={{
                      padding: '10px 18px', borderRadius: '10px', border: '1.5px solid',
                      borderColor: isPenalty ? 'var(--line)' : (rate === String(r) ? 'var(--navy)' : 'var(--line)'),
                      background: isPenalty ? 'var(--paper)' : (rate === String(r) ? 'var(--navy)' : 'var(--paper)'),
                      color: isPenalty ? 'var(--ink-soft)' : (rate === String(r) ? '#ffffff' : 'var(--ink-soft)'),
                      fontWeight: '700', cursor: isPenalty ? 'not-allowed' : 'pointer', fontSize: '13px',
                      opacity: isPenalty ? 0.6 : 1,
                    }}
                  >{r}%</button>
                ))
              )}
            </div>
          </label>

          {/* Offline / Nghỉ checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 0' }}>
            <input
              type="checkbox"
              checked={isPenalty}
              onChange={(e) => {
                setIsPenalty(e.target.checked)
                if (e.target.checked) setRevenueInput('')
              }}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: '600', fontSize: '14px' }}>
              Offline / Nghỉ
            </span>
          </label>

          {/* Preview */}
          {(revenue > 0 || isPenalty) && (
            <div style={{
              background: isPenalty ? 'rgba(234, 88, 12, 0.08)' : 'rgba(26,122,76,0.08)',
              border: isPenalty ? '1px solid rgba(234, 88, 12, 0.25)' : '1px solid rgba(26,122,76,0.2)',
              borderRadius: '12px', padding: '14px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span className="muted" style={{ fontSize: '13px' }}>
                {isPenalty ? 'Offline / Nghỉ' : `${formatMoney(revenue)} × ${effectiveRate}%`}
              </span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: (isPenalty ? 0 : calculatedCommission) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                {formatMoney(isPenalty ? 0 : calculatedCommission)}
              </span>
            </div>
          )}

          {/* Note */}
          <label className="field">
            <span>Ghi chú <span className="muted">(tuỳ chọn)</span></span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: đi trễ, lý do % khác..."
            />
          </label>

          {status.text && (
            <div className={status.type === 'error' ? 'error-text' : 'success-text'}>{status.text}</div>
          )}

          <button className="btn-primary" type="submit" disabled={saving || !selectedUid}>
            {saving ? 'Đang lưu…' : `Lưu hoa hồng${selectedEmployee ? ` cho ${selectedEmployee.name}` : ''}`}
          </button>
        </form>
      </div>

      {/* ── List of today's entries ── */}
      {dayRecords.length > 0 && (
        <div className="card" style={{ marginTop: '16px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '700' }}>
            📋 Đã nhập ngày {commDate.split('-').reverse().join('/')}
          </h3>
          <ul className="bill-list" style={{ margin: 0 }}>
            {dayRecords.map((r) => (
              <li key={r.id} className="bill-row" style={{ gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', fontSize: '14px', minWidth: '90px' }}>
                  {r.employeeName}
                </span>
                {r.isPenalty ? (
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '2px 8px',
                    borderRadius: '20px', background: 'rgba(234, 88, 12, 0.12)',
                    color: '#c2410c', border: '1px solid rgba(234, 88, 12, 0.3)',
                  }}>
                    Offline / Nghỉ
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: '13px', color: 'var(--blue)' }}>
                      {formatMoney(r.revenue)}
                    </span>
                    <span className="muted" style={{ fontSize: '12px' }}>×{r.rate}%</span>
                  </>
                )}
                {r.note && (
                  <span className="muted small" style={{ fontStyle: 'italic' }}>({r.note})</span>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {r.enteredBy === 'admin' && (
                    <span style={{
                      fontSize: '10px', fontWeight: '700', padding: '2px 8px',
                      borderRadius: '20px', background: 'rgba(245,158,11,0.12)',
                      color: '#92400E', border: '1px solid rgba(245,158,11,0.3)',
                    }}>
                      Admin nhập
                    </span>
                  )}
                  <span style={{
                    fontWeight: '700',
                    color: r.commission >= 0 ? 'var(--success)' : 'var(--error)',
                    fontSize: '14px',
                  }}>
                    {r.commission >= 0 ? formatMoney(r.commission) : `-${formatMoney(Math.abs(r.commission))}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
