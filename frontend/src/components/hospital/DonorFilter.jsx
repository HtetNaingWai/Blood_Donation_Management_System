// Filter controls keep donor discovery fast without changing the existing portal layout.
function DonorFilter({ filters, options, onChange, onReset }) {
  return (
    <section className="hospital-search-donors__filters hospital-panel">
      <div className="hospital-panel__header hospital-panel__header--split">
        <div>
          <h2>Filter Donors</h2>
          <p>Refine donor matches by blood type, location, status, and radius.</p>
        </div>
        <button type="button" onClick={onReset}>Reset</button>
      </div>

      <div className="hospital-search-donors__filter-grid">
        <label className="hospital-search-donors__field">
          <span>Blood Group</span>
          <select value={filters.bloodGroup} onChange={(event) => onChange('bloodGroup', event.target.value)}>
            <option value="all">All blood groups</option>
            {options.bloodGroups.map((bloodGroup) => (
              <option key={bloodGroup} value={bloodGroup}>
                {bloodGroup}
              </option>
            ))}
          </select>
        </label>

        <label className="hospital-search-donors__field">
          <span>Township</span>
          <select value={filters.township} onChange={(event) => onChange('township', event.target.value)}>
            <option value="all">All townships</option>
            {options.townships.map((township) => (
              <option key={township} value={township}>
                {township}
              </option>
            ))}
          </select>
        </label>

        <label className="hospital-search-donors__field">
          <span>Availability</span>
          <select value={filters.availability} onChange={(event) => onChange('availability', event.target.value)}>
            <option value="all">All availability</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="temporarily_ineligible">Temporarily Ineligible</option>
          </select>
        </label>

        <label className="hospital-search-donors__field">
          <span>Distance Radius</span>
          <select value={filters.radiusKm} onChange={(event) => onChange('radiusKm', event.target.value)}>
            {options.radii.map((radiusKm) => (
              <option key={radiusKm} value={radiusKm}>
                {radiusKm} km
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}

export default DonorFilter
