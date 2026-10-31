import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabase'

const rules = [
  { label: 'More than 8 characters', test: (p) => p.length > 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 ' +
  'placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const allRulesPass = rules.every((r) => r.test(form.password))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!allRulesPass) return setError('Password does not meet all the requirements.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { full_name: form.fullName.trim() } }, // read by your handle_new_user trigger
    })
    setLoading(false)

    if (error) return setError(error.message)
    // Supabase returns an empty identities list when the email already exists
    if (data.user && data.user.identities?.length === 0)
      return setError('This email is already registered. Try logging in.')

    navigate('/login', { state: { message: 'Account created! Please log in.' } })
  }

  return (
    <div className="flex min-h-screen font-sans">
      {/* Left brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#14123a] to-[#2a2670] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-lg font-bold">
            S
          </div>
          <span className="text-xl font-semibold">Brightloop</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Run your subscription
            <br />
            business in one place.
          </h1>
          <p className="mt-4 max-w-md text-indigo-200">
            Plans, recurring invoices, payments and revenue reports, all managed from a single dashboard.
          </p>
        </div>
        <p className="text-sm text-indigo-300">© 2026 Brightloop Software</p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center bg-slate-50 px-6 py-10 lg:w-1/2">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
          <p className="mt-1 text-sm text-slate-500">Join Brightloop Software</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
              <input name="fullName" value={form.fullName} onChange={update} required
                placeholder="Enter your full name" className={inputCls} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input type="email" name="email" value={form.email} onChange={update} required
                placeholder="you@company.com" className={inputCls} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
              <input type={showPw ? 'text' : 'password'} name="password" value={form.password}
                onChange={update} required placeholder="Create a password" className={inputCls} />

              {form.password && (
                <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                  {rules.map((r) => {
                    const ok = r.test(form.password)
                    return (
                      <li key={r.label} className={`text-xs ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {ok ? '✓' : '○'} {r.label}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</label>
              <input type={showPw ? 'text' : 'password'} name="confirm" value={form.confirm}
                onChange={update} required placeholder="Re-enter your password" className={inputCls} />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm
                         transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}