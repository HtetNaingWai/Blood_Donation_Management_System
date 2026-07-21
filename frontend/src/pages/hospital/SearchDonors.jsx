import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DonorCard from '../../components/hospital/DonorCard'
import DonorFilter from '../../components/hospital/DonorFilter'
import DonorMap from '../../components/hospital/DonorMap'
import DonorSearchBar from '../../components/hospital/DonorSearchBar'
import hospitalService, { emptyHospitalDonorSearch } from '../../services/hospitalService'
import { logout } from '../../services/authService'
import { getStoredToken, getStoredUser, getUserHomeRoute } from '../../services/authStorage'
import '../../styles/hospital-search-donors.css'

const sidebarItems = [
  { label: 'Dashboard', icon: '📊', route: '/hospital/dashboard' },
  { label: 'Search Donors', icon: '💉', route: '/hospital/search-donors' },
  { label: 'Blood Requests', icon: '🩸', route: '/hospital/dashboard?section=Blood%20Requests' },
  { label: 'Notifications', icon: '🔔', route: '/hospital/dashboard?section=Notifications' },
  { label: 'Profile', icon: '👤', route: '/hospital/dashboard?section=Profile' },
]

const defaultFilters = {
  bloodGroup: 'all',
  township: 'all',
  availability: 'all',
  radiusKm: '10',
}

function toRadians(value) {
  return (value * Math.PI) / 180
}

function distanceKm(fromLatitude, fromLongitude, toLatitude, toLongitude) {
  const earthRadiusKm = 6371
  const latitudeDelta = toRadians(toLatitude - fromLatitude)
  const longitudeDelta = toRadians(toLongitude - fromLongitude)
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(toRadians(fromLatitude)) * Math.cos(toRadians(toLatitude)) *
      Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2)

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function formatDonationDate(value) {
  if (!value) {
    return 'Not recorded'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function SearchDonors() {
  const navigate = useNavigate()
  const storedUser = getStoredUser()
  const [searchResponse, setSearchResponse] = useState(emptyHospitalDonorSearch)
  const [searchValue, setSearchValue] = useState('')
  const [filters, setFilters] = useState(defaultFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [requestError, setRequestError] = useState('')
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [selectedDonor, setSelectedDonor] = useState(null)
  const [requestForm, setRequestForm] = useState({
    units_required: '1',
    urgency: 'standard',
  })

  useEffect(() => {
    let isMounted = true

    async function loadDonors() {
      setLoading(true)
      if (!searchResponse.donors.length) {
        setError('')
      }

      try {
        const data = await hospitalService.getDonors({
          blood_group: filters.bloodGroup !== 'all' ? filters.bloodGroup : undefined,
          township: filters.township !== 'all' ? filters.township : undefined,
          availability: filters.availability !== 'all' ? filters.availability : undefined,
          distance: filters.radiusKm,
          search: searchValue.trim() || undefined,
        })

        if (!isMounted) {
          return
        }

        setSearchResponse(data)
        setError('')
      } catch (loadError) {
        if (isMounted) {
          const apiMessage =
            loadError?.response?.data?.errors
              ? Object.values(loadError.response.data.errors).flat()[0]
              : loadError?.response?.data?.message

          setError(apiMessage || 'Unable to load hospital donor search results right now.')
          setSearchResponse(emptyHospitalDonorSearch)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDonors()

    return () => {
      isMounted = false
    }
  }, [filters.availability, filters.bloodGroup, filters.radiusKm, filters.township, searchValue])

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

  const currentUser = searchResponse.user || storedUser
  const hospitalProfile = searchResponse.hospital || currentUser?.hospital
  const doctorName = currentUser?.name || hospitalProfile?.hospital_name || 'Hospital User'
  const hospitalTitle = hospitalProfile?.hospital_name || currentUser?.name || 'Approved Hospital'
  const hospitalLocation = useMemo(() => ({
    name: hospitalTitle,
    latitude: Number(hospitalProfile?.latitude || 16.8409),
    longitude: Number(hospitalProfile?.longitude || 96.1735),
  }), [hospitalProfile?.latitude, hospitalProfile?.longitude, hospitalTitle])

  const filterOptions = useMemo(() => ({
    bloodGroups: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    townships: [...new Set(searchResponse.donors.map((donor) => donor.township).filter(Boolean))].sort(),
    radii: ['5', '10', '15', '25', '50'],
  }), [searchResponse.donors])

  const donors = useMemo(() => (
    searchResponse.donors.map((donor) => {
      const donorDistanceKm = donor.distance_km ?? (
        donor.latitude != null && donor.longitude != null
          ? distanceKm(hospitalLocation.latitude, hospitalLocation.longitude, donor.latitude, donor.longitude)
          : null
      )

      return {
        id: donor.id,
        name: donor.name,
        bloodGroup: donor.blood_group,
        township: donor.township,
        latitude: donor.latitude,
        longitude: donor.longitude,
        availabilityStatus: donor.availability,
        lastDonationDate: formatDonationDate(donor.last_donation_date),
        distanceKm: donorDistanceKm,
        distanceLabel: donorDistanceKm != null ? `${Number(donorDistanceKm).toFixed(1)} km` : 'Unknown',
      }
    })
  ), [hospitalLocation.latitude, hospitalLocation.longitude, searchResponse.donors])

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateRequestForm(field, value) {
    setRequestForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  async function handleRequestBlood(event) {
    event.preventDefault()

    if (!selectedDonor) {
      setRequestError('Please select a donor before sending a blood request.')
      return
    }

    setRequestSubmitting(true)
    setRequestError('')
    setRequestMessage('')

    try {
      const data = await hospitalService.createRequest({
        donor_id: selectedDonor.id,
        blood_type: selectedDonor.bloodGroup,
        units_required: Number(requestForm.units_required),
        urgency: requestForm.urgency,
      })

      setRequestMessage(
        data?.message
          ? `${data.message} Selected donor: ${selectedDonor.name}.`
          : `Blood request sent for ${selectedDonor.name}.`,
      )
      setSelectedDonor(null)
      setRequestForm({
        units_required: '1',
        urgency: 'standard',
      })
    } catch (submitError) {
      const apiMessage =
        submitError?.response?.data?.errors
          ? Object.values(submitError.response.data.errors).flat()[0]
          : submitError?.response?.data?.message

      setRequestError(apiMessage || 'Unable to send the blood request right now.')
    } finally {
      setRequestSubmitting(false)
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
                className={`hospital-nav__item${item.label === 'Search Donors' ? ' hospital-nav__item--active' : ''}`}
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
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search donors, requests, or clinical records..."
            />
          </label>

          <div className="hospital-topbar__actions">
            <span className="hospital-topbar__icon" aria-hidden="true">🔔</span>
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
          {requestMessage ? <p className="hospital-success">{requestMessage}</p> : null}

          <DonorSearchBar
            value={searchValue}
            onChange={(value) => {
              setSearchValue(value)
              setError('')
            }}
            resultCount={donors.length}
          />

          <section className="hospital-search-donors__grid">
            <div className="hospital-search-donors__left">
              <DonorFilter
                filters={filters}
                options={filterOptions}
                onChange={updateFilter}
                onReset={() => {
                  setSearchValue('')
                  setFilters(defaultFilters)
                  setError('')
                }}
              />

              {selectedDonor ? (
                <section className="hospital-search-donors__request-panel hospital-panel">
                  <div className="hospital-panel__header">
                    <h2>Send Blood Request</h2>
                    <p>
                      Selected donor: <strong>{selectedDonor.name}</strong> ({selectedDonor.bloodGroup})
                    </p>
                  </div>

                  <form className="hospital-request-form" onSubmit={handleRequestBlood}>
                    <div className="hospital-request-form__row">
                      <label>
                        <span>Units Required</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={requestForm.units_required}
                          onChange={(event) => updateRequestForm('units_required', event.target.value)}
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

                    {requestError ? <p className="hospital-error">{requestError}</p> : null}

                    <div className="hospital-search-donors__request-actions">
                      <button className="hospital-request-form__submit" type="submit" disabled={requestSubmitting}>
                        {requestSubmitting ? 'Sending...' : 'Send Blood Request'}
                      </button>
                      <button
                        type="button"
                        className="hospital-search-donors__secondary-button"
                        onClick={() => {
                          setSelectedDonor(null)
                          setRequestError('')
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </section>
              ) : null}

              <section className="hospital-search-donors__results">
                <div className="hospital-panel__header hospital-panel__header--split">
                  <div>
                    <h2>Nearby Donors</h2>
                    <p>Eligible donor matches sorted by distance from your hospital.</p>
                  </div>
                  <button type="button" onClick={() => navigate('/hospital/dashboard')}>
                    Back to Dashboard
                  </button>
                </div>

                {loading ? (
                  <div className="hospital-empty-state hospital-search-donors__empty">Loading donor search data...</div>
                ) : donors.length ? (
                  <div className="hospital-search-donors__card-grid">
                    {donors.map((donor) => (
                      <DonorCard
                        key={donor.id}
                        donor={donor}
                        onRequestBlood={(nextDonor) => {
                          setSelectedDonor(nextDonor)
                          setRequestError('')
                          setRequestMessage('')
                          setRequestForm((current) => ({
                            ...current,
                            units_required: current.units_required || '1',
                          }))
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="hospital-empty-state hospital-search-donors__empty">
                    No donors match the current search and filter settings.
                  </div>
                )}
              </section>
            </div>

            <div className="hospital-search-donors__right">
              <DonorMap hospital={hospitalLocation} donors={donors} />
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default SearchDonors
