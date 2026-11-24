import { useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { db, col, ADMIN_EMAIL, BRANCH_NAME } from '../firebase'

export default function Login() {
  const { login } = useAuth()
  const [loginInput, setLoginInput] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const val = loginInput.trim()
    if (!val) {
      setBusy(false)
      return
    }

    try {
      // 1. Thử đăng nhập Admin trước (dùng mật khẩu Admin)
      await login(ADMIN_EMAIL, val)
    } catch (adminErr) {
      // 2. Không phải Admin -> tìm trong collection usernames (công khai)
      try {
        const usernameDoc = await getDoc(doc(db, col('usernames'), val.toLowerCase()))

        if (!usernameDoc.exists()) {
          setError('Tên đăng nhập hoặc mật khẩu Admin không đúng.')
          setBusy(false)
          return
        }

        const { email } = usernameDoc.data()
        // Đăng nhập bằng email tìm được và mật khẩu mặc định '123456'
        await login(email, '123456')
      } catch (err) {
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          setError('Tên đăng nhập không đúng hoặc tài khoản đã bị vô hiệu hóa.')
        } else {
          setError('Đăng nhập thất bại. Vui lòng thử lại.')
        }
      } finally {
        setBusy(false)
      }
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">
          <img 
            src={`${import.meta.env.BASE_URL}icons/apple-touch-icon.png`} 
            alt="Go Ship" 
            style={{ 
              width: '52px', 
              height: '52px', 
              borderRadius: '14px', 
              objectFit: 'cover',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4), 0 0 16px rgba(59, 130, 246, 0.3)',
              border: '1.5px solid rgba(59, 130, 246, 0.35)'
            }} 
          />
          <div>
            <h1>{BRANCH_NAME ? `GO SHIP - ${BRANCH_NAME}` : 'GO SHIP'}</h1>
            <p className="muted" style={{ fontSize: '13.5px', marginTop: '2px' }}>Đăng nhập để vào hệ thống</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="stack">
          <label className="field">
            <span>Tên Đăng Nhập hoặc Mật Khẩu Admin</span>
            <input
              type="text"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              placeholder="Nhập tên nhân viên..."
              autoComplete="username"
              required
            />
          </label>
          {error && (
            <div className="error-text" style={{ 
              background: 'rgba(239, 68, 68, 0.12)', 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              padding: '10px 14px', 
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          <button className="btn-primary" type="submit" disabled={busy} style={{ width: '100%', marginTop: '6px' }}>
            {busy ? 'Đang xác thực…' : 'Đăng Nhập'}
          </button>
        </form>
        <p className="muted small" style={{ textAlign: 'center', marginTop: '18px' }}>
          Nhắn anh Hào hoặc anh Linh cấp tài khoản
        </p>
      </div>
    </div>
  )
}
