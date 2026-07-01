import { useEffect, useState } from 'react'
import adminService from '../../services/adminService'

function PendingHospitals() {
  const [hospitals, setHospitals] = useState([])
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    let isMounted = true

    adminService.getPendingHospitals().then((response) => {
      if (isMounted) {
        setHospitals(response?.data || [])
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  async function handleApprove(id) {
    setProcessingId(id)
    const response = await adminService.approveHospital(id)
    setHospitals((current) => current.filter((hospital) => hospital.id !== id || !response?.data))
    setProcessingId(null)
  }

  async function handleReject(id) {
    const rejectionReason = window.prompt('Enter a rejection reason for this hospital (optional):', '') ?? ''

    setProcessingId(id)
    const response = await adminService.rejectHospital(id, rejectionReason)
    setHospitals((current) => current.filter((hospital) => hospital.id !== id || !response?.data))
    setProcessingId(null)
  }

  return (
    <section className="admin-page">
      <article className="admin-panel">
        <div className="admin-panel__header">
          <h2>Pending Hospital Approvals</h2>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Hospital Name</th>
                <th>License Number</th>
                <th>Address</th>
                <th>Registered Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.length ? (
                hospitals.map((hospital) => (
                  <tr key={hospital.id}>
                    <td>{hospital.hospital_name || hospital.user?.name || 'Hospital'}</td>
                    <td>{hospital.license_number || 'N/A'}</td>
                    <td>{hospital.address || 'N/A'}</td>
                    <td>{hospital.created_at ? new Date(hospital.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <span className="admin-badge admin-badge--pending">
                        {hospital.approval_status || 'pending'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        <button type="button" className="admin-action admin-action--neutral">
                          View Details
                        </button>
                        <button
                          type="button"
                          className="admin-action admin-action--success"
                          disabled={processingId === hospital.id}
                          onClick={() => handleApprove(hospital.id)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="admin-action admin-action--danger"
                          disabled={processingId === hospital.id}
                          onClick={() => handleReject(hospital.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="admin-empty-row" colSpan="6">
                    No pending hospitals found.
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

export default PendingHospitals
