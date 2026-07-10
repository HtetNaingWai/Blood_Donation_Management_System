import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../services/authService'
import { getStoredUser } from '../services/authStorage'

function RoleDashboardPage({ role }) {
  const navigate = useNavigate()
  const user = getStoredUser()

  const titles = {
    donor: 'Donor Dashboard',
    patient: 'Patient Dashboard',
    hospital: 'Hospital Dashboard',
  }

  const summaries = {
    donor: [
      `Blood Group: ${user?.donor?.blood_type || 'Not set'}`,
      `Location: ${user?.donor?.general_location || 'Not set'}`,
      `Availability: ${user?.donor?.availability_status || 'available'}`,
    ],
    patient: [
      `Needed Blood Group: ${user?.patient?.needed_blood_type || 'Not set'}`,
      `Township: ${user?.patient?.township || 'Not set'}`,
      `Request Note: ${user?.patient?.request_note || 'No note yet'}`,
    ],
    hospital: [
      `Hospital Name: ${user?.hospital?.hospital_name || user?.name || 'Not set'}`,
      `License Number: ${user?.hospital?.license_number || 'Not set'}`,
      `Approval Status: ${user?.hospital?.approval_status || 'unknown'}`,
    ],
  }

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  if (role === 'patient') {
    return (
      <div className="dashboard-shell patient-shell">
        <aside className="dashboard-sidebar patient-sidebar">
          <div>
            <div className="patient-brand">
              <span>BloodLink</span>
              <small>Patient Portal</small>
            </div>

            <nav className="patient-nav" aria-label="Patient">
              <div className="patient-nav__item">
                <span aria-hidden="true">🩺</span>
                Dashboard
              </div>
            </nav>
          </div>

          <button type="button" className="patient-logout" onClick={handleLogout}>
            <span aria-hidden="true">⇨</span>
            Logout
          </button>
        </aside>

        <main className="dashboard-main patient-main">
          <header className="dashboard-topbar patient-topbar">
            <div>
              <h1>{titles[role] || 'Dashboard'}</h1>
              <p>Signed in as {user?.name || 'User'}</p>
            </div>
          </header>

          <section className="dashboard-content patient-content">
            <section className="status-card status-card--wide">
              <span className="status-card__badge status-card__badge--approved">Dashboard</span>
              <h1>{titles[role] || 'Dashboard'}</h1>
              <p>Signed in as {user?.name || 'User'}. This protected area is ready for the next phase of your project.</p>

              <div className="status-card__details">
                {summaries[role]?.map((item) => (
                  <div key={item} className="status-card__detail">
                    {item}
                  </div>
                ))}
              </div>

              <div className="status-card__actions">
                <Link className="auth-page__secondary" to="/">
                  Back to Home
                </Link>
                <button className="auth-page__submit" type="button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </section>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="status-page">
      <section className="status-card status-card--wide">
        <span className="status-card__badge status-card__badge--approved">Dashboard</span>
        <h1>{titles[role] || 'Dashboard'}</h1>
        <p>Signed in as {user?.name || 'User'}. This protected area is ready for the next phase of your project.</p>

        <div className="status-card__details">
          {summaries[role]?.map((item) => (
            <div key={item} className="status-card__detail">
              {item}
            </div>
          ))}
        </div>

        <div className="status-card__actions">
          <Link className="auth-page__secondary" to="/">
            Back to Home
          </Link>
          <button className="auth-page__submit" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>
    </div>
  )
}

export default RoleDashboardPage
