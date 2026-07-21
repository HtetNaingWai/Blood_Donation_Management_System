// Render the landing page top navigation and auth action buttons.
function Topbar({ onOpenLoginModal, onOpenJoinModal }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">+</span>
        <span>LifeBlood</span>
      </div>

      <nav className="nav-links" aria-label="Primary">
        <a href="#find-blood">Find Blood</a>
        <a href="#how-it-works">How It Works</a>
        <a href="#about-us">About Us</a>
      </nav>

      <div className="nav-actions">
        <button className="pill-button pill-button--solid nav-button" type="button" onClick={onOpenLoginModal}>
          Login
        </button>
        <button
          className="pill-button pill-button--solid nav-button"
          type="button"
          onClick={onOpenJoinModal}
        >
          Register
        </button>
      </div>
    </header>
  )
}

export default Topbar
