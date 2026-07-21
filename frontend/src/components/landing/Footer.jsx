// Render the landing page footer with resource, company, and contact links.
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <div className="brand">
          <span className="brand-mark">+</span>
          <span>LifeBlood</span>
        </div>
        <p>
          Bridging the gap between healthcare and community-driven blood
          donation with faster, safer coordination.
        </p>
      </div>

      <div className="footer-links">
        <div>
          <h4>Resources</h4>
          <a href="#how-it-works">How It Works</a>
          <a href="#donor-guidelines">Donor Guidelines</a>
          <a href="#emergency-faq">Emergency FAQs</a>
        </div>

        <div>
          <h4>Company</h4>
          <a href="#about-us">About Us</a>
          <a href="#contact-support">Contact Support</a>
          <a href="#partner">Partner With Us</a>
        </div>

        <div>
          <h4>Connect</h4>
          <a href="#share">Share</a>
          <a href="#email">Email</a>
          <a href="#call">Call</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
