import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import './admin.css'
import App from './App.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AuditLogs from './pages/admin/AuditLogs.jsx'
import BloodRequestManagement from './pages/admin/BloodRequestManagement.jsx'
import DonorManagement from './pages/admin/DonorManagement.jsx'
import HospitalManagement from './pages/admin/HospitalManagement.jsx'
import PendingHospitals from './pages/admin/PendingHospitals.jsx'
import PatientManagement from './pages/admin/PatientManagement.jsx'
import Reports from './pages/admin/Reports.jsx'
import DonorDashboard from './pages/donor/DonorDashboard.jsx'
import RoleDashboardPage from './pages/RoleDashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import UnauthorizedPage from './pages/UnauthorizedPage.jsx'
import HospitalPending from './pages/hospital/HospitalPending.jsx'
import HospitalRejected from './pages/hospital/HospitalRejected.jsx'
import HospitalApprovedRoute from './routes/HospitalApprovedRoute.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import RoleRoute from './routes/RoleRoute.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route element={<RoleRoute allowedRole="donor" />}>
          <Route path="/donor/dashboard" element={<DonorDashboard />} />
        </Route>

        <Route element={<RoleRoute allowedRole="patient" />}>
          <Route path="/patient/dashboard" element={<RoleDashboardPage role="patient" />} />
        </Route>

        <Route element={<RoleRoute allowedRole="hospital" />}>
          <Route path="/hospital/pending" element={<HospitalPending />} />
          <Route path="/hospital/rejected" element={<HospitalRejected />} />
        </Route>

        <Route element={<HospitalApprovedRoute />}>
          <Route path="/hospital/dashboard" element={<RoleDashboardPage role="hospital" />} />
        </Route>

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
    </BrowserRouter>
  </StrictMode>,
)
