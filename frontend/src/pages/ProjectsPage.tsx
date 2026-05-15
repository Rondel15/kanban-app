import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/api/client';
import { Project } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import ThemeToggle from '@/components/ThemeToggle';

export default function ProjectsPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Project[]>('/projects')
      .then(setProjects)
      .catch(() => setError('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  async function createProject() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const proj = await api.post<Project>('/projects', { name, description });
      setProjects(p => [proj, ...p]);
      setShowCreate(false);
      setName(''); setDescription('');
      navigate(`/projects/${proj.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  const inputStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            <span className="text-brand-400">Kan</span>ban
          </h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{user?.username}</span>
            <button onClick={logout} className="text-xs transition-colors" style={{ color: 'var(--text-faint)' }}>
              sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Projects</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Your boards and shared workspaces</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-brand-400 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New project
          </button>
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>New project</h3>
              <div className="space-y-3">
                <input
                  autoFocus type="text" placeholder="Project name"
                  value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createProject()}
                  className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                />
                <textarea
                  placeholder="Description (optional)" value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none resize-none"
                  style={inputStyle}
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setShowCreate(false); setName(''); setDescription(''); }}
                  className="flex-1 text-sm py-2 rounded-lg transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >cancel</button>
                <button
                  onClick={createProject} disabled={creating || !name.trim()}
                  className="flex-1 bg-brand-400 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >{creating ? 'creating...' : 'create'}</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 font-mono text-sm" style={{ color: 'var(--text-faint)' }}>loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-mono text-sm" style={{ color: 'var(--text-faint)' }}>no projects yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-faint)' }}>create one to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <button
                key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                className="rounded-xl p-5 text-left transition-all group hover:border-brand-400/50"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-400/10 flex items-center justify-center text-brand-400 text-sm font-semibold">
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>{p.member_count} members</span>
                </div>
                <h3 className="font-medium mb-1 group-hover:text-brand-400 transition-colors" style={{ color: 'var(--text)' }}>
                  {p.name}
                </h3>
                {p.description && (
                  <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--text-muted)' }}>{p.description}</p>
                )}
                <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                  {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                </p>
              </button>
            ))}
          </div>
        )}
        {error && <div className="text-red-400 text-sm text-center mt-4 font-mono">{error}</div>}
      </main>
    </div>
  );
}
