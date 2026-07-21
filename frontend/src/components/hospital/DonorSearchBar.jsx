// Search input for narrowing donor cards by name, blood group, or township.
function DonorSearchBar({ value, onChange, resultCount }) {
  return (
    <section className="hospital-search-donors__searchbar hospital-panel">
      <div className="hospital-panel__header">
        <h2>Search Donors</h2>
        <p>Find eligible blood donors near your hospital.</p>
      </div>

      <div className="hospital-search-donors__searchbar-row">
        <label className="hospital-search-donors__query">
          <span aria-hidden="true">⌕</span>
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search by donor name, blood group, or township..."
          />
        </label>

        <div className="hospital-search-donors__summary">
          <strong>{resultCount}</strong>
          <span>matching donors</span>
        </div>
      </div>
    </section>
  )
}

export default DonorSearchBar
