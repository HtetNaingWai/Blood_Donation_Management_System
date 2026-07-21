// Render the landing page call-to-action banner above the footer.
function CtaBanner({ onOpenJoinModal }) {
  return (
    <section className="cta-banner" id="about-us">
      <h2>Ready to save a life today?</h2>
      <p>
        Register as a donor in minutes and help build a stronger emergency
        response network in your community.
      </p>
      <div className="cta-actions">
        <button
          className="pill-button pill-button--light nav-button"
          type="button"
          onClick={onOpenJoinModal}
        >
          Become a Donor
        </button>
        <a className="pill-button pill-button--outline-light" href="#hospital">
          Hospital Inquiry
        </a>
      </div>
    </section>
  )
}

export default CtaBanner
