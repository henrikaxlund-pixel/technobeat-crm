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

export const ENGAGEMENT_TYPES = ['Project', 'Fractional', 'Both']

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
  const [projects, setProjects]     = useState([])
  const [modal, setModal]           = useState(null)
  const [dragId, setDragId]         = useState(null)
  const [activeStage, setActiveStage] = useState(STAGES[0].id)
  const [ownerFilter, setOwnerFilter] = useState(() => {
    try { return localStorage.getItem('tb_owner_filter') || 'all' } catch { return 'all' }
  })

  useEffect(() => {
    try { localStorage.setItem('tb_owner_filter', ownerFilter) } catch { /* ignore */ }
  }, [ownerFilter])

  const email = session.user.email
  const currentOwner = email.toLowerCase().includes('henrik') ? 'Henrik Axlund'
                      : email.toLowerCase().includes('riina')  ? 'Riina Rinkinen'
                      : OWNERS[0]
  const ownerStyle = OWNER_STYLES[currentOwner] || OWNER_STYLES['Henrik Axlund']

  const fetchDeals = useCallback(async () => {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('position', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    if (!error) setDeals(data)
  }, [])

  const fetchProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('year', { ascending: false, nullsFirst: false })
    if (!error) setProjects(data)
  }, [])

  useEffect(() => {
    fetchDeals()
    fetchProjects()
    const channel = supabase
      .channel('crm-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, fetchDeals)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchProjects)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchDeals, fetchProjects])

  async function createDeal(fields) {
    // New cards go to the bottom of their column.
    const maxPos = deals.reduce((m, d) => Math.max(m, d.position ?? 0), 0)
    const { error } = await supabase.from('deals').insert([{ ...fields, position: maxPos + 1 }])
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

  async function addProject(company, fields) {
    const { error } = await supabase.from('projects').insert([{ company, ...fields }])
    if (error) alert('Error saving project: ' + error.message)
  }

  async function deleteProject(id) {
    if (!confirm('Remove this project?')) return
    await supabase.from('projects').delete().eq('id', id)
  }

  function onDragStart(id) { setDragId(id) }

  // Drop a dragged card into `targetStage`, positioned just before `beforeId`
  // (or at the end when beforeId is null). Persists the new order.
  async function reorderDeal(targetStage, beforeId) {
    if (!dragId) return
    const draggedId = dragId
    setDragId(null)
    if (beforeId === draggedId) return

    const stageDeals = deals
      .filter(d => d.stage === targetStage && d.id !== draggedId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

    let idx = beforeId ? stageDeals.findIndex(d => d.id === beforeId) : stageDeals.length
    if (idx < 0) idx = stageDeals.length
    const prev = stageDeals[idx - 1]
    const next = stageDeals[idx]

    let newPos
    if (!prev && !next)      newPos = 1
    else if (!prev)          newPos = (next.position ?? 1) - 1
    else if (!next)          newPos = (prev.position ?? 0) + 1
    else                     newPos = ((prev.position ?? 0) + (next.position ?? 0)) / 2

    // Optimistic update so it feels instant; realtime will reconcile.
    setDeals(ds => ds.map(d => d.id === draggedId ? { ...d, stage: targetStage, position: newPos } : d))
    const { error } = await supabase
      .from('deals')
      .update({ stage: targetStage, position: newPos })
      .eq('id', draggedId)
    if (error) { alert('Error reordering: ' + error.message); fetchDeals() }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const activeStageObj = STAGES.find(s => s.id === activeStage)
  const companies = [...new Set(deals.map(d => d.company || d.client_name).filter(Boolean))].sort()

  // Owner filter — lets each person focus on just their own pipeline.
  const visibleDeals = ownerFilter === 'all' ? deals : deals.filter(d => d.owner === ownerFilter)

  // Sum of delivered project value per company (feeds cards + stats).
  const companyTotals = projects.reduce((acc, p) => {
    acc[p.company] = (acc[p.company] || 0) + (parseFloat(p.value) || 0)
    return acc
  }, {})
  const soldTotal = Object.values(companyTotals).reduce((s, v) => s + v, 0)

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
      <StatsBar deals={visibleDeals} soldTotal={soldTotal} />

      {/* Owner filter */}
      <div className="filter-bar">
        <span className="filter-label">Show</span>
        <div className="owner-seg">
          <button className={ownerFilter === 'all' ? 'active' : ''}
            onClick={() => setOwnerFilter('all')}>Everyone</button>
          {OWNERS.map(o => (
            <button key={o}
              className={ownerFilter === o ? 'active' : ''}
              onClick={() => setOwnerFilter(o)}>
              {o === currentOwner ? 'Mine' : o.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

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
              {visibleDeals.filter(d => d.stage === stage.id).length}
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
              deals={visibleDeals.filter(d => d.stage === stage.id)}
              onAddDeal={() => setModal({ type: 'add', stage: stage.id })}
              onOpenDeal={deal => setModal({ type: 'detail', deal })}
              onDragStart={onDragStart}
              onReorder={reorderDeal}
              dragId={dragId}
              companyTotals={companyTotals}
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
          companies={companies}
          projects={projects}
          onClose={() => setModal(null)}
          onCreate={createDeal}
          onUpdate={updateDeal}
          onMove={moveDeal}
          onDelete={deleteDeal}
          onAddProject={addProject}
          onDeleteProject={deleteProject}
        />
      )}
    </div>
  )
}
