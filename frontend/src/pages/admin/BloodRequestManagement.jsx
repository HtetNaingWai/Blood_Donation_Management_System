import { useEffect, useState } from 'react'
import adminService from '../../services/adminService'

function BloodRequestManagement() {
  const [requests, setRequests] = useState([])

  useEffect(() => {
    let isMounted = true

    adminService.getBloodRequests().then((response) => {
      if (isMounted) {
        setRequests(response?.data || [])
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="admin-page">
      <article className="admin-panel">
        <div className="admin-panel__header">
          <h2>Blood Request Monitoring</h2>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Blood Group</th>
                <th>Units</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {requests.length ? (
                requests.map((request) => (
                  <tr key={request.id}>
                    <td>#{request.id}</td>
                    <td>{request.blood_group || 'N/A'}</td>
                    <td>{request.units_needed || 'N/A'}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${request.status || 'pending'}`}>
                        {request.status || 'pending'}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge admin-badge--${request.priority || 'inactive'}`}>
                        {request.priority || 'normal'}
                      </span>
                    </td>
                    <td>{request.created_at ? new Date(request.created_at).toLocaleString() : 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="admin-empty-row" colSpan="6">
                    No blood requests found.
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

export default BloodRequestManagement
