import { useState } from 'react'
import { createPortal } from 'react-dom'
import { STAGES, OWNERS, OWNER_STYLES, ENGAGEMENT_TYPES, fmtDate, fmtEur } from './KanbanBoard'

const PROSPECT_STAGES = ['Lead', 'Contacted', 'Proposal sent', 'Negotiation']

// ── Projected value (prospects only; clients get value from projects) ──
function ValueFields({ stage, projectedValue, onChange }) {
  if (!PROSPECT_STAGES.includes(stage)) return null
  return (
    <div className="value-section">
      <div className="value-section-title">Projected value</div>
      <div className="form-group">
        <label>Estimated value (€)</label>
        <input type="number" min="0" value={projectedValue}
          onChange={e => onChange('projected_value', e.target.value)} placeholder="e.g. 15000" />
        <div className="form-hint">Best estimate of what this could be worth</div>
      </div>
    </div>
  )
}

// ── Add / Edit form ──
function DealForm({ initial, currentOwner, onSave, onCancel, isEdit, companies = [] }) {
  const [fields, setFields] = useState({
    contact_person:  initial?.contact_person  ?? '',
    company:         initial?.company          ?? initial?.client_name ?? '',
    engagement_type: initial?.engagement_type  ?? '',
    opportunity:     initial?.opportunity      ?? '',
    owner:           initial?.owner            ?? currentOwner,
    stage:           initial?.stage            ?? 'Lead',
    last_contacted:  initial?.last_contacted   ?? '',
    next_action:     initial?.next_action      ?? '',
    projected_value: initial?.projected_value  ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(key, val) { setFields(f => ({ ...f, [key]: val })) }

  function handleStageChange(newStage) {
    setFields(f => ({
      ...f,
      stage:           newStage,
      // Projected value only applies while it's still a prospect.
      projected_value: PROSPECT_STAGES.includes(newStage) ? f.projected_value : '',
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fields.company.trim()) return
    setSaving(true)
    const payload = {
      ...fields,
      company:         fields.company.trim(),
      client_name:     fields.company.trim(), // keep legacy headline in sync
      engagement_type: fields.engagement_type || null,
      projected_value: fields.projected_value !== '' ? parseFloat(fields.projected_value) : null,
      last_contacted:  fields.last_contacted  || null,
    }
    await onSave(payload)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Contact person</label>
        <input type="text" value={fields.contact_person} autoFocus
          onChange={e => set('contact_person', e.target.value)} placeholder="e.g. Hina Atta" />
      </div>
      <div className="form-group">
        <label>Company</label>
        <input type="text" value={fields.company} required list="company-list"
          onChange={e => set('company', e.target.value)} placeholder="e.g. ICEYE" />
        {companies.length > 0 && (
          <datalist id="company-list">
            {companies.map(c => <option key={c} value={c} />)}
          </datalist>
        )}
        <div className="form-hint">Contacts sharing a company are grouped together</div>
      </div>
      <div className="form-group">
        <label>Engagement type</label>
        <select value={fields.engagement_type} onChange={e => set('engagement_type', e.target.value)}>
          <option value="">—</option>
          {ENGAGEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Opportunity / note</label>
        <input type="text" value={fields.opportunity}
          onChange={e => set('opportunity', e.target.value)} placeholder="e.g. Website redesign" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Stage</label>
          <select value={fields.stage} onChange={e => handleStageChange(e.target.value)}>
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Owner</label>
          <select value={fields.owner} onChange={e => set('owner', e.target.value)}>
            {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <ValueFields
        stage={fields.stage}
        projectedValue={fields.projected_value ?? ''}
        onChange={set}
      />

      {fields.stage === 'Active client' && (
        <div className="form-hint" style={{ margin: '-2px 0 12px' }}>
          Log delivered projects & their value from the client's detail view after saving.
        </div>
      )}

      <div className="form-group">
        <label>Last contacted</label>
        <input type="date" value={fields.last_contacted}
          onChange={e => set('last_contacted', e.target.value)} />
      </div>
      <div className="form-group">
        <label>Next action / notes</label>
        <textarea value={fields.next_action}
          onChange={e => set('next_action', e.target.value)}
          placeholder="What's the next step?" />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-save" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add contact'}
        </button>
      </div>
    </form>
  )
}

// ── Project history (company-level, shown in the detail view) ──
function ProjectHistory({ company, projects, onAdd, onDelete }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', value: '', year: '' })
  const total = projects.reduce((s, p) => s + (parseFloat(p.value) || 0), 0)

  function submit(e) {
    e.preventDefault()
    if (!draft.name.trim()) return
    onAdd(company, {
      name:  draft.name.trim(),
      value: draft.value !== '' ? parseFloat(draft.value) : 0,
      year:  draft.year  !== '' ? parseInt(draft.year, 10) : null,
    })
    setDraft({ name: '', value: '', year: '' })
    setAdding(false)
  }

  return (
    <>
      <div className="section-label" style={{ marginTop: 14 }}>Project history</div>

      {projects.length === 0 && !adding && (
        <div className="proj-empty">No projects logged yet.</div>
      )}

      {projects.length > 0 && (
        <div className="proj-list">
          {projects.map(p => (
            <div className="proj-row" key={p.id}>
              <div className="proj-main">
                <span className="proj-name">{p.name}</span>
                {p.year && <span className="proj-year">{p.year}</span>}
              </div>
              <div className="proj-right">
                <span className="proj-value">{fmtEur(p.value) || '€0'}</span>
                <button className="proj-del" onClick={() => onDelete(p.id)} title="Remove project">×</button>
              </div>
            </div>
          ))}
          <div className="proj-total">
            <span>Total value</span>
            <span>{fmtEur(total) || '€0'}</span>
          </div>
        </div>
      )}

      {adding ? (
        <form className="proj-add-form" onSubmit={submit}>
          <input autoFocus placeholder="Project name" value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
          <div className="proj-add-row">
            <input type="number" min="0" placeholder="€ value" value={draft.value}
              onChange={e => setDraft(d => ({ ...d, value: e.target.value }))} />
            <input type="number" placeholder="Year" value={draft.year}
              onChange={e => setDraft(d => ({ ...d, year: e.target.value }))} />
          </div>
          <div className="proj-add-actions">
            <button type="button" className="btn-cancel" onClick={() => { setAdding(false); setDraft({ name: '', value: '', year: '' }) }}>Cancel</button>
            <button type="submit" className="btn-save">Add project</button>
          </div>
        </form>
      ) : (
        <button className="add-here" style={{ marginTop: 6 }} onClick={() => setAdding(true)}>+ Add project</button>
      )}
    </>
  )
}

// ── Detail view ──
function DealDetail({ deal, projects, onClose, onEdit, onMove, onDelete, onAddProject, onDeleteProject }) {
  const stage      = STAGES.find(s => s.id === deal.stage) || STAGES[0]
  const ownerStyle = OWNER_STYLES[deal.owner] || OWNER_STYLES['Henrik Axlund']
  const others     = STAGES.filter(s => s.id !== deal.stage)
  const pv = fmtEur(deal.projected_value)

  return (
    <>
      <div className="detail-flex">
        <div className="detail-header">
          <div className="detail-name">{deal.company || deal.client_name}</div>
          {deal.contact_person && <div className="detail-contact">{deal.contact_person}</div>}
          {deal.opportunity && <div className="detail-opp">{deal.opportunity}</div>}
          <span
            className="detail-stage-pill"
            style={{ background: stage.bg, color: stage.color }}
          >
            {stage.id}
          </span>
        </div>
        <button className="detail-close" onClick={onClose}>×</button>
      </div>

      <div className="field-list">
        {deal.engagement_type && (
          <div className="field-item">
            <span className="fi-label">Engagement</span>
            <span className="fi-val">{deal.engagement_type}</span>
          </div>
        )}
        <div className="field-item">
          <span className="fi-label">Owner</span>
          <span className="fi-val" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div
              className="avatar"
              style={{ background: ownerStyle.bg, color: ownerStyle.color, width: 22, height: 22, fontSize: 9 }}
            >
              {ownerStyle.initials}
            </div>
            {deal.owner}
          </span>
        </div>
        <div className="field-item">
          <span className="fi-label">Last contacted</span>
          <span className="fi-val">{fmtDate(deal.last_contacted)}</span>
        </div>
      </div>

      {pv && (
        <div className="value-panel">
          <div className="value-box projected">
            <div className="value-box-label">Projected</div>
            <div className="value-box-amount">{pv}</div>
          </div>
        </div>
      )}

      {deal.next_action && (
        <>
          <div className="section-label">Next action</div>
          <div className="next-action-box">→ {deal.next_action}</div>
        </>
      )}

      <ProjectHistory
        company={deal.company || deal.client_name}
        projects={projects}
        onAdd={onAddProject}
        onDelete={onDeleteProject}
      />

      <div className="section-label" style={{ marginTop: 14 }}>Move to stage</div>
      <div className="move-grid">
        {others.map(s => (
          <button key={s.id} className="move-btn" onClick={() => onMove(deal.id, s.id)}>
            {s.id}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="move-btn" onClick={() => onEdit(deal)}>Edit</button>
        <button className="del-btn"  onClick={() => onDelete(deal.id)}>Remove</button>
      </div>
    </>
  )
}

// ── Root modal wrapper ──
export default function DealModal({
  modal, currentOwner, companies = [], projects = [],
  onClose, onCreate, onUpdate, onMove, onDelete, onAddProject, onDeleteProject,
}) {
  const [view, setView] = useState(modal.type) // 'add' | 'edit' | 'detail'
  const [editDeal, setEditDeal] = useState(modal.deal || null)

  function handleEdit(deal) {
    setEditDeal(deal)
    setView('edit')
  }

  const isDetail = view === 'detail'
  const dealCompany = modal.deal?.company || modal.deal?.client_name
  const companyProjects = projects.filter(p => p.company === dealCompany)
  const title = view === 'add' ? 'New contact'
              : view === 'edit' ? `Edit — ${editDeal?.company || editDeal?.client_name}`
              : null

  return createPortal(
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal${isDetail ? ' detail-modal' : ''}`}>
        {title && <div className="modal-title">{title}</div>}

        {view === 'add' && (
          <DealForm
            currentOwner={currentOwner}
            companies={companies}
            initial={{ stage: modal.stage || 'Lead' }}
            onSave={onCreate}
            onCancel={onClose}
            isEdit={false}
          />
        )}

        {view === 'edit' && editDeal && (
          <DealForm
            currentOwner={currentOwner}
            companies={companies}
            initial={editDeal}
            onSave={fields => onUpdate(editDeal.id, fields)}
            onCancel={onClose}
            isEdit
          />
        )}

        {view === 'detail' && modal.deal && (
          <DealDetail
            deal={modal.deal}
            projects={companyProjects}
            onClose={onClose}
            onEdit={handleEdit}
            onMove={onMove}
            onDelete={onDelete}
            onAddProject={onAddProject}
            onDeleteProject={onDeleteProject}
          />
        )}
      </div>
    </div>,
    document.body
  )
}
