import { useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db, col } from '../firebase'
import { getISOWeek, formatMoney, getWeekDateRange } from '../utils/date'
import { useBonchonWeekBills } from '../utils/useWeekBills'

const DAY_FULL = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']

function dateStrToIsoDay(dateStr) {
  if (!dateStr) return 0
  const [y, m, d] = dateStr.split('-').map(Number)
  const jsDay = new Date(y, m - 1, d).getDay()
  return jsDay === 0 ? 7 : jsDay
}

export default function AdminBonchonEmployeeDetail() {
  const { uid } = useParams()
  const [params] = useSearchParams()
  const fallback = getISOWeek()
  const week = Number(params.get('week')) || fallback.week
  const year = Number(params.get('year')) || fallback.year
  const weekRange = useMemo(() => getWeekDateRange(week, year), [week, year])

  const { bills, loading } = useBonchonWeekBills(week, year)
  const own = useMemo(
    () => bills.filter((b) => b.uid === uid).sort((a, b) => {
      const da = a.dateStr || ''
      const db2 = b.dateStr || ''
      if (da !== db2) return db2.localeCompare(da)
      return (b.timeStr || '').localeCompare(a.timeStr || '')
    }),
    [bills, uid],
  )

  const count = own.length
  const total = own.reduce((s, b) => s + (b.amount || 15000), 0)
  const paidCount = own.filter((b) => b.status === 'paid').length
  const pendingCount = count - paidCount
  const name = own[0]?.employeeName || 'Nhân viên'

  async function handleToggleStatus(bill) {
    const newStatus = bill.status === 'paid' ? 'pending' : 'paid'
    try {
      await updateDoc(doc(db, col('bonchon_bills'), bill.id), { status: newStatus })
    } catch (err) {
      console.error(err)
      alert('Không thể cập nhật trạng thái.')
    }
  }

  async function handlePayAll() {
    const unpaid = own.filter((b) => b.status !== 'paid')
    if (unpaid.length === 0) return
    if (!confirm(`Thanh toán toàn bộ ${unpaid.length} đơn Bonchon chưa thanh toán của ${name}?`)) return
    try {
      const batch = writeBatch(db)
      unpaid.forEach((b) => {
        batch.update(doc(db, col('bonchon_bills'), b.id), { status: 'paid' })
      })
      await batch.commit()
    } catch (err) {
      console.error(err)
      alert('Thanh toán thất bại.')
    }
  }

  return (
    <div className="page">
      <Link to="/admin/bonchon/employees" className="back-link">← Danh sách Tổng tiền BONCHON</Link>
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0 }}>🍗 BONCHON — {name}</h2>
          <span className="muted small">Tuần {week}/{year} ({weekRange.from} – {weekRange.to})</span>
        </div>
        {pendingCount > 0 && (
          <button
            className="btn-primary"
            onClick={handlePayAll}
            style={{ fontSize: '13px', padding: '8px 14px' }}
          >
            Thanh toán tất cả ({pendingCount} đơn)
          </button>
        )}
      </div>

      {loading && <p className="muted">Đang tải…</p>}

      <div className="card summary-card" style={{ marginBottom: '14px' }}>
        <div className="stat-row">
          <div className="stat">
            <span className="stat-label">Tổng đơn</span>
            <span className="stat-value">{count}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Chờ TT</span>
            <span className="stat-value" style={{ color: 'var(--error)' }}>{pendingCount}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Đã TT</span>
            <span className="stat-value" style={{ color: 'var(--success)' }}>{paidCount}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Tổng tiền</span>
            <span className="stat-value" style={{ color: 'var(--navy)' }}>{formatMoney(total)}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <ul className="bill-list">
          {own.map((b) => {
            const isoDay = dateStrToIsoDay(b.dateStr)
            const isPaid = b.status === 'paid'
            return (
              <li key={b.id} className="bill-row" style={{ alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>
                    📍 {b.address}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                    <span>{isoDay ? DAY_FULL[isoDay] : ''}</span>
                    <span style={{ margin: '0 4px' }}>·</span>
                    <span>{b.dateStr ? b.dateStr.split('-').reverse().slice(0, 2).join('/') : ''}</span>
                    <span style={{ margin: '0 4px' }}>·</span>
                    <span>{b.timeStr}</span>
                  </div>
                </div>

                <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--navy)' }}>
                  {formatMoney(b.amount || 15000)}
                </span>

                <button
                  className="link-btn"
                  onClick={() => handleToggleStatus(b)}
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: isPaid ? 'rgba(26,122,76,0.1)' : 'rgba(220,53,69,0.1)',
                    color: isPaid ? 'var(--success)' : 'var(--error)',
                    border: `1px solid ${isPaid ? 'rgba(26,122,76,0.3)' : 'rgba(220,53,69,0.3)'}`,
                  }}
                >
                  {isPaid ? 'Đã TT ✓' : 'Chờ TT ⏳'}
                </button>
              </li>
            )
          })}
          {own.length === 0 && !loading && <li className="muted small empty">Không có đơn Bonchon nào tuần này.</li>}
        </ul>
      </div>
    </div>
  )
}
