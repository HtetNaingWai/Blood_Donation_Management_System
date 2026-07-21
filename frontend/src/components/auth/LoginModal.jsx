// Handle the landing page login form without changing the existing auth request flow.
function LoginModal({
  loginForm,
  setLoginForm,
  showLoginPassword,
  setShowLoginPassword,
  authError,
  authLoading,
  updateForm,
  onCloseModal,
  onHandleLogin,
  onOpenJoinModal,
}) {
  return (
    <div className="join-modal-overlay" role="presentation" onClick={onCloseModal}>
      <section
        className="auth-modal auth-modal--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="auth-modal__header">
          <div>
            <h2 id="login-title">Welcome Back</h2>
            <p>Sign in to continue your LifeBlood journey.</p>
          </div>
          <button className="close-modal-button" type="button" onClick={onCloseModal}>
            ×
          </button>
        </div>

        <form className="auth-form" onSubmit={onHandleLogin}>
          <div className="auth-form__grid auth-form__grid--single">
            <label className="field field--full">
              <span>Email Address</span>
              <div className="field__input">
                <span className="field__icon">✉</span>
                <input type="email" placeholder="Email@example.com" value={loginForm.email} onChange={(event) => updateForm(setLoginForm, 'email', event.target.value)} />
              </div>
            </label>

            <label className="field field--full">
              <span>Password</span>
              <div className="field__input">
                <span className="field__icon">▣</span>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(event) => updateForm(setLoginForm, 'password', event.target.value)}
                />
                <button
                  className="field__toggle"
                  type="button"
                  onClick={() => setShowLoginPassword((value) => !value)}
                >
                  {showLoginPassword ? '🙈' : '👁'}
                </button>
              </div>
            </label>
          </div>

          {authError ? <p className="auth-error">{authError}</p> : null}

          <div className="auth-form__actions auth-form__actions--tight">
            <button className="submit-button" type="submit" disabled={authLoading}>
              {authLoading ? 'Logging in...' : 'Login'}
            </button>
            <p className="auth-form__switch">
              Need an account?{' '}
              <button className="inline-link" type="button" onClick={onOpenJoinModal}>
                Register
              </button>
            </p>
          </div>
        </form>
      </section>
    </div>
  )
}

export default LoginModal
