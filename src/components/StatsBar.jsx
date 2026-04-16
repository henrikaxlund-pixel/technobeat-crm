export default function StatsBar({ deals }) {
  const active    = deals.filter(d => d.stage === 'Active client')
  const pipeline  = deals.filter(d => !['Active client', 'Archived'].includes(d.stage))

  const soldVal = active.reduce((s, d) => s + (parseFloat(d.sold_value) || 0), 0)
  const projVal = pipeline.reduce((s, d) => s + (parseFloat(d.projected_value) || 0), 0)

  function fmt(n) {
    return n ? '€' + n.toLocaleString('fi-FI') : '—'
  }

  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-label">Active clients</div>
        <div className="stat-value green">{active.length}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Sold value</div>
        <div className="stat-value green">{fmt(soldVal)}</div>
      </div>
      <div className="stat-divider" />
      <div className="stat-card">
        <div className="stat-label">In pipeline</div>
        <div className="stat-value accent">{pipeline.length}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Projected value</div>
        <div className="stat-value amber">{fmt(projVal)}</div>
      </div>
      <div className="stat-divider" />
      <div className="stat-card">
        <div className="stat-label">Total leads</div>
        <div className="stat-value">{deals.filter(d => d.stage !== 'Archived').length}</div>
      </div>
    </div>
  )
}
