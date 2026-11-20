import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { formatDate, formatStatus, statusBadgeClass } from '../lib/format'
import PortalHeader from '../components/PortalHeader'

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/dashboard/investigator')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div className="min-h-screen bg-slate-100">
      <PortalHeader />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">My investigations</h2>
          <p className="text-sm text-slate-600 mt-1">
            You can only view cases assigned to you. Select a case to add progress notes, upload
            evidence and submit your report.
          </p>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Assigned', data.stats.assigned],
                ['Active', data.stats.active],
                ['Awaiting report', data.stats.awaitingReport],
                ['Completed', data.stats.completed],
              ].map(([label, value]) => (
                <div key={label} className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="text-2xl font-semibold mt-1">{value}</p>
                </div>
              ))}
            </div>

            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 font-semibold">Assigned cases</div>
              {data.investigations.length === 0 ? (
                <p className="px-4 py-8 text-sm text-slate-500">
                  No investigations assigned yet. When management allocates a case, it will appear
                  here.
                </p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Reference</th>
                          <th className="px-4 py-3 font-medium">Client</th>
                          <th className="px-4 py-3 font-medium">Service</th>
                          <th className="px-4 py-3 font-medium">Due</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.investigations.map((inv) => (
                          <tr
                            key={inv.id}
                            onClick={() => navigate(`/cases/${inv.id}`)}
                            className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                          >
                            <td className="px-4 py-3 font-medium">
                              <Link
                                to={`/cases/${inv.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-900"
                              >
                                {inv.reference}
                              </Link>
                            </td>
                            <td className="px-4 py-3">{inv.client?.fullName || '—'}</td>
                            <td className="px-4 py-3">{inv.service?.name || '—'}</td>
                            <td className="px-4 py-3">{formatDate(inv.expectedCompletionDate)}</td>
                            <td className="px-4 py-3">
                              <span className={statusBadgeClass(inv.status)}>
                                {formatStatus(inv.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <ul className="md:hidden divide-y divide-slate-100">
                    {data.investigations.map((inv) => (
                      <li key={inv.id}>
                        <Link to={`/cases/${inv.id}`} className="block px-4 py-3 hover:bg-slate-50">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-slate-900">{inv.reference}</span>
                            <span className={statusBadgeClass(inv.status)}>
                              {formatStatus(inv.status)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            {inv.client?.fullName || '—'} · {inv.service?.name || '—'}
                          </p>
                          {inv.expectedCompletionDate && (
                            <p className="text-xs text-slate-500 mt-1">
                              Due {formatDate(inv.expectedCompletionDate)}
                            </p>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </>
        )}

        {!data && !error && <p className="text-slate-600">Loading…</p>}
      </main>
    </div>
  )
}
