import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="text-brand-400">Kan</span>ban
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-mono">// collaborative task manager</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-950 p-1 rounded-xl mb-6">
            {(['login', 'register'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your_username"
                autoComplete="off"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-400 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-950 border border-red-900 text-red-400 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-brand-400 hover:bg-brand-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors text-sm mt-2"
            >
              {loading ? 'connecting...' : tab === 'login' ? 'sign in →' : 'create account →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
