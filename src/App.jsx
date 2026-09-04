import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import NavBar from './components/NavBar'
import Login from './pages/Login'
import EmployeeHome from './pages/EmployeeHome'
import AdminDashboard from './pages/AdminDashboard'
import AdminEmployees from './pages/AdminEmployees'
import AdminEmployeeDetail from './pages/AdminEmployeeDetail'
import AdminSettings from './pages/AdminSettings'
import AdminTodayBills from './pages/AdminTodayBills'
import AdminCommission from './pages/AdminCommission'
import AdminCommissionEnter from './pages/AdminCommissionEnter'
import AdminCommissionHistory from './pages/AdminCommissionHistory'
import AdminBossDebts from './pages/AdminBossDebts'
import AdminWeekBills from './pages/AdminWeekBills'
import AdminBonchonWeekBills from './pages/AdminBonchonWeekBills'
import AdminBonchonEmployees from './pages/AdminBonchonEmployees'
import AdminBonchonEmployeeDetail from './pages/AdminBonchonEmployeeDetail'
import AdminFeatureSettings from './pages/AdminFeatureSettings'

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
            <Route path="/admin/today-bills" element={<AdminTodayBills />} />
            <Route path="/admin/week-bills" element={<AdminWeekBills />} />
            <Route path="/admin/employees" element={<AdminEmployees />} />
            <Route path="/admin/employees/:uid" element={<AdminEmployeeDetail />} />
            <Route path="/admin/bonchon/week-bills" element={<AdminBonchonWeekBills />} />
            <Route path="/admin/bonchon/employees" element={<AdminBonchonEmployees />} />
            <Route path="/admin/bonchon/employees/:uid" element={<AdminBonchonEmployeeDetail />} />
            <Route path="/admin/commission" element={<AdminCommission />} />
            <Route path="/admin/commission/enter" element={<AdminCommissionEnter />} />
            <Route path="/admin/commission/history" element={<AdminCommissionHistory />} />
            <Route path="/admin/boss-debts" element={<AdminBossDebts />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/settings/data" element={<AdminFeatureSettings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/" element={<EmployeeHome />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </>
  )
}
