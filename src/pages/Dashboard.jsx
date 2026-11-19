import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/dashboard/investigator')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Investigator portal</p>
            <h1 className="text-lg font-semibold">Bespoke Investigation CRM</h1>
          </div>
          <div className="text-right text-sm">
            <p>
              {user?.firstName} {user?.lastName}
            </p>
            <button type="button" onClick={handleLogout} className="underline text-slate-300 mt-1">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">My investigations</h2>
          <p className="text-sm text-slate-600 mt-1">
            You can only view cases assigned to you. Case detail, evidence upload and report
            submission arrive in Phases 6–7.
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
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Reference</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Service</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.investigations.map((inv) => (
                      <tr key={inv.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium">{inv.reference}</td>
                        <td className="px-4 py-3">{inv.client?.fullName}</td>
                        <td className="px-4 py-3">{inv.service?.name || '—'}</td>
                        <td className="px-4 py-3">{inv.status.replaceAll('_', ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}

        {!data && !error && <p className="text-slate-600">Loading…</p>}
      </main>
    </div>
  )
}
