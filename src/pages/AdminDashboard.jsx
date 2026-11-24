import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db, col } from '../firebase'
import { getISOWeek, formatMoney, getWeekDateRange } from '../utils/date'
import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  const [bossDebts, setBossDebts] = useState([])
  const { week, year } = useMemo(() => getISOWeek(), [])
  const weekRange = useMemo(() => getWeekDateRange(week, year), [week, year])

  useEffect(() => {
    const q = query(collection(db, col('boss_debts')), where('week', '==', week), where('year', '==', year))
    return onSnapshot(q, (snap) => {
      setBossDebts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [week, year])

  const pendingDebts = bossDebts.filter((d) => d.status !== 'paid')
  const bossUnpaidTotal = pendingDebts.reduce((s, d) => s + (d.amount || 0), 0)

  return (
    <div className="page">
      <div className="section-header">
        <h2>Tổng quan · Tuần {week}/{year} ({weekRange.from} – {weekRange.to})</h2>
      </div>
      <div className="grid-stats">
        <Link to="/admin/boss-debts" className="stat-card-link">
          <StatCard label="Khoản nợ tuần này" value={bossDebts.length} />
        </Link>
        <StatCard label="Chờ thanh toán" value={pendingDebts.length} />
        <StatCard label="Tổng tiền nợ tuần này" value={formatMoney(bossUnpaidTotal)} wide />
      </div>
      <div className="card link-list">
        <Link to="/admin/commission/enter" className="link-item">Nhập hoa hồng nhân viên →</Link>
        <Link to="/admin/commission" className="link-item">Bảng xếp hạng doanh thu tháng →</Link>
        <Link to="/admin/commission/history" className="link-item">Lịch sử hoa hồng →</Link>
        <Link to="/admin/boss-debts" className="link-item">Xem tiền nợ nhân viên →</Link>
        <Link to="/admin/settings" className="link-item">Quản lí nhân viên & tài khoản →</Link>
        <Link to="/admin/deposits" className="link-item">Quản lí tiền cọc nhân viên →</Link>
        <Link to="/admin/rules" className="link-item">Bảng nội quy →</Link>
      </div>
    </div>
  )
}

function StatCard({ label, value, wide }) {
  return (
    <div className={`stat-card ${wide ? 'wide' : ''}`}>
      <span className="stat-card-label">{label}</span>
      <span className="stat-card-value">{value}</span>
    </div>
  )
}
