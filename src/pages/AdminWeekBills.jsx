import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db, col } from '../firebase'
import { getISOWeek, getWeekDateRange, formatMoney } from '../utils/date'
import * as XLSX from 'xlsx'

const DAY_LABELS = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const DAY_FULL = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']

// Convert a YYYY-MM-DD dateStr to ISO day-of-week (1=Mon … 7=Sun)
function dateStrToIsoDay(dateStr) {
  if (!dateStr) return 0
  const [y, m, d] = dateStr.split('-').map(Number)
  const jsDay = new Date(y, m - 1, d).getDay() // 0=Sun..6=Sat
  return jsDay === 0 ? 7 : jsDay
}

export default function AdminWeekBills() {
  const [bills, setBills] = useState([])
  const [selectedDay, setSelectedDay] = useState(0)   // 0 = tất cả, 1-7 = Thứ 2-CN
  const [selectedUid, setSelectedUid] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportMode, setExportMode] = useState('all')   // 'all' | 'employee'
  const [exportEmpUid, setExportEmpUid] = useState('')

  const { week, year } = useMemo(() => getISOWeek(), [])
  const weekRange = useMemo(() => getWeekDateRange(week, year), [week, year])

  // Load all bills this week
  useEffect(() => {
    const q = query(
      collection(db, col('bills')),
      where('week', '==', week),
      where('year', '==', year)
    )
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => {
        const da = a.dateStr || ''
        const db2 = b.dateStr || ''
        if (da !== db2) return db2.localeCompare(da)
        return b.timeStr.localeCompare(a.timeStr)
      })
      setBills(list)
    })
  }, [week, year])

  // Danh sách nhân viên đã có bill tuần này (cho dropdown)
  const activeEmployees = useMemo(() => {
    const map = new Map()
    for (const b of bills) {
      if (b.uid && b.employeeName) map.set(b.uid, b.employeeName)
    }
    return [...map.entries()]
      .map(([uid, name]) => ({ uid, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [bills])

  // Danh sách các ngày thực tế có bill (cho tabs lọc ngày)
  const activeDays = useMemo(() => {
    const days = new Set(bills.map((b) => dateStrToIsoDay(b.dateStr)).filter(Boolean))
    return [1, 2, 3, 4, 5, 6, 7].filter((d) => days.has(d))
  }, [bills])

  // Lọc bill theo ngày + nhân viên
  const filteredBills = useMemo(() => {
    let list = bills
    if (selectedDay > 0) list = list.filter((b) => dateStrToIsoDay(b.dateStr) === selectedDay)
    if (selectedUid) list = list.filter((b) => b.uid === selectedUid)
    return list
  }, [bills, selectedDay, selectedUid])

  // Tổng hợp
  const totals = useMemo(() => {
    const t10 = filteredBills.filter((b) => b.amount === 10000).length
    const t15 = filteredBills.filter((b) => b.amount === 15000).length
    const total = filteredBills.reduce((s, b) => s + b.amount, 0)
    return { t10, t15, total, count: filteredBills.length }
  }, [filteredBills])

  async function handleDeleteBill(bill) {
    if (!confirm(`Bạn có chắc chắn muốn xóa bill "${bill.billFull}" của nhân viên "${bill.employeeName || 'này'}" không?`)) return
    try {
      await deleteDoc(doc(db, col('bills'), bill.id))
    } catch (err) {
      console.error(err)
      alert('Xóa bill thất bại. Vui lòng thử lại.')
    }
  }

  function doExport() {
    // Decide which bills to export based on modal selection
    let source = bills
    let empName = ''
    if (exportMode === 'employee' && exportEmpUid) {
      source = bills.filter((b) => b.uid === exportEmpUid)
      empName = activeEmployees.find((e) => e.uid === exportEmpUid)?.name || 'NV'
    }

    const t10 = source.filter((b) => b.amount === 10000).length
    const t15 = source.filter((b) => b.amount === 15000).length
    const total = source.reduce((s, b) => s + b.amount, 0)

    const filename = exportMode === 'employee' && empName
      ? `bill_tuan${week}_${year}_${empName}.xlsx`
      : `bill_tuan${week}_${year}_ca_tuan.xlsx`

    const data = source.map((b) => ({
      'Mã bill': b.billFull,
      'Nhân viên': b.employeeName || '',
      'Thứ': DAY_FULL[dateStrToIsoDay(b.dateStr)] || '',
      'Ngày': b.dateStr ? b.dateStr.split('-').reverse().slice(0, 2).join('/') : '',
      'Giờ': b.timeStr || '',
      'Loại': b.amount === 15000 ? '15k' : '10k',
      'Số tiền': b.amount,
      'Trạng thái': b.status === 'paid' ? 'Đã TT' : 'Chờ TT',
    }))
    data.push({})
    data.push({
      'Mã bill': 'TỔNG CỘNG',
      'Nhân viên': `${source.length} bill`,
      'Loại': `10k: ${t10} | 15k: ${t15}`,
      'Số tiền': total,
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Tuần ${week}`)
    XLSX.writeFile(wb, filename)
    setShowExportModal(false)
  }

  return (
    <div className="page">
      <Link to="/admin" className="back-link">← Tổng quan</Link>
      <div className="section-header">
        <h2>Bill tuần {week}/{year}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="muted small">{weekRange.from} – {weekRange.to}</span>
          <button
            onClick={() => { setExportMode('all'); setExportEmpUid(''); setShowExportModal(true) }}
            style={{
              background: '#1d6f42', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '6px 14px', fontSize: '13px',
              fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            📅 Xuất Excel
          </button>
        </div>
      </div>

      {showExportModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }} onClick={() => setShowExportModal(false)}>
          <div style={{
            background: 'var(--paper-raised)', borderRadius: '20px',
            padding: '24px', width: '100%', maxWidth: '380px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '800' }}>📅 Xuất Excel</h3>
            <p className="muted small" style={{ margin: '0 0 20px' }}>
              Tuần {week}/{year} · {weekRange.from} – {weekRange.to}
            </p>

            {/* Option 1: All week */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
              padding: '14px', borderRadius: '12px', marginBottom: '10px',
              border: `2px solid ${exportMode === 'all' ? 'var(--navy)' : 'var(--line)'}`,
              background: exportMode === 'all' ? 'rgba(27,35,80,0.05)' : 'var(--paper)',
            }}>
              <input
                type="radio"
                name="exportMode"
                value="all"
                checked={exportMode === 'all'}
                onChange={() => { setExportMode('all'); setExportEmpUid('') }}
                style={{ width: '18px', height: '18px', accentColor: 'var(--navy)' }}
              />
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px' }}>Toàn bộ cả tuần</div>
                <div className="muted small">Xuất tất cả {bills.length} bill của mọi nhân viên</div>
              </div>
            </label>

            {/* Option 2: By employee */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
              padding: '14px', borderRadius: '12px', marginBottom: '16px',
              border: `2px solid ${exportMode === 'employee' ? 'var(--navy)' : 'var(--line)'}`,
              background: exportMode === 'employee' ? 'rgba(27,35,80,0.05)' : 'var(--paper)',
            }}>
              <input
                type="radio"
                name="exportMode"
                value="employee"
                checked={exportMode === 'employee'}
                onChange={() => setExportMode('employee')}
                style={{ width: '18px', height: '18px', accentColor: 'var(--navy)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '15px' }}>Theo nhân viên</div>
                <div className="muted small" style={{ marginBottom: '8px' }}>Chỉ xuất bill của 1 nhân viên</div>
                {exportMode === 'employee' && (
                  <select
                    value={exportEmpUid}
                    onChange={(e) => setExportEmpUid(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '100%', marginTop: '4px' }}
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {activeEmployees.map((emp) => (
                      <option key={emp.uid} value={emp.uid}>{emp.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </label>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid var(--line)',
                  background: 'var(--paper)', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                onClick={doExport}
                disabled={exportMode === 'employee' && !exportEmpUid}
                style={{
                  flex: 2, padding: '12px', borderRadius: '12px', border: 'none',
                  background: exportMode === 'employee' && !exportEmpUid ? 'var(--line)' : '#1d6f42',
                  color: '#fff', fontWeight: '700', fontSize: '14px',
                  cursor: exportMode === 'employee' && !exportEmpUid ? 'not-allowed' : 'pointer',
                }}
              >
                📥 Tải xuống Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lọc theo ngày */}
      <div className="segmented" style={{ marginBottom: '8px', flexWrap: 'wrap' }}>
        <button
          className={selectedDay === 0 ? 'active' : ''}
          onClick={() => setSelectedDay(0)}
        >
          Tất cả
        </button>
        {activeDays.map((d) => (
          <button
            key={d}
            className={selectedDay === d ? 'active' : ''}
            onClick={() => setSelectedDay(d)}
          >
            {DAY_LABELS[d]}
          </button>
        ))}
      </div>

      {/* Lọc theo nhân viên */}
      <div className="card stack" style={{ marginBottom: '8px' }}>
        <label className="field">
          <span>Lọc theo nhân viên</span>
          <select value={selectedUid} onChange={(e) => setSelectedUid(e.target.value)}>
            <option value="">Tất cả nhân viên ({activeEmployees.length})</option>
            {activeEmployees.map((emp) => (
              <option key={emp.uid} value={emp.uid}>{emp.name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Thống kê tổng hợp */}
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

        {/* Danh sách bill */}
        <ul className="bill-list">
          {filteredBills.map((b) => {
            const isoDay = dateStrToIsoDay(b.dateStr)
            return (
              <li key={b.id} className="bill-row">
                <span className="bill-code">{b.billFull}</span>
                <span className="muted small" style={{ minWidth: '56px' }}>
                  {isoDay ? DAY_FULL[isoDay] : ''}
                </span>
                <span className="muted small" style={{ flex: 1 }}>
                  {b.employeeName}
                </span>
                <span className={`bill-amount ${b.amount === 15000 ? 'a15' : 'a10'}`}>
                  {formatMoney(b.amount)}
                </span>
                <span className="bill-time muted" style={{ marginLeft: '8px' }}>
                  {b.dateStr
                    ? `${b.dateStr.split('-').reverse().slice(0, 2).join('/')} `
                    : ''}
                  {b.timeStr}
                </span>
                <span
                  className={`badge ${b.status === 'paid' ? 'badge-paid' : 'badge-pending'}`}
                  style={{ marginLeft: '8px' }}
                >
                  {b.status === 'paid' ? 'Đã TT' : 'Chờ TT'}
                </span>
                <button
                  className="link-btn"
                  onClick={() => handleDeleteBill(b)}
                  style={{
                    marginLeft: '8px',
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
                  Xóa Bill
                </button>
              </li>
            )
          })}
          {filteredBills.length === 0 && (
            <li className="muted small empty">
              {selectedDay > 0
                ? `Không có bill vào ${DAY_FULL[selectedDay]}.`
                : 'Chưa có bill nào tuần này.'}
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
