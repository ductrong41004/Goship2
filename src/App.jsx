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
    return <div className="center-screen">Đang tải…</div>
  }

  if (!user) {
    return <Login />
  }

  if (!profile) {
    return (
      <div className="center-screen">
        <p>Tài khoản chưa được thiết lập. Vui lòng liên hệ Admin.</p>
        <button className="link-btn" onClick={logout}>Đăng xuất</button>
      </div>
    )
  }

  if (profile.active === false) {
    return (
      <div className="center-screen">
        <p>Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin.</p>
        <button className="link-btn" onClick={logout}>Đăng xuất</button>
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
