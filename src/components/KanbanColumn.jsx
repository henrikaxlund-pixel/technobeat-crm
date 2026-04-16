import { useState } from 'react'
import DealCard from './DealCard'

export default function KanbanColumn({ stage, deals, onAddDeal, onOpenDeal, onDragStart, onDrop, dragId, isMobileActive }) {
  const [over, setOver] = useState(false)

  function handleDragOver(e) {
    e.preventDefault()
    setOver(true)
  }

  function handleDragLeave() {
    setOver(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setOver(false)
    onDrop(stage.id)
  }

  return (
    <div className={`col${isMobileActive ? ' mobile-active' : ''}`}>
      <div className="col-header" style={{ background: stage.bg, color: stage.color }}>
        <span>{stage.id}</span>
        <span className="col-count">{deals.length}</span>
      </div>

      <div
        className={`col-drop-zone${over ? ' drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {deals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            onClick={() => onOpenDeal(deal)}
            onDragStart={() => onDragStart(deal.id)}
            isDragging={dragId === deal.id}
          />
        ))}

        <button className="add-here" onClick={onAddDeal}>+ Add here</button>
      </div>
    </div>
  )
}
