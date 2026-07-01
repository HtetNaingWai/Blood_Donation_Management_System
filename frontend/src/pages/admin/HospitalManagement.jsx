import { useEffect, useState } from 'react'
import adminService from '../../services/adminService'

function HospitalManagement() {
  const [hospitals, setHospitals] = useState([])
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    let isMounted = true

    adminService.getHospitals().then((response) => {
      if (isMounted) {
        setHospitals(response?.data || [])
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  async function updateHospital(id, action) {
    setProcessingId(id)

    const response =
      action === 'approve'
        ? await adminService.approveHospital(id)
        : await adminService.rejectHospital(id)

    const updatedHospital = response?.data

    setHospitals((current) =>
      current.map((hospital) => (hospital.id === id && updatedHospital ? updatedHospital : hospital)),
    )
    setProcessingId(null)
  }

  return (
    <section className="admin-page">
      <article className="admin-panel">
        <div className="admin-panel__header">
          <h2>Hospital Verification Queue</h2>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Hospital</th>
                <th>License</th>
                <th>Email</th>
                <th>Status</th>
                <th>Approval</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.length ? (
                hospitals.map((hospital) => (
                  <tr key={hospital.id}>
                    <td>{hospital.hospital_name || hospital.user?.name || 'Hospital'}</td>
                    <td>{hospital.license_number || 'N/A'}</td>
                    <td>{hospital.user?.email || 'N/A'}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${hospital.user?.status || 'pending'}`}>
                        {hospital.user?.status || 'pending'}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge admin-badge--${hospital.approval_status || 'pending'}`}>
                        {hospital.approval_status || 'pending'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        <button
                          type="button"
                          className="admin-action admin-action--success"
                          disabled={processingId === hospital.id}
                          onClick={() => updateHospital(hospital.id, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="admin-action admin-action--danger"
                          disabled={processingId === hospital.id}
                          onClick={() => updateHospital(hospital.id, 'reject')}
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
                    No hospitals found.
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

export default HospitalManagement
