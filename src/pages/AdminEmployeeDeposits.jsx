import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore'
import { db, col } from '../firebase'
import { formatMoney } from '../utils/date'

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

function formatNumberInput(val) {
  if (!val) return ''
  const num = String(val).replace(/\D/g, '')
  if (!num) return ''
  return Number(num).toLocaleString('vi-VN')
}

export default function AdminEmployeeDeposits() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // all, deposited, no_deposit, has_bag, has_jacket
  const [savingMap, setSavingMap] = useState({}) // { [uid]: boolean }
  const [localAmounts, setLocalAmounts] = useState({}) // { [uid]: string }

  // Load employees from Firestore
  useEffect(() => {
    const q = query(collection(db, col('users')), where('role', '==', 'employee'))
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'))
      setEmployees(list)

      // Initialize local amount inputs
      const amounts = {}
      list.forEach((emp) => {
        if (emp.depositAmount !== undefined && emp.depositAmount !== null) {
          amounts[emp.uid] = formatNumberInput(emp.depositAmount)
        } else {
          amounts[emp.uid] = ''
        }
      })
      setLocalAmounts(amounts)
      setLoading(false)
    })
  }, [])

  // Toggle Bag (TÚI)
  async function handleToggleBag(emp) {
    const nextVal = !emp.depositBag
    setSavingMap((prev) => ({ ...prev, [emp.uid]: true }))
    try {
      await updateDoc(doc(db, col('users'), emp.uid), {
        depositBag: nextVal,
        depositUpdatedAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Lỗi cập nhật Túi:', err)
      alert('Không thể lưu trạng thái Túi. Vui lòng thử lại.')
    } finally {
      setTimeout(() => {
        setSavingMap((prev) => ({ ...prev, [emp.uid]: false }))
      }, 300)
    }
  }

  // Toggle Jacket (ÁO KHOÁC)
  async function handleToggleJacket(emp) {
    const nextVal = !emp.depositJacket
    setSavingMap((prev) => ({ ...prev, [emp.uid]: true }))
    try {
      await updateDoc(doc(db, col('users'), emp.uid), {
        depositJacket: nextVal,
        depositUpdatedAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Lỗi cập nhật Áo khoác:', err)
      alert('Không thể lưu trạng thái Áo khoác. Vui lòng thử lại.')
    } finally {
      setTimeout(() => {
        setSavingMap((prev) => ({ ...prev, [emp.uid]: false }))
      }, 300)
    }
  }

  // Handle amount text change
  function handleAmountChange(uid, rawValue) {
    const formatted = formatNumberInput(rawValue)
    setLocalAmounts((prev) => ({ ...prev, [uid]: formatted }))
  }

  // Save amount to Firestore on blur
  async function handleAmountBlur(emp) {
    const rawVal = localAmounts[emp.uid] || ''
    const cleanNum = rawVal ? parseInt(rawVal.replace(/\D/g, ''), 10) : 0
    const currentNum = emp.depositAmount || 0

    if (cleanNum === currentNum) return

    setSavingMap((prev) => ({ ...prev, [emp.uid]: true }))
    try {
      await updateDoc(doc(db, col('users'), emp.uid), {
        depositAmount: cleanNum,
        depositUpdatedAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Lỗi lưu số tiền cọc:', err)
      alert('Không thể lưu tiền cọc. Vui lòng thử lại.')
    } finally {
      setTimeout(() => {
        setSavingMap((prev) => ({ ...prev, [emp.uid]: false }))
      }, 350)
    }
  }

  // Set quick amount preset (e.g. 0, 200k, 500k, 1M)
  async function handleSetPreset(emp, amount) {
    setLocalAmounts((prev) => ({ ...prev, [emp.uid]: formatNumberInput(amount) }))
    setSavingMap((prev) => ({ ...prev, [emp.uid]: true }))
    try {
      await updateDoc(doc(db, col('users'), emp.uid), {
        depositAmount: amount,
        depositUpdatedAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Lỗi lưu số tiền cọc:', err)
      alert('Không thể lưu tiền cọc. Vui lòng thử lại.')
    } finally {
      setTimeout(() => {
        setSavingMap((prev) => ({ ...prev, [emp.uid]: false }))
      }, 350)
    }
  }

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    let list = [...employees]
    if (searchTerm.trim()) {
      const term = removeVietnameseTones(searchTerm.trim())
      list = list.filter((emp) => {
        const nameMatch = removeVietnameseTones(emp.name || '').includes(term)
        const userMatch = removeVietnameseTones(emp.username || '').includes(term)
        return nameMatch || userMatch
      })
    }

    if (filterType === 'deposited') {
      list = list.filter((e) => (e.depositAmount || 0) > 0)
    } else if (filterType === 'no_deposit') {
      list = list.filter((e) => !(e.depositAmount > 0))
    } else if (filterType === 'has_bag') {
      list = list.filter((e) => Boolean(e.depositBag))
    } else if (filterType === 'has_jacket') {
      list = list.filter((e) => Boolean(e.depositJacket))
    }

    return list
  }, [employees, searchTerm, filterType])

  // Statistics
  const stats = useMemo(() => {
    let totalDeposit = 0
    let bagCount = 0
    let jacketCount = 0
    let depositCount = 0

    employees.forEach((emp) => {
      const amt = emp.depositAmount || 0
      totalDeposit += amt
      if (amt > 0) depositCount++
      if (emp.depositBag) bagCount++
      if (emp.depositJacket) jacketCount++
    })

    return { totalDeposit, bagCount, jacketCount, depositCount, totalEmp: employees.length }
  }, [employees])

  return (
    <div className="page" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: 'var(--navy)' }}>
            🎒 Quản lí tiền cọc NV
          </h2>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Theo dõi số tiền cọc và xác nhận cấp phát Túi, Áo khoác cho nhân viên
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div className="card" style={{ padding: '16px', background: '#fff', textAlign: 'center' }}>
          <div className="muted small" style={{ fontSize: '12px', fontWeight: '600' }}>TỔNG TIỀN CỌC</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--teal)', marginTop: '4px' }}>
            {formatMoney(stats.totalDeposit)}
          </div>
          <div className="muted small" style={{ fontSize: '11px', marginTop: '2px' }}>
            {stats.depositCount} / {stats.totalEmp} nhân viên đã cọc
          </div>
        </div>

        <div className="card" style={{ padding: '16px', background: '#fff', textAlign: 'center' }}>
          <div className="muted small" style={{ fontSize: '12px', fontWeight: '600' }}>🎒 ĐÃ CẤP TÚI</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--blue)', marginTop: '4px' }}>
            {stats.bagCount} <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink-soft)' }}>/ {stats.totalEmp}</span>
          </div>
          <div className="muted small" style={{ fontSize: '11px', marginTop: '2px' }}>
            Túi giao hàng GoShip
          </div>
        </div>

        <div className="card" style={{ padding: '16px', background: '#fff', textAlign: 'center' }}>
          <div className="muted small" style={{ fontSize: '12px', fontWeight: '600' }}>🧥 ĐÃ CẤP ÁO KHOÁC</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#7c3aed', marginTop: '4px' }}>
            {stats.jacketCount} <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink-soft)' }}>/ {stats.totalEmp}</span>
          </div>
          <div className="muted small" style={{ fontSize: '11px', marginTop: '2px' }}>
            Áo khoác đồng phục
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '16px', background: '#fff' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <input
              type="text"
              placeholder="🔍 Tìm nhân viên theo tên hoặc tài khoản..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                borderRadius: '10px',
                border: '1.5px solid var(--line)',
                background: 'var(--paper)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              style={filterType === 'all' ? activeFilterStyle : normalFilterStyle}
            >
              Tất cả ({employees.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('deposited')}
              style={filterType === 'deposited' ? activeFilterStyle : normalFilterStyle}
            >
              Đã cọc ({stats.depositCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('has_bag')}
              style={filterType === 'has_bag' ? activeFilterStyle : normalFilterStyle}
            >
              🎒 Có Túi ({stats.bagCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('has_jacket')}
              style={filterType === 'has_jacket' ? activeFilterStyle : normalFilterStyle}
            >
              🧥 Có Áo ({stats.jacketCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Employee Deposit List */}
      <div className="card" style={{ padding: '0', background: '#fff', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--ink-soft)' }}>
            Đang tải dữ liệu nhân viên…
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-soft)' }}>
            Không tìm thấy nhân viên nào phù hợp.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredEmployees.map((emp, index) => {
              const isSaving = savingMap[emp.uid]
              const amountVal = localAmounts[emp.uid] || ''
              const numericAmount = amountVal ? parseInt(amountVal.replace(/\D/g, ''), 10) : 0

              return (
                <div
                  key={emp.uid}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: index < filteredEmployees.length - 1 ? '1px solid var(--line)' : 'none',
                    background: index % 2 === 0 ? '#fff' : '#fafafa',
                    gap: '14px',
                    transition: 'background 0.2s',
                  }}
                >
                  {/* Left: Employee Info */}
                  <div style={{ flex: '1 1 220px', minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy)' }}>
                        {emp.name}
                      </span>
                      {isSaving && (
                        <span style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: '700' }}>
                          ● Đang lưu…
                        </span>
                      )}
                    </div>
                    <div className="muted small" style={{ marginTop: '2px', fontSize: '12px' }}>
                      Đăng nhập: <strong style={{ color: 'var(--ink)' }}>{emp.username || '—'}</strong>
                    </div>
                  </div>

                  {/* Middle: 2 Tick Buttons (TÚI & ÁO KHOÁC) */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Nút tích 1: TÚI */}
                    <button
                      type="button"
                      onClick={() => handleToggleBag(emp)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease-in-out',
                        border: emp.depositBag
                          ? '2px solid #0f766e'
                          : '1.5px solid var(--line)',
                        background: emp.depositBag
                          ? '#0f766e'
                          : '#fff',
                        color: emp.depositBag
                          ? '#ffffff'
                          : '#475569',
                        boxShadow: emp.depositBag
                          ? '0 3px 10px rgba(15, 118, 110, 0.25)'
                          : 'none',
                      }}
                      title="Bấm để tích / bỏ tích nhận Túi"
                    >
                      <span style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        background: emp.depositBag ? '#fff' : '#f1f5f9',
                        color: emp.depositBag ? '#0f766e' : 'transparent',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '900',
                        border: emp.depositBag ? 'none' : '1px solid #cbd5e1',
                      }}>
                        ✓
                      </span>
                      🎒 TÚI
                    </button>

                    {/* Nút tích 2: ÁO KHOÁC */}
                    <button
                      type="button"
                      onClick={() => handleToggleJacket(emp)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease-in-out',
                        border: emp.depositJacket
                          ? '2px solid #1e3a8a'
                          : '1.5px solid var(--line)',
                        background: emp.depositJacket
                          ? '#1e3a8a'
                          : '#fff',
                        color: emp.depositJacket
                          ? '#ffffff'
                          : '#475569',
                        boxShadow: emp.depositJacket
                          ? '0 3px 10px rgba(30, 58, 138, 0.25)'
                          : 'none',
                      }}
                      title="Bấm để tích / bỏ tích nhận Áo khoác"
                    >
                      <span style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        background: emp.depositJacket ? '#fff' : '#f1f5f9',
                        color: emp.depositJacket ? '#1e3a8a' : 'transparent',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '900',
                        border: emp.depositJacket ? 'none' : '1px solid #cbd5e1',
                      }}>
                        ✓
                      </span>
                      🧥 ÁO KHOÁC
                    </button>
                  </div>

                  {/* Right: Text Input nhập số tiền cọc */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ink-soft)' }}>
                        Tiền cọc:
                      </span>
                      <div style={{ position: 'relative', width: '150px' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={amountVal}
                          onChange={(e) => handleAmountChange(emp.uid, e.target.value)}
                          onBlur={() => handleAmountBlur(emp)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur()
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 30px 8px 12px',
                            textAlign: 'right',
                            fontSize: '15px',
                            fontWeight: '800',
                            borderRadius: '10px',
                            border: numericAmount > 0
                              ? '1.5px solid var(--teal)'
                              : '1.5px solid var(--line)',
                            background: numericAmount > 0
                              ? 'rgba(15, 61, 62, 0.05)'
                              : '#fff',
                            color: numericAmount > 0
                              ? 'var(--teal)'
                              : 'var(--ink-soft)',
                            outline: 'none',
                          }}
                        />
                        <span style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '12px',
                          color: 'var(--ink-soft)',
                          fontWeight: '700',
                          pointerEvents: 'none',
                        }}>
                          đ
                        </span>
                      </div>
                    </div>

                    {/* Quick preset buttons */}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                      <button
                        type="button"
                        onClick={() => handleSetPreset(emp, 0)}
                        style={presetBtnStyle}
                        title="Đặt về 0đ"
                      >
                        0đ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetPreset(emp, 200000)}
                        style={presetBtnStyle}
                        title="Đặt 200.000đ"
                      >
                        200k
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetPreset(emp, 300000)}
                        style={presetBtnStyle}
                        title="Đặt 300.000đ"
                      >
                        300k
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetPreset(emp, 500000)}
                        style={presetBtnStyle}
                        title="Đặt 500.000đ"
                      >
                        500k
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const activeFilterStyle = {
  padding: '6px 12px',
  borderRadius: '8px',
  border: '1px solid var(--navy)',
  background: 'var(--navy)',
  color: '#fff',
  fontSize: '12px',
  fontWeight: '700',
  cursor: 'pointer',
}

const normalFilterStyle = {
  padding: '6px 12px',
  borderRadius: '8px',
  border: '1px solid var(--line)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  fontSize: '12px',
  fontWeight: '600',
  cursor: 'pointer',
}

const presetBtnStyle = {
  padding: '2px 6px',
  borderRadius: '6px',
  border: '1px solid var(--line)',
  background: '#fff',
  fontSize: '11px',
  fontWeight: '700',
  color: 'var(--ink-soft)',
  cursor: 'pointer',
}
