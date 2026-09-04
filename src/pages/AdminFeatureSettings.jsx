import { useEffect, useState } from 'react'
import { collection, doc, getDocs, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

const FEATURES = [
  {
    key: 'lottee',
    label: 'Tính Tiền Lottee',
    icon: '🟡',
    desc: 'Cho phép nhân viên nhập bill Lottee.',
  },
  {
    key: 'bonchon',
    label: 'Tính Tiền BONCHON',
    icon: '🔴',
    desc: 'Cho phép nhân viên nhập đơn BONCHON.',
  },
  {
    key: 'bossDebt',
    label: 'Tính Tiền Sếp Nợ',
    icon: '💰',
    desc: 'Cho phép nhân viên ghi nợ sếp.',
  },
]

export default function AdminFeatureSettings() {
  const [features, setFeatures] = useState(null)
  const [saving, setSaving] = useState({})
  const [msg, setMsg] = useState({})

  useEffect(() => {
    const ref = doc(db, 'config', 'features')
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setFeatures(snap.data())
      } else {
        setFeatures({ lottee: true, bonchon: true, bossDebt: true })
      }
    })
  }, [])

  async function toggle(key) {
    const newVal = !features[key]
    setSaving((prev) => ({ ...prev, [key]: true }))
    setMsg((prev) => ({ ...prev, [key]: null }))
    try {
      const ref = doc(db, 'config', 'features')
      await setDoc(ref, { ...features, [key]: newVal }, { merge: true })
      setMsg((prev) => ({
        ...prev,
        [key]: { type: 'success', text: newVal ? '✓ Đã bật' : '✓ Đã tắt' },
      }))
    } catch (err) {
      console.error(err)
      setMsg((prev) => ({
        ...prev,
        [key]: { type: 'error', text: 'Lưu thất bại. Thử lại.' },
      }))
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }))
      setTimeout(() => setMsg((prev) => ({ ...prev, [key]: null })), 2000)
    }
  }

  // Delete all paid bills from a collection
  const [deleting, setDeleting] = useState({})
  const [delMsg, setDelMsg] = useState({})

  async function deletePaidBills(collectionName, label) {
    if (!confirm(`⚠️ Bạn có chắc muốn XOÁ TOÀN BỘ bill "${label}" đã Đã Thanh Toán?\nHành động này KHÔNG THỂ hoàn tác!`)) return
    setDeleting((prev) => ({ ...prev, [collectionName]: true }))
    setDelMsg((prev) => ({ ...prev, [collectionName]: null }))
    try {
      const q = query(collection(db, collectionName), where('status', '==', 'paid'))
      const snap = await getDocs(q)
      if (snap.empty) {
        setDelMsg((prev) => ({ ...prev, [collectionName]: { type: 'info', text: 'Không có bill nào đã thanh toán.' } }))
        return
      }
      // Batch delete (max 500 per batch)
      let batch = writeBatch(db)
      let count = 0
      let total = 0
      for (const docSnap of snap.docs) {
        batch.delete(docSnap.ref)
        count++
        total++
        if (count === 499) {
          await batch.commit()
          batch = writeBatch(db)
          count = 0
        }
      }
      if (count > 0) await batch.commit()
      setDelMsg((prev) => ({ ...prev, [collectionName]: { type: 'success', text: `✓ Đã xoá ${total} bill đã thanh toán.` } }))
    } catch (err) {
      console.error(err)
      setDelMsg((prev) => ({ ...prev, [collectionName]: { type: 'error', text: 'Xoá thất bại. Thử lại.' } }))
    } finally {
      setDeleting((prev) => ({ ...prev, [collectionName]: false }))
    }
  }

  if (!features) return <div className="center-screen">Đang tải…</div>

  return (
    <div className="page">
      <div className="section-header">
        <h2>⚙️ Cài Đặt Dữ Liệu</h2>
      </div>
      <p className="muted small" style={{ marginBottom: 16 }}>
        Bật / Tắt từng tính năng. Khi <strong>Tắt</strong>, tab tương ứng ở trang nhân viên sẽ bị
        vô hiệu hoá (xám lại) và không cho nhập dữ liệu.
      </p>

      <div className="card stack" style={{ gap: 0 }}>
        {FEATURES.map((feat, idx) => {
          const isOn = features[feat.key] !== false
          const isSaving = !!saving[feat.key]
          const featureMsg = msg[feat.key]

          return (
            <div
              key={feat.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 0',
                borderBottom:
                  idx < FEATURES.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {/* Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 26 }}>{feat.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{feat.label}</div>
                  <div className="muted small" style={{ marginTop: 2 }}>
                    {feat.desc}
                  </div>
                  {featureMsg && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        fontWeight: 700,
                        color:
                          featureMsg.type === 'success'
                            ? '#16a34a'
                            : '#dc2626',
                      }}
                    >
                      {featureMsg.text}
                    </div>
                  )}
                </div>
              </div>

              {/* Toggle Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isOn ? '#1e40af' : '#9ca3af',
                  }}
                >
                  {isOn ? 'BẬT' : 'TẮT'}
                </span>
                <button
                  onClick={() => toggle(feat.key)}
                  disabled={isSaving}
                  aria-label={isOn ? 'Tắt' : 'Bật'}
                  style={{
                    position: 'relative',
                    width: 56,
                    height: 30,
                    borderRadius: 15,
                    border: 'none',
                    cursor: isSaving ? 'wait' : 'pointer',
                    background: isOn ? '#1e40af' : '#d1d5db',
                    transition: 'background 0.25s',
                    flexShrink: 0,
                    opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: isOn ? 28 : 3,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.25s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    }}
                  />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div
        className="card"
        style={{
          marginTop: 16,
          background: '#f8fafc',
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: '#1e40af',
              display: 'inline-block',
            }}
          />
          <span className="small">BẬT — nhân viên nhập bình thường</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: '#d1d5db',
              display: 'inline-block',
            }}
          />
          <span className="small">TẮT — tab hiện "Sắp ra mắt", không cho nhập</span>
        </div>
      </div>

      {/* ── Xoá bill đã thanh toán ── */}
      <div className="section-header" style={{ marginTop: 24 }}>
        <h2>🗑️ Xoá Bill Đã Thanh Toán</h2>
      </div>
      <p className="muted small" style={{ marginBottom: 12 }}>
        Xoá toàn bộ bill có trạng thái <strong>Đã Thanh Toán</strong> khỏi hệ thống.
        Hành động này <strong style={{ color: '#dc2626' }}>không thể hoàn tác</strong>.
      </p>

      {[
        { col: 'bills',        label: 'Lottee',   icon: '🟡', desc: 'Xoá tất cả bill Lottee đã được thanh toán.' },
        { col: 'bonchon_bills',label: 'BONCHON',  icon: '🔴', desc: 'Xoá tất cả đơn BONCHON đã được thanh toán.' },
        { col: 'boss_debts',   label: 'Sếp Nợ',  icon: '💰', desc: 'Xoá tất cả khoản nợ sếp đã được thanh toán.' },
      ].map((item) => (
        <div key={item.col} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 26 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{item.label}</div>
                <div className="muted small">{item.desc}</div>
                {delMsg[item.col] && (
                  <div style={{
                    marginTop: 4, fontSize: 12, fontWeight: 700,
                    color: delMsg[item.col].type === 'success' ? '#16a34a'
                         : delMsg[item.col].type === 'error'   ? '#dc2626'
                         : '#6b7280',
                  }}>
                    {delMsg[item.col].text}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => deletePaidBills(item.col, item.label)}
              disabled={!!deleting[item.col]}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1.5px solid #fca5a5',
                background: deleting[item.col] ? '#fee2e2' : '#fff',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: 13,
                cursor: deleting[item.col] ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
                opacity: deleting[item.col] ? 0.7 : 1,
              }}
            >
              {deleting[item.col] ? 'Đang xoá…' : '🗑️ Xoá bill đã TT'}
            </button>
          </div>
        </div>
      ))}

    </div>
  )
}
 
