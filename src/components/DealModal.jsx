import { useState } from 'react'
import { createPortal } from 'react-dom'
import { STAGES, OWNERS, ENGAGEMENT_TYPES, fmtEur } from './KanbanBoard'

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

// ── Project history (company-level). Note: no nested <form> — this lives
// inside the deal form, so buttons are type="button" and Enter is handled. ──
function ProjectHistory({ company, projects, onAdd, onDelete }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', value: '', year: '' })
  const total = projects.reduce((s, p) => s + (parseFloat(p.value) || 0), 0)

  function submit() {
    if (!draft.name.trim()) return
    onAdd(company, {
      name:  draft.name.trim(),
      value: draft.value !== '' ? parseFloat(draft.value) : 0,
      year:  draft.year  !== '' ? parseInt(draft.year, 10) : null,
    })
    setDraft({ name: '', value: '', year: '' })
    setAdding(false)
  }
  function onKey(e) { if (e.key === 'Enter') { e.preventDefault(); submit() } }

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
                <button type="button" className="proj-del" onClick={() => onDelete(p.id)} title="Remove project">×</button>
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
        <div className="proj-add-form">
          <input autoFocus placeholder="Project name" value={draft.name} onKeyDown={onKey}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
          <div className="proj-add-row">
            <input type="number" min="0" placeholder="€ value" value={draft.value} onKeyDown={onKey}
              onChange={e => setDraft(d => ({ ...d, value: e.target.value }))} />
            <input type="number" placeholder="Year" value={draft.year} onKeyDown={onKey}
              onChange={e => setDraft(d => ({ ...d, year: e.target.value }))} />
          </div>
          <div className="proj-add-actions">
            <button type="button" className="btn-cancel" onClick={() => { setAdding(false); setDraft({ name: '', value: '', year: '' }) }}>Cancel</button>
            <button type="button" className="btn-save" onClick={submit}>Add project</button>
          </div>
        </div>
      ) : (
        <button type="button" className="add-here" style={{ marginTop: 6 }} onClick={() => setAdding(true)}>+ Add project</button>
      )}
    </>
  )
}

// ── Add / Edit form (editing a card lands here directly) ──
function DealForm({
  initial, currentOwner, onSave, onCancel, isEdit, companies = [],
  projects = [], onAddProject, onDeleteProject, onDelete,
}) {
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

  // Project history is keyed on the saved company name.
  const dealCompany = initial?.company || initial?.client_name

  function set(key, val) { setFields(f => ({ ...f, [key]: val })) }

  function handleStageChange(newStage) {
    setFields(f => ({
      ...f,
      stage:           newStage,
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

      {isEdit && dealCompany && (
        <ProjectHistory
          company={dealCompany}
          projects={projects}
          onAdd={onAddProject}
          onDelete={onDeleteProject}
        />
      )}

      <div className="modal-actions">
        {isEdit && (
          <button type="button" className="del-btn" style={{ marginRight: 'auto' }} onClick={onDelete}>
            Remove
          </button>
        )}
        <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-save" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add contact'}
        </button>
      </div>
    </form>
  )
}

// ── Root modal wrapper ──
export default function DealModal({
  modal, currentOwner, companies = [], projects = [],
  onClose, onCreate, onUpdate, onDelete, onAddProject, onDeleteProject,
}) {
  const isEdit = modal.type === 'detail' || modal.type === 'edit'
  const deal = modal.deal
  const dealCompany = deal?.company || deal?.client_name
  const companyProjects = projects.filter(p => p.company === dealCompany)
  const title = isEdit ? (dealCompany || 'Edit contact') : 'New contact'

  return createPortal(
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal detail-modal">
        <div className="modal-title">{title}</div>

        {isEdit && deal ? (
          <DealForm
            currentOwner={currentOwner}
            companies={companies}
            initial={deal}
            projects={companyProjects}
            onSave={fields => onUpdate(deal.id, fields)}
            onCancel={onClose}
            onDelete={() => onDelete(deal.id)}
            onAddProject={onAddProject}
            onDeleteProject={onDeleteProject}
            isEdit
          />
        ) : (
          <DealForm
            currentOwner={currentOwner}
            companies={companies}
            initial={{ stage: modal.stage || 'Lead' }}
            onSave={onCreate}
            onCancel={onClose}
            isEdit={false}
          />
        )}
      </div>
    </div>,
    document.body
  )
}
