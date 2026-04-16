import { useState } from 'react'
import { createPortal } from 'react-dom'
import { STAGES, OWNERS, OWNER_STYLES, fmtDate, fmtEur } from './KanbanBoard'

// ── Value fields shown depend on stage ──
function ValueFields({ stage, projectedValue, soldValue, onChange }) {
  const isActive   = stage === 'Active client'
  const isProspect = ['Lead', 'Contacted', 'Proposal sent', 'Negotiation'].includes(stage)

  if (isActive) return (
    <div className="value-section">
      <div className="value-section-title">Value</div>
      <div className="form-row">
        <div className="form-group">
          <label>Projected value (€)</label>
          <input type="number" min="0" value={projectedValue}
            onChange={e => onChange('projected_value', e.target.value)}
            placeholder="Original estimate" />
          <div className="form-hint">Your estimate before signing</div>
        </div>
        <div className="form-group">
          <label>Sold value (€)</label>
          <input type="number" min="0" value={soldValue}
            onChange={e => onChange('sold_value', e.target.value)}
            placeholder="Confirmed amount" />
          <div className="form-hint">The signed amount</div>
        </div>
      </div>
    </div>
  )

  if (isProspect) return (
    <div className="value-section">
      <div className="value-section-title">Value</div>
      <div className="form-group">
        <label>Projected value (€)</label>
        <input type="number" min="0" value={projectedValue}
          onChange={e => onChange('projected_value', e.target.value)}
          placeholder="e.g. 15000" />
        <div className="form-hint">Best estimate of what this could be worth</div>
      </div>
    </div>
  )

  return null
}

// ── Add / Edit form ──
function DealForm({ initial, currentOwner, onSave, onCancel, isEdit }) {
  const [fields, setFields] = useState({
    client_name:     initial?.client_name     ?? '',
    opportunity:     initial?.opportunity     ?? '',
    contact_person:  initial?.contact_person  ?? '',
    owner:           initial?.owner           ?? currentOwner,
    stage:           initial?.stage           ?? 'Lead',
    last_contacted:  initial?.last_contacted  ?? '',
    next_action:     initial?.next_action     ?? '',
    projected_value: initial?.projected_value ?? '',
    sold_value:      initial?.sold_value      ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(key, val) { setFields(f => ({ ...f, [key]: val })) }

  // Reset value fields when stage changes
  function handleStageChange(newStage) {
    const isNowActive   = newStage === 'Active client'
    const isNowProspect = ['Lead', 'Contacted', 'Proposal sent', 'Negotiation'].includes(newStage)
    setFields(f => ({
      ...f,
      stage:           newStage,
      sold_value:      isNowActive   ? f.sold_value : '',
      projected_value: isNowProspect || isNowActive ? f.projected_value : '',
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fields.client_name.trim()) return
    setSaving(true)
    const payload = {
      ...fields,
      projected_value: fields.projected_value !== '' ? parseFloat(fields.projected_value) : null,
      sold_value:      fields.sold_value      !== '' ? parseFloat(fields.sold_value)      : null,
      last_contacted:  fields.last_contacted  || null,
    }
    await onSave(payload)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Client / company</label>
        <input type="text" value={fields.client_name} autoFocus required
          onChange={e => set('client_name', e.target.value)} placeholder="e.g. Stora Enso" />
      </div>
      <div className="form-group">
        <label>Opportunity / project</label>
        <input type="text" value={fields.opportunity}
          onChange={e => set('opportunity', e.target.value)} placeholder="e.g. Website redesign" />
      </div>
      <div className="form-group">
        <label>Contact person</label>
        <input type="text" value={fields.contact_person}
          onChange={e => set('contact_person', e.target.value)} placeholder="Name" />
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
        soldValue={fields.sold_value ?? ''}
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

      <div className="modal-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-save" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add lead'}
        </button>
      </div>
    </form>
  )
}

// ── Detail view ──
function DealDetail({ deal, onClose, onEdit, onMove, onDelete }) {
  const stage      = STAGES.find(s => s.id === deal.stage) || STAGES[0]
  const ownerStyle = OWNER_STYLES[deal.owner] || OWNER_STYLES['Henrik Axlund']
  const others     = STAGES.filter(s => s.id !== deal.stage)
  const pv = fmtEur(deal.projected_value)
  const sv = fmtEur(deal.sold_value)

  return (
    <>
      <div className="detail-flex">
        <div className="detail-header">
          <div className="detail-name">{deal.client_name}</div>
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
        <div className="field-item">
          <span className="fi-label">Contact</span>
          <span className="fi-val">{deal.contact_person || '—'}</span>
        </div>
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

      {(pv || sv) && (
        <div className="value-panel">
          {pv && (
            <div className="value-box projected">
              <div className="value-box-label">Projected</div>
              <div className="value-box-amount">{pv}</div>
            </div>
          )}
          {sv && (
            <div className="value-box sold">
              <div className="value-box-label">Sold</div>
              <div className="value-box-amount">{sv}</div>
            </div>
          )}
        </div>
      )}

      {deal.next_action && (
        <>
          <div className="section-label">Next action</div>
          <div className="next-action-box">→ {deal.next_action}</div>
        </>
      )}

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
export default function DealModal({ modal, currentOwner, onClose, onCreate, onUpdate, onMove, onDelete }) {
  const [view, setView] = useState(modal.type) // 'add' | 'edit' | 'detail'
  const [editDeal, setEditDeal] = useState(modal.deal || null)

  function handleEdit(deal) {
    setEditDeal(deal)
    setView('edit')
  }

  const isDetail = view === 'detail'
  const title = view === 'add' ? 'New lead' : view === 'edit' ? `Edit — ${editDeal?.client_name}` : null

  return createPortal(
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal${isDetail ? ' detail-modal' : ''}`}>
        {title && <div className="modal-title">{title}</div>}

        {view === 'add' && (
          <DealForm
            currentOwner={currentOwner}
            initial={{ stage: modal.stage || 'Lead' }}
            onSave={onCreate}
            onCancel={onClose}
            isEdit={false}
          />
        )}

        {view === 'edit' && editDeal && (
          <DealForm
            currentOwner={currentOwner}
            initial={editDeal}
            onSave={fields => onUpdate(editDeal.id, fields)}
            onCancel={onClose}
            isEdit
          />
        )}

        {view === 'detail' && modal.deal && (
          <DealDetail
            deal={modal.deal}
            onClose={onClose}
            onEdit={handleEdit}
            onMove={onMove}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>,
    document.body
  )
}
