import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BRANCH_NAME } from '../firebase'

export default function NavBar() {
  const { profile, isAdmin, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [commissionOpen, setCommissionOpen] = useState(true)

  const toggleDrawer = () => setIsOpen(!isOpen)
  const closeDrawer = () => setIsOpen(false)

  return (
    <>
      <header className="navbar">
        {isAdmin ? (
          <button className="navbar-toggle-btn" onClick={toggleDrawer} aria-label="Toggle menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        ) : (
          <div style={{ width: 8 }} />
        )}
        <span className="navbar-title">{BRANCH_NAME ? `GO SHIP (${BRANCH_NAME})` : (isAdmin ? 'GO SHIP' : 'GOSHIP')}</span>
        <span className="navbar-right-user">{profile?.name}</span>
      </header>

      {/* Drawer Overlay */}
      <div className={`drawer-backdrop ${isOpen ? 'open' : ''}`} onClick={closeDrawer} />

      {/* Drawer Panel */}
      <div className={`drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>DANH SÁCH</h3>
          <button className="drawer-close-btn" onClick={closeDrawer}>&times;</button>
        </div>

        <div className="drawer-content">
          {isAdmin ? (
            <>
              {/* TỔNG QUAN Direct Link */}
              <NavLink to="/admin" end className="drawer-link" onClick={closeDrawer}>
                📊 Tổng quan
              </NavLink>

              {/* HOA HỒNG Accordion Group */}
              <div className="drawer-group" style={{ marginTop: '8px' }}>
                <div 
                  className={`drawer-group-header ${commissionOpen ? 'open' : ''}`} 
                  onClick={() => setCommissionOpen(!commissionOpen)}
                >
                  <span>Hoa hồng</span>
                  <span className="caret" style={{ display: 'inline-block' }}>▶</span>
                </div>
                {commissionOpen && (
                  <div className="drawer-group-items">
                    <NavLink to="/admin/commission/enter" className="drawer-sub-link" onClick={closeDrawer}>
                      Nhập Hoa Hồng
                    </NavLink>
                    <NavLink to="/admin/commission" end className="drawer-sub-link" onClick={closeDrawer}>
                      Xếp hạng doanh thu
                    </NavLink>
                    <NavLink to="/admin/commission/history" className="drawer-sub-link" onClick={closeDrawer}>
                      Lịch sử hoa hồng
                    </NavLink>
                    <NavLink to="/admin/boss-debts" className="drawer-sub-link" onClick={closeDrawer}>
                      Xem tiền nợ Nhân Viên
                    </NavLink>
                  </div>
                )}
              </div>

              {/* CÀI ĐẶT DỮ LIỆU Direct Link */}
              <NavLink to="/admin/settings/data" className="drawer-link" style={{ marginTop: '8px' }} onClick={closeDrawer}>
                ⚙️ Cài Đặt Dữ Liệu
              </NavLink>

              {/* QUẢN LÍ NHÂN VIÊN Direct Link */}
              <NavLink to="/admin/settings" className="drawer-link" style={{ marginTop: '4px' }} onClick={closeDrawer}>
                👥 Quản lí nhân viên
              </NavLink>

              {/* QUẢN LÍ TIỀN CỌC NV Direct Link */}
              <NavLink to="/admin/deposits" className="drawer-link" style={{ marginTop: '4px' }} onClick={closeDrawer}>
                🎒 Quản lí tiền cọc NV
              </NavLink>

              {/* BẢNG NỘI QUY Direct Link */}
              <NavLink to="/admin/rules" className="drawer-link" style={{ marginTop: '4px' }} onClick={closeDrawer}>
                📜 Bảng nội quy
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" end className="drawer-link" onClick={closeDrawer}>
                Thêm bill
              </NavLink>
              <NavLink to="/rules" className="drawer-link" style={{ marginTop: '4px' }} onClick={closeDrawer}>
                📜 Bảng nội quy
              </NavLink>
            </>
          )}
        </div>

        <div className="drawer-footer">
          <span className="user-name">{profile?.name}</span>
          <button className="logout-btn" onClick={() => { closeDrawer(); logout(); }}>
            Đăng xuất
          </button>
        </div>
      </div>
    </>
  )
}
