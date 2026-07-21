import LocationPicker from '../map/LocationPicker'

// Handle donor registration form fields, location selection, and donor-specific terms.
function DonorRegisterModal({
  donorForm,
  setDonorForm,
  showPassword,
  setShowPassword,
  authError,
  authLoading,
  updateForm,
  onCloseModal,
  onHandleDonorRegister,
  onOpenLoginModal,
  onHandleDonorLocationChange,
}) {
  return (
    <div className="join-modal-overlay" role="presentation" onClick={onCloseModal}>
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="donor-register-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="auth-modal__header">
          <div>
            <h2 id="donor-register-title">Become a Hero</h2>
            <p>Register as a donor and help save lives in your community.</p>
          </div>
          <button className="close-modal-button" type="button" onClick={onCloseModal}>
            ×
          </button>
        </div>

        <form className="auth-form" onSubmit={onHandleDonorRegister}>
          <div className="auth-form__grid">
            <label className="field field--full">
              <span>Full Name</span>
              <div className="field__input">
                <span className="field__icon">◌</span>
                <input type="text" placeholder="John Doe" value={donorForm.name} onChange={(event) => updateForm(setDonorForm, 'name', event.target.value)} />
              </div>
            </label>

            <label className="field">
              <span>Email Address</span>
              <div className="field__input">
                <span className="field__icon">✉</span>
                <input type="email" placeholder="email@example.com" value={donorForm.email} onChange={(event) => updateForm(setDonorForm, 'email', event.target.value)} />
              </div>
            </label>

            <label className="field">
              <span>Phone Number</span>
              <div className="field__input">
                <span className="field__icon">☏</span>
                <input type="tel" placeholder="09*********" value={donorForm.phone} onChange={(event) => updateForm(setDonorForm, 'phone', event.target.value)} />
              </div>
            </label>

            <label className="field">
              <span>Blood Group</span>
              <div className="field__input">
                <span className="field__icon">🩸</span>
                <select value={donorForm.blood_group} onChange={(event) => updateForm(setDonorForm, 'blood_group', event.target.value)}>
                  <option value="" disabled>
                    Select Group
                  </option>
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>O+</option>
                  <option>O-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                </select>
                <span className="field__icon field__icon--right">⌄</span>
              </div>
            </label>

            <label className="field">
              <span>Township / Location</span>
              <div className="field__input">
                <span className="field__icon">⌖</span>
                <input type="text" placeholder="Central District" value={donorForm.township} onChange={(event) => updateForm(setDonorForm, 'township', event.target.value)} />
              </div>
            </label>

            <div className="field field--full">
              <span>Current Location Selection</span>
              <LocationPicker
                value={{
                  latitude: donorForm.latitude || null,
                  longitude: donorForm.longitude || null,
                }}
                onLocationChange={onHandleDonorLocationChange}
              />
            </div>

            <label className="field field--full">
              <span>Create Password</span>
              <div className="field__input">
                <span className="field__icon">▣</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={donorForm.password}
                  onChange={(event) => updateForm(setDonorForm, 'password', event.target.value)}
                />
                <button
                  className="field__toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </label>
          </div>

          <label className="terms-row">
            <input type="checkbox" checked={donorForm.acceptedTerms} onChange={(event) => updateForm(setDonorForm, 'acceptedTerms', event.target.checked)} />
            <span>
              I confirm that I am over 18 years old and agree to the{' '}
              <button className="inline-link" type="button">
                Donor Guidelines
              </button>{' '}
              and{' '}
              <button className="inline-link" type="button">
                Privacy Policy
              </button>
              .
            </span>
          </label>

          {authError ? <p className="auth-error">{authError}</p> : null}

          <div className="auth-form__actions">
            <button className="submit-button" type="submit" disabled={authLoading}>
              {authLoading ? 'Registering...' : 'Register'}
            </button>
            <p className="auth-form__switch">
              Already have an account?{' '}
              <button className="inline-link" type="button" onClick={onOpenLoginModal}>
                Sign In
              </button>
            </p>
          </div>
        </form>

        <div className="auth-modal__footer">
          <div className="auth-modal__badge" aria-hidden="true">
            ♡
          </div>
          <div>
            <strong>Did you know?</strong>
            <p>One donation can save up to three lives.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default DonorRegisterModal
