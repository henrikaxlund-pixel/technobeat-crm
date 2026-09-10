import { useState } from 'react'
import DealCard from './DealCard'

export default function KanbanColumn({ stage, deals, onAddDeal, onOpenDeal, onDragStart, onReorder, dragId, companyTotals = {}, isMobileActive }) {
  const [over, setOver] = useState(false)
  const [indicator, setIndicator] = useState(null) // { id, before } | 'end' | null

  const ordered = [...deals].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  // Translate a drop on a card + half into the id to insert before (null = end).
  function beforeIdFor(cardId, before) {
    const idx = ordered.findIndex(d => d.id === cardId)
    if (before) return cardId
    const next = ordered[idx + 1]
    return next ? next.id : null
  }

  function cardHalf(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    return (e.clientY - rect.top) < rect.height / 2 // true = top half = insert before
  }

  function handleCardDragOver(e, cardId) {
    if (!dragId) return
    e.preventDefault()
    setOver(true)
    setIndicator({ id: cardId, before: cardHalf(e) })
  }

  function handleCardDrop(e, cardId) {
    e.preventDefault()
    e.stopPropagation()
    const before = cardHalf(e)
    setOver(false)
    setIndicator(null)
    onReorder(stage.id, beforeIdFor(cardId, before))
  }

  function handleZoneDragOver(e) {
    e.preventDefault()
    setOver(true)
    if (e.target === e.currentTarget) setIndicator('end')
  }

  function handleZoneLeave(e) {
    if (e.target === e.currentTarget) { setOver(false); setIndicator(null) }
  }

  function handleZoneDrop(e) {
    e.preventDefault()
    setOver(false)
    setIndicator(null)
    onReorder(stage.id, null) // append to end
  }

  return (
    <div className={`col${isMobileActive ? ' mobile-active' : ''}`}>
      <div className="col-header" style={{ background: stage.bg, color: stage.color }}>
        <span>{stage.id}</span>
        <span className="col-count">{ordered.length}</span>
      </div>

      <div
        className={`col-drop-zone${over ? ' drag-over' : ''}`}
        onDragOver={handleZoneDragOver}
        onDragLeave={handleZoneLeave}
        onDrop={handleZoneDrop}
      >
        {ordered.map(deal => (
          <div
            key={deal.id}
            onDragOver={e => handleCardDragOver(e, deal.id)}
            onDrop={e => handleCardDrop(e, deal.id)}
          >
            {indicator && indicator.id === deal.id && indicator.before && <div className="drop-line" />}
            <DealCard
              deal={deal}
              companyTotal={companyTotals[deal.company || deal.client_name] || 0}
              onClick={() => onOpenDeal(deal)}
              onDragStart={() => onDragStart(deal.id)}
              isDragging={dragId === deal.id}
            />
            {indicator && indicator.id === deal.id && !indicator.before && <div className="drop-line" />}
          </div>
        ))}

        {indicator === 'end' && <div className="drop-line" />}

        <button className="add-here" onClick={onAddDeal}>+ Add here</button>
      </div>
    </div>
  )
}
