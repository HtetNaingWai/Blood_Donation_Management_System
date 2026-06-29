function HeroSection({ apiStatus }) {
  return (
    <section className="hero-section">
      <div className="hero-copy">
        <p className="eyebrow">Emergency coordination made practical</p>
        <h2>Connect donors, hospitals, patients, and admins in one system.</h2>
        <p className="hero-text">
          LifeBlood is the foundation for a smart blood donation workflow with
          donor discovery, emergency requests, eligibility tracking, and faster
          hospital communication.
        </p>
      </div>

      <aside className="status-panel">
        <p className="status-label">Backend status</p>
        <strong>{apiStatus.label}</strong>
        <p>{apiStatus.detail}</p>
      </aside>
    </section>
  )
}

export default HeroSection
