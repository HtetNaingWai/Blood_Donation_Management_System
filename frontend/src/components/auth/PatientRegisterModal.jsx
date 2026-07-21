// Handle patient registration fields while preserving the current patient auth flow.
function PatientRegisterModal({
  patientForm,
  setPatientForm,
  showPatientPassword,
  setShowPatientPassword,
  authError,
  authLoading,
  updateForm,
  onCloseModal,
  onHandlePatientRegister,
  onOpenLoginModal,
}) {
  return (
    <div className="join-modal-overlay" role="presentation" onClick={onCloseModal}>
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-register-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="auth-modal__header">
          <div>
            <h2 id="patient-register-title">Patient Registration</h2>
            <p>Create an account to search for compatible donors and request support.</p>
          </div>
          <button className="close-modal-button" type="button" onClick={onCloseModal}>
            ×
          </button>
        </div>

        <form className="auth-form" onSubmit={onHandlePatientRegister}>
          <div className="auth-form__grid">
            <label className="field field--full">
              <span>Full Name</span>
              <div className="field__input">
                <span className="field__icon">◌</span>
                <input type="text" placeholder="Patient Name" value={patientForm.name} onChange={(event) => updateForm(setPatientForm, 'name', event.target.value)} />
              </div>
            </label>

            <label className="field">
              <span>Email Address</span>
              <div className="field__input">
                <span className="field__icon">✉</span>
                <input type="email" placeholder="patient@example.com" value={patientForm.email} onChange={(event) => updateForm(setPatientForm, 'email', event.target.value)} />
              </div>
            </label>

            <label className="field">
              <span>Phone Number</span>
              <div className="field__input">
                <span className="field__icon">☏</span>
                <input type="tel" placeholder="09*********" value={patientForm.phone} onChange={(event) => updateForm(setPatientForm, 'phone', event.target.value)} />
              </div>
            </label>

            <label className="field">
              <span>Required Blood Group</span>
              <div className="field__input">
                <span className="field__icon">🩸</span>
                <select value={patientForm.required_blood_group} onChange={(event) => updateForm(setPatientForm, 'required_blood_group', event.target.value)}>
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
                <input type="text" placeholder="Current Township" value={patientForm.township} onChange={(event) => updateForm(setPatientForm, 'township', event.target.value)} />
              </div>
            </label>

            <label className="field field--full">
              <span>Reason for Request</span>
              <div className="field__input">
                <span className="field__icon field__icon--top">✎</span>
                <textarea
                  className="field__textarea"
                  rows="2"
                  placeholder="Briefly describe the blood request or medical need..."
                  value={patientForm.request_note}
                  onChange={(event) => updateForm(setPatientForm, 'request_note', event.target.value)}
                />
              </div>
            </label>

            <label className="field field--full">
              <span>Create Password</span>
              <div className="field__input">
                <span className="field__icon">▣</span>
                <input
                  type={showPatientPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={patientForm.password}
                  onChange={(event) => updateForm(setPatientForm, 'password', event.target.value)}
                />
                <button
                  className="field__toggle"
                  type="button"
                  onClick={() => setShowPatientPassword((value) => !value)}
                >
                  {showPatientPassword ? '🙈' : '👁'}
                </button>
              </div>
            </label>
          </div>

          <label className="terms-row">
            <input type="checkbox" checked={patientForm.acceptedTerms} onChange={(event) => updateForm(setPatientForm, 'acceptedTerms', event.target.checked)} />
            <span>
              I confirm that the request details are accurate and I agree to the{' '}
              <button className="inline-link" type="button">
                Patient Support Policy
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
              {authLoading ? 'Registering...' : 'Register Patient'}
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
            ⌕
          </div>
          <div>
            <strong>Need support fast?</strong>
            <p>Registered patients can search donors and submit emergency requests faster.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PatientRegisterModal
