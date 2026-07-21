// Render the landing page platform statistics cards.
function StatsGrid({ stats }) {
  return (
    <section className="stats-grid" aria-label="Platform statistics">
      {stats.map((item) => (
        <article className="stat-card" key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </article>
      ))}
    </section>
  )
}

export default StatsGrid
