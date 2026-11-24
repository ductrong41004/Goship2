import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import NavBar from './components/NavBar'
import Login from './pages/Login'
import EmployeeHome from './pages/EmployeeHome'
import AdminDashboard from './pages/AdminDashboard'
import AdminSettings from './pages/AdminSettings'
import AdminCommission from './pages/AdminCommission'
import AdminCommissionEnter from './pages/AdminCommissionEnter'
import AdminCommissionHistory from './pages/AdminCommissionHistory'
import AdminBossDebts from './pages/AdminBossDebts'
import AdminFeatureSettings from './pages/AdminFeatureSettings'
import AdminEmployeeDeposits from './pages/AdminEmployeeDeposits'
import RulesPage from './pages/RulesPage'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  )
}

function AppRoutes() {
  const { user, profile, loading, isAdmin, logout } = useAuth()

  if (loading) {
    return (
      <div className="center-screen">
        <div className="loader-3d-wrapper">
          <div className="loader-3d">
            <div className="loader-3d-ring ring-1"></div>
            <div className="loader-3d-ring ring-2"></div>
            <div className="loader-3d-ring ring-3"></div>
            <div className="loader-3d-core"></div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="loader-brand-title">GO SHIP RẠCH GIÁ</div>
            <div className="loader-brand-sub" style={{ marginTop: '6px' }}>Đang tải dữ liệu…</div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  if (!profile) {
    return (
      <div className="center-screen">
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: '380px' }}>
          <div style={{ fontSize: '42px', marginBottom: '14px' }}>⚠️</div>
          <h2 style={{ margin: '0 0 10px', fontSize: '19px', color: '#ffffff', fontWeight: '800' }}>
            Tài khoản chưa thiết lập
          </h2>
          <p className="muted" style={{ margin: '0 0 24px', fontSize: '14px', lineHeight: '1.5' }}>
            Vui lòng liên hệ Admin để hoàn tất cấu hình và cấp quyền cho tài khoản.
          </p>
          <button className="btn-primary" onClick={logout} style={{ width: '100%' }}>
            Đăng xuất
          </button>
        </div>
      </div>
    )
  }

  if (profile.active === false) {
    return (
      <div className="center-screen">
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: '380px' }}>
          <div style={{ fontSize: '42px', marginBottom: '14px' }}>🚫</div>
          <h2 style={{ margin: '0 0 10px', fontSize: '19px', color: '#ef4444', fontWeight: '800' }}>
            Tài khoản bị vô hiệu hóa
          </h2>
          <p className="muted" style={{ margin: '0 0 24px', fontSize: '14px', lineHeight: '1.5' }}>
            Tài khoản của bạn tạm thời đã bị khóa. Vui lòng liên hệ Admin.
          </p>
          <button className="btn-primary" onClick={logout} style={{ width: '100%' }}>
            Đăng xuất
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <NavBar />
      <main>
        {isAdmin ? (
          <Routes>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/commission" element={<AdminCommission />} />
            <Route path="/admin/commission/enter" element={<AdminCommissionEnter />} />
            <Route path="/admin/commission/history" element={<AdminCommissionHistory />} />
            <Route path="/admin/boss-debts" element={<AdminBossDebts />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/settings/data" element={<AdminFeatureSettings />} />
            <Route path="/admin/deposits" element={<AdminEmployeeDeposits />} />
            <Route path="/admin/rules" element={<RulesPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/" element={<EmployeeHome />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </>
  )
}
