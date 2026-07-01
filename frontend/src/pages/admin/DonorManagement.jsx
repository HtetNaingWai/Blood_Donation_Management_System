import { useEffect, useState } from 'react'
import adminService from '../../services/adminService'

function DonorManagement() {
  const [donors, setDonors] = useState([])

  useEffect(() => {
    let isMounted = true

    adminService.getDonors().then((response) => {
      if (isMounted) {
        setDonors(response?.data || [])
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
          <h2>Donor Directory</h2>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Blood Group</th>
                <th>Location</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {donors.length ? (
                donors.map((donor) => (
                  <tr key={donor.id}>
                    <td>{donor.user?.name || 'Unknown donor'}</td>
                    <td>{donor.blood_type || 'N/A'}</td>
                    <td>{donor.general_location || donor.contact_address || 'N/A'}</td>
                    <td>{donor.user?.phone || 'N/A'}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${donor.user?.status || 'pending'}`}>
                        {donor.user?.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="admin-empty-row" colSpan="5">
                    No donors found.
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

export default DonorManagement
