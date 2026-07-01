import { useEffect, useState } from 'react'
import adminService from '../../services/adminService'

function PatientManagement() {
  const [patients, setPatients] = useState([])

  useEffect(() => {
    let isMounted = true

    adminService.getPatients().then((response) => {
      if (isMounted) {
        setPatients(response?.data || [])
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
          <h2>Patient Registry</h2>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Needed Blood</th>
                <th>Location</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.length ? (
                patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.user?.name || 'Unknown patient'}</td>
                    <td>{patient.needed_blood_type || 'N/A'}</td>
                    <td>{patient.township || 'N/A'}</td>
                    <td>{patient.user?.phone || 'N/A'}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${patient.user?.status || 'pending'}`}>
                        {patient.user?.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="admin-empty-row" colSpan="5">
                    No patients found.
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

export default PatientManagement
