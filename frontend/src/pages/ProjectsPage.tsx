import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/api/client';
import { Project } from '@/types';
import { formatDistanceToNow } from 'date-fns';

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
      setName('');
      setDescription('');
      navigate(`/projects/${proj.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            <span className="text-brand-400">Kan</span>ban
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 font-mono">{user?.username}</span>
            <button onClick={logout} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Page title + create btn */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-semibold">Projects</h2>
            <p className="text-gray-500 text-sm mt-0.5">Your boards and shared workspaces</p>
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
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
              <h3 className="font-semibold mb-4">New project</h3>
              <div className="space-y-3">
                <input
                  autoFocus
                  type="text"
                  placeholder="Project name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createProject()}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-400"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-400 resize-none"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setShowCreate(false); setName(''); setDescription(''); }}
                  className="flex-1 border border-gray-800 text-gray-400 text-sm py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  cancel
                </button>
                <button
                  onClick={createProject}
                  disabled={creating || !name.trim()}
                  className="flex-1 bg-brand-400 hover:bg-brand-500 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {creating ? 'creating...' : 'create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project list */}
        {loading ? (
          <div className="text-center text-gray-600 py-20 font-mono text-sm">loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 font-mono text-sm">no projects yet</p>
            <p className="text-gray-700 text-sm mt-1">create one to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="bg-gray-900 border border-gray-800 hover:border-brand-400/50 rounded-xl p-5 text-left transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-400/10 flex items-center justify-center text-brand-400 text-sm font-semibold">
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-600 font-mono">{p.member_count} members</span>
                </div>
                <h3 className="font-medium text-white group-hover:text-brand-400 transition-colors mb-1">
                  {p.name}
                </h3>
                {p.description && (
                  <p className="text-gray-500 text-xs line-clamp-2 mb-3">{p.description}</p>
                )}
                <p className="text-gray-700 text-xs font-mono">
                  {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                </p>
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm text-center mt-4 font-mono">{error}</div>
        )}
      </main>
    </div>
  );
}
