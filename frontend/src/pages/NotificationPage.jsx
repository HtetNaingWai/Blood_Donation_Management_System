import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationDropdown from '../components/notifications/NotificationDropdown'
import useNotifications from '../hooks/useNotifications'
import { logout } from '../services/authService'
import { getStoredUser } from '../services/authStorage'

const donorSidebarItems = [
  { label: 'Dashboard', icon: '📊', route: '/donor/dashboard' },
  { label: 'Donations', icon: '💉', route: '/donor/dashboard' },
  { label: 'Blood Requests', icon: '🩸', route: '/donor/blood-requests' },
  { label: 'Search Hospital', icon: '🏨', route: '/donor/dashboard' },
  { label: 'Messages', icon: '💬', route: '/messages' },
  { label: 'Notifications', icon: '🔔', route: '/notifications' },
  { label: 'Profile', icon: '👤', route: '/donor/dashboard' },
]

const hospitalSidebarItems = [
  { label: 'Dashboard', icon: '📊', route: '/hospital/dashboard' },
  { label: 'Search Donors', icon: '💉', route: '/hospital/search-donors' },
  { label: 'Blood Requests', icon: '🩸', route: '/hospital/blood-requests' },
  { label: 'Messages', icon: '💬', route: '/messages' },
  { label: 'Notifications', icon: '🔔', route: '/notifications' },
  { label: 'Profile', icon: '👤', route: '/hospital/dashboard?section=Profile' },
]

function splitNotifications(notifications) {
  return {
    unread: notifications.filter((notification) => !notification.is_read),
    read: notifications.filter((notification) => notification.is_read),
  }
}

// Shared notification center for donor and hospital roles.
function NotificationPage() {
  const navigate = useNavigate()
  const storedUser = getStoredUser()
  const role = storedUser?.role === 'hospital' ? 'hospital' : 'donor'
  const sidebarItems = role === 'hospital' ? hospitalSidebarItems : donorSidebarItems
  const displayName = role === 'hospital'
    ? storedUser?.hospital?.hospital_name || storedUser?.name || 'Hospital User'
    : storedUser?.name?.split(' ')[0] || 'Donor'
  const {
    notifications,
    unreadNotificationCount,
    notificationsLoading,
    notificationActionLoading,
    notificationError,
    markNotificationRead,
    markAllNotificationsRead,
  } = useNotifications(storedUser?.id)

  const grouped = useMemo(() => splitNotifications(notifications), [notifications])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  function handleNotificationRoute(notification) {
    if (notification.conversation_id) {
      navigate(`/messages/${notification.conversation_id}`)
      return
    }

    if (role === 'hospital') {
      navigate('/hospital/blood-requests')
      return
    }

    navigate('/donor/blood-requests')
  }

  function renderNotificationCard(notification) {
    return (
      <article
        className={`portal-notification-card${notification.is_read ? '' : ' portal-notification-card--unread'}`}
        key={notification.id || `${notification.title}-${notification.created_at}`}
      >
        <div className="portal-notification-card__body">
          <strong>{notification.title}</strong>
          <p>{notification.body}</p>
          <small>{notification.age}</small>
        </div>

        <div className="portal-notification-card__actions">
          {!notification.is_read ? (
            <button
              type="button"
              className="portal-action-button"
              onClick={() => markNotificationRead(notification.id)}
              disabled={notificationActionLoading === notification.id}
            >
              {notificationActionLoading === notification.id ? 'Saving...' : 'Mark as read'}
            </button>
          ) : (
            <span className="portal-notification-card__status">Read</span>
          )}

          <button
            type="button"
            className="portal-action-button portal-action-button--ghost"
            onClick={() => handleNotificationRoute(notification)}
          >
            View request
          </button>
        </div>
      </article>
    )
  }

  return (
    <div className={`dashboard-shell ${role}-shell`}>
      <aside className={`dashboard-sidebar ${role}-sidebar`}>
        <div>
          <div className={`${role}-brand`}>
            <span>BloodLink</span>
            <small>Clinical Portal</small>
          </div>

          <nav className={`${role}-nav`} aria-label={role === 'hospital' ? 'Hospital' : 'Donor'}>
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`${role}-nav__item${item.label === 'Notifications' ? ` ${role}-nav__item--active` : ''}`}
                onClick={() => navigate(item.route)}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <button type="button" className={`${role}-logout`} onClick={handleLogout}>
          <span aria-hidden="true">{role === 'hospital' ? '⇢' : '⇨'}</span>
          Logout
        </button>
      </aside>

      <div className={`dashboard-main ${role}-main`}>
        <header className={`dashboard-topbar ${role}-topbar`}>
          <label className={role === 'hospital' ? 'hospital-search' : 'donor-search'}>
            <span aria-hidden="true">{role === 'hospital' ? '⌕' : '🔎'}</span>
            <input type="text" value="Notifications Center" readOnly />
          </label>

          <div className={`${role}-topbar__actions`}>
            <NotificationDropdown
              variant={role}
              notifications={notifications}
              unreadCount={unreadNotificationCount}
              loading={notificationsLoading}
              actionLoading={notificationActionLoading}
              onMarkAsRead={markNotificationRead}
              onNotificationClick={handleNotificationRoute}
              onViewAll={() => navigate('/notifications')}
            />
            {role === 'hospital' ? <span className="hospital-topbar__icon" aria-hidden="true">?</span> : null}
            {role === 'hospital' ? (
              <div className="hospital-topbar__identity">
                <strong>{storedUser?.name || displayName}</strong>
                <small>{displayName}</small>
              </div>
            ) : null}
            <div className={`${role}-topbar__avatar`}>{displayName.slice(0, 1)}</div>
          </div>
        </header>

        <main className={`dashboard-content ${role}-content`}>
          <section className={`portal-page ${role === 'hospital' ? 'portal-page--hospital' : ''}`}>
            <div className="portal-page__header">
              <div>
                <h1>Notifications Center</h1>
                <p>Review new blood requests, donor responses, and message activity.</p>
              </div>
              <button
                type="button"
                className="portal-action-button"
                onClick={markAllNotificationsRead}
                disabled={!notifications.length || unreadNotificationCount === 0 || notificationActionLoading === 'all'}
              >
                {notificationActionLoading === 'all' ? 'Updating...' : 'Mark all as read'}
              </button>
            </div>

            {notificationError ? <p className={`${role}-error`}>{notificationError}</p> : null}

            <section className="portal-panel">
              <div className="portal-panel__header">
                <h2>Unread Notifications</h2>
                <span>{grouped.unread.length}</span>
              </div>
              <div className="portal-notification-list">
                {notificationsLoading && !notifications.length ? (
                  <div className="portal-empty-state">Loading notifications...</div>
                ) : grouped.unread.length ? (
                  grouped.unread.map(renderNotificationCard)
                ) : (
                  <div className="portal-empty-state">No unread notifications right now.</div>
                )}
              </div>
            </section>

            <section className="portal-panel">
              <div className="portal-panel__header">
                <h2>Read Notifications</h2>
                <span>{grouped.read.length}</span>
              </div>
              <div className="portal-notification-list">
                {grouped.read.length ? (
                  grouped.read.map(renderNotificationCard)
                ) : (
                  <div className="portal-empty-state">Read notifications will appear here.</div>
                )}
              </div>
            </section>
          </section>
        </main>
      </div>
    </div>
  )
}

export default NotificationPage
