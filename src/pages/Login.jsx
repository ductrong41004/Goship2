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
            style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }} 
          />
          <div>
            <h1>{BRANCH_NAME ? `GO SHIP - ${BRANCH_NAME}` : 'GO SHIP'}</h1>
            <p className="muted">Đăng nhập để bắt đầu nhập bill</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="stack">
          <label className="field">
            <span>Tên Đăng Nhập</span>
            <input
              type="text"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              placeholder=""
              required
            />
          </label>
          {error && <div className="error-text">{error}</div>}
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
        <p className="muted small" style={{ textAlign: 'center', marginTop: '12px' }}>
          Nhắn anh Hào hoặc anh Linh cấp tài khoản
        </p>
      </div>
    </div>
  )
}
