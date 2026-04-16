import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import StatsBar from './StatsBar'
import KanbanColumn from './KanbanColumn'
import DealModal from './DealModal'

export const STAGES = [
  { id: 'Lead',          bg: '#F0EDE8', color: '#6B6860' },
  { id: 'Contacted',     bg: '#EAF1F8', color: '#2C5F8A' },
  { id: 'Proposal sent', bg: '#F0EAF8', color: '#5C3D8A' },
  { id: 'Negotiation',   bg: '#FAF0E0', color: '#8A5C1A' },
  { id: 'Active client', bg: '#E6F4EE', color: '#1A6B4A' },
  { id: 'Archived',      bg: '#F0EDE8', color: '#A09D97' },
]

export const OWNERS = ['Henrik Axlund', 'Riina Rinkinen']

export const OWNER_STYLES = {
  'Henrik Axlund':  { bg: '#EAF1F8', color: '#2C5F8A', initials: 'HA' },
  'Riina Rinkinen': { bg: '#E6F4EE', color: '#1A6B4A', initials: 'RR' },
}

export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })
}

export function fmtEur(v) {
  const n = parseFloat(v)
  if (!v || isNaN(n)) return null
  return '€' + n.toLocaleString('fi-FI')
}

export default function KanbanBoard({ session }) {
  const [deals, setDeals]           = useState([])
  const [modal, setModal]           = useState(null)
  const [dragId, setDragId]         = useState(null)
  const [activeStage, setActiveStage] = useState(STAGES[0].id)

  const email = session.user.email
  const currentOwner = email.toLowerCase().includes('henrik') ? 'Henrik Axlund'
                      : email.toLowerCase().includes('riina')  ? 'Riina Rinkinen'
                      : OWNERS[0]
  const ownerStyle = OWNER_STYLES[currentOwner] || OWNER_STYLES['Henrik Axlund']

  const fetchDeals = useCallback(async () => {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) setDeals(data)
  }, [])

  useEffect(() => {
    fetchDeals()
    const channel = supabase
      .channel('deals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, fetchDeals)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchDeals])

  async function createDeal(fields) {
    const { error } = await supabase.from('deals').insert([fields])
    if (error) alert('Error saving deal: ' + error.message)
    else setModal(null)
  }

  async function updateDeal(id, fields) {
    const { error } = await supabase.from('deals').update(fields).eq('id', id)
    if (error) alert('Error updating deal: ' + error.message)
    else setModal(null)
  }

  async function moveDeal(id, stage) {
    await supabase.from('deals').update({ stage }).eq('id', id)
    setModal(null)
  }

  async function deleteDeal(id) {
    if (!confirm('Remove this deal from the pipeline?')) return
    await supabase.from('deals').delete().eq('id', id)
    setModal(null)
  }

  function onDragStart(id) { setDragId(id) }

  async function onDrop(stage) {
    if (!dragId) return
    await moveDeal(dragId, stage)
    setDragId(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const activeStageObj = STAGES.find(s => s.id === activeStage)

  return (
    <div>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-logo">Techno<span> Beat</span></div>
        <div className="topbar-user">
          <div className="avatar" style={{ background: ownerStyle.bg, color: ownerStyle.color }}>
            {ownerStyle.initials}
          </div>
          <span className="topbar-name">{currentOwner}</span>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
        <button className="add-btn-top" onClick={() => setModal({ type: 'add', stage: activeStage })}>
          + Add
        </button>
      </div>

      {/* Stats */}
      <StatsBar deals={deals} />

      {/* Mobile stage tabs */}
      <div className="stage-tabs">
        {STAGES.map(stage => (
          <button
            key={stage.id}
            className={`stage-tab${activeStage === stage.id ? ' active' : ''}`}
            style={activeStage === stage.id ? { background: stage.bg, color: stage.color } : {}}
            onClick={() => setActiveStage(stage.id)}
          >
            {stage.id}
            <span className="stage-tab-count">
              {deals.filter(d => d.stage === stage.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Board — desktop shows all columns, mobile shows active only */}
      <div className="board-wrap">
        <div className="board">
          {STAGES.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={deals.filter(d => d.stage === stage.id)}
              onAddDeal={() => setModal({ type: 'add', stage: stage.id })}
              onOpenDeal={deal => setModal({ type: 'detail', deal })}
              onDragStart={onDragStart}
              onDrop={onDrop}
              dragId={dragId}
              isMobileActive={activeStage === stage.id}
            />
          ))}
        </div>
      </div>

      {modal && (
        <DealModal
          modal={modal.type === 'detail'
            ? { ...modal, deal: deals.find(d => d.id === modal.deal?.id) || modal.deal }
            : modal}
          currentOwner={currentOwner}
          onClose={() => setModal(null)}
          onCreate={createDeal}
          onUpdate={updateDeal}
          onMove={moveDeal}
          onDelete={deleteDeal}
        />
      )}
    </div>
  )
}
