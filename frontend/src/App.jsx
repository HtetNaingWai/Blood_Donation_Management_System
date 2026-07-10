import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LocationPicker from './components/LocationPicker'
import { apiBaseUrl } from './config/api'
import { clearAuthSession, getUserHomeRoute, setAuthSession } from './services/authStorage'
import './App.css'

function App() {
  const navigate = useNavigate()
  const [activeModal, setActiveModal] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showHospitalPassword, setShowHospitalPassword] = useState(false)
  const [showPatientPassword, setShowPatientPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })
  const [donorForm, setDonorForm] = useState({
    name: '',
    email: '',
    phone: '',
    blood_group: '',
    township: '',
    latitude: '',
    longitude: '',
    password: '',
    acceptedTerms: false,
  })
  const [patientForm, setPatientForm] = useState({
    name: '',
    email: '',
    phone: '',
    required_blood_group: '',
    township: '',
    request_note: '',
    password: '',
    acceptedTerms: false,
  })
  const [hospitalForm, setHospitalForm] = useState({
    hospital_name: '',
    license_number: '',
    email: '',
    phone: '',
    address: '',
    password: '',
  })

  const stats = [
    { value: '12k+', label: 'Active Donors' },
    { value: '450+', label: 'Hospitals' },
    { value: '85k', label: 'Lives Saved' },
    { value: '24/7', label: 'Availability' },
  ]

  const features = [
    {
      title: 'Real-time Proximity Matching',
      text: 'Our intelligent algorithm identifies the nearest eligible donors and hospitals, reducing critical response time by up to 40% in emergency situations.',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB6dH470jaLRM2xdNHK3wB3n_l7UHW6PdHVF10iS-1pucpC3L25WSyrYVJ5U0pYT5kJybVSRPN-8U4f0DJYW1RpWyuM4oo2KRVDOG6F2ULiSRMr-XnauVDHHZj28AjFaD5jSEfsGFKN1CUELMOjdAqMny9fUdMp-VPQO1dK5YcWcppZbWzjRZTcmSuemBuyitJzoarlwtW9I5WZgpUb6xF3iItcxlCLBbxAgOE2p5HogtY3kwwiAvPSZpfcxULf6KK3nqVyJtkUb_4',
    },
    {
      title: 'Verified Security',
      text: 'All medical records and donation history are encrypted with role-based access to protect donor privacy and hospital compliance.',
    },
    {
      title: 'Smart Scheduling',
      text: 'Book appointments, receive reminders, and track donation eligibility cycles with an experience that feels clear and effortless.',
    },
    {
      title: 'Inventory Analytics',
      text: 'Hospitals get a live view of urgent stock levels so shortages can be predicted early and managed with better coordination.',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBaDMJAnga_DIwNc_Y3cLcG5jXWCTHGzGcwBjtDTbCWTl0kus7snhov1zBFtglMNzK7a8-HMFKouxjtTbyt7BKS5OWJ7nc3vuL-It1rkW1w6QRWL8Nfh0bAV-zk4McsoW7Cd7DlPSZTauMe-bOZSgKB4d2GI4SH2YxU53R0krhUUDTWO0gPmbk9H82VEaXIoWpHEO5caYw9ro0XeVV3DOsybmn30vW_0_2LsHzqwU84H8GXKIZCdznZUeQx6Gk6sp3uVv7UMmON8Cc',
    },
  ]

  const heroImage =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDffjEBF-BKXYNHwhfCeaZw6PbswUmn8YIbTvt5HROIAbu7ujn5x8fHFo-s6sQDjXRF7v-g6cuj6cj_6WgI1riEl6ITRX3O8R7k2CcR63v1QNWKZQNKuPMzn8ZDIKQYIk0B4FQy94y46TaunTKAhrv_-QZtth13GV9ENykVXS7F6QC_3vH-2NYFeJ_pEJ8W6xamCK0k-A43a67WBvEOaev8nLCY_KE9z0n7u8Ti9ezDTDx71UOTSol5bykOVN2oYJn1UFshb-3JrFI'

  function openJoinModal() {
    setActiveModal('join')
    setSelectedRole('')
    setAuthError('')
  }

  function openLoginModal() {
    setActiveModal('login')
    setSelectedRole('')
    setAuthError('')
  }

  function openDonorRegisterModal() {
    setActiveModal('donor-register')
  }

  function openHospitalRegisterModal() {
    setActiveModal('hospital-register')
  }

  function openPatientRegisterModal() {
    setActiveModal('patient-register')
  }

  function closeModal() {
    setActiveModal('')
    setSelectedRole('')
    setShowPassword(false)
    setShowLoginPassword(false)
    setShowHospitalPassword(false)
    setShowPatientPassword(false)
    setAuthError('')
    setAuthLoading(false)
  }

  function handleJoinNext() {
    if (selectedRole === 'donor') {
      openDonorRegisterModal()
    }

    if (selectedRole === 'hospital') {
      openHospitalRegisterModal()
    }

    if (selectedRole === 'patient') {
      openPatientRegisterModal()
    }
  }

  function updateForm(setter, field, value) {
    setter((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleDonorLocationChange(location) {
    setDonorForm((current) => ({
      ...current,
      latitude: location.latitude,
      longitude: location.longitude,
    }))
  }

  async function submitAuthRequest(endpoint, payload) {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const validationErrors = data.errors ? Object.values(data.errors).flat() : []
      throw new Error(validationErrors[0] || data.message || 'Authentication failed.')
    }

    return data
  }

  function finishAuth(data) {
    clearAuthSession()
    setAuthSession(data)
    closeModal()
    navigate(getUserHomeRoute(data.user), { replace: true })
  }

  async function handleDonorRegister(event) {
    event.preventDefault()

    if (!donorForm.acceptedTerms) {
      setAuthError('Please accept the donor guidelines and privacy policy.')
      return
    }

    try {
      setAuthLoading(true)
      setAuthError('')
      // Keep the donor registration payload explicit so the API receives clean location data.
      const data = await submitAuthRequest('/register/donor', {
        name: donorForm.name,
        email: donorForm.email,
        phone: donorForm.phone,
        blood_group: donorForm.blood_group,
        township: donorForm.township,
        latitude: donorForm.latitude || null,
        longitude: donorForm.longitude || null,
        password: donorForm.password,
      })
      finishAuth(data)
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handlePatientRegister(event) {
    event.preventDefault()

    if (!patientForm.acceptedTerms) {
      setAuthError('Please confirm your details and accept the privacy policy.')
      return
    }

    try {
      setAuthLoading(true)
      setAuthError('')
      const data = await submitAuthRequest('/register/patient', patientForm)
      finishAuth(data)
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogin(event) {
    event.preventDefault()

    try {
      setAuthLoading(true)
      setAuthError('')
      const data = await submitAuthRequest('/login', loginForm)
      finishAuth(data)
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleHospitalRegister(event) {
    event.preventDefault()

    try {
      setAuthLoading(true)
      setAuthError('')
      clearAuthSession()
      const data = await submitAuthRequest('/register/hospital', hospitalForm)
      finishAuth(data)
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <div className="page-shell">
      <main className={`landing-page${activeModal ? ' landing-page--modal-open' : ''}`}>
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">+</span>
            <span>LifeBlood</span>
          </div>

          <nav className="nav-links" aria-label="Primary">
            <a href="#find-blood">Find Blood</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#about-us">About Us</a>
          </nav>

          <div className="nav-actions">
            <button className="pill-button pill-button--solid nav-button" type="button" onClick={openLoginModal}>
              Login
            </button>
            <button
              className="pill-button pill-button--solid nav-button"
              type="button"
              onClick={openJoinModal}
            >
              Register
            </button>
          </div>
        </header>

        <section className="hero" id="find-blood">
          <div className="hero-copy">
            <span className="badge">Trusted by local hospitals</span>
            <h1>Connecting blood donors with hospitals to save lives in real-time.</h1>
            <p>
              A seamless digital platform connecting donors, hospitals, and
              patients for faster emergency response and better community care.
            </p>

            <div className="hero-actions">
              <a className="pill-button pill-button--solid" href="#donate">
                Donate Now
              </a>
              <a className="pill-button pill-button--ghost" href="#how-it-works">
                Learn More
              </a>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-window">
              <div className="hero-window__bar">
                <span className="hero-window__title">BloodLink - Home</span>
                <span className="hero-window__meta">Restore</span>
              </div>
              <img className="hero-window__image" src={heroImage} alt="Blood donation center" />
            </div>
          </div>
        </section>

        <section className="stats-grid" aria-label="Platform statistics">
          {stats.map((item) => (
            <article className="stat-card" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </section>

        <section className="section-heading" id="how-it-works">
          <h2>Why Choose LifeBlood?</h2>
          <p>
            A modern blood donation platform built to improve speed, trust, and
            coordination across the whole donation journey.
          </p>
        </section>

        <section className="feature-layout">
          <article className="feature-card feature-card--wide feature-card--light">
            <div className="feature-copy">
              <h3>{features[0].title}</h3>
              <p>{features[0].text}</p>
            </div>
            <div className="feature-image feature-image--soft">
              <img src={features[0].image} alt="Proximity matching dashboard" />
            </div>
          </article>

          <article className="feature-card feature-card--green">
            <div className="feature-copy">
              <h3>{features[1].title}</h3>
              <p>{features[1].text}</p>
            </div>
          </article>

          <article className="feature-card feature-card--rose">
            <div className="feature-copy">
              <h3>{features[2].title}</h3>
              <p>{features[2].text}</p>
            </div>
          </article>

          <article className="feature-card feature-card--wide feature-card--dark">
            <div className="feature-image feature-image--dark">
              <img src={features[3].image} alt="Inventory analytics dashboard" />
            </div>
            <div className="feature-copy">
              <h3>{features[3].title}</h3>
              <p>{features[3].text}</p>
            </div>
          </article>
        </section>

        <section className="cta-banner" id="about-us">
          <h2>Ready to save a life today?</h2>
          <p>
            Register as a donor in minutes and help build a stronger emergency
            response network in your community.
          </p>
          <div className="cta-actions">
            <button
              className="pill-button pill-button--light nav-button"
              type="button"
              onClick={openJoinModal}
            >
              Become a Donor
            </button>
            <a className="pill-button pill-button--outline-light" href="#hospital">
              Hospital Inquiry
            </a>
          </div>
        </section>

        <footer className="footer">
          <div className="footer-brand">
            <div className="brand">
              <span className="brand-mark">+</span>
              <span>LifeBlood</span>
            </div>
            <p>
              Bridging the gap between healthcare and community-driven blood
              donation with faster, safer coordination.
            </p>
          </div>

          <div className="footer-links">
            <div>
              <h4>Resources</h4>
              <a href="#how-it-works">How It Works</a>
              <a href="#donor-guidelines">Donor Guidelines</a>
              <a href="#emergency-faq">Emergency FAQs</a>
            </div>

            <div>
              <h4>Company</h4>
              <a href="#about-us">About Us</a>
              <a href="#contact-support">Contact Support</a>
              <a href="#partner">Partner With Us</a>
            </div>

            <div>
              <h4>Connect</h4>
              <a href="#share">Share</a>
              <a href="#email">Email</a>
              <a href="#call">Call</a>
            </div>
          </div>
        </footer>
      </main>

      {activeModal === 'join' ? (
        <div
          className="join-modal-overlay"
          role="presentation"
          onClick={closeModal}
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
              <button className="back-home-button" type="button" onClick={closeModal}>
                <span aria-hidden="true">←</span>
                Back to home
              </button>

              <button
                className={`next-button${selectedRole ? ' next-button--enabled' : ''}`}
                type="button"
                disabled={!selectedRole}
                onClick={handleJoinNext}
              >
                Next
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {activeModal === 'donor-register' ? (
        <div className="join-modal-overlay" role="presentation" onClick={closeModal}>
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
              <button className="close-modal-button" type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            <form className="auth-form" onSubmit={handleDonorRegister}>
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
                    onLocationChange={handleDonorLocationChange}
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
                  <button className="inline-link" type="button" onClick={openLoginModal}>
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
      ) : null}

      {activeModal === 'login' ? (
        <div className="join-modal-overlay" role="presentation" onClick={closeModal}>
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
              <button className="close-modal-button" type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            <form className="auth-form" onSubmit={handleLogin}>
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
                  <button className="inline-link" type="button" onClick={openJoinModal}>
                    Register
                  </button>
                </p>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {activeModal === 'hospital-register' ? (
        <div className="join-modal-overlay" role="presentation" onClick={closeModal}>
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
                <button className="close-modal-button" type="button" onClick={closeModal}>
                  ×
                </button>
              </div>

              <form className="auth-form auth-form--hospital" onSubmit={handleHospitalRegister}>
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
      ) : null}

      {activeModal === 'patient-register' ? (
        <div className="join-modal-overlay" role="presentation" onClick={closeModal}>
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
              <button className="close-modal-button" type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            <form className="auth-form" onSubmit={handlePatientRegister}>
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
                  <button className="inline-link" type="button" onClick={openLoginModal}>
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
      ) : null}
    </div>
  )
}

export default App
