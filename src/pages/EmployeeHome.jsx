import { useEffect, useMemo, useRef, useState } from 'react'
import {
  collection, doc, onSnapshot, query, runTransaction, serverTimestamp, where, orderBy, deleteDoc, updateDoc, setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { getISOWeek, formatDateStr, formatTimeStr, formatMonthStr, formatMoney, getWeekDateRange, recentWeeks } from '../utils/date'
import DatePickerDMY from '../components/DatePickerDMY'

function getWeeksOfMonth(year, month) {
  const result = []
  const seen = new Set()
  const date = new Date(year, month - 1, 1)
  while (date.getMonth() === month - 1) {
    const { week, year: wYear } = getISOWeek(date)
    const key = `${wYear}-${week}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push({ week, year: wYear })
    }
    date.setDate(date.getDate() + 1)
  }
  return result.sort((a, b) => b.week - a.week)
}

export default function EmployeeHome() {
  const { user, profile } = useAuth()
  const [billCode, setBillCode] = useState('')
  const [amount, setAmount] = useState(15000)
  const [status, setStatus] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)
  const [bills, setBills] = useState([])
  const [showGuideModal, setShowGuideModal] = useState(false)

  const [activeTab, setActiveTab] = useState('lottee') // 'lottee' | 'boss' | 'commission'
  const [bossDebts, setBossDebts] = useState([])
  const [selectedBoss, setSelectedBoss] = useState('Anh Hào')
  const [bossCustomName, setBossCustomName] = useState('')
  const [bossAmountInput, setBossAmountInput] = useState('')
  const [bossNote, setBossNote] = useState('')
  const [savingBoss, setSavingBoss] = useState(false)
  const [bossStatus, setBossStatus] = useState({ type: '', text: '' })

  const [bonchonAddress, setBonchonAddress] = useState('')
  const [savingBonchon, setSavingBonchon] = useState(false)
  const [bonchonStatus, setBonchonStatus] = useState({ type: '', text: '' })
  const [bonchonBills, setBonchonBills] = useState([])

  const [commDate, setCommDate] = useState(formatDateStr())
  const [commRevenueInput, setCommRevenueInput] = useState('')
  const [commRate, setCommRate] = useState('15')
  const [commNote, setCommNote] = useState('')
  const [commIsPenalty, setCommIsPenalty] = useState(false)
  const [savingComm, setSavingComm] = useState(false)
  const [commStatus, setCommStatus] = useState({ type: '', text: '' })
  const [commHistory, setCommHistory] = useState([])
  const [commCurrentRecord, setCommCurrentRecord] = useState(null) // record for selected commDate
  const [commSelectedWeek, setCommSelectedWeek] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [rulesHtml, setRulesHtml] = useState(() => localStorage.getItem('lottee_rules_html') || '')
  const rulesVideoRef = useRef(null)
  const [videoUnmuted, setVideoUnmuted] = useState(false)

  function isHtmlEmpty(html) {
    if (!html) return true
    const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    return text.length === 0
  }

  useEffect(() => {
    const ref = doc(db, 'config', 'rules')
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const html = snap.data().contentHtml || ''
        setRulesHtml(html)
        localStorage.setItem('lottee_rules_html', html)
      }
    })
  }, [])

  useEffect(() => {
    if (showRules && isHtmlEmpty(rulesHtml)) {
      // Delay slightly for modal element to mount
      const t = setTimeout(() => {
        if (!rulesVideoRef.current) return
        rulesVideoRef.current.currentTime = 0
        rulesVideoRef.current.muted = false
        const playPromise = rulesVideoRef.current.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setVideoUnmuted(true)
            })
            .catch((err) => {
              console.warn('Autoplay with sound prevented, falling back to muted:', err)
              if (rulesVideoRef.current) {
                rulesVideoRef.current.muted = true
                rulesVideoRef.current.play()
                setVideoUnmuted(false)
              }
            })
        }
      }, 100)
      return () => clearTimeout(t)
    } else if (!showRules && rulesVideoRef.current) {
      rulesVideoRef.current.pause()
      setVideoUnmuted(false)
    }
  }, [showRules, rulesHtml])

  // Feature flags from admin (config/features)
  const [features, setFeatures] = useState({ lottee: true, bonchon: true, bossDebt: true })
  useEffect(() => {
    const ref = doc(db, 'config', 'features')
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) setFeatures(snap.data())
    })
  }, [])

  const currentISO = useMemo(() => getISOWeek(), [])
  const [selectedMonthStr, setSelectedMonthStr] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedWeek, setSelectedWeek] = useState(() => currentISO.week)
  const [selectedYear, setSelectedYear] = useState(() => currentISO.year)

  const weekRange = useMemo(() => getWeekDateRange(selectedWeek, selectedYear), [selectedWeek, selectedYear])

  const recentMonthsList = useMemo(() => {
    const list = []
    const d = new Date()
    for (let i = 0; i < 6; i++) {
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      list.push({
        year: y,
        month: m,
        label: `Tháng ${m}/${y}`,
        value: `${y}-${String(m).padStart(2, '0')}`
      })
      d.setMonth(d.getMonth() - 1)
    }
    return list
  }, [])

  const weeksListForMonth = useMemo(() => {
    const [y, m] = selectedMonthStr.split('-').map(Number)
    return getWeeksOfMonth(y, m)
  }, [selectedMonthStr])

  useEffect(() => {
    if (weeksListForMonth.length > 0) {
      const current = getISOWeek()
      const now = new Date()
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const hasCurrent = weeksListForMonth.some((w) => w.week === current.week && w.year === current.year)
      const hasPrevSelected = weeksListForMonth.some((w) => w.week === selectedWeek && w.year === selectedYear)

      if (hasCurrent && selectedMonthStr === currentMonthStr) {
        setSelectedWeek(current.week)
        setSelectedYear(current.year)
      } else if (!hasPrevSelected) {
        setSelectedWeek(weeksListForMonth[0].week)
        setSelectedYear(weeksListForMonth[0].year)
      }
    }
  }, [weeksListForMonth])

  // live list of this employee's bills for the current week
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'bills'),
      where('uid', '==', user.uid),
      where('week', '==', selectedWeek),
      where('year', '==', selectedYear),
      orderBy('createdAt', 'desc'),
    )
    return onSnapshot(q, (snap) => {
      setBills(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [user, selectedWeek, selectedYear])

  // live list of this employee's boss debts for the current week
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'boss_debts'),
      where('uid', '==', user.uid),
      where('week', '==', selectedWeek),
      where('year', '==', selectedYear)
    )
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0
        const tB = b.createdAt?.seconds || 0
        return tB - tA
      })
      setBossDebts(list)
    })
  }, [user, selectedWeek, selectedYear])

  // live list of this employee's bonchon bills for the current week
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'bonchon_bills'),
      where('uid', '==', user.uid),
      where('week', '==', selectedWeek),
      where('year', '==', selectedYear)
    )
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0
        const tB = b.createdAt?.seconds || 0
        return tB - tA
      })
      setBonchonBills(list)
    })
  }, [user, selectedWeek, selectedYear])

  // live list of this employee's commissions for the selected month
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'commissions'),
      where('uid', '==', user.uid),
      where('yearMonth', '==', selectedMonthStr)
    )
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => b.date.localeCompare(a.date))
      setCommHistory(list)
    })
  }, [user, selectedMonthStr])

  // Watch the specific doc for the currently selected commDate to detect admin lock
  useEffect(() => {
    if (!user || !commDate) return
    const ref = doc(db, 'commissions', `${user.uid}_${commDate}`)
    return onSnapshot(ref, (snap) => {
      setCommCurrentRecord(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    })
  }, [user, commDate])

  const totals = useMemo(() => {
    const t10 = bills.filter((b) => b.amount === 10000).length
    const t15 = bills.filter((b) => b.amount === 15000).length
    const total = bills.reduce((s, b) => s + b.amount, 0)
    return { t10, t15, total, count: bills.length }
  }, [bills])

  const bossTotals = useMemo(() => {
    const hao = bossDebts.filter((d) => d.boss === 'Anh Hào').reduce((s, d) => s + (d.amount || 0), 0)
    const linh = bossDebts.filter((d) => d.boss === 'Anh Linh').reduce((s, d) => s + (d.amount || 0), 0)
    const khac = bossDebts.filter((d) => d.boss !== 'Anh Hào' && d.boss !== 'Anh Linh').reduce((s, d) => s + (d.amount || 0), 0)
    return { hao, linh, khac }
  }, [bossDebts])

  const bonchonTotals = useMemo(() => {
    const total = bonchonBills.reduce((s, b) => s + (b.amount || 15000), 0)
    return { count: bonchonBills.length, total }
  }, [bonchonBills])

  const { selMonth, selYear } = useMemo(() => {
    const d = new Date()
    return { selMonth: d.getMonth() + 1, selYear: d.getFullYear() }
  }, [])

  const isDucTrong = useMemo(() => profile?.username === 'dtrong', [profile])

  const commRevenue = useMemo(() => {
    const num = parseFloat(commRevenueInput)
    if (isNaN(num) || num <= 0) return 0
    return num * 1000
  }, [commRevenueInput])

  const commPenalty = 0
  const calculatedCommission = (commRevenue * ((parseFloat(isDucTrong ? 15 : commRate) || 15) / 100)) - commPenalty

  const filteredCommHistory = useMemo(() => {
    if (!commSelectedWeek) return commHistory
    const [y, w] = commSelectedWeek.split('-').map(Number)
    return commHistory.filter((item) => {
      if (!item.date) return false
      const [iy, im, id] = item.date.split('-').map(Number)
      const info = getISOWeek(new Date(iy, im - 1, id))
      return info.week === w && info.year === y
    })
  }, [commHistory, commSelectedWeek])

  const commHistoryTotal = useMemo(() => {
    return filteredCommHistory.reduce((s, r) => s + (r.revenue || 0), 0)
  }, [filteredCommHistory])

  const commHistoryCommissionTotal = useMemo(() => {
    return filteredCommHistory.reduce((s, r) => s + (r.commission || 0), 0)
  }, [filteredCommHistory])

  async function handleSave(e) {
    e.preventDefault()
    setStatus({ type: '', text: '' })
    const code = billCode.trim().replace(/\D/g, '')
    if (code.length !== 5) {
      setStatus({ type: 'error', text: 'Vui lòng nhập đầy đủ 5 số mã bill (ví dụ: 41031).' })
      setShowGuideModal(true)
      return
    }

    setSaving(true)
    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'bills', code)
        const existing = await tx.get(ref)
        if (existing.exists()) throw new Error('DUPLICATE')
        const now = new Date()
        tx.set(ref, {
          billFull: code,
          uid: user.uid,
          employeeName: profile?.name || user.email,
          amount,
          status: 'pending',
          dateStr: formatDateStr(now),
          timeStr: formatTimeStr(now),
          monthStr: formatMonthStr(now),
          week: getISOWeek(now).week,
          year: getISOWeek(now).year,
          createdAt: serverTimestamp(),
          paymentId: null,
        })
      })
      setStatus({ type: 'success', text: `Đã lưu bill ${code}` })
      setBillCode('')
      setAmount(15000)
    } catch (err) {
      if (err.message === 'DUPLICATE') {
        setStatus({ type: 'error', text: `Bill ${code} đã tồn tại.` })
      } else if (err.code === 'permission-denied') {
        setStatus({ type: 'error', text: 'Lỗi quyền truy cập (permission-denied). Vui lòng báo Admin.' })
      } else if (err.code === 'unavailable' || err.code === 'deadline-exceeded') {
        setStatus({ type: 'error', text: 'Mất kết nối mạng. Vui lòng kiểm tra mạng và thử lại.' })
      } else {
        console.error('Lỗi lưu bill:', err.code, err.message)
        setStatus({ type: 'error', text: `Lỗi: ${err.code || err.message || 'Không rõ'}. Thử lại hoặc báo Admin.` })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteBill(id, billFull) {
    if (!confirm(`Bạn có chắc chắn muốn xóa bill ${billFull}?`)) return
    try {
      await deleteDoc(doc(db, 'bills', id))
    } catch (err) {
      console.error(err)
      alert('Không thể xóa bill. Vui lòng thử lại.')
    }
  }

  async function handleSaveBoss(e) {
    e.preventDefault()
    setBossStatus({ type: '', text: '' })
    const finalBossName = selectedBoss === 'Khác' ? bossCustomName.trim() : selectedBoss
    if (selectedBoss === 'Khác' && !finalBossName) {
      setBossStatus({ type: 'error', text: 'Vui lòng nhập tên người nợ / mục nợ.' })
      return
    }
    const amountVal = parseFloat(bossAmountInput)
    if (isNaN(amountVal) || amountVal <= 0) {
      setBossStatus({ type: 'error', text: 'Vui lòng nhập số tiền nợ.' })
      return
    }
    const finalAmount = amountVal * 1000
    const noteTrimmed = bossNote.trim()
    setSavingBoss(true)
    try {
      const now = new Date()
      const randomStr = Math.random().toString(36).substring(2, 6)
      const docId = `debt_${user.uid}_${now.getTime()}_${randomStr}`
      await setDoc(doc(db, 'boss_debts', docId), {
        uid: user.uid,
        employeeName: profile?.name || user.email,
        boss: finalBossName,
        amount: finalAmount,
        note: noteTrimmed,
        status: 'pending',
        dateStr: formatDateStr(now),
        timeStr: formatTimeStr(now),
        monthStr: formatMonthStr(now),
        week: getISOWeek(now).week,
        year: getISOWeek(now).year,
        createdAt: serverTimestamp(),
      })
      setBossStatus({ type: 'success', text: `✓ Đã lưu nợ ${finalBossName} — ${formatMoney(finalAmount)}` })
      setBossAmountInput('')
      setBossNote('')
      setBossCustomName('')
    } catch (err) {
      console.error(err)
      setBossStatus({ type: 'error', text: 'Lưu thất bại. Vui lòng thử lại.' })
    } finally {
      setSavingBoss(false)
    }
  }

  async function handleDeleteBossDebt(id, boss, amount) {
    if (!confirm(`Bạn có chắc chắn muốn xóa khoản nợ của ${boss} — ${formatMoney(amount)}?`)) return
    try {
      await deleteDoc(doc(db, 'boss_debts', id))
    } catch (err) {
      console.error(err)
      alert('Không thể xóa. Vui lòng thử lại.')
    }
  }

  async function handleSaveBonchon(e) {
    e.preventDefault()
    setBonchonStatus({ type: '', text: '' })
    const addr = bonchonAddress.trim()
    if (!addr) {
      setBonchonStatus({ type: 'error', text: 'Vui lòng nhập địa chỉ giao hàng.' })
      return
    }
    setSavingBonchon(true)
    try {
      const now = new Date()
      const randomStr = Math.random().toString(36).substring(2, 7)
      const docId = `bonchon_${user.uid}_${now.getTime()}_${randomStr}`
      await setDoc(doc(db, 'bonchon_bills', docId), {
        uid: user.uid,
        employeeName: profile?.name || user.email,
        address: addr,
        amount: 15000,
        status: 'pending',
        dateStr: formatDateStr(now),
        timeStr: formatTimeStr(now),
        monthStr: formatMonthStr(now),
        week: getISOWeek(now).week,
        year: getISOWeek(now).year,
        createdAt: serverTimestamp(),
      })
      setBonchonStatus({ type: 'success', text: `✓ Đã lưu đơn Bonchon: ${addr} — 15.000đ` })
      setBonchonAddress('')
    } catch (err) {
      console.error('Lỗi lưu đơn Bonchon:', err)
      const errDetail = err?.code === 'permission-denied' 
        ? 'Chưa cấp quyền Firestore (permission-denied). Cần cập nhật rules trên Firebase Console.' 
        : (err?.message || 'Vui lòng thử lại.')
      setBonchonStatus({ type: 'error', text: `Lưu đơn thất bại: ${errDetail}` })
    } finally {
      setSavingBonchon(false)
    }
  }

  async function handleDeleteBonchonBill(b) {
    if (!confirm(`Bạn có chắc chắn muốn xóa đơn Bonchon "${b.address}"?`)) return
    try {
      await deleteDoc(doc(db, 'bonchon_bills', b.id))
    } catch (err) {
      console.error(err)
      alert(`Không thể xóa (${err?.code || err?.message || 'Vui lòng thử lại'}).`)
    }
  }

  async function handleSaveComm(e) {
    e.preventDefault()
    setCommStatus({ type: '', text: '' })
    if (commCurrentRecord?.enteredBy === 'admin') {
      setCommStatus({ type: 'error', text: 'Admin đã nhập ngày này cho bạn rồi. Liên hệ admin nếu cần thay đổi.' })
      return
    }
    if (commRevenue <= 0 && !commIsPenalty) {
      setCommStatus({ type: 'error', text: 'Vui lòng nhập doanh thu hoặc chọn Offline / Nghỉ.' })
      return
    }
    setSavingComm(true)
    try {
      const docId = `${user.uid}_${commDate}`
      await setDoc(doc(db, 'commissions', docId), {
        uid: user.uid,
        employeeName: profile?.name || user.email,
        date: commDate,
        day: Number(commDate.split('-')[2]),
        yearMonth: commDate.slice(0, 7),
        revenue: commIsPenalty ? 0 : commRevenue,
        rate: isDucTrong ? 15 : (parseFloat(commRate) || 15),
        commission: commIsPenalty ? 0 : calculatedCommission,
        isPenalty: commIsPenalty,
        note: commNote.trim(),
      })
      setCommStatus({ type: 'success', text: `✓ Đã lưu hoa hồng: ${formatMoney(commIsPenalty ? 0 : calculatedCommission)}` })
      setCommRevenueInput('')
      setCommNote('')
      setCommIsPenalty(false)
    } catch (err) {
      console.error(err)
      setCommStatus({ type: 'error', text: 'Lưu thất bại. Vui lòng thử lại.' })
    } finally {
      setSavingComm(false)
    }
  }

  async function handleDeleteComm(item) {
    if (!confirm(`Xóa hoa hồng ngày ${item.date}?`)) return
    try {
      await deleteDoc(doc(db, 'commissions', item.id))
    } catch (err) {
      console.error(err)
      alert('Không thể xóa. Vui lòng thử lại.')
    }
  }


  return (
    <div className="page">

      {/* Floating Action Buttons */}
      <div style={{
        position: 'fixed', bottom: '20px', right: '20px',
        display: 'flex', gap: '8px', zIndex: 50,
      }}>
        <button
          onClick={() => setShowRules(true)}
          style={{
            background: '#fff', color: 'var(--navy)',
            border: '2px solid var(--navy)', borderRadius: '50px',
            padding: '10px 16px', fontSize: '13px', fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          📜 Bảng nội quy
        </button>

        <button
          onClick={() => setShowQR(true)}
          style={{
            background: 'var(--navy)', color: '#fff',
            border: 'none', borderRadius: '50px',
            padding: '10px 16px', fontSize: '13px', fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          📷 Mã QR
        </button>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowQR(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: '20px', padding: '24px',
              width: '100%', maxWidth: '340px', textAlign: 'center',
              boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '800', color: 'var(--navy)' }}>
              📷 Mã QR Go Ship
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--ink-soft)' }}>
              Quet mã để chuyển tiền
            </p>
            <img
              src={`${import.meta.env.BASE_URL}qrgoship.jpg`}
              alt="QR Go Ship"
              style={{ width: '100%', borderRadius: '12px', display: 'block', marginBottom: '16px' }}
            />

            <button
              onClick={() => { setShowQR(false); setShowRules(true); }}
              style={{
                width: '100%', marginBottom: '14px', padding: '9px 12px',
                borderRadius: '10px', border: '1.5px solid var(--navy)',
                background: 'rgba(15, 61, 62, 0.05)', color: 'var(--navy)',
                fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              📜 Xem Bảng nội quy GOSHIP
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowQR(false)}
                style={{
                  flex: 1, padding: '11px', borderRadius: '12px',
                  border: '1.5px solid var(--line)', background: 'var(--paper)',
                  fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                }}
              >
                Đóng
              </button>
              <a
                href={`${import.meta.env.BASE_URL}qrgoship.jpg`}
                download="qrgoship.jpg"
                style={{
                  flex: 2, padding: '11px', borderRadius: '12px',
                  background: 'var(--navy)', color: '#fff',
                  fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                  textDecoration: 'none', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '6px',
                }}
              >
                ⬇️ Lưu vào ảnh
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal for Employee */}
      {showRules && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowRules(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: '20px',
              width: '100%', maxWidth: '680px', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--line)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--navy)', color: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📜</span>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#fff' }}>
                  Bảng Nội Quy GOSHIP
                </h3>
              </div>
              <button
                onClick={() => setShowRules(false)}
                style={{
                  background: 'none', border: 'none', color: '#fff',
                  fontSize: '24px', cursor: 'pointer', lineHeight: 1, padding: 0,
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body: Rules Content OR Video when empty */}
            <div
              style={{
                padding: isHtmlEmpty(rulesHtml) ? '20px' : '28px',
                overflowY: 'auto', flex: 1,
                fontSize: '15px', lineHeight: '1.7', color: 'var(--ink)',
                background: isHtmlEmpty(rulesHtml) ? '#0f172a' : '#fff',
                textAlign: isHtmlEmpty(rulesHtml) ? 'center' : 'left',
              }}
            >
              {isHtmlEmpty(rulesHtml) ? (
                <div style={{ position: 'relative', width: '100%', maxWidth: '440px', margin: '0 auto' }}>
                  <video
                    ref={rulesVideoRef}
                    src={`${import.meta.env.BASE_URL}Onggianhay.mp4`}
                    playsInline
                    webkit-playsinline="true"
                    controls
                    autoPlay
                    loop
                    style={{
                      width: '100%',
                      maxHeight: '65vh',
                      borderRadius: '16px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                      display: 'block',
                      background: '#000',
                    }}
                  />
                  {!videoUnmuted && (
                    <button
                      type="button"
                      onClick={() => {
                        if (rulesVideoRef.current) {
                          rulesVideoRef.current.muted = false
                          rulesVideoRef.current.play()
                          setVideoUnmuted(true)
                        }
                      }}
                      style={{
                        position: 'absolute', top: '16px', right: '16px',
                        background: 'rgba(0,0,0,0.8)', color: '#fff',
                        border: '1.5px solid rgba(255,255,255,0.4)',
                        borderRadius: '30px', padding: '8px 14px',
                        fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        backdropFilter: 'blur(6px)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                      }}
                    >
                      🔊 Bật âm thanh
                    </button>
                  )}
                  <p style={{ margin: '14px 0 0', color: '#94a3b8', fontSize: '14px', fontWeight: '600' }}>
                    Học tập mà nhảy theo nha anh em
                  </p>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: rulesHtml }} />
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--line)',
              background: '#f8fafc', display: 'flex', justifyContent: 'flex-end',
            }}>
              <button
                className="btn-primary"
                onClick={() => setShowRules(false)}
                style={{ padding: '9px 24px', fontSize: '14px', borderRadius: '10px' }}
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Tab Selector */}
      <div className="segmented" style={{ marginBottom: '8px', flexWrap: 'wrap' }}>
        {/* Lottee tab */}
        <button
          className={activeTab === 'lottee' ? 'active' : ''}
          onClick={() => setActiveTab('lottee')}
          style={features.lottee === false ? { opacity: 0.45, cursor: 'not-allowed', filter: 'grayscale(80%)' } : {}}
        >
          Lottee
          {features.lottee === false && (
            <span style={{ fontSize: 10, marginLeft: 5, background: '#ef4444', color: '#fff', borderRadius: 8, padding: '1px 5px', fontWeight: 700 }}>Sắp ra mắt</span>
          )}
        </button>

        {/* BONCHON tab */}
        <button
          className={activeTab === 'bonchon' ? 'active' : ''}
          onClick={() => setActiveTab('bonchon')}
          style={features.bonchon === false ? { opacity: 0.45, cursor: 'not-allowed', filter: 'grayscale(80%)' } : {}}
        >
          <span>BONCHON</span>
          {features.bonchon === false && (
            <span style={{ fontSize: 10, marginLeft: 5, background: '#ef4444', color: '#fff', borderRadius: 8, padding: '1px 5px', fontWeight: 700 }}>Sắp ra mắt</span>
          )}
        </button>

        {/* Sếp nợ tab */}
        <button
          className={activeTab === 'boss' ? 'active' : ''}
          onClick={() => setActiveTab('boss')}
          style={features.bossDebt === false ? { opacity: 0.45, cursor: 'not-allowed', filter: 'grayscale(80%)' } : {}}
        >
          Sếp Nợ
          {features.bossDebt === false && (
            <span style={{ fontSize: 10, marginLeft: 5, background: '#ef4444', color: '#fff', borderRadius: 8, padding: '1px 5px', fontWeight: 700 }}>Sắp ra mắt</span>
          )}
        </button>

        {/* Hoa hồng tab - luôn bật */}
        <button
          className={activeTab === 'commission' ? 'active' : ''}
          onClick={() => setActiveTab('commission')}
        >
          Nhập Hoa Hồng
        </button>
      </div>

      {activeTab === 'lottee' && (
        <div style={{ position: 'relative' }}>
          {features.lottee === false && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(255,255,255,0.82)',
              borderRadius: 12,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              backdropFilter: 'blur(2px)',
            }}>
              <span style={{ fontSize: 36 }}>🚀</span>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#374151' }}>Sắp ra mắt</div>
              <div className="muted small">Khi nào tiệm mở thì cho sài</div>
            </div>
          )}
          <>
          {/* Lottee Form Card */}
          <div className="card add-bill-card">
            <form onSubmit={handleSave} className="stack">
              <label className="field">
                <span>Mã bill Lottee (Đầy đủ 5 số)</span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={5}
                  placeholder="Nhập 5 số (vd: 41031)"
                  value={billCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 5)
                    setBillCode(val)
                    if (val.length === 5 && status.type === 'error') {
                      setStatus({ type: '', text: '' })
                    }
                  }}
                  className="big-input"
                  autoFocus
                />
              </label>
              {billCode.length === 5 && (
                <div className="preview-full">
                  Bill đầy đủ: <strong>{billCode}</strong>
                </div>
              )}
              <div className="amount-select" style={{ justifyContent: 'center' }}>
                <button
                  type="button"
                  className={`amount-btn ${amount === 15000 ? 'active a15' : ''}`}
                  onClick={() => setAmount(15000)}
                >
                  15.000đ
                </button>
              </div>
              {status.text && (
                <div className={status.type === 'error' ? 'error-text' : 'success-text'}>{status.text}</div>
              )}

              {/* ── Hướng dẫn khoanh số hình ảnh (Tự biến mất khi gõ đủ 5 số) ── */}
              {showGuideModal && billCode.length < 5 && (
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(220, 53, 69, 0.05)',
                  border: '1.5px solid rgba(220, 53, 69, 0.3)',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '13px', color: 'var(--error)', fontWeight: '700', margin: '0 0 10px' }}>
                    ⚠️ Ghi số bill mà bạn đọc để lấy đơn
                  </p>
                  <div style={{
                    borderRadius: '10px', overflow: 'hidden',
                    border: '1px solid var(--line)', background: '#fff',
                  }}>
                    <img
                      src={`${import.meta.env.BASE_URL}guide-5digits.png`}
                      alt="Hướng dẫn nhập mã bill 5 số"
                      style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '350px', objectFit: 'contain' }}
                      onError={(e) => {
                        const step = e.target.dataset.retry || '0'
                        if (step === '0') {
                          e.target.dataset.retry = '1'
                          e.target.src = '/guide-5digits.png'
                        } else if (step === '1') {
                          e.target.dataset.retry = '2'
                          e.target.src = 'guide-5digits.png'
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? 'Đang lưu…' : 'Lưu'}
              </button>
            </form>
          </div>

          {/* Lottee List Card */}
          <div className="card">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h2>Xem bill tuần</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select
                  value={selectedMonthStr}
                  onChange={(e) => setSelectedMonthStr(e.target.value)}
                  style={{
                    fontSize: '13px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--paper-raised)',
                    color: 'var(--ink)',
                    fontWeight: '600',
                    outline: 'none',
                  }}
                >
                  {recentMonthsList.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={`${selectedYear}-${selectedWeek}`}
                  onChange={(e) => {
                    const [y, w] = e.target.value.split('-').map(Number)
                    setSelectedWeek(w)
                    setSelectedYear(y)
                  }}
                  style={{
                    fontSize: '13px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--paper-raised)',
                    color: 'var(--ink)',
                    fontWeight: '600',
                    outline: 'none',
                  }}
                >
                  {weeksListForMonth.map((w) => {
                    const range = getWeekDateRange(w.week, w.year)
                    const isCurrent = w.week === currentISO.week && w.year === currentISO.year
                    return (
                      <option key={`${w.year}-${w.week}`} value={`${w.year}-${w.week}`}>
                        Tuần {w.week}/{w.year} ({range.from} – {range.to}){isCurrent ? ' (Hiện tại)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
            <div className="stat-row">
              <div className="stat">
                <span className="stat-label">10k</span>
                <span className="stat-value">{totals.t10}</span>
              </div>
              <div className="stat">
                <span className="stat-label">15k</span>
                <span className="stat-value">{totals.t15}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Tổng tiền</span>
                <span className="stat-value">{formatMoney(totals.total)}</span>
              </div>
            </div>
            <ul className="bill-list">
              {bills.map((b) => (
                <li key={b.id} className="bill-row">
                  <span className="bill-code">{b.billFull}</span>
                  <span className={`bill-amount ${b.amount === 15000 ? 'a15' : 'a10'}`}>{formatMoney(b.amount)}</span>
                  <span className="bill-time muted">
                    {b.dateStr ? `${b.dateStr.split('-').reverse().slice(0, 2).join('/')} ` : ''}
                    {b.timeStr}
                  </span>
                  <span className={`badge ${b.status === 'paid' ? 'badge-paid' : 'badge-pending'}`}>
                    {b.status === 'paid' ? 'Đã TT' : 'Chờ TT'}
                  </span>
                  {b.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '6px' }}>
                      <button className="link-btn" onClick={() => handleDeleteBill(b.id, b.billFull)} style={{ fontSize: '12px', textDecoration: 'none', color: 'var(--error)' }}>
                        Xóa
                      </button>
                    </div>
                  )}
                </li>
              ))}
              {bills.length === 0 && <li className="muted small empty">Chưa có bill nào tuần này.</li>}
            </ul>
          </div>
          </>
        </div>
      )}


      {activeTab === 'bonchon' && (
        <div style={{ position: 'relative' }}>
          {features.bonchon === false && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(255,255,255,0.82)',
              borderRadius: 12,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              backdropFilter: 'blur(2px)',
            }}>
              <span style={{ fontSize: 36 }}>🚀</span>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#374151' }}>Sắp ra mắt</div>
              <div className="muted small">Khi nào tiệm mở thì cho sài</div>
            </div>
          )}
          <>
          {/* Bonchon Form Card */}
          <div className="card add-bill-card">
            <form onSubmit={handleSaveBonchon} className="stack">
              <label className="field">
                <span>Địa chỉ giao hàng BONCHON</span>
                <input
                  type="text"
                  value={bonchonAddress}
                  onChange={(e) => setBonchonAddress(e.target.value)}
                  placeholder="VD : 54 Trần Phú thì nhập 54 TP"
                  autoComplete="off"
                  required
                />
              </label>

              <div className="field">
                <span>Số tiền mỗi đơn</span>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(27,35,80,0.06)',
                  border: '1.5px solid var(--navy)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink-soft)' }}>
                    🍗 Đơn Bonchon mặc định
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)' }}>
                    15.000đ
                  </span>
                </div>
              </div>

              {bonchonStatus.text && (
                <div className={bonchonStatus.type === 'error' ? 'error-text' : 'success-text'}>
                  {bonchonStatus.text}
                </div>
              )}

              <button className="btn-primary" type="submit" disabled={savingBonchon}>
                {savingBonchon ? 'Đang lưu…' : 'Lưu đơn Bonchon'}
              </button>
            </form>
          </div>

          {/* Bonchon List Card */}
          <div className="card">
            <div className="section-header">
              <h2>Đơn BONCHON tuần này</h2>
              <span className="muted small">Tuần {selectedWeek}/{selectedYear}</span>
            </div>
            <div className="stat-row">
              <div className="stat">
                <span className="stat-label">Số đơn</span>
                <span className="stat-value">{bonchonTotals.count}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Mỗi đơn</span>
                <span className="stat-value" style={{ color: 'var(--blue)' }}>15.000đ</span>
              </div>
              <div className="stat">
                <span className="stat-label">Tổng tiền</span>
                <span className="stat-value" style={{ color: 'var(--success)' }}>{formatMoney(bonchonTotals.total)}</span>
              </div>
            </div>
            <ul className="bill-list">
              {bonchonBills.map((b) => (
                <li key={b.id} className="bill-row" style={{ alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--ink)' }}>
                      📍 {b.address}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                      <span>{b.dateStr ? b.dateStr.split('-').reverse().slice(0, 2).join('/') : ''}</span>
                      <span style={{ margin: '0 4px' }}>·</span>
                      <span>{b.timeStr}</span>
                    </div>
                  </div>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--navy)' }}>
                    {formatMoney(b.amount || 15000)}
                  </span>
                  <span className={`badge ${b.status === 'paid' ? 'badge-paid' : 'badge-pending'}`}>
                    {b.status === 'paid' ? 'Đã TT' : 'Chờ TT'}
                  </span>
                  {b.status === 'pending' && (
                    <button
                      className="link-btn"
                      onClick={() => handleDeleteBonchonBill(b)}
                      style={{ fontSize: '12px', textDecoration: 'none', color: 'var(--error)', marginLeft: '4px' }}
                    >
                      Xóa
                    </button>
                  )}
                </li>
              ))}
              {bonchonBills.length === 0 && (
                <li className="muted small empty">Chưa có đơn Bonchon nào tuần này.</li>
              )}
            </ul>
          </div>
          </>
        </div>
      )}


      {activeTab === 'boss' && (
        <div style={{ position: 'relative' }}>
          {features.bossDebt === false && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(255,255,255,0.82)',
              borderRadius: 12,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              backdropFilter: 'blur(2px)',
            }}>
              <span style={{ fontSize: 36 }}>🚀</span>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#374151' }}>Sắp ra mắt</div>
              <div className="muted small">Khi nào tiệm mở thì cho sài</div>
            </div>
          )}
          <>
          {/* Boss Debt Form Card */}
          <div className="card add-bill-card">
            <form onSubmit={handleSaveBoss} className="stack">
              <label className="field">
                <span>Chọn Sếp / Mục nợ</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['Anh Hào', 'Anh Linh', 'Khác'].map((boss) => (
                    <button
                      key={boss}
                      type="button"
                      className={`amount-btn ${selectedBoss === boss ? 'active a10' : ''}`}
                      onClick={() => setSelectedBoss(boss)}
                      style={{
                        padding: '14px 10px',
                        flex: 1,
                        borderColor: selectedBoss === boss ? 'var(--navy)' : 'var(--line)',
                        background: selectedBoss === boss ? 'rgba(27,35,80,0.08)' : 'var(--paper-raised)',
                        color: selectedBoss === boss ? 'var(--navy)' : 'var(--ink)',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {boss}
                    </button>
                  ))}
                </div>
              </label>

              {selectedBoss === 'Khác' && (
                <label className="field">
                  <span>Tên <span className="muted">(tên người nợ hoặc mục nợ)</span></span>
                  <input
                    type="text"
                    value={bossCustomName}
                    onChange={(e) => setBossCustomName(e.target.value)}
                    placeholder="Nhập tên (Ví dụ: Mì tê, Lottee, Tiền ăn nhậu cả đám)"
                    required
                  />
                </label>
              )}

              <label className="field">
                <span>Số tiền <span className="muted">(VD: 135 = 135.000đ)</span></span>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={bossAmountInput}
                    onChange={(e) => setBossAmountInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="135"
                    min="1"
                    required
                    style={{ paddingRight: bossAmountInput ? '130px' : '14px', width: '100%' }}
                  />
                  {parseFloat(bossAmountInput) > 0 && (
                    <span style={{
                      position: 'absolute', right: '12px', top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '13px', color: 'var(--blue)', fontWeight: '600',
                      pointerEvents: 'none',
                    }}>
                      = {formatMoney(parseFloat(bossAmountInput) * 1000)}
                    </span>
                  )}
                </div>
              </label>

              <label className="field">
                <span>Ghi chú <span className="muted">(tuỳ chọn)</span></span>
                <input
                  type="text"
                  value={bossNote}
                  onChange={(e) => setBossNote(e.target.value)}
                  placeholder="Ví dụ: Mua hộ ly nước, sếp nợ tiền đồ ăn..."
                />
              </label>

              {bossStatus.text && (
                <div className={bossStatus.type === 'error' ? 'error-text' : 'success-text'}>{bossStatus.text}</div>
              )}

              <button className="btn-primary" type="submit" disabled={savingBoss}>
                {savingBoss ? 'Đang lưu…' : 'Lưu'}
              </button>
            </form>
          </div>

          {/* Boss Debt List Card */}
          <div className="card">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h2>Xem nợ tuần</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select
                  value={selectedMonthStr}
                  onChange={(e) => setSelectedMonthStr(e.target.value)}
                  style={{
                    fontSize: '13px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--paper-raised)',
                    color: 'var(--ink)',
                    fontWeight: '600',
                    outline: 'none',
                  }}
                >
                  {recentMonthsList.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={`${selectedYear}-${selectedWeek}`}
                  onChange={(e) => {
                    const [y, w] = e.target.value.split('-').map(Number)
                    setSelectedWeek(w)
                    setSelectedYear(y)
                  }}
                  style={{
                    fontSize: '13px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--paper-raised)',
                    color: 'var(--ink)',
                    fontWeight: '600',
                    outline: 'none',
                  }}
                >
                  {weeksListForMonth.map((w) => {
                    const range = getWeekDateRange(w.week, w.year)
                    const isCurrent = w.week === currentISO.week && w.year === currentISO.year
                    return (
                      <option key={`${w.year}-${w.week}`} value={`${w.year}-${w.week}`}>
                        Tuần {w.week}/{w.year} ({range.from} – {range.to}){isCurrent ? ' (Hiện tại)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
            <div className="stat-row">
              <div className="stat">
                <span className="stat-label">Anh Hào</span>
                <span className="stat-value" style={{ color: 'var(--error)' }}>
                  {formatMoney(bossTotals.hao)}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Anh Linh</span>
                <span className="stat-value" style={{ color: 'var(--error)' }}>
                  {formatMoney(bossTotals.linh)}
                </span>
              </div>
              {bossTotals.khac > 0 && (
                <div className="stat">
                  <span className="stat-label">Khác</span>
                  <span className="stat-value" style={{ color: 'var(--error)' }}>
                    {formatMoney(bossTotals.khac)}
                  </span>
                </div>
              )}
            </div>
            <ul className="bill-list">
              {bossDebts.map((item) => (
                <li key={item.id} className="bill-row" style={{ flexWrap: 'nowrap', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: '700', fontSize: '14px' }}>
                      {item.boss}
                    </span>
                    <span className="muted small" style={{ fontSize: '12px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.note}
                    </span>
                  </div>
                  <span style={{ fontWeight: '700', color: 'var(--error)', fontSize: '14px', flexShrink: 0 }}>
                    {formatMoney(item.amount)}
                  </span>
                  <span className="bill-time muted" style={{ fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {item.dateStr ? `${item.dateStr.split('-').reverse().slice(0, 2).join('/')} ` : ''}
                    {item.timeStr}
                  </span>
                  <span className={`badge ${item.status === 'paid' ? 'badge-paid' : 'badge-pending'}`} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {item.status === 'paid' ? 'Đã TT' : 'Chờ TT'}
                  </span>
                  {item.status === 'pending' && (
                    <button
                      className="link-btn"
                      onClick={() => handleDeleteBossDebt(item.id, item.boss, item.amount)}
                      style={{ color: 'var(--error)', fontSize: '12px', textDecoration: 'none', marginLeft: '4px', flexShrink: 0 }}
                    >
                      Xóa
                    </button>
                  )}
                </li>
              ))}
              {bossDebts.length === 0 && <li className="muted small empty">Chưa có khoản nợ nào tuần này.</li>}
            </ul>
          </div>
          </>
        </div>
      )}


      {activeTab === 'commission' && (
        <>
          {/* Commission Form Card */}
          <div className="card add-bill-card">
            {/* Admin-lock banner */}
            {commCurrentRecord?.enteredBy === 'admin' && (
              <div style={{
                background: 'rgba(245,158,11,0.12)',
                border: '1.5px solid rgba(245,158,11,0.45)',
                borderRadius: '10px', padding: '12px 16px',
                marginBottom: '12px',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
              }}>
                <span style={{ fontSize: '20px', lineHeight: 1 }}>🔒</span>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#92400E' }}>
                    Admin đã nhập ngày này cho bạn
                  </div>
                  <div style={{ fontSize: '12px', color: '#78350F', marginTop: '3px' }}>
                    {formatMoney(commCurrentRecord.revenue)} × {commCurrentRecord.rate}% = <strong>{formatMoney(commCurrentRecord.commission)}</strong>
                    {commCurrentRecord.note ? ` · ${commCurrentRecord.note}` : ''}
                  </div>
                  <div style={{ fontSize: '11px', color: '#92400E', marginTop: '3px', opacity: 0.8 }}>
                    Liên hệ admin nếu cần thay đổi.
                  </div>
                </div>
              </div>
            )}
            <form onSubmit={handleSaveComm} className="stack" style={{ opacity: commCurrentRecord?.enteredBy === 'admin' ? 0.5 : 1, pointerEvents: commCurrentRecord?.enteredBy === 'admin' ? 'none' : 'auto' }}>
              <label className="field">
                <span>Ngày (Ngày / Tháng / Năm)</span>
                <DatePickerDMY
                  value={commDate}
                  onChange={(v) => setCommDate(v)}
                />
              </label>

              <label className="field">
                <span>Doanh thu <span className="muted">(VD: 500 = 500.000đ)</span></span>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={commRevenueInput}
                    onChange={(e) => setCommRevenueInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="500"
                    disabled={commIsPenalty}
                    style={{ paddingRight: commRevenueInput ? '130px' : '14px', width: '100%', opacity: commIsPenalty ? 0.6 : 1 }}
                  />
                  {parseFloat(commRevenueInput) > 0 && (
                    <span style={{
                      position: 'absolute', right: '12px', top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '13px', color: 'var(--blue)', fontWeight: '600',
                      pointerEvents: 'none',
                    }}>
                      = {formatMoney(parseFloat(commRevenueInput) * 1000)}
                    </span>
                  )}
                </div>
              </label>

              <label className="field">
                <span>% Hoa hồng <span className="muted">(mặc định 15%)</span></span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={isDucTrong ? '15' : commRate}
                    onChange={(e) => setCommRate(e.target.value)}
                    min="0" max="100" step="0.5"
                    disabled={commIsPenalty || isDucTrong}
                    style={{ flex: 1, opacity: (commIsPenalty || isDucTrong) ? 0.6 : 1 }}
                  />
                  {isDucTrong ? (
                    <span style={{ fontSize: '13px', color: 'var(--navy)', fontWeight: '700', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--navy)', background: 'rgba(27,35,80,0.08)' }}>
                      Boi hàn quốc cố định 15%
                    </span>
                  ) : (
                    [10, 15, 20].map((r) => (
                      <button
                        key={r} type="button"
                        onClick={() => setCommRate(String(r))}
                        disabled={commIsPenalty}
                        style={{
                          padding: '10px 14px', borderRadius: '10px', border: '1.5px solid',
                          borderColor: commIsPenalty ? 'var(--line)' : (commRate === String(r) ? 'var(--navy)' : 'var(--line)'),
                          background: commIsPenalty ? 'var(--paper)' : (commRate === String(r) ? 'var(--navy)' : 'var(--paper)'),
                          color: commIsPenalty ? 'var(--ink-soft)' : (commRate === String(r) ? '#ffffff' : 'var(--ink-soft)'),
                          fontWeight: '700', cursor: commIsPenalty ? 'not-allowed' : 'pointer', fontSize: '13px',
                          opacity: commIsPenalty ? 0.6 : 1,
                        }}
                      >{r}%</button>
                    ))
                  )}
                </div>
              </label>

              {/* Offline / Nghỉ checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 0' }}>
                <input
                  type="checkbox"
                  checked={commIsPenalty}
                  onChange={(e) => {
                    setCommIsPenalty(e.target.checked)
                    if (e.target.checked) setCommRevenueInput('')
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: '600', fontSize: '14px' }}>
                  Offline / Nghỉ
                </span>
              </label>

              {(commRevenue > 0 || commIsPenalty) && (
                <div style={{
                  background: commIsPenalty ? 'rgba(234, 88, 12, 0.08)' : 'rgba(26,122,76,0.08)',
                  border: commIsPenalty ? '1px solid rgba(234, 88, 12, 0.25)' : '1px solid rgba(26,122,76,0.2)',
                  borderRadius: '12px', padding: '14px 16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span className="muted" style={{ fontSize: '13px' }}>
                    {commIsPenalty ? 'Offline / Nghỉ' : `${formatMoney(commRevenue)} × ${isDucTrong ? 15 : commRate}%`}
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: '700', color: (commIsPenalty ? 0 : calculatedCommission) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                    {formatMoney(commIsPenalty ? 0 : calculatedCommission)}
                  </span>
                </div>
              )}

              <label className="field">
                <span>Ghi chú <span className="muted">(tuỳ chọn)</span></span>
                <input
                  value={commNote}
                  onChange={(e) => setCommNote(e.target.value)}
                  placeholder="Ví dụ : Đi trễ bao nhiêu phút thì ghi vào, để biết lý do tại sao hôm đó không phải 15%"
                />
              </label>



              {commStatus.text && (
                <div className={commStatus.type === 'error' ? 'error-text' : 'success-text'}>{commStatus.text}</div>
              )}

              <button className="btn-primary" type="submit" disabled={savingComm}>
                {savingComm ? 'Đang lưu…' : 'Lưu hoa hồng'}
              </button>
            </form>
          </div>

          {/* Commission List Card */}
          <div className="card">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h2>Hoa hồng tháng này</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={selectedMonthStr}
                  onChange={(e) => {
                    setSelectedMonthStr(e.target.value)
                    setCommSelectedWeek('') // reset week filter on month change
                  }}
                  style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--paper-raised)',
                    color: 'var(--ink)',
                    fontWeight: '600',
                    outline: 'none',
                  }}
                >
                  {recentMonthsList.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={commSelectedWeek}
                  onChange={(e) => setCommSelectedWeek(e.target.value)}
                  style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--paper-raised)',
                    color: 'var(--ink)',
                    fontWeight: '600',
                    outline: 'none',
                  }}
                >
                  <option value="">Cả tháng</option>
                  {weeksListForMonth.map((w) => {
                    const range = getWeekDateRange(w.week, w.year)
                    return (
                      <option key={`${w.year}-${w.week}`} value={`${w.year}-${w.week}`}>
                        Tuần {w.week} ({range.from} – {range.to})
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
            <div className="stat-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div className="stat" style={{ flex: '1 1 80px' }}>
                <span className="stat-label">Số ngày nhập</span>
                <span className="stat-value">{filteredCommHistory.length}</span>
              </div>
              <div className="stat" style={{ flex: '2 1 120px' }}>
                <span className="stat-label">
                  {commSelectedWeek ? 'Tiền tuần đã chạy' : 'Tiền tháng đã chạy'}
                </span>
                <span className="stat-value" style={{ color: 'var(--blue)', fontSize: '16px' }}>
                  {formatMoney(commHistoryTotal)}
                </span>
              </div>
              <div className="stat" style={{ flex: '2 1 120px' }}>
                <span className="stat-label">Tiền hoa hồng</span>
                <span className="stat-value" style={{ color: 'var(--success)', fontSize: '16px' }}>
                  {formatMoney(commHistoryCommissionTotal)}
                </span>
              </div>
            </div>
            <ul className="bill-list">
              {filteredCommHistory.map((item) => (
                <li key={item.id} className="bill-row" style={{ flexWrap: 'nowrap', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '700', fontSize: '14px' }}>
                        {item.date.split('-').reverse().slice(0, 2).join('/')}
                      </span>
                      {item.isPenalty ? (
                        <span className="badge badge-pending" style={{ background: 'rgba(234, 88, 12, 0.12)', color: '#c2410c', border: '1px solid rgba(234, 88, 12, 0.3)' }}>
                          Offline / Nghỉ
                        </span>
                      ) : (
                        <span className="muted small">
                          Doanh thu: {formatMoney(item.revenue)} ({item.rate}%)
                        </span>
                      )}
                    </div>
                    {item.note && (
                      <span className="muted small" style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.note}
                      </span>
                    )}
                  </div>
                  <span style={{ fontWeight: '700', color: item.commission >= 0 ? 'var(--success)' : 'var(--error)', fontSize: '14px', flexShrink: 0 }}>
                    {item.commission >= 0 ? formatMoney(item.commission) : `-${formatMoney(Math.abs(item.commission))}`}
                  </span>
                  <button
                    className="link-btn"
                    onClick={() => handleDeleteComm(item)}
                    style={{ color: 'var(--error)', fontSize: '12px', textDecoration: 'none', marginLeft: '6px', flexShrink: 0 }}
                  >
                    Xóa
                  </button>
                </li>
              ))}
              {filteredCommHistory.length === 0 && <li className="muted small empty">Chưa có dữ liệu hoa hồng.</li>}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
