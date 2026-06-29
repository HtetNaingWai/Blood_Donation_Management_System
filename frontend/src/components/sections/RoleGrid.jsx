const roles = [
  {
    title: 'Donor',
    description:
      'Manage profile details, view eligibility, respond to emergency requests, and track donation activity.',
  },
  {
    title: 'Hospital',
    description:
      'Create urgent requests, review donor matches, and coordinate donation fulfillment.',
  },
  {
    title: 'Patient',
    description:
      'Search for suitable donor help through a controlled, privacy-aware workflow.',
  },
  {
    title: 'Admin',
    description:
      'Oversee verification, activity monitoring, access control, and platform governance.',
  },
]

function RoleGrid() {
  return (
    <section className="content-section" id="roles">
      <div className="section-heading">
        <p className="eyebrow">System actors</p>
        <h3>Planned user roles</h3>
      </div>

      <div className="role-grid">
        {roles.map((role) => (
          <article className="role-card" key={role.title}>
            <h4>{role.title}</h4>
            <p>{role.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default RoleGrid
