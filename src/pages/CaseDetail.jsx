import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, apiDownload, apiUpload } from '../lib/api'
import { formatDate, formatDateTime, formatStatus, statusBadgeClass } from '../lib/format'
import PortalHeader from '../components/PortalHeader'

// Mirrors backend INVESTIGATOR_TRANSITIONS / report rules.
const STATUS_ACTIONS = {
  ASSIGNED: [{ to: 'IN_PROGRESS', label: 'Start investigation' }],
  IN_PROGRESS: [{ to: 'AWAITING_REPORT', label: 'Mark awaiting report' }],
  AMENDMENTS_REQUIRED: [{ to: 'AWAITING_REPORT', label: 'Mark awaiting report' }],
}
const REPORTABLE_CASE_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'AWAITING_REPORT', 'AMENDMENTS_REQUIRED']
const OPEN_REPORT_STATUSES = ['DRAFT', 'SUBMITTED', 'AMENDMENTS_REQUIRED']
const EDITABLE_REPORT_STATUSES = ['DRAFT', 'AMENDMENTS_REQUIRED']

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800'
const primaryBtn =
  'rounded-md bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-60'
const secondaryBtn =
  'rounded-md border border-slate-300 bg-white text-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60'

function Section({ title, children, aside }) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {aside}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="text-sm text-slate-900 mt-1">{children}</div>
    </div>
  )
}

function Notice({ tone = 'error', children }) {
  const styles =
    tone === 'error'
      ? 'text-red-600 bg-red-50 border-red-100'
      : 'text-green-700 bg-green-50 border-green-100'
  return <p className={`text-sm border rounded-md px-3 py-2 ${styles}`}>{children}</p>
}

export default function CaseDetail() {
  const { id } = useParams()
  const [investigation, setInvestigation] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loadError, setLoadError] = useState('')
  const [flash, setFlash] = useState({ tone: 'success', message: '' })

  const load = useCallback(async () => {
    try {
      const [inv, docs] = await Promise.all([
        api(`/investigations/${id}`),
        api(`/documents?investigationId=${encodeURIComponent(id)}&limit=100`).catch(() => null),
      ])
      setInvestigation(inv.data.investigation)
      setDocuments(docs?.data?.documents || [])
      setLoadError('')
    } catch (err) {
      setLoadError(err.status === 403 || err.status === 404 ? 'Case not found or not assigned to you.' : err.message)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  function notify(message, tone = 'success') {
    setFlash({ tone, message })
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <PortalHeader />

      <main className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
        <Link to="/dashboard" className="text-sm text-slate-600 underline">
          ← Back to my investigations
        </Link>

        {loadError && <Notice>{loadError}</Notice>}
        {!investigation && !loadError && <p className="text-slate-600">Loading…</p>}

        {investigation && (
          <>
            {flash.message && <Notice tone={flash.tone}>{flash.message}</Notice>}
            <Overview investigation={investigation} onChanged={load} notify={notify} />
            <Reports investigation={investigation} onChanged={load} notify={notify} />
            <ProgressNotes investigation={investigation} onChanged={load} notify={notify} />
            <EvidenceSection investigation={investigation} onChanged={load} notify={notify} />
            <DocumentsSection documents={documents} notify={notify} />
          </>
        )}
      </main>
    </div>
  )
}

function Overview({ investigation: inv, onChanged, notify }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const actions = STATUS_ACTIONS[inv.status] || []

  async function changeStatus(to) {
    setBusy(true)
    try {
      await api(`/investigations/${inv.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: to, ...(note.trim() ? { note: note.trim() } : {}) }),
      })
      setNote('')
      notify(`Status updated to ${formatStatus(to)}.`)
      await onChanged()
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const client = inv.client
  const address = client
    ? [client.addressLine1, client.addressLine2, client.city, client.postcode, client.country]
        .filter(Boolean)
        .join(', ')
    : ''

  return (
    <Section
      title={`Case ${inv.reference}`}
      aside={<span className={statusBadgeClass(inv.status)}>{formatStatus(inv.status)}</span>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Field label="Reference">{inv.reference}</Field>
        <Field label="Service">{inv.service?.name || '—'}</Field>
        <Field label="Client">{client?.fullName || '—'}</Field>
        <Field label="Start date">{formatDate(inv.startDate)}</Field>
        <Field label="Expected completion">{formatDate(inv.expectedCompletionDate)}</Field>
        <Field label="Completed">{formatDate(inv.completionDate)}</Field>
        {address && (
          <div className="sm:col-span-2 md:col-span-3">
            <Field label="Client address">{address}</Field>
          </div>
        )}
        <div className="sm:col-span-2 md:col-span-3">
          <Field label="Instructions">
            {inv.instructions ? (
              <p className="whitespace-pre-wrap">{inv.instructions}</p>
            ) : (
              <span className="text-slate-500">No instructions recorded.</span>
            )}
          </Field>
        </div>
      </div>

      {actions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
          <p className="text-sm font-medium text-slate-700">Update case status</p>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note for management"
            maxLength={2000}
            className={inputClass}
          />
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a.to}
                type="button"
                disabled={busy}
                onClick={() => changeStatus(a.to)}
                className={primaryBtn}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </Section>
  )
}

function ProgressNotes({ investigation: inv, onChanged, notify }) {
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    setBusy(true)
    setError('')
    try {
      await api(`/investigations/${inv.id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ content: content.trim() }),
      })
      setContent('')
      notify('Progress note added.')
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Progress notes">
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={10000}
          placeholder="Record what you have done or found…"
          className={inputClass}
        />
        {error && <Notice>{error}</Notice>}
        <button type="submit" disabled={busy || !content.trim()} className={primaryBtn}>
          {busy ? 'Adding…' : 'Add note'}
        </button>
      </form>

      {inv.progressNotes?.length ? (
        <ul className="mt-5 space-y-3">
          {inv.progressNotes.map((n) => (
            <li key={n.id} className="border border-slate-100 rounded-md p-3 bg-slate-50">
              <p className="text-xs text-slate-500">
                {n.author ? `${n.author.firstName} ${n.author.lastName}` : 'System'} ·{' '}
                {formatDateTime(n.notedAt)}
              </p>
              <p className="text-sm text-slate-900 mt-1 whitespace-pre-wrap break-words">
                {n.content}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-slate-500">No progress notes yet.</p>
      )}
    </Section>
  )
}

function EvidenceSection({ investigation: inv, onChanged, notify }) {
  const fileRef = useRef(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) {
      setError('Choose a file to upload')
      return
    }
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      if (title.trim()) form.append('title', title.trim())
      if (notes.trim()) form.append('notes', notes.trim())
      await apiUpload(`/investigations/${inv.id}/evidence`, form)
      setTitle('')
      setNotes('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      notify('Evidence uploaded.')
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function download(item) {
    try {
      await apiDownload(`/investigations/${inv.id}/evidence/${item.id}/download`, item.title)
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  return (
    <Section title="Evidence">
      <form onSubmit={handleUpload} className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Title (defaults to file name)"
          className={inputClass}
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={5000}
          placeholder="Notes (optional)"
          className={inputClass}
        />
        <input
          ref={fileRef}
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-300"
        />
        {error && <Notice>{error}</Notice>}
        <button type="submit" disabled={busy || !file} className={primaryBtn}>
          {busy ? 'Uploading…' : 'Upload evidence'}
        </button>
      </form>

      {inv.evidence?.length ? (
        <ul className="mt-5 divide-y divide-slate-100 border border-slate-100 rounded-md">
          {inv.evidence.map((ev) => (
            <li key={ev.id} className="p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 break-words">{ev.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatDateTime(ev.createdAt)}
                  {ev.mimeType ? ` · ${ev.mimeType}` : ''}
                </p>
                {ev.notes && <p className="text-sm text-slate-600 mt-1">{ev.notes}</p>}
              </div>
              <button type="button" onClick={() => download(ev)} className={`${secondaryBtn} shrink-0`}>
                Download
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-slate-500">No evidence uploaded yet.</p>
      )}
    </Section>
  )
}

function Reports({ investigation: inv, onChanged, notify }) {
  const reports = inv.reports || []
  const openReport = reports.find((r) => OPEN_REPORT_STATUSES.includes(r.status))
  const canCreate = REPORTABLE_CASE_STATUSES.includes(inv.status) && !openReport
  const [newContent, setNewContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function createDraft(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/reports', {
        method: 'POST',
        body: JSON.stringify({
          investigationId: inv.id,
          ...(newContent.trim() ? { content: newContent } : {}),
        }),
      })
      setNewContent('')
      notify('Draft report created.')
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Reports">
      {canCreate && (
        <form onSubmit={createDraft} className="space-y-3 mb-5">
          <p className="text-sm text-slate-600">
            {reports.length > 0
              ? 'Start a new draft report for this case.'
              : 'No report yet. Create a draft when you are ready to write up your findings.'}
          </p>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={5}
            placeholder="Report content (optional – you can edit the draft afterwards)"
            className={inputClass}
          />
          {error && <Notice>{error}</Notice>}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? 'Creating…' : 'Create draft report'}
          </button>
        </form>
      )}

      {reports.length === 0 && !canCreate && (
        <p className="text-sm text-slate-500">No reports for this case.</p>
      )}

      <div className="space-y-4">
        {reports.map((r) => (
          <ReportCard key={r.id} report={r} onChanged={onChanged} notify={notify} />
        ))}
      </div>
    </Section>
  )
}

function ReportCard({ report, onChanged, notify }) {
  const editable = EDITABLE_REPORT_STATUSES.includes(report.status)
  const [content, setContent] = useState(report.content || '')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  // Re-sync when the server copy changes (e.g. after reload).
  useEffect(() => {
    setContent(report.content || '')
  }, [report.content, report.updatedAt])

  const dirty = content !== (report.content || '')

  async function save() {
    setBusy('save')
    setError('')
    try {
      await api(`/reports/${report.id}`, { method: 'PATCH', body: JSON.stringify({ content }) })
      notify('Report saved.')
      await onChanged()
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setBusy('')
    }
  }

  async function submit() {
    if (!content.trim()) {
      setError('Report content is required before submitting')
      return
    }
    if (!window.confirm('Submit this report to management for review? You will not be able to edit it until it is returned.')) {
      return
    }
    setError('')
    if (dirty && !(await save())) return
    setBusy('submit')
    try {
      await api(`/reports/${report.id}/submit`, { method: 'POST' })
      notify('Report submitted for management review.')
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function downloadPdf() {
    try {
      await apiDownload(`/reports/${report.id}/download`, `report-v${report.version}.pdf`)
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  return (
    <div className="border border-slate-200 rounded-md p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">
          Version {report.version}{' '}
          <span className="text-slate-500 font-normal">· updated {formatDateTime(report.updatedAt)}</span>
        </p>
        <span className={statusBadgeClass(report.status)}>{formatStatus(report.status)}</span>
      </div>

      {report.managementComments && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            report.status === 'AMENDMENTS_REQUIRED'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          <p className="text-xs uppercase tracking-wide font-medium">
            {report.status === 'AMENDMENTS_REQUIRED'
              ? 'Amendments required – management comments'
              : 'Management comments'}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{report.managementComments}</p>
        </div>
      )}

      {editable ? (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className={`${inputClass} font-mono`}
            placeholder="Write your report…"
          />
          {error && <Notice>{error}</Notice>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={!!busy || !dirty} className={secondaryBtn}>
              {busy === 'save' ? 'Saving…' : 'Save draft'}
            </button>
            <button type="button" onClick={submit} disabled={!!busy} className={primaryBtn}>
              {busy === 'submit'
                ? 'Submitting…'
                : report.status === 'AMENDMENTS_REQUIRED'
                  ? 'Resubmit for review'
                  : 'Submit for review'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-md bg-slate-50 border border-slate-100 p-3 text-sm whitespace-pre-wrap break-words max-h-80 overflow-y-auto">
            {report.content || <span className="text-slate-500">No content.</span>}
          </div>
          {report.submittedAt && (
            <p className="text-xs text-slate-500">Submitted {formatDateTime(report.submittedAt)}</p>
          )}
          {error && <Notice>{error}</Notice>}
          {report.pdfPath && (
            <button type="button" onClick={downloadPdf} className={secondaryBtn}>
              Download PDF
            </button>
          )}
        </>
      )}
    </div>
  )
}

function DocumentsSection({ documents, notify }) {
  async function download(doc) {
    try {
      await apiDownload(`/documents/${doc.id}/download`, doc.title)
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  return (
    <Section title="Authorised documents">
      {documents.length === 0 ? (
        <p className="text-sm text-slate-500">No documents have been shared for this case.</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-md">
          {documents.map((doc) => (
            <li key={doc.id} className="p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 break-words">{doc.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {doc.category ? `${doc.category} · ` : ''}
                  {formatDateTime(doc.createdAt)}
                </p>
              </div>
              <button type="button" onClick={() => download(doc)} className={`${secondaryBtn} shrink-0`}>
                Download
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
