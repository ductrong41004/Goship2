import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, query, where, writeBatch } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db, col } from '../firebase'
import { getISOWeek, formatMoney, recentWeeks, getWeekDateRange } from '../utils/date'
import { useWeekBills } from '../utils/useWeekBills'

function removeVietnameseTones(str) {
  if (!str) return ''
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i")
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
  str = str.replace(/đ/g, "d")
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A")
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E")
  str = str.replace(/Ì|Í|Ị|Ĩ/g, "I")
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O")
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U")
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y")
  str = str.replace(/Đ/g, "D")
  return str.toLowerCase()
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([])
  const [sel, setSel] = useState(() => getISOWeek())
  const [searchTerm, setSearchTerm] = useState('')
  const weeks = useMemo(() => recentWeeks(12), [])
  const { bills, loading } = useWeekBills(sel.week, sel.year)

  async function handlePayAllEmployeeBills(employeeUid, employeeName) {
    if (!confirm(`Thanh toán toàn bộ các bill tuần này của nhân viên "${employeeName}"?`)) return
    const unpaidBills = bills.filter((b) => b.uid === employeeUid && b.status !== 'paid')
    if (unpaidBills.length === 0) return
    try {
      const batch = writeBatch(db)
      unpaidBills.forEach((b) => {
        const ref = doc(db, col('bills'), b.id)
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
      const t10 = own.filter((b) => b.amount === 10000).length
      const t15 = own.filter((b) => b.amount === 15000).length
      const total = own.reduce((s, b) => s + b.amount, 0)
      const allPaid = own.length > 0 && own.every((b) => b.status === 'paid')
      const somePaid = own.some((b) => b.status === 'paid')
      const status = own.length === 0 ? '—' : allPaid ? 'Đã thanh toán' : somePaid ? 'Một phần' : 'Chờ thanh toán'
      return { ...emp, t10, t15, count: own.length, total, status }
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

  return (
    <div className="page">
      <div className="section-header">
        <h2>Bill Lottee Nhân Viên</h2>
        <select
          value={`${sel.year}-${sel.week}`}
          onChange={(e) => {
            const [y, w] = e.target.value.split('-').map(Number)
            setSel({ week: w, year: y })
          }}
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
      {/* Ô tìm kiếm nhân viên nhập tay */}
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
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>10k</th>
              <th>15k</th>
              <th>Tổng bill</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.uid}>
                <td>
                  <Link to={`/admin/employees/${r.uid}?week=${sel.week}&year=${sel.year}`}>{r.name}</Link>
                </td>
                <td>{r.t10}</td>
                <td>{r.t15}</td>
                <td>{r.count}</td>
                <td>{formatMoney(r.total)}</td>
                <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`badge ${r.status === 'Đã thanh toán' ? 'badge-paid' : 'badge-pending'}`}>
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
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '16px' }}>
                  {searchTerm ? `Không tìm thấy nhân viên nào với từ khóa "${searchTerm}".` : 'Chưa có nhân viên nào.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
