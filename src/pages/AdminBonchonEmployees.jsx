import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, query, where, writeBatch } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db, col } from '../firebase'
import { getISOWeek, formatMoney, recentWeeks, getWeekDateRange } from '../utils/date'
import { useBonchonWeekBills } from '../utils/useWeekBills'

function removeVietnameseTones(str) {
  if (!str) return ''
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a')
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e')
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i')
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o')
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u')
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y')
  str = str.replace(/đ/g, 'd')
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A')
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E')
  str = str.replace(/Ì|Í|Ị|Ĩ/g, 'I')
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O')
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U')
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y')
  str = str.replace(/Đ/g, 'D')
  return str.toLowerCase()
}

export default function AdminBonchonEmployees() {
  const [employees, setEmployees] = useState([])
  const [sel, setSel] = useState(() => getISOWeek())
  const [searchTerm, setSearchTerm] = useState('')
  const weeks = useMemo(() => recentWeeks(12), [])
  const { bills, loading } = useBonchonWeekBills(sel.week, sel.year)

  async function handlePayAllEmployeeBills(employeeUid, employeeName) {
    if (!confirm(`Thanh toán toàn bộ đơn Bonchon tuần này của nhân viên "${employeeName}"?`)) return
    const unpaidBills = bills.filter((b) => b.uid === employeeUid && b.status !== 'paid')
    if (unpaidBills.length === 0) return
    try {
      const batch = writeBatch(db)
      unpaidBills.forEach((b) => {
        const ref = doc(db, col('bonchon_bills'), b.id)
        batch.update(ref, { status: 'paid' })
      })
      await batch.commit()
    } catch (err) {
      console.error(err)
      alert('Không thể thanh toán. Vui lòng thử lại.')
    }
  }

  useEffect(() => {
    const q = query(collection(db, col('users')), where('role', '==', 'employee'))
    return onSnapshot(q, (snap) => {
      setEmployees(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
    })
  }, [])

  const rows = useMemo(() => {
    return employees.map((emp) => {
      const own = bills.filter((b) => b.uid === emp.uid)
      const total = own.reduce((s, b) => s + (b.amount || 15000), 0)
      const allPaid = own.length > 0 && own.every((b) => b.status === 'paid')
      const somePaid = own.some((b) => b.status === 'paid')
      const status = own.length === 0 ? '—' : allPaid ? 'Đã thanh toán' : somePaid ? 'Một phần' : 'Chờ thanh toán'
      return { ...emp, count: own.length, total, status }
    }).sort((a, b) => b.total - a.total)
  }, [employees, bills])

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows
    const term = removeVietnameseTones(searchTerm.trim())
    return rows.filter((r) => {
      const nameClean = removeVietnameseTones(r.name || '')
      const usernameClean = removeVietnameseTones(r.username || '')
      return nameClean.includes(term) || usernameClean.includes(term)
    })
  }, [rows, searchTerm])

  const grandTotal = useMemo(() => {
    const totalCount = bills.length
    const totalMoney = bills.reduce((s, b) => s + (b.amount || 15000), 0)
    const paidMoney = bills.filter((b) => b.status === 'paid').reduce((s, b) => s + (b.amount || 15000), 0)
    const pendingMoney = totalMoney - paidMoney
    return { totalCount, totalMoney, paidMoney, pendingMoney }
  }, [bills])

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0 }}>🍗 Tổng Tiền BONCHON Nhân Viên</h2>
        </div>
        <select
          value={`${sel.year}-${sel.week}`}
          onChange={(e) => {
            const [y, w] = e.target.value.split('-').map(Number)
            setSel({ week: w, year: y })
          }}
          style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--line)', fontWeight: '600' }}
        >
          {weeks.map((w) => {
            const range = getWeekDateRange(w.week, w.year)
            return (
              <option key={`${w.year}-${w.week}`} value={`${w.year}-${w.week}`}>
                Tuần {w.week}/{w.year} ({range.from} – {range.to})
              </option>
            )
          })}
        </select>
      </div>

      {/* Thẻ thống kê toàn quán */}
      <div className="card" style={{ marginBottom: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '100px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Tổng đơn Bonchon</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', marginTop: '2px' }}>{grandTotal.totalCount} đơn</div>
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Tổng tiền</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', marginTop: '2px' }}>{formatMoney(grandTotal.totalMoney)}</div>
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Đã thanh toán</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--success)', marginTop: '2px' }}>{formatMoney(grandTotal.paidMoney)}</div>
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Chưa thanh toán</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--error)', marginTop: '2px' }}>{formatMoney(grandTotal.pendingMoney)}</div>
          </div>
        </div>
      </div>

      {/* Ô tìm kiếm */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 Tìm kiếm nhân viên (nhập tên hoặc tên đăng nhập)..."
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1.5px solid var(--line)',
            fontSize: '14px',
            background: 'var(--paper-raised)',
            color: 'var(--ink)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {loading && <p className="muted">Đang tải…</p>}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th style={{ textAlign: 'center' }}>Số đơn</th>
              <th style={{ textAlign: 'right' }}>Tổng tiền</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.uid}>
                <td>
                  <Link
                    to={`/admin/bonchon/employees/${r.uid}?week=${sel.week}&year=${sel.year}`}
                    style={{ fontWeight: '600', color: 'var(--navy)', textDecoration: 'none' }}
                  >
                    {r.name} →
                  </Link>
                </td>
                <td style={{ textAlign: 'center', fontWeight: '700' }}>
                  {r.count > 0 ? `${r.count} đơn` : '—'}
                </td>
                <td style={{ textAlign: 'right', fontWeight: '700', color: r.total > 0 ? 'var(--navy)' : 'var(--ink-soft)' }}>
                  {r.total > 0 ? formatMoney(r.total) : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className={`badge ${r.status === 'Đã thanh toán' ? 'badge-paid' : r.status === 'Chờ thanh toán' ? 'badge-pending' : ''}`}>
                      {r.status}
                    </span>
                    {r.status !== 'Đã thanh toán' && r.count > 0 && (
                      <button
                        className="link-btn"
                        onClick={() => handlePayAllEmployeeBills(r.uid, r.name)}
                        style={{
                          color: 'var(--success)',
                          fontSize: '12px',
                          fontWeight: '700',
                          border: '1.5px solid rgba(26,122,76,0.3)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(26,122,76,0.05)',
                          cursor: 'pointer',
                        }}
                      >
                        Thanh toán
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: '24px' }}>
                  {searchTerm ? `Không tìm thấy nhân viên nào với từ khóa "${searchTerm}".` : 'Chưa có dữ liệu.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
