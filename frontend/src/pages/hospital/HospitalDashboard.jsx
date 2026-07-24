import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import LocationPicker from '../../components/map/LocationPicker'
import hospitalService, { emptyHospitalDashboard } from '../../services/hospitalService'
import { logout } from '../../services/authService'
import { getStoredToken, getStoredUser, getUserHomeRoute } from '../../services/authStorage'
import useNotifications from '../../hooks/useNotifications'

const sidebarItems = [
  { label: 'Dashboard', icon: '📊' },
  { label: 'Search Donors', icon: '💉', route: '/hospital/search-donors' },
  { label: 'Blood Requests', icon: '🩸', route: '/hospital/blood-requests' },
  { label: 'Messages', icon: '💬', route: '/messages' },
  { label: 'Notifications', icon: '🔔', route: '/notifications' },
  { label: 'Profile', icon: '👤' },
]

const donorMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

// Main hospital portal for emergency requests, donor responses, profile updates, and donation confirmation.
function HospitalDashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const storedUser = getStoredUser()
  const [activeSection, setActiveSection] = useState(searchParams.get('section') || 'Dashboard')
  const [dashboard, setDashboard] = useState(emptyHospitalDashboard)
  const [searchTerm, setSearchTerm] = useState('')
  const [requestFilter, setRequestFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [responseMessage, setResponseMessage] = useState('')
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [responseActionLoadingId, setResponseActionLoadingId] = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [requestForm, setRequestForm] = useState({
    blood_type: '',
    units_required: '',
    urgency: 'standard',
  })
  const [profileForm, setProfileForm] = useState({
    hospital_name: '',
    license_number: '',
    email: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
  })
  const currentUser = dashboard.user || storedUser
  const hospital = dashboard.hospital || currentUser?.hospital
  const {
    notifications,
    unreadNotificationCount,
    notificationsLoading,
    notificationActionLoading,
    notificationError,
    markNotificationRead: handleMarkNotificationRead,
    markAllNotificationsRead: handleMarkAllNotificationsRead,
  } = useNotifications(currentUser?.id || storedUser?.id)

  useEffect(() => {
    setActiveSection(searchParams.get('section') || 'Dashboard')
  }, [searchParams])

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        // Load hospital statistics, active requests, donor responses, and map data in one dashboard request.
        const data = await hospitalService.getDashboard()

        if (!isMounted) {
          return
        }

        setDashboard({
          ...emptyHospitalDashboard,
          ...data,
          stats: {
            ...emptyHospitalDashboard.stats,
            ...(data?.stats || {}),
          },
          active_requests: data?.active_requests || [],
          request_responses: data?.request_responses || [],
          recent_log: data?.recent_log || [],
          donor_heatmap: {
            ...emptyHospitalDashboard.donor_heatmap,
            ...(data?.donor_heatmap || {}),
          },
          matches_in_route: data?.matches_in_route || [],
        })
      } catch {
        if (isMounted) {
          setError('Unable to load the hospital dashboard right now.')
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

  useEffect(() => {
    if (notificationError) {
      setError(notificationError)
    }
  }, [notificationError])

  useEffect(() => {
    function syncSessionAccess() {
      const token = getStoredToken()
      const user = getStoredUser()

      if (!token || !user) {
        navigate('/login', { replace: true })
        return
      }

      const nextRoute = getUserHomeRoute(user)

      if (user.role !== 'hospital' || nextRoute !== '/hospital/dashboard') {
        navigate(nextRoute, { replace: true })
      }
    }

    window.addEventListener('storage', syncSessionAccess)

    return () => {
      window.removeEventListener('storage', syncSessionAccess)
    }
  }, [navigate])

  const doctorName = currentUser?.name || hospital?.hospital_name || 'Hospital User'
  const hospitalTitle = hospital?.hospital_name || currentUser?.name || 'Approved Hospital'
  const matchRate = dashboard.stats.match_rate || 0
  const mapCenter = [
    dashboard.donor_heatmap.center?.latitude || 16.8409,
    dashboard.donor_heatmap.center?.longitude || 96.1735,
  ]

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return dashboard.active_requests.filter((request) => {
      const matchesSearch = !query || [
        request.request_code,
        request.blood_type,
        request.status,
        request.priority,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))

      if (!matchesSearch) {
        return false
      }

      if (requestFilter === 'urgent') {
        return ['urgent', 'critical', 'high'].includes((request.priority || '').toLowerCase())
      }

      return true
    })
  }, [dashboard.active_requests, requestFilter, searchTerm])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    setProfileForm({
      hospital_name: hospital?.hospital_name || currentUser.name || '',
      license_number: hospital?.license_number || '',
      email: currentUser.email || '',
      phone: currentUser.phone || '',
      address: hospital?.address || '',
      latitude: hospital?.latitude ?? '',
      longitude: hospital?.longitude ?? '',
    })
  }, [currentUser, hospital])

  async function reloadDashboard() {
    const data = await hospitalService.getDashboard()
    setDashboard({
      ...emptyHospitalDashboard,
      ...data,
      stats: {
        ...emptyHospitalDashboard.stats,
        ...(data?.stats || {}),
      },
      active_requests: data?.active_requests || [],
      request_responses: data?.request_responses || [],
      recent_log: data?.recent_log || [],
      donor_heatmap: {
        ...emptyHospitalDashboard.donor_heatmap,
        ...(data?.donor_heatmap || {}),
      },
      matches_in_route: data?.matches_in_route || [],
    })
  }

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  function handleSectionChange(item) {
    if (item.route) {
      navigate(item.route)
      return
    }

    setActiveSection(item.label)

    if (item.label === 'Dashboard') {
      setSearchParams({})
      return
    }

    setSearchParams({ section: item.label })
  }

  function updateRequestForm(field, value) {
    setRequestForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateProfileField(field, value) {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleProfileLocationChange(location) {
    setProfileForm((current) => ({
      ...current,
      latitude: location.latitude,
      longitude: location.longitude,
    }))
  }

  async function handleBroadcastRequest(event) {
    event.preventDefault()
    setSubmittingRequest(true)
    setRequestMessage('')
    setResponseMessage('')
    setError('')

    try {
      // Create a new hospital emergency blood request that will appear in donor portals.
      const response = await hospitalService.createRequest({
        blood_type: requestForm.blood_type,
        units_required: Number(requestForm.units_required),
        urgency: requestForm.urgency,
      })

      setRequestMessage(response?.message || 'Emergency request broadcast successfully.')
      setRequestForm({
        blood_type: '',
        units_required: '',
        urgency: 'standard',
      })
      setActiveSection('Blood Requests')
      await reloadDashboard()
    } catch (requestError) {
      const apiMessage =
        requestError?.response?.data?.errors
          ? Object.values(requestError.response.data.errors).flat()[0]
          : requestError?.response?.data?.message

      setError(apiMessage || 'Unable to broadcast the request right now.')
    } finally {
      setSubmittingRequest(false)
    }
  }

  async function handleCompleteResponse(responseId) {
    setResponseActionLoadingId(responseId)
    setResponseMessage('')
    setError('')

    try {
      // Confirm that the donor has completed the donation so backend records can be finalized.
      const data = await hospitalService.completeResponse(responseId)

      setResponseMessage(data?.message || 'Donation confirmed successfully.')
      await reloadDashboard()
    } catch (requestError) {
      const apiMessage =
        requestError?.response?.data?.errors
          ? Object.values(requestError.response.data.errors).flat()[0]
          : requestError?.response?.data?.message

      setError(apiMessage || 'Unable to confirm this donation right now.')
    } finally {
      setResponseActionLoadingId(null)
    }
  }

  async function handleProfileSave(event) {
    event.preventDefault()
    setProfileSaving(true)
    setProfileMessage('')
    setError('')

    try {
      // Save hospital contact and location details used across dashboards and donor search results.
      const data = await hospitalService.updateProfile({
        hospital_name: profileForm.hospital_name,
        license_number: profileForm.license_number,
        email: profileForm.email,
        phone: profileForm.phone,
        address: profileForm.address,
        latitude: profileForm.latitude || null,
        longitude: profileForm.longitude || null,
      })

      setDashboard((previous) => ({
        ...previous,
        user: data.user,
        hospital: data.hospital || data.user?.hospital || previous.hospital,
      }))
      setProfileMessage('Hospital profile updated successfully.')
    } catch (profileError) {
      const apiMessage =
        profileError?.response?.data?.errors
          ? Object.values(profileError.response.data.errors).flat()[0]
          : profileError?.response?.data?.message

      setError(apiMessage || 'Unable to save the hospital profile right now.')
    } finally {
      setProfileSaving(false)
    }
  }

  function renderPlaceholder(title, message) {
    return (
      <section className="hospital-placeholder">
        <div className="hospital-placeholder__card">
          <div>
            <h2>{title}</h2>
            <p>{message}</p>
          </div>
        </div>
      </section>
    )
  }

  function renderNotifications() {
    return (
      <section className="hospital-panel hospital-panel--notifications">
        <div className="hospital-panel__header">
          <div>
            <h2>Hospital Notifications</h2>
            <p>{unreadNotificationCount} unread message updates</p>
          </div>
          <button
            type="button"
            className="hospital-notification-action"
            onClick={handleMarkAllNotificationsRead}
            disabled={!notifications.length || unreadNotificationCount === 0 || notificationActionLoading === 'all'}
          >
            {notificationActionLoading === 'all' ? 'Updating...' : 'Mark all read'}
          </button>
        </div>

        <div className="hospital-notifications">
          {notificationsLoading && !notifications.length ? (
            <div className="hospital-empty-state">Loading notifications...</div>
          ) : notifications.length ? (
            notifications.map((item) => (
              <article
                className={`hospital-notification${item.is_read ? '' : ' hospital-notification--unread'}`}
                key={item.id || item.title}
              >
                <div className={`hospital-notification__icon hospital-notification__icon--${item.tone || 'soft'}`}>
                  {item.tone === 'danger' ? '!' : item.tone === 'success' ? '✓' : '✉'}
                </div>
                <div className="hospital-notification__content">
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  {item.message_preview ? <p className="hospital-notification__preview">"{item.message_preview}"</p> : null}
                  <small>{item.age}</small>
                </div>
                {!item.is_read ? (
                  <button
                    type="button"
                    className="hospital-notification-action"
                    onClick={() => handleMarkNotificationRead(item.id)}
                    disabled={notificationActionLoading === item.id}
                  >
                    {notificationActionLoading === item.id ? 'Saving...' : 'Mark as read'}
                  </button>
                ) : (
                  <span className="hospital-notification-state">Read</span>
                )}
              </article>
            ))
          ) : (
            <div className="hospital-empty-state">No notifications to show.</div>
          )}
        </div>
      </section>
    )
  }

  function renderDashboard() {
    return (
      <>
        <section className="hospital-stats">
          <article className="hospital-stat-card">
            <div className="hospital-stat-card__icon hospital-stat-card__icon--rose">✦</div>
            <span>Total Requests</span>
            <strong>{loading ? '...' : dashboard.stats.total_requests}</strong>
            <small>Live hospital request volume</small>
          </article>

          <article className="hospital-stat-card">
            <div className="hospital-stat-card__icon hospital-stat-card__icon--green">⌁</div>
            <span>Donors Matched Today</span>
            <strong>{loading ? '...' : dashboard.stats.donors_matched_today}</strong>
            <small>{matchRate}% match rate</small>
          </article>

          <article className="hospital-stat-card">
            <div className="hospital-stat-card__icon hospital-stat-card__icon--neutral">▣</div>
            <span>Blood Inventory Status</span>
            <strong>{loading ? '...' : `${dashboard.stats.inventory_units} Units`}</strong>
            <small>Completed donations on record</small>
          </article>

          <article className="hospital-stat-card hospital-stat-card--critical">
            <div className="hospital-stat-card__icon hospital-stat-card__icon--critical">!</div>
            <span>Urgent Pending</span>
            <strong>{loading ? '...' : String(dashboard.stats.urgent_pending).padStart(2, '0')}</strong>
            <small>Critical or urgent open requests</small>
          </article>
        </section>

        <section className="hospital-grid">
          <div className="hospital-grid__left">
            <section className="hospital-panel">
              <div className="hospital-panel__header">
                <h2>Emergency Request</h2>
                <p>Initiate a blood procurement request</p>
              </div>

              <form className="hospital-request-form" onSubmit={handleBroadcastRequest}>
                <label>
                  <span>Blood Type Required</span>
                  <select
                    value={requestForm.blood_type}
                    onChange={(event) => updateRequestForm('blood_type', event.target.value)}
                  >
                    <option value="" disabled>Select Type...</option>
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>B-</option>
                    <option>O+</option>
                    <option>O-</option>
                    <option>AB+</option>
                    <option>AB-</option>
                  </select>
                </label>

                <div className="hospital-request-form__row">
                  <label>
                    <span>Units Required</span>
                    <input
                      type="number"
                      min="1"
                      value={requestForm.units_required}
                      onChange={(event) => updateRequestForm('units_required', event.target.value)}
                      placeholder="0"
                    />
                  </label>

                  <label>
                    <span>Urgency</span>
                    <select
                      value={requestForm.urgency}
                      onChange={(event) => updateRequestForm('urgency', event.target.value)}
                    >
                      <option value="standard">Standard</option>
                      <option value="urgent">Urgent</option>
                      <option value="critical">Critical</option>
                    </select>
                  </label>
                </div>

                <button className="hospital-request-form__submit" type="submit" disabled={submittingRequest}>
                  {submittingRequest ? 'Broadcasting...' : 'Broadcast Request'}
                </button>
                {requestMessage ? <p className="hospital-success">{requestMessage}</p> : null}
              </form>
            </section>

            <section className="hospital-panel">
              <div className="hospital-panel__header hospital-panel__header--split">
                <div>
                  <h2>Recent Log</h2>
                  <p>Latest donor and donation activity</p>
                </div>
                <button type="button">View All</button>
              </div>

              <div className="hospital-log-list">
                {dashboard.recent_log.length ? (
                  dashboard.recent_log.map((entry) => (
                    <article className="hospital-log-card" key={entry.id || `${entry.donor_name}-${entry.time_ago}`}>
                      <div className="hospital-log-card__badge">{entry.blood_type}</div>
                      <div>
                        <strong>{entry.donor_name}</strong>
                        <p>
                          Donated {entry.units} Unit{Number(entry.units) > 1 ? 's' : ''} • {entry.time_ago}
                        </p>
                      </div>
                      <span className="hospital-log-card__status">✓</span>
                    </article>
                  ))
                ) : (
                  <div className="hospital-empty-state">No recent hospital donation log available yet.</div>
                )}
              </div>
            </section>
          </div>

          <div className="hospital-grid__right">
            <section className="hospital-panel hospital-panel--table">
              <div className="hospital-panel__header hospital-panel__header--split">
                <div>
                  <h2>Active Procurement Requests</h2>
                  <p>Live request tracking for your hospital</p>
                </div>
                <div className="hospital-filter-group">
                  <button
                    type="button"
                    className={requestFilter === 'all' ? 'hospital-filter-group__button hospital-filter-group__button--active' : 'hospital-filter-group__button'}
                    onClick={() => setRequestFilter('all')}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={requestFilter === 'urgent' ? 'hospital-filter-group__button hospital-filter-group__button--active hospital-filter-group__button--danger' : 'hospital-filter-group__button hospital-filter-group__button--danger'}
                    onClick={() => setRequestFilter('urgent')}
                  >
                    Urgent
                  </button>
                </div>
              </div>

              <div className="hospital-table-wrap">
                <table className="hospital-table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Blood Type</th>
                      <th>Volume</th>
                      <th>Status</th>
                      <th>Time Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length ? (
                      filteredRequests.map((request) => (
                        <tr key={request.id || request.request_code}>
                          <td className="hospital-table__request">{request.request_code}</td>
                          <td>
                            <span className="hospital-table__group">{request.blood_type}</span>
                          </td>
                          <td>{request.volume} Units</td>
                          <td>
                            <span className={`hospital-table__status hospital-table__status--${request.status_tone}`}>
                              {request.status}
                            </span>
                          </td>
                          <td>{request.time_remaining}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="hospital-table__empty">No active procurement requests found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="hospital-bottom-grid">
              <section className="hospital-panel">
                <div className="hospital-panel__header">
                  <h2>Donor Heatmap</h2>
                  <p>{hospitalTitle} active donor radius</p>
                </div>

                <div className="hospital-map">
                  <MapContainer center={mapCenter} zoom={12} scrollWheelZoom className="hospital-map__frame">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {dashboard.donor_heatmap.points.map((point) => (
                      point.latitude && point.longitude ? (
                        <Marker key={point.id || point.name} position={[point.latitude, point.longitude]} icon={donorMarkerIcon}>
                          <Popup>
                            <strong>{point.name}</strong>
                            <br />
                            {point.blood_type} • {point.distance_label}
                          </Popup>
                        </Marker>
                      ) : null
                    ))}
                  </MapContainer>
                </div>
              </section>

              <section className="hospital-panel">
                <div className="hospital-panel__header">
                  <h2>Matches In-Route</h2>
                  <p>Nearest donor support for active requests</p>
                </div>

                <div className="hospital-match-list">
                  {dashboard.matches_in_route.length ? (
                    dashboard.matches_in_route.map((match) => (
                      <article className="hospital-match-card" key={match.id || match.name}>
                        <div className="hospital-match-card__avatar">{match.name?.slice(0, 1) || 'D'}</div>
                        <div className="hospital-match-card__body">
                          <div className="hospital-match-card__row">
                            <strong>{match.name}</strong>
                            <span>{match.distance_label}</span>
                          </div>
                          <div className="hospital-match-card__progress">
                            <span style={{ width: `${Math.max(12, 100 - match.distance_km * 12)}%` }} />
                          </div>
                          <small>ETA: {match.eta_minutes} minutes (Driving)</small>
                        </div>
                        <div className="hospital-match-card__blood">{match.blood_type}</div>
                      </article>
                    ))
                  ) : (
                    <div className="hospital-empty-state">No donor matches with shared location are available yet.</div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>
      </>
    )
  }

  function renderBloodRequests() {
    return (
      <section className="hospital-requests-page">
        <section className="hospital-panel">
          <div className="hospital-panel__header hospital-panel__header--split">
            <div>
              <h2>Blood Request Operations</h2>
              <p>Create and monitor live hospital procurement requests.</p>
            </div>
            <button type="button" onClick={reloadDashboard}>Refresh</button>
          </div>

          <form className="hospital-request-form" onSubmit={handleBroadcastRequest}>
            <label>
              <span>Blood Type Required</span>
              <select
                value={requestForm.blood_type}
                onChange={(event) => updateRequestForm('blood_type', event.target.value)}
              >
                <option value="" disabled>Select Type...</option>
                <option>A+</option>
                <option>A-</option>
                <option>B+</option>
                <option>B-</option>
                <option>O+</option>
                <option>O-</option>
                <option>AB+</option>
                <option>AB-</option>
              </select>
            </label>

            <div className="hospital-request-form__row">
              <label>
                <span>Units Required</span>
                <input
                  type="number"
                  min="1"
                  value={requestForm.units_required}
                  onChange={(event) => updateRequestForm('units_required', event.target.value)}
                  placeholder="0"
                />
              </label>

              <label>
                <span>Urgency</span>
                <select
                  value={requestForm.urgency}
                  onChange={(event) => updateRequestForm('urgency', event.target.value)}
                >
                  <option value="standard">Standard</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
            </div>

            <button className="hospital-request-form__submit" type="submit" disabled={submittingRequest}>
              {submittingRequest ? 'Broadcasting...' : 'Broadcast Request'}
            </button>
            {requestMessage ? <p className="hospital-success">{requestMessage}</p> : null}
          </form>
        </section>

        <section className="hospital-panel hospital-panel--table">
          <div className="hospital-panel__header hospital-panel__header--split">
            <div>
              <h2>Active Blood Requests</h2>
              <p>Requests now visible inside donor clinical portals.</p>
            </div>
            <div className="hospital-filter-group">
              <button
                type="button"
                className={requestFilter === 'all' ? 'hospital-filter-group__button hospital-filter-group__button--active' : 'hospital-filter-group__button'}
                onClick={() => setRequestFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={requestFilter === 'urgent' ? 'hospital-filter-group__button hospital-filter-group__button--active hospital-filter-group__button--danger' : 'hospital-filter-group__button hospital-filter-group__button--danger'}
                onClick={() => setRequestFilter('urgent')}
              >
                Urgent
              </button>
            </div>
          </div>

          <div className="hospital-table-wrap">
            <table className="hospital-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Blood Type</th>
                  <th>Volume</th>
                  <th>Status</th>
                  <th>Accepted Donors</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length ? (
                  filteredRequests.map((request) => (
                    <tr key={request.id || request.request_code}>
                      <td className="hospital-table__request">{request.request_code}</td>
                      <td>
                        <span className="hospital-table__group">{request.blood_type}</span>
                      </td>
                      <td>{request.volume} Units</td>
                      <td>
                        <span className={`hospital-table__status hospital-table__status--${request.status_tone}`}>
                          {request.status}
                        </span>
                      </td>
                      <td>{request.accepted_donors || 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="hospital-table__empty">No active blood requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="hospital-panel hospital-panel--table">
          <div className="hospital-panel__header">
            <h2>Donor Responses</h2>
            <p>Accepted donor matches coming from the donor portal.</p>
          </div>

          {responseMessage ? <p className="hospital-success">{responseMessage}</p> : null}

          <div className="hospital-table-wrap">
            <table className="hospital-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Donor</th>
                  <th>Blood Group</th>
                  <th>Status</th>
                  <th>ETA</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.request_responses?.length ? (
                  dashboard.request_responses.map((response) => (
                    <tr key={response.id || `${response.request_code}-${response.donor_name}`}>
                      <td className="hospital-table__request">{response.request_code}</td>
                      <td>{response.donor_name}</td>
                      <td>
                        <span className="hospital-table__group">{response.blood_type || 'Unknown'}</span>
                      </td>
                      <td>
                        <span className={`hospital-table__status hospital-table__status--${response.status_tone || 'open'}`}>
                          {response.status}
                        </span>
                      </td>
                      <td>{response.eta_minutes ? `${response.eta_minutes} mins` : 'Awaiting route'}</td>
                      <td>
                        {response.can_complete ? (
                          <button
                            type="button"
                            className="hospital-filter-group__button hospital-filter-group__button--active"
                            onClick={() => handleCompleteResponse(response.id)}
                            disabled={responseActionLoadingId === response.id}
                          >
                            {responseActionLoadingId === response.id ? 'Saving...' : 'Confirm Donation'}
                          </button>
                        ) : (
                          response.completed_at || 'Completed'
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="hospital-table__empty">No donor responses have been accepted yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    )
  }

  function renderProfile() {
    return (
      <section className="hospital-profile">
        <form className="hospital-profile__form hospital-panel" onSubmit={handleProfileSave}>
          <div className="hospital-panel__header hospital-panel__header--split">
            <div>
              <h2>Hospital Profile</h2>
              <p>Update facility information used for verified request matching.</p>
            </div>
            <button type="submit" className="hospital-profile__save" disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          <div className="hospital-profile__grid">
            <label className="hospital-profile__field">
              <span>Hospital Name</span>
              <input
                type="text"
                value={profileForm.hospital_name}
                onChange={(event) => updateProfileField('hospital_name', event.target.value)}
              />
            </label>

            <label className="hospital-profile__field">
              <span>License Number</span>
              <input
                type="text"
                value={profileForm.license_number}
                onChange={(event) => updateProfileField('license_number', event.target.value)}
              />
            </label>

            <label className="hospital-profile__field">
              <span>Email Address</span>
              <input
                type="email"
                value={profileForm.email}
                onChange={(event) => updateProfileField('email', event.target.value)}
              />
            </label>

            <label className="hospital-profile__field">
              <span>Phone Number</span>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(event) => updateProfileField('phone', event.target.value)}
              />
            </label>

            <label className="hospital-profile__field hospital-profile__field--full">
              <span>Facility Address</span>
              <textarea
                rows="4"
                value={profileForm.address}
                onChange={(event) => updateProfileField('address', event.target.value)}
                placeholder="Enter the hospital address"
              />
            </label>

            <div className="hospital-profile__field hospital-profile__field--full">
              <span>Hospital Map Location</span>
              <LocationPicker
                value={{
                  latitude: profileForm.latitude || null,
                  longitude: profileForm.longitude || null,
                }}
                onLocationChange={handleProfileLocationChange}
              />
            </div>
          </div>

          {profileMessage ? <p className="hospital-success">{profileMessage}</p> : null}
        </form>

        <aside className="hospital-profile__summary">
          <section className="hospital-panel">
            <div className="hospital-panel__header">
              <h2>Verification Snapshot</h2>
              <p>Core verified facility details</p>
            </div>
            <div className="hospital-profile__stats">
              <div>
                <span>Approval Status</span>
                <strong>{hospital?.approval_status || 'approved'}</strong>
              </div>
              <div>
                <span>Current License</span>
                <strong>{profileForm.license_number || 'Not set'}</strong>
              </div>
              <div>
                <span>Saved Coordinates</span>
                <strong>
                  {profileForm.latitude && profileForm.longitude
                    ? `${profileForm.latitude}, ${profileForm.longitude}`
                    : 'Not selected'}
                </strong>
              </div>
            </div>
          </section>

          <section className="hospital-panel">
            <div className="hospital-panel__header">
              <h2>Operational Summary</h2>
              <p>Live values from your dashboard</p>
            </div>
            <div className="hospital-profile__stats">
              <div>
                <span>Total Requests</span>
                <strong>{dashboard.stats.total_requests}</strong>
              </div>
              <div>
                <span>Inventory Units</span>
                <strong>{dashboard.stats.inventory_units}</strong>
              </div>
              <div>
                <span>Urgent Pending</span>
                <strong>{dashboard.stats.urgent_pending}</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>
    )
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
                className={`hospital-nav__item${activeSection === item.label ? ' hospital-nav__item--active' : ''}`}
                onClick={() => handleSectionChange(item)}
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
            <input
              type="text"
              placeholder="Search donors, requests, or clinical records..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <div className="hospital-topbar__actions">
            <button
              type="button"
              className="hospital-topbar__icon hospital-topbar__icon--button"
              onClick={() => {
                setActiveSection('Notifications')
                setSearchParams({ section: 'Notifications' })
              }}
              aria-label={unreadNotificationCount ? `${unreadNotificationCount} unread notifications` : 'Notifications'}
            >
              <span aria-hidden="true">🔔</span>
              {unreadNotificationCount ? (
                <span className="dashboard-notification-badge">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              ) : null}
            </button>
            <span className="hospital-topbar__icon" aria-hidden="true">?</span>
            <div className="hospital-topbar__identity">
              <strong>{doctorName}</strong>
              <small>{hospitalTitle}</small>
            </div>
            <div className="hospital-topbar__avatar">{doctorName.slice(0, 1)}</div>
          </div>
        </header>

        <main className="dashboard-content hospital-content">
          {error ? <p className="hospital-error">{error}</p> : null}

          {activeSection === 'Dashboard' && renderDashboard()}
          {activeSection === 'Blood Requests' && renderBloodRequests()}
          {activeSection === 'Search Donors' &&
            renderPlaceholder('Search Donors', 'Your donor search can be expanded next with advanced filters, travel radius, and eligibility targeting.')}
          {activeSection === 'Profile' && renderProfile()}
          {activeSection === 'Notifications' && renderNotifications()}
        </main>
      </div>
    </div>
  )
}

export default HospitalDashboard
