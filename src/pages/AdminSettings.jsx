import { useEffect, useState } from 'react'
import { createUserWithEmailAndPassword, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where, updateDoc } from 'firebase/firestore'
import { db, secondaryAuth, auth } from '../firebase'

export default function AdminSettings() {
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({ name: '', username: '' })
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState({ type: '', text: '' })

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' })

  function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
    str = str.replace(/đ/g,"d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|R|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|U|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Y|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    str = str.replace(/\u0300|\u0301|\u0309|\u0303|\u0323/g, "");
    str = str.replace(/\u02C6|\u0306|\u031B/g, "");
    return str;
  }

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'employee'))
    return onSnapshot(q, (snap) => {
      setEmployees(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
    })
  }, [])

  async function handleCreateEmployee(e) {
    e.preventDefault()
    setCreateMsg({ type: '', text: '' })
    const nameTrimmed = form.name.trim()
    const usernameTrimmed = form.username.trim().toLowerCase().replace(/\s+/g, '')
    if (!nameTrimmed) {
      setCreateMsg({ type: 'error', text: 'Vui lòng nhập họ tên nhân viên.' })
      return
    }
    if (!usernameTrimmed) {
      setCreateMsg({ type: 'error', text: 'Vui lòng nhập tên đăng nhập.' })
      return
    }
    setCreating(true)
    try {
      const randomStr = Math.random().toString(36).substring(2, 6)
      const generatedEmail = `${usernameTrimmed}_${randomStr}@lottee.internal`
      const defaultPassword = '123456'

      const cred = await createUserWithEmailAndPassword(secondaryAuth, generatedEmail, defaultPassword)
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: nameTrimmed,
        username: usernameTrimmed,
        email: generatedEmail,
        role: 'employee',
        active: true,
      })
      // Lưu mapping username -> email vào collection usernames để tra cứu khi đăng nhập
      await setDoc(doc(db, 'usernames', usernameTrimmed), {
        email: generatedEmail,
        uid: cred.user.uid,
      })
      await signOut(secondaryAuth)
      setForm({ name: '', username: '' })
      setCreateMsg({ type: 'success', text: `Đã tạo tài khoản "${usernameTrimmed}" cho nhân viên "${nameTrimmed}".` })
    } catch (err) {
      setCreateMsg({ type: 'error', text: mapError(err.code) })
    } finally {
      setCreating(false)
    }
  }

  async function deleteEmployee(emp) {
    if (!confirm(`Xóa nhân viên "${emp.name}"? Tài khoản sẽ bị xóa khỏi danh sách và không thể đăng nhập. Hành động này không thể hoàn tác!`)) return
    try {
      await deleteDoc(doc(db, 'users', emp.uid))
      if (emp.username) {
        await deleteDoc(doc(db, 'usernames', emp.username))
      }
    } catch (err) {
      console.error(err)
      alert('Xóa thất bại. Vui lòng thử lại.')
    }
  }

  async function editEmployeeName(emp) {
    const newName = prompt(`Nhập tên mới cho nhân viên "${emp.name}":`, emp.name)
    if (newName === null) return
    const trimmed = newName.trim()
    if (!trimmed) {
      alert('Họ tên nhân viên không được để trống.')
      return
    }
    if (trimmed === emp.name) return
    try {
      await updateDoc(doc(db, 'users', emp.uid), { name: trimmed })
    } catch (err) {
      console.error(err)
      alert('Đổi tên thất bại. Vui lòng thử lại.')
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwMsg({ type: '', text: '' })
    if (pwForm.next.length < 6) {
      setPwMsg({ type: 'error', text: 'Mật khẩu mới phải tối thiểu 6 ký tự.' })
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' })
      return
    }
    setPwSaving(true)
    try {
      const user = auth.currentUser
      if (!user) throw new Error('not-logged-in')
      const credential = EmailAuthProvider.credential(user.email, pwForm.current)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, pwForm.next)
      setPwMsg({ type: 'success', text: '✓ Đổi mật khẩu thành công!' })
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPwMsg({ type: 'error', text: 'Mật khẩu hiện tại không đúng.' })
      } else {
        setPwMsg({ type: 'error', text: 'Đổi mật khẩu thất bại. Vui lòng thử lại.' })
      }
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="section-header"><h2>Thêm nhân viên</h2></div>
      <form className="card stack" onSubmit={handleCreateEmployee}>
        <label className="field">
          <span>Họ tên</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nguyễn Văn A" required />
        </label>
        <label className="field">
          <span>Tên đăng nhập <span className="muted small">(không dấu, không khoảng trắng)</span></span>
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s+/g, '').toLowerCase() })} placeholder="vana" required />
        </label>
        {createMsg.text && (
          <div className={createMsg.type === 'error' ? 'error-text' : 'success-text'}>{createMsg.text}</div>
        )}
        <button className="btn-primary" type="submit" disabled={creating}>
          {creating ? 'Đang tạo…' : 'Tạo tài khoản'}
        </button>
      </form>

      <div className="section-header"><h2>Danh sách nhân viên</h2></div>
      <div className="card">
        <ul className="bill-list">
          {employees.map((emp) => (
            <li key={emp.uid} className="bill-row">
              <span className="bill-code">{emp.name}</span>
              <span className="muted small">Đăng nhập: <strong>{emp.username || '—'}</strong></span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                <button
                  className="link-btn"
                  onClick={() => editEmployeeName(emp)}
                  style={{ color: 'var(--blue)' }}
                >
                  Sửa tên
                </button>
                <button
                  className="link-btn"
                  onClick={() => deleteEmployee(emp)}
                  style={{ color: 'var(--error)' }}
                >
                  Xóa nhân viên
                </button>
              </div>
            </li>
          ))}
          {employees.length === 0 && <li className="muted small empty">Chưa có nhân viên nào.</li>}
        </ul>
      </div>

      {/* ── Đổi mật khẩu Admin ── */}
      <div className="section-header"><h2>🔑 Đổi mật khẩu Admin</h2></div>
      <form className="card stack" onSubmit={handleChangePassword}>
        <label className="field">
          <span>Mật khẩu hiện tại</span>
          <input
            type="password"
            value={pwForm.current}
            onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
            placeholder="Nhập mật khẩu hiện tại"
            required
            autoComplete="current-password"
          />
        </label>
        <label className="field">
          <span>Mật khẩu mới <span className="muted small">(tối thiểu 6 ký tự)</span></span>
          <input
            type="password"
            value={pwForm.next}
            onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
            placeholder="Nhập mật khẩu mới"
            required
            autoComplete="new-password"
          />
        </label>
        <label className="field">
          <span>Xác nhận mật khẩu mới</span>
          <input
            type="password"
            value={pwForm.confirm}
            onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
            placeholder="Nhập lại mật khẩu mới"
            required
            autoComplete="new-password"
          />
        </label>
        {pwMsg.text && (
          <div className={pwMsg.type === 'error' ? 'error-text' : 'success-text'}>{pwMsg.text}</div>
        )}
        <button className="btn-primary" type="submit" disabled={pwSaving}>
          {pwSaving ? 'Đang đổi…' : 'Đổi mật khẩu'}
        </button>
      </form>
    </div>
  )
}

function mapError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Email này đã được sử dụng.'
    case 'auth/invalid-email':
      return 'Email không hợp lệ.'
    case 'auth/weak-password':
      return 'Mật khẩu quá yếu (tối thiểu 6 ký tự).'
    default:
      return 'Tạo tài khoản thất bại. Vui lòng thử lại.'
  }
}
