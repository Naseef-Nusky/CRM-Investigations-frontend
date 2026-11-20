import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PortalHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link to="/dashboard" className="block">
          <p className="text-xs uppercase tracking-widest text-slate-400">Investigator portal</p>
          <h1 className="text-lg font-semibold">Bespoke Investigation CRM</h1>
        </Link>
        <div className="text-right text-sm shrink-0">
          <p>
            {user?.firstName} {user?.lastName}
          </p>
          <button type="button" onClick={handleLogout} className="underline text-slate-300 mt-1">
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
