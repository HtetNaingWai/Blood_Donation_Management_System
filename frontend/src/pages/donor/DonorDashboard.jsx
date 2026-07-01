import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import donorService, { emptyDonorDashboard } from '../../services/donorService'
import { logout } from '../../services/authService'
import { getStoredUser } from '../../services/authStorage'

const sidebarItems = [
  { label: 'Dashboard', icon: '⌘' },
  { label: 'Profile', icon: '◌' },
  { label: 'Donations', icon: '◔' },
  { label: 'Requests', icon: '✦' },
  { label: 'Map', icon: '⌖' },
  { label: 'Notifications', icon: '🔔' },
  { label: 'Settings', icon: '⚙' },
]

function barHeight(value, maxValue) {
  if (!maxValue) {
    return 16
  }

  return Math.max(16, Math.round((value / maxValue) * 70))
}

function formatAvailability(status) {
  return status === 'available' ? 'Available to Donate' : 'Unavailable'
}

function DonorDashboard() {
  const navigate = useNavigate()
  const storedUser = getStoredUser()
  const [activeSection, setActiveSection] = useState('Dashboard')
  const [dashboard, setDashboard] = useState(emptyDonorDashboard)
  const [notifications, setNotifications] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [availabilitySaving, setAvailabilitySaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const data = await donorService.getDashboard()

        if (!isMounted) {
          return
        }

        setDashboard({
          ...emptyDonorDashboard,
          ...data,
          summary: {
            ...emptyDonorDashboard.summary,
            ...(data?.summary || {}),
          },
          donation_trends: data?.donation_trends || [],
          nearby_requests: data?.nearby_requests || [],
          donation_history: data?.donation_history || [],
          notifications: data?.notifications || [],
        })
        setNotifications(data?.notifications || [])
      } catch {
        if (isMounted) {
          setError('Unable to load donor dashboard right now.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const currentUser = dashboard.user || storedUser
  const donor = currentUser?.donor
  const donorName = currentUser?.name?.split(' ')[0] || 'Donor'
  const bloodGroup = dashboard.summary.blood_group || donor?.blood_type || 'Unknown'
  const isAvailable = dashboard.summary.availability_status === 'available'
  const maxTrendValue = Math.max(...dashboard.donation_trends.map((item) => item.value || 0), 0)

  const filteredRequests = useMemo(() => {
    if (!searchTerm.trim()) {
      return dashboard.nearby_requests
    }

    const query = searchTerm.toLowerCase()

    return dashboard.nearby_requests.filter((request) =>
      [request.hospital, request.needed, request.urgency]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    )
  }, [dashboard.nearby_requests, searchTerm])

  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) {
      return dashboard.donation_history
    }

    const query = searchTerm.toLowerCase()

    return dashboard.donation_history.filter((item) =>
      [item.hospital, item.blood_group, item.status, item.date]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    )
  }, [dashboard.donation_history, searchTerm])

  const statCards = [
    { label: 'Total Donations', value: dashboard.summary.total_donations },
    { label: 'Lives Saved', value: dashboard.summary.lives_saved },
    { label: 'Pending Requests', value: dashboard.summary.pending_requests },
    { label: 'Last Donation', value: dashboard.summary.last_donation_date || 'No record yet' },
  ]

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  async function handleAvailabilityToggle() {
    const nextStatus = isAvailable ? 'unavailable' : 'available'
    setAvailabilitySaving(true)

    try {
      const data = await donorService.updateAvailability(nextStatus)
      const nextUser = data?.user || currentUser

      setDashboard((previous) => ({
        ...previous,
        user: nextUser,
        summary: {
          ...previous.summary,
          availability_status: nextUser?.donor?.availability_status || nextStatus,
        },
      }))
    } catch {
      setError('Unable to update your donation availability right now.')
    } finally {
      setAvailabilitySaving(false)
    }
  }

  function renderPlaceholder(title, message) {
    return (
      <section className="donor-placeholder">
        <div className="donor-placeholder__card">
          <div>
            <h2>{title}</h2>
            <p>{message}</p>
          </div>
        </div>
      </section>
    )
  }

  function renderDashboard() {
    return (
      <>
        <section className="donor-hero">
          <div>
            <h1>Welcome back, {donorName}!</h1>
            <div className="donor-hero__badges">
              <span className="donor-pill donor-pill--blood">{bloodGroup}</span>
              <span className={`donor-pill ${isAvailable ? 'donor-pill--available' : 'donor-pill--muted'}`}>
                {formatAvailability(dashboard.summary.availability_status)}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={`donor-toggle${isAvailable ? ' donor-toggle--active' : ''}`}
            onClick={handleAvailabilityToggle}
            disabled={availabilitySaving}
          >
            <span>{availabilitySaving ? 'Saving...' : 'Blood Availability Toggle'}</span>
            <span className="donor-toggle__track">
              <span className="donor-toggle__thumb" />
            </span>
          </button>
        </section>

        <section className="donor-stats">
          {statCards.map((card) => (
            <article className="donor-stat-card" key={card.label}>
              <span>{card.label}</span>
              <strong>{loading ? '...' : card.value}</strong>
            </article>
          ))}

          <article className="donor-stat-card donor-stat-card--chart">
            <div className="donor-stat-card__header">
              <div>
                <strong>Donation Trends</strong>
                <small>Last 6 Months</small>
              </div>
            </div>
            <div className="donor-chart" aria-hidden="true">
              {(dashboard.donation_trends.length ? dashboard.donation_trends : [{ label: 'Now', value: 0 }]).map((item) => (
                <span
                  key={item.label}
                  style={{ height: `${barHeight(item.value || 0, maxTrendValue)}px` }}
                  title={`${item.label}: ${item.value || 0}`}
                />
              ))}
            </div>
          </article>
        </section>

        <section className="donor-grid">
          <div className="donor-grid__main">
            <section className="donor-panel">
              <div className="donor-panel__header">
                <h2>Nearby Blood Requests</h2>
                <button type="button" onClick={() => setActiveSection('Requests')}>View All</button>
              </div>

              <div className="donor-request-grid">
                {filteredRequests.length ? (
                  filteredRequests.map((request) => (
                    <article className="donor-request-card" key={request.id || `${request.hospital}-${request.needed}`}>
                      <div className="donor-request-card__header">
                        <div>
                          <strong>{request.hospital}</strong>
                          <span>⌖ {request.distance || 'Nearby'}</span>
                        </div>
                        <span className={`donor-request-card__badge donor-request-card__badge--${request.urgency_tone || 'medium'}`}>
                          {request.urgency || 'Open'}
                        </span>
                      </div>

                      <div className="donor-request-card__meta">
                        <div>
                          <small>Needed</small>
                          <strong>{request.needed || 'Unknown'}</strong>
                        </div>
                        <div>
                          <small>Required By</small>
                          <strong>{request.required_by || 'Soon'}</strong>
                        </div>
                      </div>

                      <button type="button" className="donor-request-card__action">
                        Accept Request
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="donor-empty-state">No matching blood requests right now.</div>
                )}
              </div>
            </section>

            <section className="donor-panel donor-panel--table">
              <div className="donor-panel__header">
                <h2>Donation History</h2>
                <span aria-hidden="true">☰</span>
              </div>

              <div className="donor-table-wrap">
                <table className="donor-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Hospital</th>
                      <th>Blood Group</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.length ? (
                      filteredHistory.map((item) => (
                        <tr key={item.id || `${item.date}-${item.hospital}`}>
                          <td>{item.date || 'No date'}</td>
                          <td>{item.hospital || 'Hospital'}</td>
                          <td>
                            <span className="donor-table__group">{item.blood_group || 'Unknown'}</span>
                          </td>
                          <td>
                            <span className={`donor-table__status donor-table__status--${(item.status || 'pending').toLowerCase()}`}>
                              {item.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="donor-table__empty">No donation history available yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="donor-grid__side">
            <section className="donor-panel">
              <div className="donor-panel__header">
                <h2>Eligibility Status</h2>
              </div>
              <div className="donor-eligibility">
                <div className="donor-eligibility__row">
                  <span>Next Donation</span>
                  <strong>
                    {dashboard.summary.days_until_eligible > 0
                      ? `In ${dashboard.summary.days_until_eligible} days`
                      : 'Eligible now'}
                  </strong>
                </div>
                <div className="donor-eligibility__bar">
                  <span style={{ width: `${dashboard.summary.eligibility_progress}%` }} />
                </div>
                <p>
                  {dashboard.summary.next_eligible_date
                    ? `Your next eligible date is ${dashboard.summary.next_eligible_date}.`
                    : 'Keep your donor profile active and you will see your eligibility update here.'}
                </p>
              </div>
            </section>

            <section className="donor-panel donor-panel--notifications">
              <div className="donor-panel__header">
                <h2>Notifications</h2>
                <button type="button" onClick={() => setNotifications([])}>Clear all</button>
              </div>

              <div className="donor-notifications">
                {notifications.length ? (
                  notifications.map((item) => (
                    <article className="donor-notification" key={item.id || item.title}>
                      <div className={`donor-notification__icon donor-notification__icon--${item.tone || 'soft'}`}>
                        {item.tone === 'danger' ? '!' : item.tone === 'success' ? '✓' : '♡'}
                      </div>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.body}</p>
                        <small>{item.age}</small>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="donor-empty-state">No notifications to show.</div>
                )}
              </div>
            </section>

            <section className="donor-referral">
              <h2>Reward Points</h2>
              <p>You currently have {dashboard.summary.reward_points || 0} donor reward points.</p>
              <button type="button">Invite Now</button>
            </section>
          </aside>
        </section>
      </>
    )
  }

  return (
    <div className="donor-shell">
      <aside className="donor-sidebar">
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
                className={`donor-nav__item${activeSection === item.label ? ' donor-nav__item--active' : ''}`}
                onClick={() => setActiveSection(item.label)}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <button type="button" className="donor-logout" onClick={handleLogout}>
          <span aria-hidden="true">⇢</span>
          Logout
        </button>
      </aside>

      <div className="donor-main">
        <header className="donor-topbar">
          <label className="donor-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="text"
              placeholder="Search hospitals or requests..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <div className="donor-topbar__actions">
            <span className="donor-topbar__icon" aria-hidden="true">🔔</span>
            <span className="donor-topbar__icon" aria-hidden="true">?</span>
            <div className="donor-topbar__avatar">{donorName.slice(0, 1)}</div>
          </div>
        </header>

        <main className="donor-content">
          {error ? <p className="donor-error">{error}</p> : null}

          {activeSection === 'Dashboard' && renderDashboard()}
          {activeSection === 'Map' &&
            renderPlaceholder('Donor Map', 'The map section is intentionally blank for now. Once you give me the map API, I can connect hospitals and blood requests here.')}
          {activeSection === 'Profile' &&
            renderPlaceholder('Donor Profile', 'Your donor profile panel will be connected next with editable personal details and donation preferences.')}
          {activeSection === 'Donations' &&
            renderPlaceholder('Donation Records', 'A dedicated donation records screen can be added next using the same live donation history data.')}
          {activeSection === 'Requests' &&
            renderPlaceholder('Blood Requests', 'A full requests page can be added next for filtering, accepting, and tracking blood requests.')}
          {activeSection === 'Notifications' &&
            renderPlaceholder('Notifications Center', 'Your notifications are already live in the dashboard. A full notification center can be added next.')}
          {activeSection === 'Settings' &&
            renderPlaceholder('Donor Settings', 'Settings can be connected next for notification preferences, privacy, and location sharing.')}
        </main>
      </div>
    </div>
  )
}

export default DonorDashboard
