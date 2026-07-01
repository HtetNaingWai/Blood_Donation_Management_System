import { useEffect, useState } from 'react'
import adminService from '../../services/adminService'

function Reports() {
  const [dashboard, setDashboard] = useState({
    total_users: 0,
    total_donors: 0,
    total_patients: 0,
    total_hospitals: 0,
    total_donations: 0,
    active_requests: 0,
  })

  useEffect(() => {
    let isMounted = true

    adminService.getDashboard().then((data) => {
      if (isMounted) {
        setDashboard((current) => ({ ...current, ...data }))
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="admin-page">
      <div className="admin-stat-grid">
        <article className="admin-stat-card">
          <div className="admin-stat-card__header">
            <span>Total Users</span>
          </div>
          <strong>{dashboard.total_users}</strong>
          <p>Registered across every role</p>
        </article>
        <article className="admin-stat-card">
          <div className="admin-stat-card__header">
            <span>Total Donations</span>
          </div>
          <strong>{dashboard.total_donations}</strong>
          <p>Recorded donation entries</p>
        </article>
        <article className="admin-stat-card">
          <div className="admin-stat-card__header">
            <span>Hospitals</span>
          </div>
          <strong>{dashboard.total_hospitals}</strong>
          <p>Network facilities tracked</p>
        </article>
      </div>

      <article className="admin-panel">
        <div className="admin-panel__header">
          <h2>Operational Snapshot</h2>
        </div>
        <div className="admin-summary-grid">
          <div>
            <span>Donors</span>
            <strong>{dashboard.total_donors}</strong>
          </div>
          <div>
            <span>Patients</span>
            <strong>{dashboard.total_patients}</strong>
          </div>
          <div>
            <span>Active Requests</span>
            <strong>{dashboard.active_requests}</strong>
          </div>
          <div>
            <span>Donation Records</span>
            <strong>{dashboard.total_donations}</strong>
          </div>
        </div>
      </article>
    </section>
  )
}

export default Reports
