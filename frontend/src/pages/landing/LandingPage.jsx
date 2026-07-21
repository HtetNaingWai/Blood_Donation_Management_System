import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DonorRegisterModal from '../../components/auth/DonorRegisterModal'
import HospitalRegisterModal from '../../components/auth/HospitalRegisterModal'
import JoinModal from '../../components/auth/JoinModal'
import LoginModal from '../../components/auth/LoginModal'
import PatientRegisterModal from '../../components/auth/PatientRegisterModal'
import CtaBanner from '../../components/landing/CtaBanner'
import FeatureSection from '../../components/landing/FeatureSection'
import Footer from '../../components/landing/Footer'
import HeroSection from '../../components/landing/HeroSection'
import StatsGrid from '../../components/landing/StatsGrid'
import Topbar from '../../components/landing/Topbar'
import { apiBaseUrl } from '../../config/api'
import { clearAuthSession, getUserHomeRoute, setAuthSession } from '../../services/authStorage'

// Landing page controller for homepage content plus login and registration modal state.
function LandingPage() {
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
        <Topbar onOpenLoginModal={openLoginModal} onOpenJoinModal={openJoinModal} />
        <HeroSection heroImage={heroImage} />
        <StatsGrid stats={stats} />
        <FeatureSection features={features} />
        <CtaBanner onOpenJoinModal={openJoinModal} />
        <Footer />
      </main>

      {activeModal === 'join' ? (
        <JoinModal
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          onCloseModal={closeModal}
          onHandleJoinNext={handleJoinNext}
        />
      ) : null}

      {activeModal === 'donor-register' ? (
        <DonorRegisterModal
          donorForm={donorForm}
          setDonorForm={setDonorForm}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          authError={authError}
          authLoading={authLoading}
          updateForm={updateForm}
          onCloseModal={closeModal}
          onHandleDonorRegister={handleDonorRegister}
          onOpenLoginModal={openLoginModal}
          onHandleDonorLocationChange={handleDonorLocationChange}
        />
      ) : null}

      {activeModal === 'login' ? (
        <LoginModal
          loginForm={loginForm}
          setLoginForm={setLoginForm}
          showLoginPassword={showLoginPassword}
          setShowLoginPassword={setShowLoginPassword}
          authError={authError}
          authLoading={authLoading}
          updateForm={updateForm}
          onCloseModal={closeModal}
          onHandleLogin={handleLogin}
          onOpenJoinModal={openJoinModal}
        />
      ) : null}

      {activeModal === 'hospital-register' ? (
        <HospitalRegisterModal
          hospitalForm={hospitalForm}
          setHospitalForm={setHospitalForm}
          showHospitalPassword={showHospitalPassword}
          setShowHospitalPassword={setShowHospitalPassword}
          authError={authError}
          authLoading={authLoading}
          updateForm={updateForm}
          onCloseModal={closeModal}
          onHandleHospitalRegister={handleHospitalRegister}
        />
      ) : null}

      {activeModal === 'patient-register' ? (
        <PatientRegisterModal
          patientForm={patientForm}
          setPatientForm={setPatientForm}
          showPatientPassword={showPatientPassword}
          setShowPatientPassword={setShowPatientPassword}
          authError={authError}
          authLoading={authLoading}
          updateForm={updateForm}
          onCloseModal={closeModal}
          onHandlePatientRegister={handlePatientRegister}
          onOpenLoginModal={openLoginModal}
        />
      ) : null}
    </div>
  )
}

export default LandingPage
