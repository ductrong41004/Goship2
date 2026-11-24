import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db, col } from '../firebase'
import { getISOWeek, formatDateStr, formatMoney, getWeekDateRange } from '../utils/date'
import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  const [weekBills, setWeekBills] = useState([])
  const [bossDebts, setBossDebts] = useState([])
  const today = useMemo(() => formatDateStr(), [])
  const { week, year } = useMemo(() => getISOWeek(), [])
  const weekRange = useMemo(() => getWeekDateRange(week, year), [week, year])

  useEffect(() => {
    const q = query(collection(db, col('bills')), where('week', '==', week), where('year', '==', year))
    return onSnapshot(q, (snap) => {
      setWeekBills(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [week, year])

  useEffect(() => {
    const q = query(collection(db, col('boss_debts')), where('week', '==', week), where('year', '==', year))
    return onSnapshot(q, (snap) => {
      setBossDebts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [week, year])

  const todayBills = weekBills.filter((b) => b.dateStr === today)
  const t10 = weekBills.filter((b) => b.amount === 10000).length
  const t15 = weekBills.filter((b) => b.amount === 15000).length
  const unpaidTotal = weekBills.filter((b) => b.status !== 'paid').reduce((s, b) => s + b.amount, 0)
  const todayUnpaid = todayBills.filter((b) => b.status !== 'paid').reduce((s, b) => s + b.amount, 0)
  const bossUnpaidTotal = bossDebts.filter((d) => d.status !== 'paid').reduce((s, d) => s + (d.amount || 0), 0)

  return (
    <div className="page">
      <div className="section-header">
        <h2>Tổng quan · Tuần {week}/{year} ({weekRange.from} – {weekRange.to})</h2>
      </div>
      <div className="grid-stats">
        <Link to="/admin/today-bills" className="stat-card-link">
          <StatCard label="Bill hôm nay" value={todayBills.length} />
        </Link>
        <Link to="/admin/week-bills" className="stat-card-link">
          <StatCard label="Bill tuần này" value={weekBills.length} />
        </Link>
        <StatCard label="Bill 10k" value={t10} />
        <StatCard label="Bill 15k" value={t15} />
        <StatCard label="Tiền Lottee Của Nhân Viên Tuần này" value={formatMoney(unpaidTotal)} />
        <StatCard label="Tiền thiếu Nhân Viên tuần này" value={formatMoney(bossUnpaidTotal)} />
      </div>
      <div className="card link-list">
        <Link to="/admin/employees" className="link-item">Danh sách tiền Lottee →</Link>
        <Link to="/admin/week-bills" className="link-item">Chi tiết Tuần Lottee →</Link>
        <Link to="/admin/boss-debts" className="link-item">Xem tiền nợ Nhân Viên →</Link>
        <Link to="/admin/commission/history" className="link-item">Lịch sử hoa hồng →</Link>
        <Link to="/admin/settings" className="link-item">Cài đặt & nhân viên →</Link>
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
