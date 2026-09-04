import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { formatMoney, getISOWeek, getWeekDateRange } from '../utils/date'
import { Link } from 'react-router-dom'

function getWeeksOfMonth(year, month) {
  const result = []
  const seen = new Set()
  const date = new Date(year, month - 1, 1)
  while (date.getMonth() === month - 1) {
    const { week, year: wYear } = getISOWeek(date)
    const key = `${wYear}-${week}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push({ week, year: wYear })
    }
    date.setDate(date.getDate() + 1)
  }
  return result.sort((a, b) => b.week - a.week)
}

const pad = (n) => String(n).padStart(2, '0')

export default function AdminBossDebts() {
  const now = new Date()
  const [employees, setEmployees] = useState([])
  const [records, setRecords] = useState([])
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selWeek, setSelWeek] = useState('')
  const [selUid, setSelUid] = useState('')
  const [selBoss, setSelBoss] = useState('')
  const [selStatus, setSelStatus] = useState('pending') // default to pending (chờ trả)

  const yearMonth = `${selYear}-${pad(selMonth)}`

  // Load employees
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'employee'))
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'))
      setEmployees(list)
    })
  }, [])

  // Load boss debts for selected month
  useEffect(() => {
    const q = query(
      collection(db, 'boss_debts'),
      where('monthStr', '==', yearMonth)
    )
    return onSnapshot(q, (snap) => {
      setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [yearMonth])

  const weeksForMonth = useMemo(() => {
    return getWeeksOfMonth(selYear, selMonth)
  }, [selYear, selMonth])

  // Filter records on client side (to avoid complex composite index issues)
  const filtered = useMemo(() => {
    let list = [...records]
    if (selWeek) {
      const [wYear, wNum] = selWeek.split('-').map(Number)
      list = list.filter((r) => r.week === wNum && (r.year === wYear || !r.year))
    }
    if (selUid) {
      list = list.filter((r) => r.uid === selUid)
    }
    if (selBoss) {
      list = list.filter((r) => r.boss === selBoss)
    }
    if (selStatus) {
      list = list.filter((r) => r.status === selStatus)
    }
    // Sort by createdAt desc
    list.sort((a, b) => {
      const tA = a.createdAt?.seconds || 0
      const tB = b.createdAt?.seconds || 0
      return tB - tA
    })
    return list
  }, [records, selWeek, selUid, selBoss, selStatus])

  const bossOptions = useMemo(() => {
    const set = new Set(['Anh Hào', 'Anh Linh'])
    records.forEach((r) => { if (r.boss) set.add(r.boss) })
    return Array.from(set)
  }, [records])

  // Totals calculations
  const totals = useMemo(() => {
    const hao = filtered.filter((r) => r.boss === 'Anh Hào').reduce((s, r) => s + (r.amount || 0), 0)
    const linh = filtered.filter((r) => r.boss === 'Anh Linh').reduce((s, r) => s + (r.amount || 0), 0)
    const khac = filtered.filter((r) => r.boss !== 'Anh Hào' && r.boss !== 'Anh Linh').reduce((s, r) => s + (r.amount || 0), 0)
    const total = filtered.reduce((s, r) => s + (r.amount || 0), 0)
    return { hao, linh, khac, total }
  }, [filtered])

  async function handleToggleStatus(item) {
    const newStatus = item.status === 'paid' ? 'pending' : 'paid'
    try {
      await updateDoc(doc(db, 'boss_debts', item.id), { status: newStatus })
    } catch (err) {
      console.error(err)
      alert('Cập nhật thất bại. Vui lòng thử lại.')
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Xóa khoản nợ của ${item.boss} — ${formatMoney(item.amount)} của ${item.employeeName}?`)) return
    try {
      await deleteDoc(doc(db, 'boss_debts', item.id))
    } catch (err) {
      console.error(err)
      alert('Xóa thất bại. Vui lòng thử lại.')
    }
  }

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="page">
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <h2>Xem tiền nợ Nhân Viên</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select value={selWeek} onChange={(e) => setSelWeek(e.target.value)}>
            <option value="">Cả tháng ({weeksForMonth.length} tuần)</option>
            {weeksForMonth.map((w) => {
              const range = getWeekDateRange(w.week, w.year)
              return (
                <option key={`${w.year}-${w.week}`} value={`${w.year}-${w.week}`}>
                  Tuần {w.week} ({range.from} – {range.to})
                </option>
              )
            })}
          </select>
          <select value={selMonth} onChange={(e) => { setSelMonth(Number(e.target.value)); setSelWeek(''); }}>
            {monthOptions.map((m) => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select value={selYear} onChange={(e) => { setSelYear(Number(e.target.value)); setSelWeek(''); }}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card grid-stats" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '14px 18px' }}>
        <label className="field">
          <span>Nhân viên</span>
          <select value={selUid} onChange={(e) => setSelUid(e.target.value)}>
            <option value="">Tất cả</option>
            {employees.map((e) => (
              <option key={e.uid} value={e.uid}>{e.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sếp / Mục nợ</span>
          <select value={selBoss} onChange={(e) => setSelBoss(e.target.value)}>
            <option value="">Tất cả</option>
            {bossOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Trạng thái</span>
          <select value={selStatus} onChange={(e) => setSelStatus(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="pending">Chờ trả</option>
            <option value="paid">Đã trả</option>
          </select>
        </label>
      </div>

      {/* Stats row */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div className="stat-row" style={{ marginBottom: 0 }}>
          <div className="stat">
            <span className="stat-label">Nợ Anh Hào</span>
            <span className="stat-value" style={{ fontSize: '16px', color: 'var(--error)' }}>
              {formatMoney(totals.hao)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Nợ Anh Linh</span>
            <span className="stat-value" style={{ fontSize: '16px', color: 'var(--error)' }}>
              {formatMoney(totals.linh)}
            </span>
          </div>
          {totals.khac > 0 && (
            <div className="stat">
              <span className="stat-label">Nợ Khác</span>
              <span className="stat-value" style={{ fontSize: '16px', color: 'var(--error)' }}>
                {formatMoney(totals.khac)}
              </span>
            </div>
          )}
          <div className="stat">
            <span className="stat-label">Tổng nợ</span>
            <span className="stat-value" style={{ fontSize: '16px', color: 'var(--ink)' }}>
              {formatMoney(totals.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Debts list */}
      <div className="card">
        <ul className="bill-list">
          {filtered.map((item) => (
            <li key={item.id} className="bill-row" style={{ flexWrap: 'nowrap', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px' }}>
                    {item.boss}
                  </span>
                  <span className="muted" style={{ fontSize: '12px' }}>
                    nợ {item.employeeName}
                  </span>
                </div>
                <span className="muted small" style={{ fontSize: '12px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.note || '(không có ghi chú)'}
                </span>
                <span className="muted" style={{ fontSize: '11px' }}>
                  Ngày: {item.dateStr?.split('-').reverse().join('/')} {item.timeStr}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span style={{ fontWeight: '700', color: 'var(--error)', fontSize: '14px' }}>
                  {formatMoney(item.amount)}
                </span>
                <button
                  onClick={() => handleToggleStatus(item)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: item.status === 'paid' ? 'var(--navy)' : 'var(--success)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    minWidth: '75px',
                  }}
                >
                  {item.status === 'paid' ? 'Đã trả' : 'Thanh toán'}
                </button>
                <button
                  className="link-btn"
                  onClick={() => handleDelete(item)}
                  style={{ color: 'var(--error)', fontSize: '12px', textDecoration: 'none' }}
                >
                  Xóa
                </button>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="muted small empty">Không có dữ liệu nợ sếp nào.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
