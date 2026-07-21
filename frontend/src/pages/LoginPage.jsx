import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../services/authService'
import { getStoredToken, getStoredUser, getUserHomeRoute } from '../services/authStorage'

// Dedicated sign-in page for users who are redirected from protected dashboard routes.
function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = getStoredToken()
    const user = getStoredUser()

    if (!token || !user) {
      return
    }

    navigate(getUserHomeRoute(user), { replace: true })
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      setLoading(true)
      setError('')
      // Submit login credentials and then return the user to the route that originally required auth.
      const data = await login(form)
      const requestedPath = location.state?.from?.pathname
      const homeRoute = getUserHomeRoute(data.user)

      if (requestedPath && data.user.role === 'admin' && requestedPath.startsWith('/admin')) {
        navigate(requestedPath, { replace: true })
        return
      }

      if (requestedPath && data.user.role === 'hospital' && requestedPath.startsWith('/hospital/dashboard')) {
        navigate(homeRoute, { replace: true })
        return
      }

      navigate(homeRoute, { replace: true })
    } catch (requestError) {
      const apiMessage =
        requestError?.response?.data?.errors
          ? Object.values(requestError.response.data.errors).flat()[0]
          : requestError?.response?.data?.message

      setError(apiMessage || 'Unable to sign in right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-page__card">
        <div className="auth-page__brand">
          <span className="admin-brand__mark">+</span>
          <span>BloodLink</span>
        </div>

        <div className="auth-page__copy">
          <h1>Secure Sign In</h1>
          <p>Use your account to continue to the LifeBlood system. You will be redirected automatically based on your role and approval status.</p>
        </div>

        <form className="auth-page__form" onSubmit={handleSubmit}>
          <label>
            <span>Email Address</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="admin@bloodlink.com"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter your password"
            />
          </label>

          {error ? <p className="auth-page__error">{error}</p> : null}

          <button className="auth-page__submit" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="auth-page__links">
          <Link to="/">Back to Home</Link>
        </div>
      </section>
    </div>
  )
}

export default LoginPage
