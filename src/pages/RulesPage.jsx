import { useEffect, useRef, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, col } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

const FONT_FAMILIES = [
  { label: 'Mặc định (Sans-serif)', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, Verdana, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
]

const FONT_SIZES = [
  { label: 'Rất nhỏ (12px)', value: '1' },
  { label: 'Nhỏ (14px)', value: '2' },
  { label: 'Vừa / Chuẩn (16px)', value: '3' },
  { label: 'Hơi to (18px)', value: '4' },
  { label: 'Lớn (24px)', value: '5' },
  { label: 'Rất lớn (32px)', value: '6' },
  { label: 'Tiêu đề lớn (48px)', value: '7' },
]

const QUICK_COLORS = [
  '#000000', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#475569',
]

const QUICK_HIGHLIGHTS = [
  '#ffffff', '#fef08a', '#bbf7d0', '#bfdbfe', '#fecdd3', '#fed7aa', '#e9d5ff',
]

const DEFAULT_RULES_HTML = `
  <h1 style="text-align: center; color: #1e3a8a; margin-bottom: 8px;">📜 BẢNG NỘI QUY GOSHIP</h1>
  <p style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 24px;"><em>(Áp dụng cho toàn thể nhân viên)</em></p>
  
  <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">1. Thời gian làm việc</h2>
  <ul>
    <li>Nhân viên có mặt đúng giờ theo ca phân công.</li>
    <li>Nghỉ phép cần báo trước cho quản lý ít nhất 1 ngày.</li>
  </ul>

  <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 20px;">2. Quy trình giao nhận & Quản lý bill</h2>
  <ul>
    <li>Nhập đầy đủ mã bill vào hệ thống ngay khi hoàn tất đơn hàng.</li>
    <li>Kiểm tra kỹ thông tin đơn và số tiền thanh toán.</li>
    <li>Báo cáo ngay cho quản lý nếu có sự cố đơn hàng hoặc bill thất lạc.</li>
  </ul>

  <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 20px;">3. Tác phong & Thái độ phục vụ</h2>
  <ul>
    <li>Thái độ hòa nhã, lịch sự, nhiệt tình với khách hàng.</li>
    <li>Giữ gìn vệ sinh chung, bảo quản trang thiết bị cửa hàng.</li>
  </ul>
`

export default function RulesPage() {
  const { isAdmin } = useAuth()
  const editorRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' })
  const [hasChanges, setHasChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)

  const [currentFont, setCurrentFont] = useState(FONT_FAMILIES[0].value)
  const [currentSize, setCurrentSize] = useState('3')
  const [currentColor, setCurrentColor] = useState('#000000')
  const [currentBgColor, setCurrentBgColor] = useState('#ffffff')

  // Load from localStorage immediately so page never renders empty
  useEffect(() => {
    const cached = localStorage.getItem('lottee_rules_html')
    if (editorRef.current) {
      editorRef.current.innerHTML = cached || DEFAULT_RULES_HTML
    }

    async function loadRules() {
      try {
        const snap = await getDoc(doc(db, col('config'), 'rules'))
        if (snap.exists() && snap.data().contentHtml) {
          const html = snap.data().contentHtml
          if (editorRef.current) {
            editorRef.current.innerHTML = html
          }
          localStorage.setItem('lottee_rules_html', html)
          if (snap.data().updatedAt) {
            setLastSaved(new Date(snap.data().updatedAt).toLocaleString('vi-VN'))
          }
        } else if (!cached && editorRef.current) {
          editorRef.current.innerHTML = DEFAULT_RULES_HTML
        }
      } catch (err) {
        console.error('Lỗi tải bảng nội quy từ Firestore:', err)
      } finally {
        setLoading(false)
      }
    }
    loadRules()
  }, [])

  function exec(command, value = null) {
    if (!isAdmin) return
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    setHasChanges(true)
  }

  function handleHeading(tag) {
    if (!isAdmin) return
    editorRef.current?.focus()
    document.execCommand('formatBlock', false, tag)
    setHasChanges(true)
  }

  async function handleClearAndSave() {
    if (!isAdmin) return
    if (!confirm('Xác nhận xóa trắng và lưu luôn nội quy? (Trang nhân viên sẽ tự động phát video)')) return
    setSaving(true)
    setStatusMsg({ type: '', text: '' })
    try {
      if (editorRef.current) {
        editorRef.current.innerHTML = ''
      }
      localStorage.setItem('lottee_rules_html', '')
      await setDoc(doc(db, col('config'), 'rules'), {
        contentHtml: '',
        updatedAt: new Date().toISOString(),
      })
      const nowStr = new Date().toLocaleString('vi-VN')
      setLastSaved(nowStr)
      setHasChanges(false)
      setStatusMsg({ type: 'success', text: `✓ Đã xóa trắng và lưu bảng nội quy thành công! (Nhân viên sẽ thấy video)` })
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000)
    } catch (err) {
      console.error('Lỗi xóa nội quy:', err)
      setStatusMsg({ type: 'error', text: `Lỗi khi lưu: ${err.message || 'Thử lại'}` })
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    if (!isAdmin) return
    setSaving(true)
    setStatusMsg({ type: '', text: '' })
    try {
      const html = editorRef.current?.innerHTML || ''
      localStorage.setItem('lottee_rules_html', html)
      await setDoc(doc(db, col('config'), 'rules'), {
        contentHtml: html,
        updatedAt: new Date().toISOString(),
      })
      const nowStr = new Date().toLocaleString('vi-VN')
      setLastSaved(nowStr)
      setHasChanges(false)
      setStatusMsg({ type: 'success', text: `✓ Đã lưu bảng nội quy thành công lúc ${nowStr}` })
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000)
    } catch (err) {
      console.error('Lỗi lưu nội quy:', err)
      setStatusMsg({ type: 'error', text: `Lỗi khi lưu: ${err.message || 'Thử lại'}` })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: 'var(--navy)' }}>
            📜 Bảng Nội Quy GOSHIP
          </h2>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            {isAdmin ? 'Nhấp trực tiếp vào văn bản bên dưới để chỉnh sửa như Word rồi bấm "Lưu Nội Quy".' : 'Xem nội quy hoạt động GOSHIP.'}
            {lastSaved && <span> (Cập nhật lần cuối: {lastSaved})</span>}
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {hasChanges && (
              <span style={{ fontSize: '12px', color: '#d97706', fontWeight: '600' }}>
                ● Có thay đổi chưa lưu
              </span>
            )}
            <button
              type="button"
              onClick={handleClearAndSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 18px', fontSize: '14px', fontWeight: '700',
                borderRadius: '10px', border: '1.5px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.15)',
              }}
            >
              🗑️ Xoá Trắng Nội Quy
            </button>
          </div>
        )}
      </div>

      {statusMsg.text && (
        <div
          className={statusMsg.type === 'error' ? 'error-text' : 'success-text'}
          style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '10px' }}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Word-style Toolbar (chỉ hiện cho Admin) */}
      {isAdmin && (
        <div style={{
          background: 'rgba(14, 25, 56, 0.9)',
          border: '1.5px solid var(--line)',
          borderRadius: '14px 14px 0 0',
          padding: '10px 12px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        }}>
          {/* Nhóm Phông chữ */}
          <select
            value={currentFont}
            onChange={(e) => {
              setCurrentFont(e.target.value)
              exec('fontName', e.target.value)
            }}
            style={{
              padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)',
              fontSize: '13px', background: 'rgba(11, 20, 46, 0.9)', color: '#ffffff', fontWeight: '600', cursor: 'pointer',
            }}
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          {/* Nhóm Cỡ chữ */}
          <select
            value={currentSize}
            onChange={(e) => {
              setCurrentSize(e.target.value)
              exec('fontSize', e.target.value)
            }}
            style={{
              padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)',
              fontSize: '13px', background: 'rgba(11, 20, 46, 0.9)', color: '#ffffff', fontWeight: '600', cursor: 'pointer',
            }}
          >
            {FONT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Tiêu đề H1, H2, Đoạn văn */}
          <div style={{ display: 'flex', gap: '3px' }}>
            <button
              type="button"
              title="Tiêu đề 1"
              onMouseDown={(e) => { e.preventDefault(); handleHeading('H1') }}
              style={toolBtnStyle}
            >
              H1
            </button>
            <button
              type="button"
              title="Tiêu đề 2"
              onMouseDown={(e) => { e.preventDefault(); handleHeading('H2') }}
              style={toolBtnStyle}
            >
              H2
            </button>
            <button
              type="button"
              title="Đoạn văn thường"
              onMouseDown={(e) => { e.preventDefault(); handleHeading('P') }}
              style={toolBtnStyle}
            >
              ¶
            </button>
          </div>

          <span style={dividerStyle} />

          {/* Nhóm Định dạng chữ: In đậm, nghiêng, gạch chân, gạch ngang */}
          <div style={{ display: 'flex', gap: '3px' }}>
            <button
              type="button"
              title="In đậm (Ctrl+B)"
              onMouseDown={(e) => { e.preventDefault(); exec('bold') }}
              style={{ ...toolBtnStyle, fontWeight: '900' }}
            >
              B
            </button>
            <button
              type="button"
              title="In nghiêng (Ctrl+I)"
              onMouseDown={(e) => { e.preventDefault(); exec('italic') }}
              style={{ ...toolBtnStyle, fontStyle: 'italic', fontFamily: 'serif' }}
            >
              I
            </button>
            <button
              type="button"
              title="Gạch chân (Ctrl+U)"
              onMouseDown={(e) => { e.preventDefault(); exec('underline') }}
              style={{ ...toolBtnStyle, textDecoration: 'underline' }}
            >
              U
            </button>
            <button
              type="button"
              title="Gạch ngang"
              onMouseDown={(e) => { e.preventDefault(); exec('strikeThrough') }}
              style={{ ...toolBtnStyle, textDecoration: 'line-through' }}
            >
              S
            </button>
          </div>

          <span style={dividerStyle} />

          {/* Màu chữ (Text Color) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Màu chữ">
            <span style={{ fontSize: '12px', fontWeight: '700' }}>A:</span>
            <input
              type="color"
              value={currentColor}
              onChange={(e) => {
                setCurrentColor(e.target.value)
                exec('foreColor', e.target.value)
              }}
              style={{
                width: '26px', height: '26px', padding: 0, border: '1px solid var(--line)',
                borderRadius: '6px', cursor: 'pointer', background: 'none',
              }}
            />
            {QUICK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setCurrentColor(c); exec('foreColor', c) }}
                style={{
                  width: '16px', height: '16px', borderRadius: '50%', background: c,
                  border: '1px solid rgba(0,0,0,0.15)', cursor: 'pointer', padding: 0,
                }}
              />
            ))}
          </div>

          <span style={dividerStyle} />

          {/* Màu đánh dấu / nền (Highlight) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Màu nền / Đánh dấu">
            <span style={{ fontSize: '12px' }}>🖌️</span>
            <input
              type="color"
              value={currentBgColor}
              onChange={(e) => {
                setCurrentBgColor(e.target.value)
                exec('hiliteColor', e.target.value)
              }}
              style={{
                width: '26px', height: '26px', padding: 0, border: '1px solid var(--line)',
                borderRadius: '6px', cursor: 'pointer', background: 'none',
              }}
            />
            {QUICK_HIGHLIGHTS.map((c) => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setCurrentBgColor(c); exec('hiliteColor', c) }}
                style={{
                  width: '16px', height: '16px', borderRadius: '4px', background: c,
                  border: '1px solid rgba(0,0,0,0.2)', cursor: 'pointer', padding: 0,
                }}
              />
            ))}
          </div>

          <span style={dividerStyle} />

          {/* Căn lề */}
          <div style={{ display: 'flex', gap: '3px' }}>
            <button
              type="button"
              title="Căn trái"
              onMouseDown={(e) => { e.preventDefault(); exec('justifyLeft') }}
              style={toolBtnStyle}
            >
              ⬅
            </button>
            <button
              type="button"
              title="Căn giữa"
              onMouseDown={(e) => { e.preventDefault(); exec('justifyCenter') }}
              style={toolBtnStyle}
            >
              ↔
            </button>
            <button
              type="button"
              title="Căn phải"
              onMouseDown={(e) => { e.preventDefault(); exec('justifyRight') }}
              style={toolBtnStyle}
            >
              ➡
            </button>
            <button
              type="button"
              title="Căn đều hai bên"
              onMouseDown={(e) => { e.preventDefault(); exec('justifyFull') }}
              style={toolBtnStyle}
            >
              ⇥
            </button>
          </div>

          <span style={dividerStyle} />

          {/* Danh sách */}
          <div style={{ display: 'flex', gap: '3px' }}>
            <button
              type="button"
              title="Danh sách chấm tròn"
              onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList') }}
              style={toolBtnStyle}
            >
              •☰
            </button>
            <button
              type="button"
              title="Danh sách số thứ tự"
              onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList') }}
              style={toolBtnStyle}
            >
              1.☰
            </button>
          </div>

          <span style={dividerStyle} />

          {/* Xóa định dạng & Hoàn tác */}
          <div style={{ display: 'flex', gap: '3px' }}>
            <button
              type="button"
              title="Hoàn tác (Ctrl+Z)"
              onMouseDown={(e) => { e.preventDefault(); exec('undo') }}
              style={toolBtnStyle}
            >
              ↩
            </button>
            <button
              type="button"
              title="Làm lại (Ctrl+Y)"
              onMouseDown={(e) => { e.preventDefault(); exec('redo') }}
              style={toolBtnStyle}
            >
              ↪
            </button>
            <button
              type="button"
              title="Xóa định dạng đang chọn"
              onMouseDown={(e) => { e.preventDefault(); exec('removeFormat') }}
              style={{ ...toolBtnStyle, fontSize: '11px', color: '#64748b' }}
            >
              🧹 Xóa định dạng
            </button>
          </div>
        </div>
      )}

      {/* Trang soạn thảo kiểu Tờ giấy A4 (Word Paper) */}
      <div
        style={{
          background: 'rgba(14, 25, 56, 0.8)',
          borderRadius: isAdmin ? '0 0 14px 14px' : '14px',
          border: '1.5px solid var(--line)',
          borderTop: isAdmin ? 'none' : '1.5px solid var(--line)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
          minHeight: '600px',
          position: 'relative',
        }}
      >
        <div
          ref={editorRef}
          contentEditable={isAdmin}
          suppressContentEditableWarning
          onInput={() => setHasChanges(true)}
          style={{
            minHeight: '600px',
            padding: '36px 40px',
            outline: 'none',
            fontSize: '16px',
            lineHeight: '1.7',
            color: 'var(--ink)',
            fontFamily: currentFont,
            cursor: isAdmin ? 'text' : 'default',
          }}
        />
      </div>

      {isAdmin && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            style={{
              padding: '11px 24px', fontSize: '15px', fontWeight: '700',
            }}
          >
            💾 {saving ? 'Đang lưu…' : 'Lưu Bảng Nội Quy'}
          </button>
        </div>
      )}
    </div>
  )
}

const toolBtnStyle = {
  minWidth: '28px',
  height: '28px',
  padding: '2px 8px',
  borderRadius: '6px',
  border: '1px solid var(--line)',
  background: 'rgba(255, 255, 255, 0.08)',
  fontSize: '13px',
  fontWeight: '700',
  color: '#ffffff',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
}

const dividerStyle = {
  width: '1px',
  height: '20px',
  background: 'var(--line)',
  margin: '0 4px',
  display: 'inline-block',
}

