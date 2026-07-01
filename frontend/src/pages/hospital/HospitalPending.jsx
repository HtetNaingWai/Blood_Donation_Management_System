import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../../services/authService'

function HospitalPending() {
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="status-page">
      <section className="status-card">
        <span className="status-card__badge status-card__badge--pending">Pending Approval</span>
        <h1>Hospital Verification Pending</h1>
        <p>
          Your hospital registration has been submitted successfully. Your account is currently waiting for admin approval.
          For safety and trust, hospitals must be verified before they can create blood requests or contact donors.
        </p>

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

export default HospitalPending
