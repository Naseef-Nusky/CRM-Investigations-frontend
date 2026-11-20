export function formatStatus(status) {
  return status ? status.replaceAll('_', ' ') : '—'
}

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_STYLES = {
  ASSIGNED: 'bg-slate-200 text-slate-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  AWAITING_REPORT: 'bg-amber-100 text-amber-800',
  MANAGEMENT_REVIEW: 'bg-purple-100 text-purple-800',
  AMENDMENTS_REQUIRED: 'bg-red-100 text-red-800',
  REPORT_APPROVED: 'bg-green-100 text-green-800',
  REPORT_SENT: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  DRAFT: 'bg-slate-200 text-slate-800',
  SUBMITTED: 'bg-purple-100 text-purple-800',
  APPROVED: 'bg-green-100 text-green-800',
  SENT: 'bg-green-100 text-green-800',
}

export function statusBadgeClass(status) {
  return `inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
    STATUS_STYLES[status] || 'bg-slate-100 text-slate-700'
  }`
}
