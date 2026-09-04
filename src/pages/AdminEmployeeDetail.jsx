import { useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { getISOWeek, formatMoney, getWeekDateRange } from '../utils/date'
import { useWeekBills } from '../utils/useWeekBills'

export default function AdminEmployeeDetail() {
  const { uid } = useParams()
  const [params] = useSearchParams()
  const fallback = getISOWeek()
  const week = Number(params.get('week')) || fallback.week
  const year = Number(params.get('year')) || fallback.year
  const weekRange = useMemo(() => getWeekDateRange(week, year), [week, year])

  const { bills, loading } = useWeekBills(week, year)
  const own = useMemo(
    () => bills.filter((b) => b.uid === uid).sort((a, b) => (a.timeStr < b.timeStr ? 1 : -1)),
    [bills, uid],
  )

  const t10 = own.filter((b) => b.amount === 10000).length
  const t15 = own.filter((b) => b.amount === 15000).length
  const total = own.reduce((s, b) => s + b.amount, 0)
  const name = own[0]?.employeeName || '—'

  return (
    <div className="page">
      <Link to="/admin/employees" className="back-link">← Danh sách nhân viên</Link>
      <div className="section-header">
        <h2>{name}</h2>
        <span className="muted small">Tuần {week}/{year} ({weekRange.from} – {weekRange.to})</span>
      </div>
      {loading && <p className="muted">Đang tải…</p>}
      <div className="card">
        <ul className="bill-list">
          {own.map((b) => (
            <li key={b.id} className="bill-row">
              <span className="bill-code">{b.billFull}</span>
              <span className={`bill-amount ${b.amount === 15000 ? 'a15' : 'a10'}`}>{formatMoney(b.amount)}</span>
              <span className="bill-time muted">{b.timeStr}</span>
              <span className={`badge ${b.status === 'paid' ? 'badge-paid' : 'badge-pending'}`}>
                {b.status === 'paid' ? 'Đã TT' : 'Chờ TT'}
              </span>
            </li>
          ))}
          {own.length === 0 && !loading && <li className="muted small empty">Không có bill nào.</li>}
        </ul>
      </div>
      <div className="card summary-card">
        <div className="stat-row">
          <div className="stat"><span className="stat-label">Bill 10k</span><span className="stat-value">{t10}</span></div>
          <div className="stat"><span className="stat-label">Bill 15k</span><span className="stat-value">{t15}</span></div>
          <div className="stat"><span className="stat-label">Tổng tiền</span><span className="stat-value">{formatMoney(total)}</span></div>
        </div>
      </div>
    </div>
  )
}
