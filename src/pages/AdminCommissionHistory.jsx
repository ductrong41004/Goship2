import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../firebase'
import { formatMoney } from '../utils/date'

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatMoneyShort(amount) {
  if (!amount) return ''
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : '+'
  if (abs >= 1000) {
    return `${sign}${(abs / 1000)}k`
  }
  return `${sign}${abs}`
}

export default function AdminCommissionHistory() {
  const now = new Date()
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [selUid, setSelUid] = useState('')
  const [employees, setEmployees] = useState([])
  const [records, setRecords] = useState([])
  const [activeDay, setActiveDay] = useState(now.getDate())
  const [showNotEntered, setShowNotEntered] = useState(false)

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

  async function handleToggleTransfer(item) {
    const isTransferred = item.status === 'transferred'
    try {
      await updateDoc(doc(db, 'commissions', item.id), {
        status: isTransferred ? 'pending' : 'transferred'
      })
    } catch (err) {
      console.error(err)
      alert('Cập nhật thất bại. Vui lòng thử lại.')
    }
  }

  async function handleDeleteCommission(item) {
    if (!confirm(`Xóa bản ghi hoa hồng của "${item.employeeName}"?`)) return
    try {
      await deleteDoc(doc(db, 'commissions', item.id))
    } catch (err) {
      console.error(err)
      alert('Xóa thất bại. Vui lòng thử lại.')
    }
  }

  // Load commission records for selected month
  useEffect(() => {
    const q = query(
      collection(db, 'commissions'),
      where('yearMonth', '==', yearMonth)
    )
    return onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => !!r.date)
      setRecords(list)
    })
  }, [yearMonth])

  // Prevent active day exceeding max days of month when switching months
  useEffect(() => {
    const maxDays = new Date(selYear, selMonth, 0).getDate()
    if (activeDay > maxDays) {
      setActiveDay(maxDays)
    }
  }, [selMonth, selYear, activeDay])

  // Handle Month Navigation
  const handlePrevMonth = () => {
    if (selMonth === 1) {
      setSelMonth(12)
      setSelYear((y) => y - 1)
    } else {
      setSelMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (selMonth === 12) {
      setSelMonth(1)
      setSelYear((y) => y + 1)
    } else {
      setSelMonth((m) => m + 1)
    }
  }

  // Calculate day sums for calendar cells (separate positive and negative)
  const dailyCommissions = useMemo(() => {
    const map = {}
    records.forEach((r) => {
      if (selUid && r.uid !== selUid) return
      const d = Number(r.day || (r.date && r.date.split('-')[2]))
      if (isNaN(d)) return
      if (!map[d]) map[d] = { positive: 0, negative: 0, allTransferred: true, hasPenalty: false }
      if (r.isPenalty) {
        map[d].hasPenalty = true
      }
      if (r.commission > 0) {
        map[d].positive += r.commission
      } else if (r.commission < 0) {
        map[d].negative += r.commission
      }
      if (r.status !== 'transferred' && !r.isPenalty) {
        map[d].allTransferred = false
      }
    })
    return map
  }, [records, selUid])

  // Get active day details list
  const activeDayRecords = useMemo(() => {
    return records.filter((r) => {
      const d = Number(r.day || (r.date && r.date.split('-')[2]))
      return d === activeDay && (!selUid || r.uid === selUid)
    })
  }, [records, activeDay, selUid])

  const activeDayRevenue = activeDayRecords.reduce((s, r) => s + (r.revenue || 0), 0)
  // Only sum positive commissions (payouts to employees), penalties are company income
  const activeDayCommission = activeDayRecords.reduce((s, r) => s + (r.commission > 0 ? r.commission : 0), 0)
  const activeDayPenalty = activeDayRecords.reduce((s, r) => s + (r.commission < 0 ? Math.abs(r.commission) : 0), 0)

  // Employees who haven't entered commission for the active day
  const notEnteredEmployees = useMemo(() => {
    const enteredUids = new Set(
      records
        .filter((r) => {
          const d = Number(r.day || (r.date && r.date.split('-')[2]))
          return d === activeDay
        })
        .map((r) => r.uid)
    )
    const pool = selUid ? employees.filter((e) => e.uid === selUid) : employees
    return pool.filter((e) => !enteredUids.has(e.uid))
  }, [records, employees, activeDay, selUid])

  const monthlyRevenue = useMemo(() => {
    const list = selUid ? records.filter((r) => r.uid === selUid) : records
    return list.reduce((s, r) => s + (r.revenue || 0), 0)
  }, [records, selUid])

  // Calculate monthly total commission (positive only = payouts)
  const monthlyCommission = useMemo(() => {
    const list = selUid ? records.filter((r) => r.uid === selUid) : records
    return list.reduce((s, r) => s + (r.commission > 0 ? r.commission : 0), 0)
  }, [records, selUid])

  // Generate calendar cells
  const { cells, weekdayHeaders } = useMemo(() => {
    const daysCount = new Date(selYear, selMonth, 0).getDate()
    const tempDay = new Date(selYear, selMonth - 1, 1).getDay()
    // Align Mon = index 0, Tue = 1, ..., Sun = 6
    const firstDayIndex = tempDay === 0 ? 6 : tempDay - 1

    const list = []
    // Pad start
    for (let i = 0; i < firstDayIndex; i++) {
      list.push(null)
    }
    // Days
    for (let i = 1; i <= daysCount; i++) {
      list.push(i)
    }

    const headers = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật']

    return { cells: list, weekdayHeaders: headers }
  }, [selYear, selMonth])

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="page">
      {/* ── Page Header Controls ── */}
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/admin/commission" className="link-btn" style={{ fontSize: '13px', textDecoration: 'underline' }}>
            ← Nhập hoa hồng
          </Link>
          <h2 style={{ margin: 0 }}>Lịch sử hoa hồng</h2>
        </div>

        {/* Filter Employee dropdown */}
        <select
          value={selUid}
          onChange={(e) => setSelUid(e.target.value)}
          style={{ fontSize: '14px', padding: '8px 10px', marginLeft: 'auto' }}
        >
          <option value="">Tất cả nhân viên ({employees.length})</option>
          {employees.map((e) => (
            <option key={e.uid} value={e.uid}>{e.name}</option>
          ))}
        </select>
      </div>

      {/* ── Calendar Widget ── */}
      <div className="calendar-widget">
        <div className="calendar-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div className="calendar-month-nav">
              <button className="calendar-nav-btn" onClick={handlePrevMonth}>‹</button>
              <span className="calendar-title">THÁNG {pad(selMonth)} - {selYear}</span>
              <button className="calendar-nav-btn" onClick={handleNextMonth}>›</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))}>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
              <select value={selYear} onChange={(e) => setSelYear(Number(e.target.value))}>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          {/* ── Tổng DT / Tổng HH row ── */}
          {(monthlyRevenue > 0 || monthlyCommission > 0) && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                background: 'rgba(255,255,255,0.15)', borderRadius: '10px',
                padding: '5px 18px', minWidth: '130px',
              }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#fbbf24', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Tổng DT</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{formatMoney(monthlyRevenue)}</span>
              </span>
              <span style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                background: 'rgba(144,239,184,0.2)', border: '1px solid rgba(144,239,184,0.4)',
                borderRadius: '10px', padding: '5px 18px', minWidth: '130px',
              }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#fbbf24', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Tổng HH</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{formatMoney(monthlyCommission)}</span>
              </span>
            </div>
          )}
        </div>

        <div className="calendar-grid">
          {/* Weekday headers */}
          {weekdayHeaders.map((name, i) => (
            <div key={i} className={`calendar-weekday ${i === 6 ? 'sunday' : ''}`}>
              {name}
            </div>
          ))}

          {/* Grid cells */}
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="calendar-cell empty" />
            }

            const dayOfWeek = (idx % 7) // 6 is Sunday
            const isSunday = dayOfWeek === 6
            const isToday =
              day === now.getDate() &&
              selMonth === now.getMonth() + 1 &&
              selYear === now.getFullYear()

            const data = dailyCommissions[day] || { positive: 0, negative: 0 }
            const active = day === activeDay

            let cellStyle = {}
            if (selUid && data.positive > 0) {
              if (data.allTransferred) {
                cellStyle = {
                  background: 'rgba(26, 122, 76, 0.15)',
                  border: '1.5px solid rgba(26, 122, 76, 0.5)',
                }
              } else {
                cellStyle = {
                  background: 'rgba(220, 53, 69, 0.15)',
                  border: '1.5px solid rgba(220, 53, 69, 0.5)',
                }
              }
            }

            return (
              <div
                key={`day-${day}`}
                className={`calendar-cell ${isSunday ? 'sunday' : ''} ${isToday ? 'today' : ''} ${active ? 'active' : ''}`}
                onClick={() => setActiveDay(day)}
                style={cellStyle}
              >
                <div className="calendar-day-num">{pad(day)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                  {data.positive > 0 && (
                    <div
                      className="calendar-day-amount"
                      style={{
                        color: selUid
                          ? (data.allTransferred ? 'var(--success)' : 'var(--error)')
                          : 'var(--success)',
                        margin: 0,
                        fontWeight: '700',
                      }}
                    >
                      {formatMoneyShort(data.positive)}
                    </div>
                  )}
                  {data.negative < 0 && (
                    <div className="calendar-day-amount" style={{ color: 'var(--error)', margin: 0 }}>
                      {formatMoneyShort(data.negative)}
                    </div>
                  )}
                  {data.hasPenalty && data.positive === 0 && data.negative === 0 && (
                    <div className="calendar-day-amount" style={{ color: '#ea580c', margin: 0, fontWeight: '700' }}>
                      Nghỉ
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Active Day Detail section below calendar ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
              📅 Chi tiết ngày {pad(activeDay)}/{pad(selMonth)}/{selYear}
            </h3>
            {/* Entered / Not-entered counts */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                fontSize: '12px', fontWeight: '700', padding: '3px 10px',
                borderRadius: '20px', background: 'rgba(26,122,76,0.12)',
                color: 'var(--success)', border: '1px solid rgba(26,122,76,0.25)',
              }}>
                ✅ Đã nhập: {activeDayRecords.length > 0 ? new Set(activeDayRecords.map(r => r.uid)).size : 0} người
              </span>
              <span
                onClick={() => setShowNotEntered((v) => !v)}
                style={{
                  fontSize: '12px', fontWeight: '700', padding: '3px 10px',
                  borderRadius: '20px', cursor: 'pointer',
                  background: notEnteredEmployees.length > 0 ? 'rgba(220,53,69,0.1)' : 'rgba(100,100,100,0.08)',
                  color: notEnteredEmployees.length > 0 ? 'var(--error)' : 'var(--ink-soft)',
                  border: `1px solid ${notEnteredEmployees.length > 0 ? 'rgba(220,53,69,0.3)' : 'var(--line)'}`,
                  userSelect: 'none',
                }}
              >
                ⚠️ Chưa nhập: {notEnteredEmployees.length} người {notEnteredEmployees.length > 0 ? (showNotEntered ? '▲' : '▼') : ''}
              </span>
            </div>
            {/* Dropdown list of not-entered employees */}
            {showNotEntered && notEnteredEmployees.length > 0 && (
              <div style={{
                background: 'var(--paper-raised)', border: '1px solid var(--line)',
                borderRadius: '12px', padding: '10px 14px',
                display: 'flex', flexWrap: 'wrap', gap: '6px',
                maxWidth: '420px', marginTop: '2px',
              }}>
                {notEnteredEmployees.map((emp) => (
                  <span key={emp.uid} style={{
                    fontSize: '12px', fontWeight: '600', padding: '3px 10px',
                    borderRadius: '20px', background: 'var(--paper)',
                    border: '1px solid var(--line)', color: 'var(--ink)',
                  }}>
                    {emp.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          {(activeDayRevenue > 0 || activeDayCommission > 0 || activeDayPenalty > 0) && (
            <div style={{ fontSize: '13px', color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              {activeDayRevenue > 0 && (
                <span>Tổng doanh thu: <strong style={{ color: 'var(--blue)' }}>{formatMoney(activeDayRevenue)}</strong></span>
              )}
              {activeDayCommission > 0 && (
                <span>Tổng hoa hồng: <strong style={{ color: 'var(--success)' }}>{formatMoney(activeDayCommission)}</strong></span>
              )}
              {activeDayPenalty > 0 && (
                <span>Thu phạt: <strong style={{ color: 'var(--error)' }}>+{formatMoney(activeDayPenalty)}</strong></span>
              )}
            </div>
          )}
        </div>

        {activeDayRecords.length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>Không có dữ liệu hoa hồng trong ngày này.</p>
        ) : (
          <div className="stack" style={{ gap: '10px' }}>
            <ul className="bill-list" style={{ margin: 0 }}>
              {activeDayRecords.map((item) => {
                const isTransferred = item.status === 'transferred'
                return (
                  <li key={item.id} className="bill-row" style={{ gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px', minWidth: '90px' }}>
                      {item.employeeName}
                    </span>
                    {item.isPenalty ? (
                      <span className="muted small" style={{ fontStyle: 'italic', color: '#ea580c' }}>
                        (Nghỉ)
                      </span>
                    ) : (
                      <>
                        <span style={{ fontSize: '13px', color: 'var(--blue)' }}>
                          {formatMoney(item.revenue)}
                        </span>
                        <span className="muted" style={{ fontSize: '12px' }}>×{item.rate}%</span>
                      </>
                    )}
                    {item.note && (
                      <span className="muted small" style={{ fontStyle: 'italic' }}>
                        ({item.note})
                      </span>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Trạng thái ở bên trái tiền hoa hồng */}
                      {item.isPenalty ? (
                        <span
                          className="badge"
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            background: 'rgba(234, 88, 12, 0.12)',
                            color: '#c2410c',
                            border: '1px solid rgba(234, 88, 12, 0.3)',
                            fontWeight: '700',
                          }}
                        >
                          Offline/Nghỉ
                        </span>
                      ) : (
                        <span
                          className={`badge ${isTransferred ? 'badge-paid' : 'badge-pending'}`}
                          style={{ fontSize: '11px', padding: '2px 8px' }}
                        >
                          {isTransferred ? 'Đã chuyển' : 'Chưa chuyển'}
                        </span>
                      )}

                      {/* Số tiền hoa hồng */}
                      <span style={{ fontWeight: '700', color: item.commission >= 0 ? 'var(--success)' : 'var(--error)', fontSize: '14px', minWidth: '70px', textAlign: 'right' }}>
                        {item.commission >= 0 ? formatMoney(item.commission) : `-${formatMoney(Math.abs(item.commission))}`}
                      </span>

                      {/* Các nút hành động bên phải */}
                      {!item.isPenalty && (
                        <button
                          className="link-btn"
                          onClick={() => handleToggleTransfer(item)}
                          style={{
                            color: isTransferred ? 'var(--ink-soft)' : 'var(--success)',
                            fontSize: '12px',
                            fontWeight: '700',
                            border: `1.5px solid ${isTransferred ? 'var(--line)' : 'rgba(26,122,76,0.3)'}`,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: isTransferred ? 'var(--paper)' : 'rgba(26,122,76,0.05)',
                            cursor: 'pointer',
                          }}
                        >
                          {isTransferred ? 'Bỏ chuyển' : 'Đã chuyển'}
                        </button>
                      )}

                      <button
                        className="link-btn"
                        onClick={() => handleDeleteCommission(item)}
                        style={{
                          color: 'var(--error)',
                          fontSize: '12px',
                          fontWeight: '700',
                          border: '1.5px solid rgba(220,53,69,0.3)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(220,53,69,0.05)',
                          cursor: 'pointer',
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Overall Day Stats (if viewing all employees) */}
            {!selUid && activeDayRecords.length > 1 && (
              <div style={{
                background: 'var(--paper)',
                padding: '12px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13.5px',
                fontWeight: '600',
                borderTop: '1px solid var(--line)',
                marginTop: '6px'
              }}>
                <span>Tổng doanh thu toàn NV: <span style={{ color: 'var(--blue)' }}>{formatMoney(activeDayRevenue)}</span></span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                  {activeDayCommission > 0 && (
                    <span>Tổng hoa hồng: <span style={{ color: 'var(--success)' }}>{formatMoney(activeDayCommission)}</span></span>
                  )}
                  {activeDayPenalty > 0 && (
                    <span>Thu phạt: <span style={{ color: 'var(--error)' }}>+{formatMoney(activeDayPenalty)}</span></span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
