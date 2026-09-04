import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, serverTimestamp, writeBatch, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { getISOWeek, formatMoney, recentWeeks, getWeekDateRange, formatMonthStr } from '../utils/date'
import { useWeekBills } from '../utils/useWeekBills'
import * as XLSX from 'xlsx'

export default function AdminPayment() {
  const [sel, setSel] = useState(() => getISOWeek())
  const weeks = useMemo(() => recentWeeks(12), [])
  const { bills, loading } = useWeekBills(sel.week, sel.year)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [selectedUid, setSelectedUid] = useState('')
  const [showPaid, setShowPaid] = useState(false)
  const [showPendingDetails, setShowPendingDetails] = useState(false)

  const [exportMode, setExportMode] = useState('week') // week | month | employee
  const [monthSel, setMonthSel] = useState(() => formatMonthStr())
  const [allEmployees, setAllEmployees] = useState([])
  const [empSel, setEmpSel] = useState('')
  const [exportBusy, setExportBusy] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'employee'))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'))
      setAllEmployees(list)
      if (list.length > 0) setEmpSel(list[0].uid)
    })
    return unsub
  }, [])

  const pending = bills.filter((b) => b.status !== 'paid')

  const byEmployee = useMemo(() => {
    const map = new Map()
    for (const b of pending) {
      if (!map.has(b.uid)) map.set(b.uid, { name: b.employeeName, t10: 0, t15: 0, total: 0, count: 0 })
      const row = map.get(b.uid)
      row.count += 1
      row.total += b.amount
      if (b.amount === 10000) row.t10 += 1
      else row.t15 += 1
    }
    return [...map.entries()].map(([uid, v]) => ({ uid, ...v })).sort((a, b) => b.total - a.total)
  }, [pending])

  const filteredBills = useMemo(() => {
    const list = selectedUid ? pending.filter((b) => b.uid === selectedUid) : pending
    return [...list].sort((a, b) => {
      const dateTimeA = a.dateStr + 'T' + a.timeStr
      const dateTimeB = b.dateStr + 'T' + b.timeStr
      return dateTimeB.localeCompare(dateTimeA)
    })
  }, [pending, selectedUid])

  const grandTotal = pending.reduce((s, b) => s + b.amount, 0)

  const paidBills = useMemo(() => {
    return [...bills.filter((b) => b.status === 'paid')].sort((a, b) => {
      const dateTimeA = a.dateStr + 'T' + a.timeStr
      const dateTimeB = b.dateStr + 'T' + b.timeStr
      return dateTimeB.localeCompare(dateTimeA)
    })
  }, [bills])
  const paidTotal = paidBills.reduce((s, b) => s + b.amount, 0)

  async function handlePay() {
    if (pending.length === 0) return
    const range = getWeekDateRange(sel.week, sel.year)
    if (!confirm(`Xác nhận thanh toán ${pending.length} bill, tổng ${formatMoney(grandTotal)} cho tuần ${sel.week}/${sel.year} (${range.from} – {range.to})?`)) return
    setBusy(true)
    try {
      const paymentRef = await addDoc(collection(db, 'payments'), {
        week: sel.week,
        year: sel.year,
        createdAt: serverTimestamp(),
        totalAmount: grandTotal,
        billCount: pending.length,
        employees: byEmployee.map((e) => ({ uid: e.uid, name: e.name, count: e.count, total: e.total })),
      })
      // Firestore batches max at 500 ops; chunk defensively.
      const chunkSize = 400
      for (let i = 0; i < pending.length; i += chunkSize) {
        const batch = writeBatch(db)
        for (const b of pending.slice(i, i + chunkSize)) {
          batch.update(doc(db, 'bills', b.id), { status: 'paid', paymentId: paymentRef.id })
        }
        await batch.commit()
      }
      setDone(true)
    } catch (err) {
      console.error(err)
      alert('Có lỗi xảy ra khi thanh toán. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeletePaid() {
    if (paidBills.length === 0) return
    if (!confirm(`Xóa toàn bộ ${paidBills.length} hóa đơn đã thanh toán trong tuần ${sel.week}/${sel.year}? Hành động này không thể hoàn tác!`)) return
    setBusy(true)
    try {
      const chunkSize = 400
      for (let i = 0; i < paidBills.length; i += chunkSize) {
        const batch = writeBatch(db)
        for (const b of paidBills.slice(i, i + chunkSize)) {
          batch.delete(doc(db, 'bills', b.id))
        }
        await batch.commit()
      }
      setShowPaid(false)
    } catch (err) {
      console.error(err)
      alert('Xóa thất bại. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  async function handleExport() {
    setExportBusy(true)
    try {
      let exportBills = []
      let label = ''
      if (exportMode === 'week') {
        exportBills = bills
        label = `Tuan_${sel.week}_${sel.year}`
      } else if (exportMode === 'month') {
        const q = query(collection(db, 'bills'), where('monthStr', '==', monthSel))
        exportBills = (await getDocs(q)).docs.map((d) => d.data())
        label = `Thang_${monthSel}`
      } else {
        const q = query(collection(db, 'bills'), where('uid', '==', empSel))
        exportBills = (await getDocs(q)).docs.map((d) => d.data())
        const emp = allEmployees.find((e) => e.uid === empSel)
        label = `NhanVien_${(emp?.name || empSel).replace(/\s+/g, '_')}`
      }
      exportToExcel(exportBills, label)
    } catch (err) {
      console.error(err)
      alert('Xuất Excel thất bại. Vui lòng thử lại.')
    } finally {
      setExportBusy(false)
    }
  }

  function exportToExcel(billsList, filenameLabel) {
    const byEmp = new Map()
    for (const b of billsList) {
      if (!byEmp.has(b.uid)) byEmp.set(b.uid, { name: b.employeeName, t10: 0, t15: 0, total: 0, count: 0 })
      const row = byEmp.get(b.uid)
      row.count += 1
      row.total += b.amount
      if (b.amount === 10000) row.t10 += 1
      else row.t15 += 1
    }
    const summaryRows = [...byEmp.values()].map((r) => ({
      'Tên nhân viên': r.name,
      'Bill 10k': r.t10,
      'Bill 15k': r.t15,
      'Tổng bill': r.count,
      'Tổng tiền': r.total,
    }))
    const detailRows = billsList
      .sort((a, b) => (a.dateStr + a.timeStr < b.dateStr + b.timeStr ? 1 : -1))
      .map((b) => ({
        'Mã bill': b.billFull,
        'Nhân viên': b.employeeName,
        'Số tiền': b.amount,
        'Ngày': b.dateStr,
        'Giờ': b.timeStr,
        'Tuần': b.week,
        'Năm': b.year,
        'Trạng thái': b.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán',
      }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Tổng hợp')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), 'Chi tiết')
    XLSX.writeFile(wb, `BillLottee_${filenameLabel}.xlsx`)
  }

  return (
    <div className="page">
      <div className="section-header" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <h2 style={{ marginRight: 'auto' }}>Thanh toán</h2>
        <select
          value={`${sel.year}-${sel.week}`}
          onChange={(e) => {
            const [y, w] = e.target.value.split('-').map(Number)
            setSel({ week: w, year: y })
            setDone(false)
            setSelectedUid('') // Reset filter
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
        <select
          value={selectedUid}
          onChange={(e) => {
            const val = e.target.value
            setSelectedUid(val)
            if (val) setShowPendingDetails(true)
          }}
          disabled={byEmployee.length === 0}
        >
          <option value="">Tất cả nhân viên ({byEmployee.length})</option>
          {byEmployee.map((e) => (
            <option key={e.uid} value={e.uid}>{e.name}</option>
          ))}
        </select>
      </div>

      {loading && <p className="muted">Đang tải…</p>}

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Tên</th><th>Số bill</th><th>Tổng tiền</th></tr>
          </thead>
          <tbody>
            {byEmployee.map((e) => (
              <tr key={e.uid}>
                <td>
                  <button
                    className="link-btn"
                    style={{ textDecoration: 'none', fontWeight: '600' }}
                    onClick={() => {
                      setSelectedUid(e.uid)
                      setShowPendingDetails(true)
                    }}
                    title={`Click để lọc bill của ${e.name}`}
                  >
                    {e.name}
                  </button>
                </td>
                <td>{e.count}</td>
                <td>{formatMoney(e.total)}</td>
              </tr>
            ))}
            {byEmployee.length === 0 && !loading && (
              <tr><td colSpan={3} className="muted">Không có bill chưa thanh toán trong tuần này.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Chi tiết danh sách bill được lọc */}
      {pending.length > 0 && (
        <div className="card">
          <div className="section-header" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
              Chi tiết hóa đơn {selectedUid ? `của ${byEmployee.find((e) => e.uid === selectedUid)?.name}` : 'chưa thanh toán'}
            </h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {selectedUid && (
                <button className="link-btn" onClick={() => setSelectedUid('')} style={{ fontSize: '13px' }}>
                  Xem tất cả ({pending.length})
                </button>
              )}
              <button
                className="link-btn"
                onClick={() => setShowPendingDetails((v) => !v)}
                style={{ fontSize: '13px' }}
              >
                {showPendingDetails ? 'Ẩn đi' : 'Xem chi tiết'}
              </button>
            </div>
          </div>
          {showPendingDetails && (
            <ul className="bill-list">
              {filteredBills.map((b) => (
                <li key={b.id} className="bill-row">
                  <span className="bill-code">{b.billFull}</span>
                  <span className="muted small" style={{ marginLeft: '10px' }}>NV: {b.employeeName}</span>
                  <span className={`bill-amount ${b.amount === 15000 ? 'a15' : 'a10'}`} style={{ marginLeft: 'auto' }}>
                    {formatMoney(b.amount)}
                  </span>
                  <span className="bill-time muted" style={{ marginLeft: '10px' }}>
                    {b.dateStr.split('-').reverse().slice(0, 2).join('/')} {b.timeStr}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="card summary-card">
        <div className="stat-row">
          <div className="stat"><span className="stat-label">Bill chưa TT</span><span className="stat-value">{pending.length}</span></div>
          <div className="stat"><span className="stat-label">Tổng cần trả</span><span className="stat-value">{formatMoney(grandTotal)}</span></div>
        </div>
        {done ? (
          <p className="success-text">Đã thanh toán xong tuần {sel.week}/{sel.year} ({getWeekDateRange(sel.week, sel.year).from} – {getWeekDateRange(sel.week, sel.year).to}).</p>
        ) : (
          <button className="btn-primary" onClick={handlePay} disabled={busy || pending.length === 0}>
            {busy ? 'Đang xử lý…' : 'Thanh toán'}
          </button>
        )}
      </div>

      {/* Section hoá đơn đã thanh toán */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
            Đã thanh toán
            {paidBills.length > 0 && <span className="muted" style={{ fontWeight: '400', fontSize: '14px', marginLeft: '8px' }}>({paidBills.length} bill • {formatMoney(paidTotal)})</span>}
          </h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              className="link-btn"
              onClick={() => setShowPaid((v) => !v)}
              style={{ fontSize: '13px' }}
            >
              {showPaid ? 'Ẩn đi' : 'Xem hóa đơn đã thanh toán'}
            </button>
            {paidBills.length > 0 && (
              <button
                className="link-btn"
                onClick={handleDeletePaid}
                disabled={busy}
                style={{ fontSize: '13px', color: 'var(--error)' }}
              >
                Xóa hóa đơn đã TT
              </button>
            )}
          </div>
        </div>

        {showPaid && (
          paidBills.length === 0 ? (
            <p className="muted small" style={{ marginTop: '12px' }}>Không có hóa đơn đã thanh toán trong tuần này.</p>
          ) : (
            <ul className="bill-list" style={{ marginTop: '12px' }}>
              {paidBills.map((b) => (
                <li key={b.id} className="bill-row">
                  <span className="bill-code">{b.billFull}</span>
                  <span className="muted small" style={{ marginLeft: '10px' }}>NV: {b.employeeName}</span>
                  <span className={`bill-amount ${b.amount === 15000 ? 'a15' : 'a10'}`} style={{ marginLeft: 'auto' }}>
                    {formatMoney(b.amount)}
                  </span>
                  <span className="bill-time muted" style={{ marginLeft: '10px' }}>
                    {b.dateStr.split('-').reverse().slice(0, 2).join('/')} {b.timeStr}
                  </span>
                  <span className="badge badge-paid" style={{ marginLeft: '10px' }}>Đã TT</span>
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      {/* Section Xuất Excel */}
      <div className="card">
        <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: '700' }}>Xuất dữ liệu Excel</h3>
        
        <div className="segmented" style={{ marginBottom: '14px' }}>
          <button className={exportMode === 'week' ? 'active' : ''} type="button" onClick={() => setExportMode('week')}>Theo tuần</button>
          <button className={exportMode === 'month' ? 'active' : ''} type="button" onClick={() => setExportMode('month')}>Theo tháng</button>
          <button className={exportMode === 'employee' ? 'active' : ''} type="button" onClick={() => setExportMode('employee')}>Theo nhân viên</button>
        </div>

        {exportMode === 'week' && (
          <div style={{ marginBottom: '14px', fontSize: '13.5px', color: 'var(--ink-soft)' }}>
            Xuất toàn bộ hóa đơn của tuần đang chọn: <strong>Tuần {sel.week}/{sel.year}</strong>
          </div>
        )}

        {exportMode === 'month' && (
          <label className="field" style={{ marginBottom: '14px' }}>
            <span>Chọn tháng</span>
            <input type="month" value={monthSel} onChange={(e) => setMonthSel(e.target.value)} />
          </label>
        )}

        {exportMode === 'employee' && (
          <label className="field" style={{ marginBottom: '14px' }}>
            <span>Chọn nhân viên</span>
            <select value={empSel} onChange={(e) => setEmpSel(e.target.value)}>
              {allEmployees.map((e) => (
                <option key={e.uid} value={e.uid}>{e.name}</option>
              ))}
            </select>
          </label>
        )}

        <button className="btn-primary" onClick={handleExport} disabled={exportBusy} style={{ width: '100%' }}>
          {exportBusy ? 'Đang xuất…' : 'Xuất Excel'}
        </button>
      </div>
    </div>
  )
}
