// Handle hospital registration fields while preserving the existing approval workflow.
function HospitalRegisterModal({
  hospitalForm,
  setHospitalForm,
  showHospitalPassword,
  setShowHospitalPassword,
  authError,
  authLoading,
  updateForm,
  onCloseModal,
  onHandleHospitalRegister,
}) {
  return (
    <div className="join-modal-overlay" role="presentation" onClick={onCloseModal}>
      <section
        className="auth-modal auth-modal--hospital"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hospital-register-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="hospital-modal__sidebar">
          <div>
            <div className="hospital-modal__sidebar-icon" aria-hidden="true">
              +
            </div>
            <h2>Partner with BloodLink</h2>
            <p>
              Join our medical network to streamline blood acquisition and
              inventory management.
            </p>
          </div>

          <div className="hospital-modal__sidebar-points">
            <span>Verified Network</span>
            <span>Real-time Tracking</span>
            <span>Emergency Support</span>
          </div>
        </div>

        <div className="hospital-modal__content">
          <div className="auth-modal__header hospital-modal__header">
            <div>
              <h2 id="hospital-register-title">Hospital Registration</h2>
              <p>Provide medical facility credentials to begin.</p>
            </div>
            <button className="close-modal-button" type="button" onClick={onCloseModal}>
              ×
            </button>
          </div>

          <form className="auth-form auth-form--hospital" onSubmit={onHandleHospitalRegister}>
            <div className="auth-form__grid">
              <label className="field">
                <span>Hospital Name</span>
                <div className="field__input">
                  <span className="field__icon">⌘</span>
                  <input
                    type="text"
                    placeholder="Hospital Name"
                    value={hospitalForm.hospital_name}
                    onChange={(event) => updateForm(setHospitalForm, 'hospital_name', event.target.value)}
                  />
                </div>
              </label>

              <label className="field">
                <span>License Number</span>
                <div className="field__input">
                  <span className="field__icon">☷</span>
                  <input
                    type="text"
                    placeholder="MED-9920-X"
                    value={hospitalForm.license_number}
                    onChange={(event) => updateForm(setHospitalForm, 'license_number', event.target.value)}
                  />
                </div>
              </label>

              <label className="field">
                <span>Email</span>
                <div className="field__input">
                  <span className="field__icon">✉</span>
                  <input
                    type="email"
                    placeholder="example@hospital.org"
                    value={hospitalForm.email}
                    onChange={(event) => updateForm(setHospitalForm, 'email', event.target.value)}
                  />
                </div>
              </label>

              <label className="field">
                <span>Phone Number</span>
                <div className="field__input">
                  <span className="field__icon">☏</span>
                  <input
                    type="tel"
                    placeholder="09*********"
                    value={hospitalForm.phone}
                    onChange={(event) => updateForm(setHospitalForm, 'phone', event.target.value)}
                  />
                </div>
              </label>

              <label className="field field--full">
                <span>Address</span>
                <div className="field__input">
                  <span className="field__icon field__icon--top">⌖</span>
                  <textarea
                    className="field__textarea"
                    rows="2"
                    placeholder="Full medical facility address..."
                    value={hospitalForm.address}
                    onChange={(event) => updateForm(setHospitalForm, 'address', event.target.value)}
                  />
                </div>
              </label>

              <label className="field field--full">
                <span>Password</span>
                <div className="field__input">
                  <span className="field__icon">▣</span>
                  <input
                    type={showHospitalPassword ? 'text' : 'password'}
                    placeholder="Your Password"
                    value={hospitalForm.password}
                    onChange={(event) => updateForm(setHospitalForm, 'password', event.target.value)}
                  />
                  <button
                    className="field__toggle"
                    type="button"
                    onClick={() => setShowHospitalPassword((value) => !value)}
                  >
                    {showHospitalPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </label>
            </div>

            {authError ? <p className="auth-error">{authError}</p> : null}

            <div className="auth-form__actions auth-form__actions--tight">
              <button className="submit-button" type="submit" disabled={authLoading}>
                {authLoading ? 'Registering...' : 'Register Hospital'}
              </button>
              <p className="auth-form__switch">
                By registering, you agree to the{' '}
                <button className="inline-link" type="button">
                  Medical Services Terms
                </button>
                .
              </p>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default HospitalRegisterModal
