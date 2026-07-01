import { useEffect, useState } from 'react'
import adminService from '../../services/adminService'

const emptyDashboard = {
  total_users: 0,
  total_donors: 0,
  total_patients: 0,
  total_hospitals: 0,
  verified_hospitals: 0,
  pending_hospitals: 0,
  active_requests: 0,
  critical_requests: 0,
  total_donations: 0,
  recent_users: [],
  recent_activities: [],
}

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      const data = await adminService.getDashboard()

      if (isMounted) {
        setDashboard({
          ...emptyDashboard,
          ...data,
          recent_users: data?.recent_users || [],
          recent_activities: data?.recent_activities || [],
        })
        setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const statCards = [
    { label: 'Total Users', value: dashboard.total_users, tone: 'red', meta: `${dashboard.total_donors} donors` },
    { label: 'Verified Hospitals', value: dashboard.verified_hospitals, tone: 'green', meta: `${dashboard.pending_hospitals} pending` },
    { label: 'Active Requests', value: dashboard.active_requests, tone: 'amber', meta: `${dashboard.critical_requests} critical` },
    { label: 'Total Donations', value: dashboard.total_donations, tone: 'rose', meta: `${dashboard.total_patients} patients tracked` },
  ]

  return (
    <section className="admin-page">
      <div className="admin-stat-grid">
        {statCards.map((card) => (
          <article className="admin-stat-card" key={card.label}>
            <div className="admin-stat-card__header">
              <span>{card.label}</span>
              <span className={`admin-stat-card__icon admin-stat-card__icon--${card.tone}`} aria-hidden="true">
                ●
              </span>
            </div>
            <strong>{loading ? '...' : card.value}</strong>
            <p>{card.meta}</p>
          </article>
        ))}
      </div>

      <div className="admin-grid admin-grid--dashboard">
        <article className="admin-panel">
          <div className="admin-panel__header">
            <h2>Platform Summary</h2>
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
              <span>Hospitals</span>
              <strong>{dashboard.total_hospitals}</strong>
            </div>
            <div>
              <span>Critical Requests</span>
              <strong>{dashboard.critical_requests}</strong>
            </div>
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <h2>System Activity</h2>
          </div>
          <div className="admin-activity-list">
            {(dashboard.recent_activities || []).length ? (
              dashboard.recent_activities.map((activity) => (
                <div className="admin-activity-item" key={`${activity.id}-${activity.created_at || ''}`}>
                  <span className="admin-activity-item__dot" />
                  <div>
                    <strong>{activity.action || 'Activity'}</strong>
                    <p>{activity.description || 'System event recorded.'}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="admin-empty-state">No recent activities available yet.</p>
            )}
          </div>
        </article>
      </div>

      <article className="admin-panel">
        <div className="admin-panel__header">
          <h2>Recent Users</h2>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard.recent_users || []).length ? (
                dashboard.recent_users.map((user) => (
                  <tr key={user.id}>
                    <td>#{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${user.status || 'pending'}`}>
                        {user.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="admin-empty-row" colSpan="5">
                    No users available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}

export default AdminDashboard
