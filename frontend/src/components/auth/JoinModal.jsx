// Handle account-type selection before opening the matching registration form.
function JoinModal({ selectedRole, setSelectedRole, onCloseModal, onHandleJoinNext }) {
  return (
    <div
      className="join-modal-overlay"
      role="presentation"
      onClick={onCloseModal}
    >
      <section
        className="join-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="join-modal__header">
          <h2 id="join-modal-title">Join the Network</h2>
          <p>
            Please select your account type to continue your registration with
            BloodLink.
          </p>
        </div>

        <div className="join-modal__body">
          <button
            className={`role-card${selectedRole === 'donor' ? ' role-card--selected' : ''}`}
            type="button"
            onClick={() => setSelectedRole('donor')}
          >
            <span className="role-card__check" aria-hidden="true">
              {selectedRole === 'donor' ? '●' : ''}
            </span>
            <span className="role-card__icon" aria-hidden="true">
              <span className="role-card__icon-symbol">♡</span>
            </span>
            <strong>Donor</strong>
            <span>Save lives by donating blood</span>
          </button>

          <button
            className={`role-card${selectedRole === 'hospital' ? ' role-card--selected' : ''}`}
            type="button"
            onClick={() => setSelectedRole('hospital')}
          >
            <span className="role-card__check" aria-hidden="true">
              {selectedRole === 'hospital' ? '●' : ''}
            </span>
            <span className="role-card__icon" aria-hidden="true">
              <span className="role-card__icon-symbol">+</span>
            </span>
            <strong>Hospital</strong>
            <span>Request and manage blood supply</span>
          </button>

          <button
            className={`role-card${selectedRole === 'patient' ? ' role-card--selected' : ''}`}
            type="button"
            onClick={() => setSelectedRole('patient')}
          >
            <span className="role-card__check" aria-hidden="true">
              {selectedRole === 'patient' ? '●' : ''}
            </span>
            <span className="role-card__icon" aria-hidden="true">
              <span className="role-card__icon-symbol">⌕</span>
            </span>
            <strong>Patient</strong>
            <span>Find donors and request urgent blood support</span>
          </button>
        </div>

        <div className="join-modal__footer">
          <button className="back-home-button" type="button" onClick={onCloseModal}>
            <span aria-hidden="true">←</span>
            Back to home
          </button>

          <button
            className={`next-button${selectedRole ? ' next-button--enabled' : ''}`}
            type="button"
            disabled={!selectedRole}
            onClick={onHandleJoinNext}
          >
            Next
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </div>
  )
}

export default JoinModal
