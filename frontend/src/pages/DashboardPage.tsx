import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/api/client';
import { ProjectDetail, Column } from '@/types';
import { format, parseISO, eachDayOfInterval, differenceInDays, isPast } from 'date-fns';
import ThemeToggle from '@/components/ThemeToggle';

interface Sprint {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  total_tasks: number;
}

interface Snapshot {
  id: number;
  sprint_id: number;
  remaining_tasks: number;
  recorded_at: string;
}

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [sprintName, setSprintName] = useState('Sprint 1');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 14 * 86400000), 'yyyy-MM-dd'));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [proj, cols, sprintData] = await Promise.all([
        api.get<ProjectDetail>(`/projects/${projectId}`),
        api.get<Column[]>(`/projects/${projectId}/columns`),
        api.get<{ sprint: Sprint | null; snapshots: Snapshot[] }>(`/projects/${projectId}/sprint`),
      ]);
      setProject(proj);
      setColumns(cols);
      setSprint(sprintData.sprint);
      setSnapshots(sprintData.snapshots);

      // Record today's snapshot silently
      if (sprintData.sprint) {
        api.post(`/projects/${projectId}/sprint/snapshot`, {}).catch(() => {});
      }
    } catch {
      navigate('/');
    }
  }, [projectId, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  async function createSprint() {
    if (!sprintName || !startDate || !endDate) return;
    setCreating(true); setError('');
    try {
      const s = await api.post<Sprint>(`/projects/${projectId}/sprint`, {
        name: sprintName, start_date: startDate, end_date: endDate,
      });
      setSprint(s);
      setShowCreateSprint(false);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function deleteSprint() {
    if (!confirm('End this sprint? All snapshot data will be lost.')) return;
    await api.delete(`/projects/${projectId}/sprint`);
    setSprint(null); setSnapshots([]);
  }

  // ── Burndown chart computation ──────────────────────────────
  function buildBurndown() {
    if (!sprint) return null;

    const start = parseISO(sprint.start_date);
    const end   = parseISO(sprint.end_date);
    const days  = eachDayOfInterval({ start, end });
    const total = sprint.total_tasks;
    const W = 560; const H = 160;
    const padL = 36; const padB = 24; const padT = 10; const padR = 10;
    const chartW = W - padL - padR;
    const chartH = H - padB - padT;

    function xPos(dayIndex: number) {
      return padL + (dayIndex / Math.max(days.length - 1, 1)) * chartW;
    }
    function yPos(val: number) {
      return padT + (1 - val / Math.max(total, 1)) * chartH;
    }

    // Ideal line
    const idealPoints = days.map((_, i) => {
      const remaining = total - (total * i / Math.max(days.length - 1, 1));
      return `${xPos(i)},${yPos(remaining)}`;
    }).join(' ');

    // Actual line — map snapshots to days
    const actualPoints: string[] = [];
    days.forEach((day, i) => {
      const snap = snapshots.find(s =>
        format(parseISO(s.recorded_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
      if (snap) actualPoints.push(`${xPos(i)},${yPos(snap.remaining_tasks)}`);
    });

    // Today marker
    const todayIndex = days.findIndex(d => format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'));
    const todayX = todayIndex >= 0 ? xPos(todayIndex) : null;

    // Stats
    const latestSnap = snapshots[snapshots.length - 1];
    const remaining = latestSnap ? latestSnap.remaining_tasks : total;
    const completed = total - remaining;
    const daysLeft = Math.max(0, differenceInDays(end, new Date()));
    const isEnded = isPast(end);

    // X axis labels — show ~5 evenly spaced
    const labelIndices = [0];
    const step = Math.floor(days.length / 4);
    for (let i = step; i < days.length - 1; i += step) labelIndices.push(i);
    labelIndices.push(days.length - 1);
    const uniqueLabels = [...new Set(labelIndices)];

    return { days, idealPoints, actualPoints, todayX, remaining, completed, daysLeft,
             isEnded, total, xPos, yPos, W, H, padL, padB, padT, uniqueLabels };
  }

  const bd = buildBurndown();

  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' };
  const allTasks = columns.flatMap(c => c.tasks);
  const doneTasks = columns.find(c => c.title.toLowerCase() === 'done')?.tasks ?? [];
  const overdueTasks = allTasks.filter(t =>
    t.due_date && isPast(parseISO(t.due_date)) && !doneTasks.find(d => d.id === t.id)
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="flex-shrink-0" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-sm transition-colors" style={{ color: 'var(--text-faint)' }}>
            ← projects
          </button>
          <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
          <h1 className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{project?.name ?? '...'}</h1>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => navigate(`/projects/${projectId}/board`)}
              className="bg-brand-400 hover:bg-brand-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Open board →
            </button>
            <ThemeToggle />
            <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{user?.username}</span>
            <button onClick={logout} className="text-xs transition-colors" style={{ color: 'var(--text-faint)' }}>sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* Sprint section */}
        {!sprint ? (
          <div className="rounded-2xl p-8 text-center mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="font-medium mb-1" style={{ color: 'var(--text)' }}>No active sprint</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Create a sprint to start tracking burndown progress</p>
            <button onClick={() => setShowCreateSprint(true)}
              className="bg-brand-400 hover:bg-brand-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              + Start sprint
            </button>
          </div>
        ) : (
          <>
            {/* Sprint header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold" style={{ color: 'var(--text)' }}>{sprint.name}</h2>
                <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-faint)' }}>
                  {format(parseISO(sprint.start_date), 'MMM d')} → {format(parseISO(sprint.end_date), 'MMM d, yyyy')}
                </p>
              </div>
              <button onClick={deleteSprint}
                className="text-xs transition-colors" style={{ color: 'var(--text-faint)' }}>
                end sprint
              </button>
            </div>

            {/* Stat cards */}
            {bd && (
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total tasks', value: bd.total, color: 'var(--text)' },
                  { label: 'Completed', value: bd.completed, color: '#3dd68c' },
                  { label: 'Remaining', value: bd.remaining, color: '#7c6af7' },
                  { label: bd.isEnded ? 'Sprint ended' : 'Days left', value: bd.isEnded ? '—' : bd.daysLeft, color: bd.daysLeft <= 2 && !bd.isEnded ? '#f56565' : '#f6ad55' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                    <div className="text-2xl font-medium" style={{ color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Burndown chart */}
            {bd && (
              <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Burndown chart</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke="#6b7280" stroke-width="1.5" stroke-dasharray="4,3"/></svg>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Ideal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke="#7c6af7" stroke-width="2"/></svg>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Actual</span>
                    </div>
                  </div>
                </div>

                {snapshots.length < 2 ? (
                  <div className="flex items-center justify-center h-40 font-mono text-sm" style={{ color: 'var(--text-faint)' }}>
                    Not enough data yet — check back tomorrow
                  </div>
                ) : (
                  <svg viewBox={`0 0 ${bd.W} ${bd.H}`} style={{ width: '100%', display: 'block' }}>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((v, i) => {
                      const y = bd.padT + v * (bd.H - bd.padB - bd.padT);
                      const val = Math.round(bd.total * (1 - v));
                      return (
                        <g key={i}>
                          <line x1={bd.padL} y1={y} x2={bd.W - bd.padR} y2={y}
                            stroke="var(--color-border-tertiary, #1f2937)" strokeWidth="0.5" strokeDasharray="3,3"/>
                          <text x={bd.padL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="var(--text-faint, #4b5563)">{val}</text>
                        </g>
                      );
                    })}

                    {/* X axis */}
                    <line x1={bd.padL} y1={bd.H - bd.padB} x2={bd.W - bd.padR} y2={bd.H - bd.padB}
                      stroke="var(--color-border-tertiary, #1f2937)" strokeWidth="0.5"/>
                    <line x1={bd.padL} y1={bd.padT} x2={bd.padL} y2={bd.H - bd.padB}
                      stroke="var(--color-border-tertiary, #1f2937)" strokeWidth="0.5"/>

                    {/* X labels */}
                    {bd.uniqueLabels.map(i => (
                      <text key={i} x={bd.xPos(i)} y={bd.H - 6} textAnchor="middle" fontSize="9" fill="var(--text-faint, #4b5563)">
                        {format(parseISO(sprint.start_date.slice(0, 10)), 'MMM') === format(new Date(parseISO(sprint.start_date).getTime() + i * 86400000), 'MMM')
                          ? format(new Date(parseISO(sprint.start_date).getTime() + i * 86400000), 'd')
                          : format(new Date(parseISO(sprint.start_date).getTime() + i * 86400000), 'MMM d')
                        }
                      </text>
                    ))}

                    {/* Ideal line */}
                    <polyline points={bd.idealPoints} fill="none" stroke="#6b7280"
                      strokeWidth="1.5" strokeDasharray="5,4" strokeLinecap="round"/>

                    {/* Actual area */}
                    {bd.actualPoints.length > 1 && (
                      <path
                        d={`M${bd.actualPoints.join(' L')} L${bd.actualPoints[bd.actualPoints.length - 1].split(',')[0]},${bd.H - bd.padB} L${bd.actualPoints[0].split(',')[0]},${bd.H - bd.padB} Z`}
                        fill="#7c6af7" fillOpacity="0.08"/>
                    )}

                    {/* Actual line */}
                    {bd.actualPoints.length > 1 && (
                      <polyline points={bd.actualPoints.join(' ')} fill="none"
                        stroke="#7c6af7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    )}

                    {/* Dots */}
                    {bd.actualPoints.map((pt, i) => {
                      const [x, y] = pt.split(',').map(Number);
                      const isLast = i === bd.actualPoints.length - 1;
                      return <circle key={i} cx={x} cy={y} r={isLast ? 4 : 3}
                        fill="#7c6af7" stroke={isLast ? 'var(--bg, #0a0a0f)' : 'none'} strokeWidth="1.5"/>;
                    })}

                    {/* Today marker */}
                    {bd.todayX !== null && (
                      <>
                        <line x1={bd.todayX} y1={bd.padT} x2={bd.todayX} y2={bd.H - bd.padB}
                          stroke="#f6ad55" strokeWidth="1" strokeDasharray="3,3"/>
                        <text x={bd.todayX + 3} y={bd.padT + 10} fontSize="8" fill="#f6ad55">today</text>
                      </>
                    )}
                  </svg>
                )}
              </div>
            )}
          </>
        )}

        {/* Overdue tasks */}
        {overdueTasks.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
              Overdue tasks
              <span className="ml-2 text-xs font-mono text-red-400">{overdueTasks.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {overdueTasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  <span className="text-sm flex-1" style={{ color: 'var(--text)' }}>{t.title}</span>
                  <span className="text-xs font-mono text-red-400">{format(parseISO(t.due_date!), 'MMM d')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create sprint modal */}
      {showCreateSprint && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
          onClick={e => e.target === e.currentTarget && setShowCreateSprint(false)}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Start a sprint</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>Sprint name</label>
                <input type="text" value={sprintName} onChange={e => setSprintName(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>Start date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>End date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} />
                </div>
              </div>
            </div>
            {error && <p className="text-red-400 text-xs mt-2 font-mono">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCreateSprint(false)}
                className="flex-1 text-sm py-2 rounded-lg transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>cancel</button>
              <button onClick={createSprint} disabled={creating}
                className="flex-1 bg-brand-400 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                {creating ? 'creating...' : 'start sprint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
