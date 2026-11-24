import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db, col } from '../firebase'
import { formatDateStr, formatMoney } from '../utils/date'

export default function AdminTodayBills() {
  const [bills, setBills] = useState([])
  const [selectedUid, setSelectedUid] = useState('')
  const today = useMemo(() => formatDateStr(), [])

  useEffect(() => {
    // Chỉ lọc theo dateStr (không dùng orderBy để tránh phải tạo index composite mới)
    const q = query(collection(db, col('bills')), where('dateStr', '==', today))
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      // Sắp xếp theo giờ nhập mới nhất ở phía client
      list.sort((a, b) => b.timeStr.localeCompare(a.timeStr))
      setBills(list)
    })
  }, [today])

  // Lấy danh sách nhân viên duy nhất đã nhập bill hôm nay để làm bộ lọc
  const activeEmployees = useMemo(() => {
    const map = new Map()
    for (const b of bills) {
      if (b.uid && b.employeeName) {
        map.set(b.uid, b.employeeName)
      }
    }
    return [...map.entries()].map(([uid, name]) => ({ uid, name }))
  }, [bills])

  // Lọc bill theo nhân viên được chọn
  const filteredBills = useMemo(() => {
    if (!selectedUid) return bills
    return bills.filter((b) => b.uid === selectedUid)
  }, [bills, selectedUid])

  // Tính tổng hợp
  const totals = useMemo(() => {
    const t10 = filteredBills.filter((b) => b.amount === 10000).length
    const t15 = filteredBills.filter((b) => b.amount === 15000).length
    const total = filteredBills.reduce((s, b) => s + b.amount, 0)
    return { t10, t15, total, count: filteredBills.length }
  }, [filteredBills])

  return (
    <div className="page">
      <Link to="/admin" className="back-link">← Tổng quan</Link>
      <div className="section-header">
        <h2>Hóa đơn hôm nay</h2>
        <span className="muted small">{today.split('-').reverse().join('/')}</span>
      </div>

      <div className="card stack">
        <label className="field">
          <span>Lọc theo nhân viên</span>
          <select value={selectedUid} onChange={(e) => setSelectedUid(e.target.value)}>
            <option value="">Tất cả nhân viên ({activeEmployees.length})</option>
            {activeEmployees.map((emp) => (
              <option key={emp.uid} value={emp.uid}>
                {emp.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card">
        <div className="stat-row">
          <div className="stat">
            <span className="stat-label">Tổng bill</span>
            <span className="stat-value">{totals.count}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Bill 10k</span>
            <span className="stat-value">{totals.t10}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Bill 15k</span>
            <span className="stat-value">{totals.t15}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Tổng tiền</span>
            <span className="stat-value">{formatMoney(totals.total)}</span>
          </div>
        </div>

        <ul className="bill-list">
          {filteredBills.map((b) => (
            <li key={b.id} className="bill-row">
              <span className="bill-code">{b.billFull}</span>
              <span className="muted small">NV: {b.employeeName}</span>
              <span className={`bill-amount ${b.amount === 15000 ? 'a15' : 'a10'}`} style={{ marginLeft: 'auto' }}>
                {formatMoney(b.amount)}
              </span>
              <span className="bill-time muted" style={{ marginLeft: '10px' }}>{b.timeStr}</span>
              <span className={`badge ${b.status === 'paid' ? 'badge-paid' : 'badge-pending'}`} style={{ marginLeft: '10px' }}>
                {b.status === 'paid' ? 'Đã TT' : 'Chờ TT'}
              </span>
            </li>
          ))}
          {filteredBills.length === 0 && (
            <li className="muted small empty">Chưa có hóa đơn nào được nhập hôm nay.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
