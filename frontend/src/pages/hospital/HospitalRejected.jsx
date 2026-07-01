import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../../services/authService'
import { getStoredUser } from '../../services/authStorage'

function HospitalRejected() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const rejectionReason = user?.hospital?.rejection_reason

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="status-page">
      <section className="status-card">
        <span className="status-card__badge status-card__badge--rejected">Rejected</span>
        <h1>Hospital Registration Not Approved</h1>
        <p>Your hospital account has been rejected by the admin.</p>
        {rejectionReason ? (
          <div className="status-card__detail status-card__detail--alert">
            Rejection Reason: {rejectionReason}
          </div>
        ) : null}

        <div className="status-card__actions">
          <Link className="auth-page__secondary" to="/">
            Back to Home
          </Link>
          <a className="auth-page__secondary" href="mailto:admin@lifeblood.local">
            Contact Admin
          </a>
          <button className="auth-page__submit" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>
    </div>
  )
}

export default HospitalRejected
