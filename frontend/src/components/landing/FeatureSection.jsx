// Render the landing page feature heading and the four feature cards.
function FeatureSection({ features }) {
  return (
    <>
      <section className="section-heading" id="how-it-works">
        <h2>Why Choose LifeBlood?</h2>
        <p>
          A modern blood donation platform built to improve speed, trust, and
          coordination across the whole donation journey.
        </p>
      </section>

      <section className="feature-layout">
        <article className="feature-card feature-card--wide feature-card--light">
          <div className="feature-copy">
            <h3>{features[0].title}</h3>
            <p>{features[0].text}</p>
          </div>
          <div className="feature-image feature-image--soft">
            <img src={features[0].image} alt="Proximity matching dashboard" />
          </div>
        </article>

        <article className="feature-card feature-card--green">
          <div className="feature-copy">
            <h3>{features[1].title}</h3>
            <p>{features[1].text}</p>
          </div>
        </article>

        <article className="feature-card feature-card--rose">
          <div className="feature-copy">
            <h3>{features[2].title}</h3>
            <p>{features[2].text}</p>
          </div>
        </article>

        <article className="feature-card feature-card--wide feature-card--dark">
          <div className="feature-image feature-image--dark">
            <img src={features[3].image} alt="Inventory analytics dashboard" />
          </div>
          <div className="feature-copy">
            <h3>{features[3].title}</h3>
            <p>{features[3].text}</p>
          </div>
        </article>
      </section>
    </>
  )
}

export default FeatureSection
