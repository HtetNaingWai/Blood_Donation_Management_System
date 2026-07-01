import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logout } from '../services/authService'
import { getStoredUser } from '../services/authStorage'

const navigationItems = [
  { to: '/admin', label: 'System Overview', icon: '▣' },
  { to: '/admin/donors', label: 'Donor Management', icon: '◔' },
  { to: '/admin/hospitals', label: 'Hospital Network', icon: '✚' },
  { to: '/admin/hospitals/pending', label: 'Pending Approvals', icon: '◌' },
  { to: '/admin/patients', label: 'Patient Care', icon: '⌕' },
  { to: '/admin/blood-requests', label: 'Blood Requests', icon: '⚠' },
  { to: '/admin/reports', label: 'Reports', icon: '▤' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: '⟲' },
]

const pageTitles = {
  '/admin': 'Dashboard',
  '/admin/donors': 'Donor Management',
  '/admin/hospitals': 'Hospital Network',
  '/admin/hospitals/pending': 'Pending Hospital Approvals',
  '/admin/patients': 'Patient Management',
  '/admin/blood-requests': 'Blood Requests',
  '/admin/reports': 'Reports',
  '/admin/audit-logs': 'Audit Logs',
}

function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = getStoredUser()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const adminName = currentUser?.name || 'System Admin'
  const adminEmail = currentUser?.email || 'admin@bloodlink.local'
  const title = pageTitles[location.pathname] || 'Admin Console'
  const initials = useMemo(() => {
    return adminName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [adminName])

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand__mark">+</span>
          <span>BloodLink</span>
        </div>

        <div className="admin-profile-card">
          <div className="admin-avatar">{initials}</div>
          <div>
            <strong>{adminName}</strong>
            <span>{adminEmail}</span>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                `admin-nav__link${isActive ? ' admin-nav__link--active' : ''}`
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button className="admin-logout" type="button" onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? 'Signing out...' : 'Logout'}
        </button>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1>{title}</h1>
            <p>LifeBlood administration console</p>
          </div>

          <div className="admin-topbar__actions">
            <label className="admin-search">
              <span aria-hidden="true">⌕</span>
              <input type="text" placeholder="Search system..." />
            </label>
            <span className="admin-topbar__icon" aria-hidden="true">🔔</span>
            <span className="admin-topbar__icon" aria-hidden="true">?</span>
            <div className="admin-topbar__user">{initials}</div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
