import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, query, where, updateDoc } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../firebase'
import { getISOWeek, getWeekDateRange, formatMoney } from '../utils/date'
import * as XLSX from 'xlsx'

const DAY_LABELS = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const DAY_FULL = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']

function dateStrToIsoDay(dateStr) {
  if (!dateStr) return 0
  const [y, m, d] = dateStr.split('-').map(Number)
  const jsDay = new Date(y, m - 1, d).getDay()
  return jsDay === 0 ? 7 : jsDay
}

export default function AdminBonchonWeekBills() {
  const [bills, setBills] = useState([])
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedUid, setSelectedUid] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportMode, setExportMode] = useState('all')
  const [exportEmpUid, setExportEmpUid] = useState('')

  const { week, year } = useMemo(() => getISOWeek(), [])
  const weekRange = useMemo(() => getWeekDateRange(week, year), [week, year])

  // Load all Bonchon bills this week
  useEffect(() => {
    const q = query(
      collection(db, 'bonchon_bills'),
      where('week', '==', week),
      where('year', '==', year)
    )
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => {
        const da = a.dateStr || ''
        const db2 = b.dateStr || ''
        if (da !== db2) return db2.localeCompare(da)
        return (b.timeStr || '').localeCompare(a.timeStr || '')
      })
      setBills(list)
    })
  }, [week, year])

  const activeEmployees = useMemo(() => {
    const map = new Map()
    for (const b of bills) {
      if (b.uid && b.employeeName) map.set(b.uid, b.employeeName)
    }
    return [...map.entries()]
      .map(([uid, name]) => ({ uid, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [bills])

  const activeDays = useMemo(() => {
    const days = new Set(bills.map((b) => dateStrToIsoDay(b.dateStr)).filter(Boolean))
    return [1, 2, 3, 4, 5, 6, 7].filter((d) => days.has(d))
  }, [bills])

  const filteredBills = useMemo(() => {
    let list = bills
    if (selectedDay > 0) list = list.filter((b) => dateStrToIsoDay(b.dateStr) === selectedDay)
    if (selectedUid) list = list.filter((b) => b.uid === selectedUid)
    return list
  }, [bills, selectedDay, selectedUid])

  const totals = useMemo(() => {
    const count = filteredBills.length
    const paidCount = filteredBills.filter((b) => b.status === 'paid').length
    const pendingCount = count - paidCount
    const total = filteredBills.reduce((s, b) => s + (b.amount || 15000), 0)
    const paidAmount = filteredBills.filter((b) => b.status === 'paid').reduce((s, b) => s + (b.amount || 15000), 0)
    const pendingAmount = total - paidAmount
    return { count, paidCount, pendingCount, total, paidAmount, pendingAmount }
  }, [filteredBills])

  async function handleToggleStatus(bill) {
    const newStatus = bill.status === 'paid' ? 'pending' : 'paid'
    try {
      await updateDoc(doc(db, 'bonchon_bills', bill.id), { status: newStatus })
    } catch (err) {
      console.error(err)
      alert('Không thể cập nhật trạng thái. Vui lòng thử lại.')
    }
  }

  async function handleDeleteBill(bill) {
    if (!confirm(`Bạn có chắc chắn muốn xóa đơn Bonchon "${bill.address || ''}" của "${bill.employeeName || 'này'}" không?`)) return
    try {
      await deleteDoc(doc(db, 'bonchon_bills', bill.id))
    } catch (err) {
      console.error(err)
      alert('Xóa đơn thất bại. Vui lòng thử lại.')
    }
  }

  function doExport() {
    let source = bills
    let empName = ''
    if (exportMode === 'employee' && exportEmpUid) {
      source = bills.filter((b) => b.uid === exportEmpUid)
      empName = activeEmployees.find((e) => e.uid === exportEmpUid)?.name || 'NV'
    }

    const total = source.reduce((s, b) => s + (b.amount || 15000), 0)

    const filename = exportMode === 'employee' && empName
      ? `bonchon_tuan${week}_${year}_${empName}.xlsx`
      : `bonchon_tuan${week}_${year}_ca_tuan.xlsx`

    const data = source.map((b) => ({
      'Địa chỉ giao hàng': b.address || '',
      'Nhân viên': b.employeeName || '',
      'Thứ': DAY_FULL[dateStrToIsoDay(b.dateStr)] || '',
      'Ngày': b.dateStr ? b.dateStr.split('-').reverse().slice(0, 2).join('/') : '',
      'Giờ': b.timeStr || '',
      'Số tiền': b.amount || 15000,
      'Trạng thái': b.status === 'paid' ? 'Đã TT' : 'Chờ TT',
    }))
    data.push({})
    data.push({
      'Địa chỉ giao hàng': 'TỔNG CỘNG',
      'Nhân viên': `${source.length} đơn`,
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
        <div>
          <h2 style={{ margin: 0 }}>🍗 BONCHON — Bill tuần {week}/{year}</h2>
          <span className="muted small">{weekRange.from} – {weekRange.to}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => { setExportMode('all'); setExportEmpUid(''); setShowExportModal(true) }}
            style={{
              background: '#1d6f42', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '6px 14px', fontSize: '13px',
              fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            📊 Xuất Excel
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
            background: 'var(--paper)', borderRadius: '14px', padding: '20px',
            maxWidth: '360px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: '700' }}>Xuất Excel Bill BONCHON</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio" name="bonchonExportMode" value="all"
                  checked={exportMode === 'all'}
                  onChange={() => setExportMode('all')}
                />
                Tất cả bill trong tuần ({bills.length} đơn)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio" name="bonchonExportMode" value="employee"
                  checked={exportMode === 'employee'}
                  onChange={() => setExportMode('employee')}
                />
                Theo từng nhân viên
              </label>
              {exportMode === 'employee' && (
                <select
                  value={exportEmpUid}
                  onChange={(e) => setExportEmpUid(e.target.value)}
                  style={{
                    padding: '8px 10px', borderRadius: '8px',
                    border: '1.5px solid var(--line)', background: 'var(--paper-raised)',
                    fontSize: '13px', fontWeight: '600', color: 'var(--ink)',
                  }}
                >
                  <option value="">— Chọn nhân viên —</option>
                  {activeEmployees.map((e) => (
                    <option key={e.uid} value={e.uid}>{e.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--line)',
                  background: 'var(--paper-raised)', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                onClick={doExport}
                disabled={exportMode === 'employee' && !exportEmpUid}
                style={{
                  padding: '7px 16px', borderRadius: '8px', border: 'none',
                  background: '#1d6f42', color: '#fff', fontSize: '13px',
                  fontWeight: '700', cursor: 'pointer', opacity: exportMode === 'employee' && !exportEmpUid ? 0.5 : 1,
                }}
              >
                Tải file .xlsx
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
            <span className="stat-label">Tổng đơn</span>
            <span className="stat-value">{totals.count}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Chờ TT</span>
            <span className="stat-value" style={{ color: 'var(--error)' }}>{totals.pendingCount}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Đã TT</span>
            <span className="stat-value" style={{ color: 'var(--success)' }}>{totals.paidCount}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Tổng tiền</span>
            <span className="stat-value" style={{ color: 'var(--navy)' }}>{formatMoney(totals.total)}</span>
          </div>
        </div>

        {/* Danh sách đơn Bonchon */}
        <ul className="bill-list">
          {filteredBills.map((b) => {
            const isoDay = dateStrToIsoDay(b.dateStr)
            const isPaid = b.status === 'paid'
            return (
              <li key={b.id} className="bill-row" style={{ alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '160px' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--ink)' }}>
                    📍 {b.address}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '2px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span>{b.employeeName}</span>
                    <span>·</span>
                    <span>{isoDay ? DAY_FULL[isoDay] : ''}</span>
                    <span>{b.dateStr ? b.dateStr.split('-').reverse().slice(0, 2).join('/') : ''}</span>
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

                <button
                  className="link-btn"
                  onClick={() => handleDeleteBill(b)}
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
              </li>
            )
          })}
          {filteredBills.length === 0 && (
            <li className="muted small empty">
              {selectedDay > 0
                ? `Không có đơn Bonchon vào ${DAY_FULL[selectedDay]}.`
                : 'Chưa có đơn Bonchon nào tuần này.'}
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
