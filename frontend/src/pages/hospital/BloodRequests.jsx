import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationDropdown from '../../components/notifications/NotificationDropdown'
import useNotifications from '../../hooks/useNotifications'
import { logout } from '../../services/authService'
import { getStoredUser } from '../../services/authStorage'
import bloodRequestService from '../../services/bloodRequestService'
import chatService from '../../services/chatService'

const sidebarItems = [
  { label: 'Dashboard', icon: '📊', route: '/hospital/dashboard' },
  { label: 'Search Donors', icon: '💉', route: '/hospital/search-donors' },
  { label: 'Blood Requests', icon: '🩸', route: '/hospital/blood-requests' },
  { label: 'Messages', icon: '💬', route: '/messages' },
  { label: 'Notifications', icon: '🔔', route: '/notifications' },
  { label: 'Profile', icon: '👤', route: '/hospital/dashboard?section=Profile' },
]

function formatDateTime(value) {
  if (!value) {
    return 'Recently'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Hospital request tracking page for direct donor requests and current response status.
function BloodRequests() {
  const navigate = useNavigate()
  const storedUser = getStoredUser()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const displayName = storedUser?.hospital?.hospital_name || storedUser?.name || 'Hospital User'
  const {
    notifications,
    unreadNotificationCount,
    notificationsLoading,
    notificationActionLoading,
    markNotificationRead,
  } = useNotifications(storedUser?.id)

  useEffect(() => {
    let isMounted = true

    async function loadRequests() {
      setLoading(true)
      setError('')

      try {
        const data = await bloodRequestService.getHospitalRequests()

        if (!isMounted) {
          return
        }

        setRequests(data.direct_requests || [])
      } catch (loadError) {
        if (isMounted) {
          const apiMessage =
            loadError?.response?.data?.errors
              ? Object.values(loadError.response.data.errors).flat()[0]
              : loadError?.response?.data?.message

          setError(apiMessage || 'Unable to load hospital request tracking right now.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadRequests()

    return () => {
      isMounted = false
    }
  }, [])

  const summary = useMemo(() => ({
    pending: requests.filter((request) => request.status === 'pending').length,
    accepted: requests.filter((request) => request.status === 'accepted').length,
    rejected: requests.filter((request) => request.status === 'rejected').length,
    completed: requests.filter((request) => request.status === 'completed').length,
  }), [requests])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  function handleNotificationRoute(notification) {
    if (notification.conversation_id) {
      navigate(`/messages/${notification.conversation_id}`)
      return
    }

    navigate('/hospital/blood-requests')
  }

  async function handleMessageDonor(request) {
    const donorId = request?.donor_id || request?.donor?.id

    if (!donorId) {
      return
    }

    setError('')

    try {
      const data = await chatService.createConversation({
        donor_id: donorId,
      })

      if (data?.conversation?.id) {
        navigate(`/messages/${data.conversation.id}`)
      }
    } catch (messageError) {
      const apiMessage =
        messageError?.response?.data?.errors
          ? Object.values(messageError.response.data.errors).flat()[0]
          : messageError?.response?.data?.message

      setError(apiMessage || 'Unable to open the donor conversation right now.')
    }
  }

  return (
    <div className="dashboard-shell hospital-shell">
      <aside className="dashboard-sidebar hospital-sidebar">
        <div>
          <div className="hospital-brand">
            <span>BloodLink</span>
            <small>Clinical Portal</small>
          </div>

          <nav className="hospital-nav" aria-label="Hospital">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`hospital-nav__item${item.label === 'Blood Requests' ? ' hospital-nav__item--active' : ''}`}
                onClick={() => navigate(item.route)}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <button type="button" className="hospital-logout" onClick={handleLogout}>
          <span aria-hidden="true">⇢</span>
          Logout
        </button>
      </aside>

      <div className="dashboard-main hospital-main">
        <header className="dashboard-topbar hospital-topbar">
          <label className="hospital-search">
            <span aria-hidden="true">⌕</span>
            <input type="text" value="Blood Requests" readOnly />
          </label>

          <div className="hospital-topbar__actions">
            <NotificationDropdown
              variant="hospital"
              notifications={notifications}
              unreadCount={unreadNotificationCount}
              loading={notificationsLoading}
              actionLoading={notificationActionLoading}
              onMarkAsRead={markNotificationRead}
              onNotificationClick={handleNotificationRoute}
              onViewAll={() => navigate('/notifications')}
            />
            <span className="hospital-topbar__icon" aria-hidden="true">?</span>
            <div className="hospital-topbar__identity">
              <strong>{storedUser?.name || displayName}</strong>
              <small>{displayName}</small>
            </div>
            <div className="hospital-topbar__avatar">{displayName.slice(0, 1)}</div>
          </div>
        </header>

        <main className="dashboard-content hospital-content">
          <section className="portal-page portal-page--hospital">
            <div className="portal-page__header">
              <div>
                <h1>Hospital Blood Requests</h1>
                <p>Track direct donor requests and monitor who has responded.</p>
              </div>
              <button
                type="button"
                className="portal-action-button"
                onClick={() => navigate('/hospital/search-donors')}
              >
                Send new request
              </button>
            </div>

            {error ? <p className="hospital-error">{error}</p> : null}

            <section className="portal-summary-grid">
              <article className="portal-summary-card">
                <strong>{summary.pending}</strong>
                <span>Pending</span>
              </article>
              <article className="portal-summary-card">
                <strong>{summary.accepted}</strong>
                <span>Accepted</span>
              </article>
              <article className="portal-summary-card">
                <strong>{summary.rejected}</strong>
                <span>Rejected</span>
              </article>
              <article className="portal-summary-card">
                <strong>{summary.completed}</strong>
                <span>Completed</span>
              </article>
            </section>

            <section className="portal-request-grid">
              {loading ? (
                <div className="portal-empty-state">Loading hospital requests...</div>
              ) : requests.length ? (
                requests.map((request) => {
                  const donorName = request.donor?.user?.name || 'Selected donor'

                  return (
                    <article className="portal-request-card portal-request-card--hospital" key={request.id}>
                      <div className="portal-request-card__header">
                        <div>
                          <strong>{donorName}</strong>
                          <p>Blood Group: {request.blood_type || 'Unknown'}</p>
                        </div>
                        <span className={`portal-status-badge portal-status-badge--${(request.status || 'pending').toLowerCase()}`}>
                          {request.status || 'pending'}
                        </span>
                      </div>

                      <div className="portal-request-card__meta">
                        <span>Urgency: {request.priority || 'standard'}</span>
                        <span>Request Date: {formatDateTime(request.created_at)}</span>
                      </div>

                      <p className="portal-request-card__message">{request.message || 'No message added for this request.'}</p>

                      <div className="portal-request-card__footer">
                        <span>Units requested: {request.units_needed || 1}</span>
                        <span>
                          {request.status === 'pending'
                            ? 'Waiting for donor response'
                            : request.status === 'accepted'
                              ? 'Donor accepted your request'
                              : request.status === 'rejected'
                                ? 'Donor declined your request'
                                : 'Request updated'}
                        </span>
                      </div>

                      <div className="portal-request-card__actions">
                        <button
                          type="button"
                          className="portal-action-button portal-action-button--ghost"
                          onClick={() => handleMessageDonor(request)}
                        >
                          Message Donor
                        </button>
                      </div>
                    </article>
                  )
                })
              ) : (
                <div className="portal-empty-state">You have not sent any direct donor requests yet.</div>
              )}
            </section>
          </section>
        </main>
      </div>
    </div>
  )
}

export default BloodRequests
