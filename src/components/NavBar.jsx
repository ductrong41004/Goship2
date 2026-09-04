import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function NavBar() {
  const { profile, isAdmin, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [lotteeOpen, setLotteeOpen] = useState(true)
  const [bonchonOpen, setBonchonOpen] = useState(true)
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
        <span className="navbar-title">{isAdmin ? 'GO SHIP' : 'GOSHIP'}</span>
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
              {/* LOTTEE Accordion Group */}
              <div className="drawer-group">
                <div 
                  className={`drawer-group-header ${lotteeOpen ? 'open' : ''}`} 
                  onClick={() => setLotteeOpen(!lotteeOpen)}
                >
                  <span>LOTTEE</span>
                  <span className="caret" style={{ display: 'inline-block' }}>▶</span>
                </div>
                {lotteeOpen && (
                  <div className="drawer-group-items">
                    <NavLink to="/admin" end className="drawer-sub-link" onClick={closeDrawer}>
                      Tổng quan
                    </NavLink>
                    <NavLink to="/admin/week-bills" className="drawer-sub-link" onClick={closeDrawer}>
                      Chi Tiết Bill Tuần
                    </NavLink>
                    <NavLink to="/admin/employees" className="drawer-sub-link" onClick={closeDrawer}>
                      Tổng Tiền Lottee
                    </NavLink>
                  </div>
                )}
              </div>

              {/* BONCHON Accordion Group */}
              <div className="drawer-group" style={{ marginTop: '8px' }}>
                <div 
                  className={`drawer-group-header ${bonchonOpen ? 'open' : ''}`} 
                  onClick={() => setBonchonOpen(!bonchonOpen)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>BONCHON</span>
                    <span style={{
                      fontSize: '9.5px', fontWeight: '800', padding: '1px 6px',
                      borderRadius: '10px', background: 'rgba(245, 158, 11, 0.18)',
                      color: '#b45309', border: '1px solid rgba(245, 158, 11, 0.35)',
                    }}>
                      Sắp ra mắt
                    </span>
                  </div>
                  <span className="caret" style={{ display: 'inline-block' }}>▶</span>
                </div>
                {bonchonOpen && (
                  <div className="drawer-group-items">
                    <NavLink to="/admin/bonchon/week-bills" className="drawer-sub-link" onClick={closeDrawer}>
                      Chi Tiết Bill Tuần
                    </NavLink>
                    <NavLink to="/admin/bonchon/employees" className="drawer-sub-link" onClick={closeDrawer}>
                      Tổng Tiền BONCHON
                    </NavLink>
                  </div>
                )}
              </div>

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

              {/* CÀI ĐẶT Direct Link */}
              <NavLink to="/admin/settings" className="drawer-link" style={{ marginTop: '4px' }} onClick={closeDrawer}>
                Cài đặt
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" end className="drawer-link" onClick={closeDrawer}>
                Thêm bill
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
