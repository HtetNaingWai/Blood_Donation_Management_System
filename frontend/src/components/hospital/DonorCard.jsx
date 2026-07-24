function formatAvailability(status) {
  const labels = {
    available: 'Available',
    unavailable: 'Unavailable',
    temporarily_ineligible: 'Temporarily Ineligible',
  }

  return labels[status] || 'Unknown'
}

// Individual donor summary card used in the hospital search results grid.
function DonorCard({ donor, onRequestBlood, onMessage }) {
  return (
    <article className="hospital-search-donors__card hospital-panel">
      <div className="hospital-search-donors__card-top">
        <div>
          <strong>{donor.name}</strong>
          <p>{donor.township}</p>
        </div>
        <span className="hospital-table__group">{donor.bloodGroup}</span>
      </div>

      <dl className="hospital-search-donors__meta">
        <div>
          <dt>Distance</dt>
          <dd>{donor.distanceLabel}</dd>
        </div>
        <div>
          <dt>Availability</dt>
          <dd>
            <span className={`hospital-search-donors__badge hospital-search-donors__badge--${donor.availabilityStatus}`}>
              {formatAvailability(donor.availabilityStatus)}
            </span>
          </dd>
        </div>
        <div>
          <dt>Last Donation</dt>
          <dd>{donor.lastDonationDate}</dd>
        </div>
      </dl>

      <div className="hospital-search-donors__card-actions">
        <button
          type="button"
          className="hospital-search-donors__request-button"
          onClick={() => onRequestBlood?.(donor)}
        >
          Request Blood
        </button>

        <button
          type="button"
          className="hospital-search-donors__secondary-button"
          onClick={() => onMessage?.(donor)}
        >
          Message
        </button>
      </div>
    </article>
  )
}

export default DonorCard
