import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import ThemeToggle from '@/components/ThemeToggle';

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') await login(username, password);
      else await register(username, password);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      {/* Theme toggle top right */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
            <span className="text-brand-400">Kan</span>ban
          </h1>
          <p className="text-sm mt-1 font-mono" style={{ color: 'var(--text-faint)' }}>// collaborative task manager</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--bg)' }}>
            {(['login', 'register'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: tab === t ? 'var(--surface-raised)' : 'transparent',
                  color: tab === t ? 'var(--text)' : 'var(--text-muted)',
                  border: tab === t ? '1px solid var(--border)' : '1px solid transparent',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {['Username', 'Password'].map((label, i) => (
              <div key={label}>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>
                  {label}
                </label>
                <input
                  type={i === 1 ? 'password' : 'text'}
                  value={i === 0 ? username : password}
                  onChange={e => i === 0 ? setUsername(e.target.value) : setPassword(e.target.value)}
                  placeholder={i === 0 ? 'your_username' : '••••••••'}
                  autoComplete="off"
                  className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>
            ))}

            {error && (
              <div className="text-sm rounded-lg px-3 py-2 bg-red-950 border border-red-900 text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-brand-400 hover:bg-brand-500 disabled:opacity-40 text-white font-medium py-2.5 rounded-lg transition-colors text-sm mt-2"
            >
              {loading ? 'connecting...' : tab === 'login' ? 'sign in →' : 'create account →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
