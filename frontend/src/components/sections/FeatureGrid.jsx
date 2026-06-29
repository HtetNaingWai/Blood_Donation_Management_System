const features = [
  'Donor registration and profile management',
  'Emergency blood request posting',
  'Donation history and eligibility tracking',
  'Role-based dashboard planning',
  'Location-aware donor and hospital discovery',
  'Real-time notifications and communication flow',
]

function FeatureGrid() {
  return (
    <section className="content-section">
      <div className="section-heading">
        <p className="eyebrow">Core scope</p>
        <h3>Starter feature map</h3>
      </div>

      <div className="feature-grid">
        {features.map((feature) => (
          <article className="feature-card" key={feature}>
            <span className="feature-index">0{features.indexOf(feature) + 1}</span>
            <p>{feature}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default FeatureGrid
