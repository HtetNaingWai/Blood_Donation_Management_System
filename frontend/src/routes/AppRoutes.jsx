import { Route, Routes } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import RoleDashboardPage from '../pages/RoleDashboardPage.jsx'
import UnauthorizedPage from '../pages/UnauthorizedPage.jsx'
import AdminDashboard from '../pages/admin/AdminDashboard.jsx'
import AuditLogs from '../pages/admin/AuditLogs.jsx'
import BloodRequestManagement from '../pages/admin/BloodRequestManagement.jsx'
import DonorManagement from '../pages/admin/DonorManagement.jsx'
import HospitalManagement from '../pages/admin/HospitalManagement.jsx'
import PatientManagement from '../pages/admin/PatientManagement.jsx'
import PendingHospitals from '../pages/admin/PendingHospitals.jsx'
import Reports from '../pages/admin/Reports.jsx'
import DonorDashboard from '../pages/donor/DonorDashboard.jsx'
import HospitalDashboard from '../pages/hospital/HospitalDashboard.jsx'
import HospitalPending from '../pages/hospital/HospitalPending.jsx'
import HospitalRejected from '../pages/hospital/HospitalRejected.jsx'
import SearchDonors from '../pages/hospital/SearchDonors.jsx'
import LandingPage from '../pages/landing/LandingPage.jsx'
import HospitalApprovedRoute from './HospitalApprovedRoute.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import RoleRoute from './RoleRoute.jsx'

// Central app routes keep page wiring separate from the React bootstrap file.
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Donor-only routes */}
      <Route element={<RoleRoute allowedRole="donor" />}>
        <Route path="/donor/dashboard" element={<DonorDashboard />} />
      </Route>

      <Route element={<RoleRoute allowedRole="patient" />}>
        <Route path="/patient/dashboard" element={<RoleDashboardPage role="patient" />} />
      </Route>

      {/* Hospital pending/rejected routes */}
      <Route element={<RoleRoute allowedRole="hospital" />}>
        <Route path="/hospital/pending" element={<HospitalPending />} />
        <Route path="/hospital/rejected" element={<HospitalRejected />} />
      </Route>

      {/* Approved hospital-only routes */}
      <Route element={<HospitalApprovedRoute />}>
        <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
        <Route path="/hospital/search-donors" element={<SearchDonors />} />
      </Route>

      {/* Admin-only routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="donors" element={<DonorManagement />} />
          <Route path="hospitals" element={<HospitalManagement />} />
          <Route path="hospitals/pending" element={<PendingHospitals />} />
          <Route path="patients" element={<PatientManagement />} />
          <Route path="blood-requests" element={<BloodRequestManagement />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit-logs" element={<AuditLogs />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default AppRoutes
