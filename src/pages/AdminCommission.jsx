import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../firebase'
import { formatMoney } from '../utils/date'

function pad(n) {
  return String(n).padStart(2, '0')
}

const RANK_CONFIG = [
  { medal: '🥇', color: '#92400E', bg: '#FFFBEB', border: '#F59E0B' },
  { medal: '🥈', color: '#374151', bg: '#F9FAFB', border: '#9CA3AF' },
  { medal: '🥉', color: '#7C2D12', bg: '#FFF7ED', border: '#D97706' },
]

export default function AdminCommission() {
  const [employees, setEmployees] = useState([])
  const now = new Date()

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'employee'))
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'))
      setEmployees(list)
    })
  }, [])

  const [rankMonth, setRankMonth] = useState(now.getMonth() + 1)
  const [rankYear, setRankYear] = useState(now.getFullYear())
  const [rankRecords, setRankRecords] = useState([])

  const rankYearMonth = `${rankYear}-${pad(rankMonth)}`

  useEffect(() => {
    const q = query(collection(db, 'commissions'), where('yearMonth', '==', rankYearMonth))
    return onSnapshot(q, (snap) => {
      setRankRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [rankYearMonth])

  const leaderboard = useMemo(() => {
    const map = new Map()
    employees.forEach((emp) => {
      map.set(emp.uid, {
        uid: emp.uid,
        name: emp.name || emp.username || 'Nhân viên',
        totalRevenue: 0,
        totalCommission: 0,
        count: 0,
      })
    })
    rankRecords.forEach((r) => {
      const key = r.uid || r.employeeName
      let item = map.get(key)
      if (!item) {
        item = { uid: key, name: r.employeeName || 'Nhân viên', totalRevenue: 0, totalCommission: 0, count: 0 }
        map.set(key, item)
      }
      item.totalRevenue += r.revenue || 0
      item.totalCommission += r.commission || 0
      item.count += 1
    })
    return [...map.values()].sort((a, b) =>
      b.totalRevenue !== a.totalRevenue ? b.totalRevenue - a.totalRevenue : b.totalCommission - a.totalCommission
    )
  }, [employees, rankRecords])

  const top1Rev = leaderboard[0]?.totalRevenue || 1
  const rankMonthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
  const rankYearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
  const hasData = leaderboard.some((e) => e.totalRevenue > 0)
  const totalRevenue = leaderboard.reduce((s, e) => s + e.totalRevenue, 0)
  const totalCommission = leaderboard.reduce((s, e) => s + e.totalCommission, 0)

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', letterSpacing: '-0.3px', color: 'var(--navy)' }}>
            Bảng Xếp Hạng Doanh Thu
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Tháng {rankMonth} / {rankYear}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={rankMonth}
            onChange={(e) => setRankMonth(Number(e.target.value))}
            style={{
              padding: '7px 10px', borderRadius: '8px',
              border: '1px solid var(--line)', background: 'var(--paper-raised)',
              color: 'var(--ink)', fontWeight: '600', fontSize: '13px', outline: 'none', cursor: 'pointer'
            }}
          >
            {rankMonthOptions.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
          <select
            value={rankYear}
            onChange={(e) => setRankYear(Number(e.target.value))}
            style={{
              padding: '7px 10px', borderRadius: '8px',
              border: '1px solid var(--line)', background: 'var(--paper-raised)',
              color: 'var(--ink)', fontWeight: '600', fontSize: '13px', outline: 'none', cursor: 'pointer'
            }}
          >
            {rankYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Link
            to="/admin/commission/history"
            style={{
              fontSize: '13px', fontWeight: '600', color: 'var(--navy)',
              textDecoration: 'none', padding: '7px 14px',
              border: '1px solid var(--line)', borderRadius: '8px',
              background: 'var(--paper-raised)', whiteSpace: 'nowrap'
            }}
          >
            Lịch sử →
          </Link>
        </div>
      </div>

      {/* ── Stats summary row ── */}
      {hasData && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[
            { label: 'Tổng doanh thu', value: formatMoney(totalRevenue), color: 'var(--navy)' },
            { label: 'Tổng hoa hồng', value: formatMoney(totalCommission), color: 'var(--teal)' },
            { label: 'Số nhân viên', value: `${leaderboard.length} người`, color: 'var(--ink)' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ flex: 1, minWidth: '120px', padding: '12px 16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Main Table Card ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        {!hasData ? (
          <div style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--ink-soft)' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.4 }}>—</div>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
              Chưa có dữ liệu cho Tháng {rankMonth}/{rankYear}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '56px 1fr 150px 150px',
              padding: '10px 20px',
              background: 'var(--paper)',
              borderBottom: '2px solid var(--line)',
            }}>
              {['#', 'Nhân viên', 'Doanh thu', 'Hoa hồng'].map((col, i) => (
                <span key={col} style={{
                  fontSize: '11px', fontWeight: '700', color: 'var(--ink-soft)',
                  textTransform: 'uppercase', letterSpacing: '0.8px',
                  textAlign: i > 1 ? 'right' : 'left'
                }}>
                  {col}
                </span>
              ))}
            </div>

            {/* Rows */}
            {leaderboard.map((emp, idx) => {
              const rank = idx + 1
              const isTop3 = rank <= 3
              const cfg = RANK_CONFIG[idx]
              const pct = Math.min(100, Math.round((emp.totalRevenue / top1Rev) * 100))

              return (
                <div
                  key={emp.uid}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '56px 1fr 150px 150px',
                    padding: '13px 20px',
                    borderBottom: '1px solid var(--line)',
                    borderLeft: isTop3 ? `3px solid ${cfg.border}` : '3px solid transparent',
                    background: isTop3 ? cfg.bg : idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.012)',
                    alignItems: 'center',
                  }}
                >
                  {/* Rank */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {isTop3
                      ? <span style={{ fontSize: '22px', lineHeight: 1 }}>{cfg.medal}</span>
                      : <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--ink-soft)', fontVariantNumeric: 'tabular-nums', minWidth: '20px', textAlign: 'center' }}>{rank}</span>
                    }
                  </div>

                  {/* Name + bar */}
                  <div style={{ paddingRight: '16px', minWidth: 0 }}>
                    <div style={{
                      fontWeight: isTop3 ? '700' : '600',
                      fontSize: '14px',
                      color: isTop3 ? cfg.color : 'var(--ink)',
                      marginBottom: '5px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {emp.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{ flex: 1, height: '3px', background: 'var(--line)', borderRadius: '4px', overflow: 'hidden', maxWidth: '220px' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: isTop3 ? cfg.border : '#94a3b8',
                          borderRadius: '4px', transition: 'width 0.5s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--ink-soft)', fontWeight: '700', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Revenue */}
                  <div style={{
                    textAlign: 'right', fontWeight: '700', fontSize: '14px',
                    color: isTop3 ? cfg.color : 'var(--ink)',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {emp.totalRevenue > 0
                      ? formatMoney(emp.totalRevenue)
                      : <span style={{ color: 'var(--ink-soft)', fontWeight: '400' }}>—</span>
                    }
                  </div>

                  {/* Commission */}
                  <div style={{
                    textAlign: 'right', fontWeight: '600', fontSize: '13px',
                    color: emp.totalCommission > 0 ? 'var(--teal)' : 'var(--ink-soft)',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {emp.totalCommission > 0 ? formatMoney(emp.totalCommission) : '—'}
                  </div>
                </div>
              )
            })}

            {/* Footer */}
            <div style={{
              padding: '11px 20px',
              background: 'var(--paper)',
              borderTop: '1px solid var(--line)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: '8px'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--ink-soft)', fontWeight: '600' }}>
                {leaderboard.length} nhân viên · Tháng {rankMonth}/{rankYear}
              </span>
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--navy)', fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(totalRevenue)}
                <span style={{ fontWeight: '500', color: 'var(--ink-soft)', marginLeft: '10px', fontSize: '12px' }}>
                  HH {formatMoney(totalCommission)}
                </span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
