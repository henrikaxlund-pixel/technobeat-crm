import { OWNER_STYLES, fmtDate, fmtEur } from './KanbanBoard'

export default function DealCard({ deal, companyTotal = 0, onClick, onDragStart, isDragging }) {
  const ownerStyle = OWNER_STYLES[deal.owner] || OWNER_STYLES['Henrik Axlund']
  const isActive   = deal.stage === 'Active client'
  const pv = fmtEur(deal.projected_value)
  const sold = fmtEur(companyTotal)

  return (
    <div
      className={`card${isDragging ? ' dragging' : ''}`}
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onClick={onClick}
    >
      <div className="card-name">{deal.company || deal.client_name}</div>
      {deal.contact_person && <div className="card-contact">{deal.contact_person}</div>}
      {deal.opportunity    && <div className="card-opp">{deal.opportunity}</div>}
      {deal.engagement_type && <span className="card-engagement">{deal.engagement_type}</span>}

      <div className="card-row">
        <span className="card-date">{fmtDate(deal.last_contacted)}</span>
        <div className="card-badges">
          {isActive && sold
            ? <span className="badge-sold">{sold}</span>
            : pv
              ? <span className="badge-projected">~{pv}</span>
              : null}
          <div
            className="avatar"
            style={{ background: ownerStyle.bg, color: ownerStyle.color, width: 22, height: 22, fontSize: 9 }}
          >
            {ownerStyle.initials}
          </div>
        </div>
      </div>

      {deal.next_action && (
        <div className="card-note">→ {deal.next_action}</div>
      )}
    </div>
  )
}
