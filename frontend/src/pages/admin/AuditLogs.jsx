import { useEffect, useState } from 'react'
import adminService from '../../services/adminService'

function AuditLogs() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    let isMounted = true

    adminService.getAuditLogs().then((response) => {
      if (isMounted) {
        setLogs(response?.data || [])
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
          <h2>Audit Trail</h2>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Action</th>
                <th>Description</th>
                <th>User ID</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {logs.length ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>#{log.id}</td>
                    <td>{log.action || 'activity'}</td>
                    <td>{log.description || 'System activity recorded.'}</td>
                    <td>{log.user_id || 'N/A'}</td>
                    <td>{log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="admin-empty-row" colSpan="5">
                    No audit logs found.
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

export default AuditLogs
