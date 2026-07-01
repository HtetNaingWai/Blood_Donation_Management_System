import { Link } from 'react-router-dom'

function UnauthorizedPage() {
  return (
    <div className="auth-page">
      <section className="auth-page__card auth-page__card--compact">
        <div className="auth-page__copy">
          <h1>Unauthorized Access</h1>
          <p>This area is reserved for admin users only. Please return home or sign in with an approved administrator account.</p>
        </div>

        <div className="auth-page__actions">
          <Link className="auth-page__secondary" to="/">
            Go Home
          </Link>
          <Link className="auth-page__submit auth-page__submit--link" to="/login">
            Login
          </Link>
        </div>
      </section>
    </div>
  )
}

export default UnauthorizedPage
