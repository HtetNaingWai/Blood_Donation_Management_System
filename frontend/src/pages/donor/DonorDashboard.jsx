import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LocationPicker from '../../components/map/LocationPicker'
import donorService, { emptyDonorDashboard } from '../../services/donorService'
import { logout } from '../../services/authService'
import { getStoredUser } from '../../services/authStorage'
import SearchHospital from './SearchHospital'

const sidebarItems = [
  { label: 'Dashboard', icon: '📊' },
  { label: 'Donations', icon: '💉' },
  { label: 'Blood Requests', icon: '🩸' },
  { label: 'Search Hospital', icon: '🏨' },
  { label: 'Notifications', icon: '🔔' },
  { label: 'Profile', icon: '👤' },
  
]
const defaultMapCenter = [16.8409, 96.1735]

function barHeight(value, maxValue) {
  if (!maxValue) {
    return 16
  }

  return Math.max(16, Math.round((value / maxValue) * 70))
}

function formatAvailability(status) {
  return status === 'available' ? 'Available to Donate' : 'Unavailable'
}

// Main donor portal for requests, donations, profile settings, and hospital map discovery.
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
  const [hospitalsLoading, setHospitalsLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [requestActionLoadingId, setRequestActionLoadingId] = useState(null)
  const [donationsLoading, setDonationsLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [locationMessage, setLocationMessage] = useState('')
  const [mapCenter, setMapCenter] = useState(defaultMapCenter)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    blood_type: '',
    general_location: '',
    contact_address: '',
    latitude: '',
    longitude: '',
    email_notifications: true,
    location_sharing: true,
  })

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        // Load the donor dashboard summary, accepted requests, completed requests, and donation history together.
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
          hospitals: data?.hospitals || [],
          accepted_requests: data?.accepted_requests || [],
          completed_requests: data?.completed_requests || [],
          donations: data?.donations || data?.donation_history || [],
          donation_history: data?.donations || data?.donation_history || [],
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

  const filteredDonations = useMemo(() => {
    if (!searchTerm.trim()) {
      return dashboard.donations
    }

    const query = searchTerm.toLowerCase()

    return dashboard.donations.filter((item) =>
      [item.hospital, item.blood_group, item.status, item.date, String(item.units), String(item.reward_points)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    )
  }, [dashboard.donations, searchTerm])

  const filteredHospitals = useMemo(() => {
    if (!searchTerm.trim()) {
      return dashboard.hospitals || []
    }

    const query = searchTerm.toLowerCase()

    return (dashboard.hospitals || []).filter((hospital) =>
      [hospital.hospital_name, hospital.address, hospital.license_number, hospital.phone, hospital.email]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    )
  }, [dashboard.hospitals, searchTerm])

  const statCards = [
    { label: 'Total Donations', value: dashboard.summary.total_donations },
    { label: 'Lives Saved', value: dashboard.summary.lives_saved },
    { label: 'Open Requests', value: dashboard.summary.pending_requests },
    { label: 'Last Donation', value: dashboard.summary.last_donation_date || 'No record yet' },
  ]

  useEffect(() => {
    if (!currentUser) {
      return
    }

    setProfileForm({
      name: currentUser.name || '',
      email: currentUser.email || '',
      phone: currentUser.phone || '',
      blood_type: currentUser.donor?.blood_type || '',
      general_location: currentUser.donor?.general_location || '',
      contact_address: currentUser.donor?.contact_address || '',
      latitude: currentUser.donor?.latitude ?? '',
      longitude: currentUser.donor?.longitude ?? '',
      email_notifications: currentUser.donor?.email_notifications ?? true,
      location_sharing: currentUser.donor?.location_sharing ?? true,
    })
  }, [currentUser])

  useEffect(() => {
    if (!dashboard.hospitals?.length) {
      return
    }

    if (currentLocation) {
      return
    }

    const firstHospital = dashboard.hospitals[0]

    if (firstHospital?.latitude && firstHospital?.longitude) {
      setMapCenter([firstHospital.latitude, firstHospital.longitude])
    }
  }, [currentLocation, dashboard.hospitals])

  useEffect(() => {
    if (activeSection !== 'Search Hospital' || dashboard.hospitals?.length) {
      return
    }

    refreshHospitals()
  }, [activeSection])

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

  async function handleProfileSave(event) {
    event.preventDefault()
    setProfileSaving(true)
    setProfileMessage('')
    setError('')

    try {
      // Save donor profile details and preference changes without leaving the dashboard.
      const data = await donorService.updateProfile({
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        blood_type: profileForm.blood_type,
        general_location: profileForm.general_location,
        contact_address: profileForm.contact_address || null,
        latitude: profileForm.latitude || null,
        longitude: profileForm.longitude || null,
        email_notifications: Boolean(profileForm.email_notifications),
        location_sharing: Boolean(profileForm.location_sharing),
      })

      setDashboard((previous) => ({
        ...previous,
        user: data.user,
        summary: {
          ...previous.summary,
          blood_group: data.user?.donor?.blood_type || previous.summary.blood_group,
        },
      }))
      setProfileMessage('Your donor profile has been updated.')
    } catch (profileError) {
      setError(profileError?.message || 'Unable to save your donor profile right now.')
    } finally {
      setProfileSaving(false)
    }
  }

  async function refreshRequestData() {
    const data = await donorService.getRequests()

    setDashboard((previous) => ({
      ...previous,
      nearby_requests: data?.available_requests || [],
      accepted_requests: data?.accepted_requests || [],
      summary: {
        ...previous.summary,
        pending_requests: (data?.available_requests || []).length,
      },
    }))
  }

  async function refreshDonations() {
    setDonationsLoading(true)

    try {
      const data = await donorService.getDonations()

      setDashboard((previous) => ({
        ...previous,
        user: data?.user || previous.user,
        donor: data?.donor || previous.donor,
        donations: data?.donations || [],
        donation_history: data?.donations || [],
      }))
    } catch {
      setError('Unable to load your donation records right now.')
    } finally {
      setDonationsLoading(false)
    }
  }

  async function refreshHospitals() {
    setHospitalsLoading(true)
    setLocationMessage('')

    try {
      // Fetch approved hospitals for the donor map view.
      const data = await donorService.getHospitals()

      setDashboard((previous) => ({
        ...previous,
        hospitals: data?.hospitals || [],
      }))
    } catch {
      setError('Unable to load approved hospitals right now.')
    } finally {
      setHospitalsLoading(false)
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocationMessage('Your browser does not support geolocation.')
      return
    }

    setLocationLoading(true)
    setLocationMessage('')

    // The donor location stays in local component state so hospitals are never overwritten on the map.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }

        setCurrentLocation(nextLocation)
        setMapCenter([nextLocation.latitude, nextLocation.longitude])
        setLocationMessage('Your current location is now shown on the map.')
        setLocationLoading(false)
      },
      (locationError) => {
        const fallbackMessage = locationError?.code === 1
          ? 'Location permission was denied.'
          : 'Unable to get your current location right now.'

        setLocationMessage(fallbackMessage)
        setLocationLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    )
  }

  async function handleAcceptRequest(requestId) {
    setRequestActionLoadingId(requestId)
    setError('')

    try {
      // Accept the selected blood request from the donor portal.
      await donorService.acceptRequest(requestId)
      await refreshRequestData()
    } catch (requestError) {
      const apiMessage =
        requestError?.response?.data?.errors
          ? Object.values(requestError.response.data.errors).flat()[0]
          : requestError?.response?.data?.message

      setError(apiMessage || 'Unable to accept this blood request right now.')
    } finally {
      setRequestActionLoadingId(null)
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
                <button type="button" onClick={() => setActiveSection('Blood Requests')}>View All</button>
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

                      <button
                        type="button"
                        className="donor-request-card__action"
                        onClick={() => handleAcceptRequest(request.id)}
                        disabled={requestActionLoadingId === request.id}
                      >
                        {requestActionLoadingId === request.id ? 'Accepting...' : 'Accept Request'}
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

  function renderProfile() {
    return (
      <section className="donor-profile">
        <form className="donor-profile__form donor-panel" onSubmit={handleProfileSave}>
          <div className="donor-panel__header">
            <h2>Donor Profile</h2>
            <button type="submit" className="donor-profile__save" disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          <div className="donor-profile__grid">
            <label className="donor-profile__field">
              <span>Full Name</span>
              <input
                type="text"
                value={profileForm.name}
                onChange={(event) => updateProfileField('name', event.target.value)}
              />
            </label>

            <label className="donor-profile__field">
              <span>Email Address</span>
              <input
                type="email"
                value={profileForm.email}
                onChange={(event) => updateProfileField('email', event.target.value)}
              />
            </label>

            <label className="donor-profile__field">
              <span>Phone Number</span>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(event) => updateProfileField('phone', event.target.value)}
              />
            </label>

            <label className="donor-profile__field">
              <span>Blood Group</span>
              <select
                value={profileForm.blood_type}
                onChange={(event) => updateProfileField('blood_type', event.target.value)}
              >
                <option value="" disabled>Select Group</option>
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

            <label className="donor-profile__field">
              <span>Township</span>
              <input
                type="text"
                value={profileForm.general_location}
                onChange={(event) => updateProfileField('general_location', event.target.value)}
              />
            </label>

            <label className="donor-profile__field donor-profile__field--full">
              <span>Address</span>
              <textarea
                rows="4"
                value={profileForm.contact_address}
                onChange={(event) => updateProfileField('contact_address', event.target.value)}
                placeholder="Add your donor contact address"
              />
            </label>

            <div className="donor-profile__field donor-profile__field--full">
              <span>Saved Map Location</span>
              <LocationPicker
                value={{
                  latitude: profileForm.latitude || null,
                  longitude: profileForm.longitude || null,
                }}
                onLocationChange={handleProfileLocationChange}
              />
            </div>
          </div>

          <div className="donor-profile__preferences">
            <label className="donor-profile__checkbox">
              <input
                type="checkbox"
                checked={profileForm.email_notifications}
                onChange={(event) => updateProfileField('email_notifications', event.target.checked)}
              />
              <span>Email notifications for donation updates</span>
            </label>

            <label className="donor-profile__checkbox">
              <input
                type="checkbox"
                checked={profileForm.location_sharing}
                onChange={(event) => updateProfileField('location_sharing', event.target.checked)}
              />
              <span>Allow location sharing for nearby request matching</span>
            </label>
          </div>

          {profileMessage ? <p className="donor-profile__message">{profileMessage}</p> : null}
        </form>

        <aside className="donor-profile__summary donor-grid__side">
          <section className="donor-panel">
            <div className="donor-panel__header">
              <h2>Profile Snapshot</h2>
            </div>
            <div className="donor-profile__stats">
              <div>
                <span>Blood Group</span>
                <strong>{profileForm.blood_type || 'Not set'}</strong>
              </div>
              <div>
                <span>Township</span>
                <strong>{profileForm.general_location || 'Not set'}</strong>
              </div>
              <div>
                <span>Reward Points</span>
                <strong>{dashboard.summary.reward_points || 0}</strong>
              </div>
            </div>
          </section>

          <section className="donor-panel">
            <div className="donor-panel__header">
              <h2>Donation Status</h2>
            </div>
            <div className="donor-eligibility">
              <div className="donor-eligibility__row">
                <span>Availability</span>
                <strong>{formatAvailability(dashboard.summary.availability_status)}</strong>
              </div>
              <div className="donor-eligibility__bar">
                <span style={{ width: `${dashboard.summary.eligibility_progress}%` }} />
              </div>
              <p>
                Keep your profile updated so hospitals can match you more accurately during urgent requests.
              </p>
            </div>
          </section>
        </aside>
      </section>
    )
  }

  function renderBloodRequests() {
    return (
      <section className="donor-requests-page">
        <section className="donor-panel">
          <div className="donor-panel__header">
            <h2>Available Hospital Blood Requests</h2>
            <button type="button" onClick={refreshRequestData}>Refresh</button>
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

                  <button
                    type="button"
                    className="donor-request-card__action"
                    onClick={() => handleAcceptRequest(request.id)}
                    disabled={requestActionLoadingId === request.id}
                  >
                    {requestActionLoadingId === request.id ? 'Accepting...' : 'Accept Request'}
                  </button>
                </article>
              ))
            ) : (
              <div className="donor-empty-state">No blood requests are available for your blood group right now.</div>
            )}
          </div>
        </section>

        <section className="donor-panel donor-panel--table">
          <div className="donor-panel__header">
            <h2>Request Responses</h2>
            <span>{dashboard.accepted_requests?.length || 0} total</span>
          </div>

          <div className="donor-table-wrap">
            <table className="donor-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Hospital</th>
                  <th>Blood Group</th>
                  <th>Status</th>
                  <th>ETA</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.accepted_requests?.length ? (
                  dashboard.accepted_requests.map((item) => (
                    <tr key={item.id || item.request_code}>
                      <td>{item.request_code}</td>
                      <td>{item.hospital}</td>
                      <td>
                        <span className="donor-table__group">{item.blood_type || 'Unknown'}</span>
                      </td>
                      <td>
                        <span className={`donor-table__status donor-table__status--${item.status_tone || 'pending'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.eta_minutes ? `${item.eta_minutes} mins` : 'Pending route'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="donor-table__empty">You have not responded to any hospital blood requests yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    )
  }

  function renderDonations() {
    return (
      <section className="donor-requests-page">
        <section className="donor-panel donor-panel--table">
          <div className="donor-panel__header">
            <h2>Completed Donations</h2>
            <button type="button" onClick={refreshDonations}>
              {donationsLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="donor-table-wrap">
            <table className="donor-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Hospital</th>
                  <th>Blood Type</th>
                  <th>Units</th>
                  <th>Status</th>
                  <th>Reward Points</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonations.length ? (
                  filteredDonations.map((item) => (
                    <tr key={item.id || `${item.date}-${item.hospital}`}>
                      <td>{item.date || 'No date'}</td>
                      <td>{item.hospital || 'Hospital'}</td>
                      <td>
                        <span className="donor-table__group">{item.blood_group || 'Unknown'}</span>
                      </td>
                      <td>{item.units || 1}</td>
                      <td>
                        <span className={`donor-table__status donor-table__status--${item.status_tone || 'completed'}`}>
                          {item.status || 'Completed'}
                        </span>
                      </td>
                      <td>{item.reward_points || 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="donor-table__empty">No completed donation records are available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    )
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
          <span aria-hidden="true">⇨</span>
          Logout
        </button>
      </aside>

      <div className="dashboard-main donor-main">
        <header className="dashboard-topbar donor-topbar">
          <label className="donor-search">
            <span aria-hidden="true">🔎</span>
            <input
              type="text"
              placeholder="Search hospitals or requests..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <div className="donor-topbar__actions">
            <span className="donor-topbar__icon" aria-hidden="true">🔔</span>
            <div className="donor-topbar__avatar">{donorName.slice(0, 1)}</div>
          </div>
        </header>

        <main className="dashboard-content donor-content">
          {error ? <p className="donor-error">{error}</p> : null}

          {activeSection === 'Dashboard' && renderDashboard()}
          {activeSection === 'Blood Requests' && renderBloodRequests()}
          {activeSection === 'Profile' && renderProfile()}
          {activeSection === 'Donations' && renderDonations()}
          {activeSection === 'Search Hospital' && (
            <SearchHospital
              hospitals={filteredHospitals}
              hospitalsLoading={hospitalsLoading}
              locationLoading={locationLoading}
              locationMessage={locationMessage}
              mapCenter={mapCenter}
              currentLocation={currentLocation}
              onUseMyLocation={handleUseMyLocation}
              onRefreshHospitals={refreshHospitals}
            />
          )}
          {activeSection === 'Notifications' &&
            renderPlaceholder('Notifications Center', 'Your notifications are already live in the dashboard. A full notification center can be added next.')}
        </main>
      </div>
    </div>
  )
}

export default DonorDashboard
