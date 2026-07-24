import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationDropdown from '../../components/notifications/NotificationDropdown'
import useNotifications from '../../hooks/useNotifications'
import { logout } from '../../services/authService'
import { getStoredUser } from '../../services/authStorage'
import bloodRequestService from '../../services/bloodRequestService'
import chatService from '../../services/chatService'

const sidebarItems = [
  { label: 'Dashboard', icon: '📊', route: '/donor/dashboard' },
  { label: 'Donations', icon: '💉', route: '/donor/dashboard' },
  { label: 'Blood Requests', icon: '🩸', route: '/donor/blood-requests' },
  { label: 'Search Hospital', icon: '🏨', route: '/donor/dashboard' },
  { label: 'Messages', icon: '💬', route: '/messages' },
  { label: 'Notifications', icon: '🔔', route: '/notifications' },
  { label: 'Profile', icon: '👤', route: '/donor/dashboard' },
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

// Donor request inbox for direct hospital requests that can be accepted or rejected.
function BloodRequests() {
  const navigate = useNavigate()
  const storedUser = getStoredUser()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState('')
  const donorName = storedUser?.name?.split(' ')[0] || 'Donor'
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
        const data = await bloodRequestService.getDonorRequests()

        if (!isMounted) {
          return
        }

        setRequests(data.received_requests || [])
      } catch (loadError) {
        if (isMounted) {
          const apiMessage =
            loadError?.response?.data?.errors
              ? Object.values(loadError.response.data.errors).flat()[0]
              : loadError?.response?.data?.message

          setError(apiMessage || 'Unable to load donor blood requests right now.')
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

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'pending').length,
    [requests],
  )

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  async function handleAction(requestId, action) {
    setActionLoadingId(`${action}-${requestId}`)
    setError('')

    try {
      const data = action === 'accept'
        ? await bloodRequestService.acceptRequest(requestId)
        : await bloodRequestService.rejectRequest(requestId)

      setRequests(data?.received_requests || [])
    } catch (actionError) {
      const apiMessage =
        actionError?.response?.data?.errors
          ? Object.values(actionError.response.data.errors).flat()[0]
          : actionError?.response?.data?.message

      setError(apiMessage || `Unable to ${action} this request right now.`)
    } finally {
      setActionLoadingId('')
    }
  }

  async function handleMessageHospital(request) {
    const hospitalId = request?.hospital_id || request?.hospital?.id

    if (!hospitalId) {
      return
    }

    setError('')

    try {
      const data = await chatService.createConversation({
        hospital_id: hospitalId,
      })

      if (data?.conversation?.id) {
        navigate(`/messages/${data.conversation.id}`)
      }
    } catch (messageError) {
      const apiMessage =
        messageError?.response?.data?.errors
          ? Object.values(messageError.response.data.errors).flat()[0]
          : messageError?.response?.data?.message

      setError(apiMessage || 'Unable to open the hospital conversation right now.')
    }
  }

  function handleNotificationRoute(notification) {
    if (notification.conversation_id) {
      navigate(`/messages/${notification.conversation_id}`)
      return
    }

    navigate('/donor/blood-requests')
  }

  return (
    <div className="dashboard-shell donor-shell">
      <aside className="dashboard-sidebar donor-sidebar">
        <div>
          <div className="donor-brand">
            <span>BloodLink</span>
            <small>Clinical Portal</small>
          </div>

          <nav className="donor-nav" aria-label="Donor">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`donor-nav__item${item.label === 'Blood Requests' ? ' donor-nav__item--active' : ''}`}
                onClick={() => navigate(item.route)}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <button type="button" className="donor-logout" onClick={handleLogout}>
          <span aria-hidden="true">⇨</span>
          Logout
        </button>
      </aside>

      <div className="dashboard-main donor-main">
        <header className="dashboard-topbar donor-topbar">
          <label className="donor-search">
            <span aria-hidden="true">🔎</span>
            <input type="text" value="Blood Requests" readOnly />
          </label>

          <div className="donor-topbar__actions">
            <NotificationDropdown
              variant="donor"
              notifications={notifications}
              unreadCount={unreadNotificationCount}
              loading={notificationsLoading}
              actionLoading={notificationActionLoading}
              onMarkAsRead={markNotificationRead}
              onNotificationClick={handleNotificationRoute}
              onViewAll={() => navigate('/notifications')}
            />
            <div className="donor-topbar__avatar">{donorName.slice(0, 1)}</div>
          </div>
        </header>

        <main className="dashboard-content donor-content">
          <section className="portal-page">
            <div className="portal-page__header">
              <div>
                <h1>Received Blood Requests</h1>
                <p>Review direct hospital requests and respond from one place.</p>
              </div>
              <div className="portal-summary-chip">{pendingCount} pending</div>
            </div>

            {error ? <p className="donor-error">{error}</p> : null}

            <section className="portal-request-grid">
              {loading ? (
                <div className="portal-empty-state">Loading blood requests...</div>
              ) : requests.length ? (
                requests.map((request) => {
                  const loadingKeyAccept = `accept-${request.id}`
                  const loadingKeyReject = `reject-${request.id}`
                  const hospitalName = request.hospital?.hospital_name || request.hospital?.user?.name || 'Hospital'

                  return (
                    <article className="portal-request-card" key={request.id}>
                      <div className="portal-request-card__header">
                        <div>
                          <strong>{hospitalName}</strong>
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

                      <p className="portal-request-card__message">{request.message || 'No extra note from the hospital.'}</p>

                      <div className="portal-request-card__actions">
                        <button
                          type="button"
                          className="portal-action-button"
                          onClick={() => handleAction(request.id, 'accept')}
                          disabled={request.status !== 'pending' || actionLoadingId === loadingKeyAccept || actionLoadingId === loadingKeyReject}
                        >
                          {actionLoadingId === loadingKeyAccept ? 'Accepting...' : 'Accept Request'}
                        </button>

                        <button
                          type="button"
                          className="portal-action-button portal-action-button--ghost"
                          onClick={() => handleAction(request.id, 'reject')}
                          disabled={request.status !== 'pending' || actionLoadingId === loadingKeyAccept || actionLoadingId === loadingKeyReject}
                        >
                          {actionLoadingId === loadingKeyReject ? 'Rejecting...' : 'Reject Request'}
                        </button>

                        <button
                          type="button"
                          className="portal-action-button portal-action-button--ghost"
                          onClick={() => handleMessageHospital(request)}
                        >
                          Message Hospital
                        </button>
                      </div>
                    </article>
                  )
                })
              ) : (
                <div className="portal-empty-state">No direct blood requests have been sent to you yet.</div>
              )}
            </section>
          </section>
        </main>
      </div>
    </div>
  )
}

export default BloodRequests
