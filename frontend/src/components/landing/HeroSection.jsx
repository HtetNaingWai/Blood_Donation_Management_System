// Render the main landing hero section with the homepage message and preview image.
function HeroSection({ heroImage }) {
  return (
    <section className="hero" id="find-blood">
      <div className="hero-copy">
        <span className="badge">Trusted by local hospitals</span>
        <h1>Connecting blood donors with hospitals to save lives in real-time.</h1>
        <p>
          A seamless digital platform connecting donors, hospitals, and
          patients for faster emergency response and better community care.
        </p>

        <div className="hero-actions">
          <a className="pill-button pill-button--solid" href="#donate">
            Donate Now
          </a>
          <a className="pill-button pill-button--ghost" href="#how-it-works">
            Learn More
          </a>
        </div>
      </div>

      <div className="hero-visual" aria-hidden="true">
        <div className="hero-window">
          <div className="hero-window__bar">
            <span className="hero-window__title">BloodLink - Home</span>
            <span className="hero-window__meta">Restore</span>
          </div>
          <img className="hero-window__image" src={heroImage} alt="Blood donation center" />
        </div>
      </div>
    </section>
  )
}

export default HeroSection
