import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Check, X, Search } from 'lucide-react';
import {
  getRequests, getProjects, createProject, updateProject, deleteProject,
  getRates, updateRate,
} from '../lib/api';
import type { TravelRequest, Project, DailyRate, Funder } from '../lib/types';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import FfgBadge from '../components/FfgBadge';
import RequestDrawer from '../components/RequestDrawer';
import { formatDate, formatCurrency } from '../lib/utils';

const STATUS_TABS = ['all', 'submitted', 'approved', 'rejected', 'draft'] as const;

export default function AdminPage() {
  const [tab, setTab] = useState<'requests' | 'projects' | 'rates'>('requests');

  return (
    <Layout>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-4xl normal-case mb-1">admin</h1>
          <p style={{ color: 'var(--scch-gray)' }}>Manage requests, projects and reimbursement rates.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 p-1 rounded-lg" style={{ background: 'hsl(var(--muted))' }}>
          {(['requests', 'projects', 'rates'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 text-sm font-semibold rounded capitalize transition-all"
              style={{
                background: tab === t ? 'hsl(var(--card))' : 'transparent',
                color: tab === t ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))',
                border: tab === t ? '1px solid rgba(0,255,65,0.2)' : '1px solid transparent',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'requests' && <RequestsTab />}
        {tab === 'projects' && <ProjectsTab />}
        {tab === 'rates' && <RatesTab />}
      </div>
    </Layout>
  );
}

// ── Requests Tab ────────────────────────────────────────────────────────────────────────────────────

function RequestsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TravelRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', statusFilter, search],
    queryFn: () => getRequests({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search || undefined,
    }),
  });

  return (
    <div>
      {/* Status tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="px-3 py-1 rounded text-xs font-semibold capitalize transition-all"
            style={{
              background: statusFilter === s ? 'rgba(0,255,65,0.12)' : 'hsl(var(--muted))',
              color: statusFilter === s ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))',
              border: statusFilter === s ? '1px solid rgba(0,255,65,0.3)' : '1px solid transparent',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--scch-gray)' }} />
        <input
          className="scch-input w-full pl-9 pr-3 py-2 text-sm max-w-sm"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="scch-card h-16 animate-pulse" />)}</div>
      ) : requests.length === 0 ? (
        <p className="text-sm py-12 text-center" style={{ color: 'var(--scch-gray)' }}>No requests found.</p>
      ) : (
        <div className="scch-card overflow-hidden">
          <div
            className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--scch-gray)', borderBottom: '1px solid hsl(var(--border))' }}
          >
            <span>Employee</span><span>Destination</span><span>Project</span>
            <span>Date</span><span>Total</span><span>Status</span>
          </div>
          {requests.map(req => {
            const total = req.items.reduce((s, i) => s + Number(i.amount), 0);
            return (
              <button
                key={req.id}
                onClick={() => setSelected(req)}
                className="w-full text-left transition-colors hover:bg-white/5"
                style={{ borderBottom: '1px solid hsl(var(--border))' }}
              >
                <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-4 items-center">
                  <div>
                    <p className="font-semibold text-sm">{req.employee_name}</p>
                    <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{req.employee_email}</p>
                  </div>
                  <p className="text-sm">{req.destination}</p>
                  <p className="text-sm">{req.project?.code ?? '—'}</p>
                  <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{formatDate(req.trip_start)}</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--scch-green)' }}>{formatCurrency(total)}</p>
                  <StatusBadge status={req.status} />
                </div>
                <div className="md:hidden px-4 py-4">
                  <div className="flex justify-between">
                    <p className="font-semibold">{req.employee_name}</p>
                    <p className="font-bold" style={{ color: 'var(--scch-green)' }}>{formatCurrency(total)}</p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <StatusBadge status={req.status} />
                    <FfgBadge request={req} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <RequestDrawer request={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ── Projects Tab ────────────────────────────────────────────────────────────────────────────────────

const FUNDERS: Funder[] = ['FFG', 'FWF', 'CDG', 'OTHER'];

function ProjectsTab() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', funder: 'FFG' as Funder, active: true });

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects });

  const add = useMutation({
    mutationFn: () => createProject(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setShowAdd(false); setForm({ code: '', name: '', funder: 'FFG', active: true }); toast.success('Project created'); },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Failed to create project'),
  });

  const edit = useMutation({
    mutationFn: (data: Partial<Project>) => updateProject(editId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setEditId(null); toast.success('Project updated'); },
    onError: () => toast.error('Failed to update project'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project deleted'); },
    onError: () => toast.error('Failed to delete project'),
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="scch-btn-primary px-4 py-2 text-sm flex items-center gap-2" onClick={() => setShowAdd(v => !v)}>
          <Plus size={15} /> Add Project
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="scch-card p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--scch-gray)' }}>Code <span style={{ color: 'var(--scch-green)' }}>*</span></label>
            <input className="scch-input w-full px-3 py-2 text-sm" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. COMET-K1" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--scch-gray)' }}>Name <span style={{ color: 'var(--scch-green)' }}>*</span></label>
            <input className="scch-input w-full px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Project full name" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--scch-gray)' }}>Funder</label>
            <select className="scch-input w-full px-3 py-2 text-sm" value={form.funder} onChange={e => setForm(f => ({ ...f, funder: e.target.value as Funder }))}>
              {FUNDERS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
              Active
            </label>
          </div>
          <div className="sm:col-span-2 flex gap-3 justify-end">
            <button className="scch-btn-ghost px-4 py-2 text-sm" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="scch-btn-primary px-4 py-2 text-sm" disabled={!form.code || !form.name || add.isPending} onClick={() => add.mutate()}>
              {add.isPending ? 'Saving...' : 'Create Project'}
            </button>
          </div>
        </div>
      )}

      {/* Projects table */}
      <div className="scch-card overflow-hidden">
        <div
          className="hidden md:grid grid-cols-[1fr_2fr_1fr_1fr_80px] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--scch-gray)', borderBottom: '1px solid hsl(var(--border))' }}
        >
          <span>Code</span><span>Name</span><span>Funder</span><span>Status</span><span></span>
        </div>
        {projects.map(p => (
          <div key={p.id} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            {editId === p.id ? (
              <EditProjectRow
                project={p}
                onSave={data => edit.mutate(data)}
                onCancel={() => setEditId(null)}
              />
            ) : (
              <>
                <div className="hidden md:grid grid-cols-[1fr_2fr_1fr_1fr_80px] gap-4 items-center w-full">
                  <span className="font-mono text-sm font-bold" style={{ color: 'var(--scch-green)' }}>{p.code}</span>
                  <span className="text-sm">{p.name}</span>
                  <FunderBadge funder={p.funder} />
                  <span className="text-xs font-semibold" style={{ color: p.active ? 'var(--scch-green)' : 'var(--scch-gray)' }}>
                    {p.active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex gap-2">
                    <button className="p-1.5 scch-btn-ghost rounded" onClick={() => setEditId(p.id)}><Pencil size={13} /></button>
                    <button className="p-1.5 scch-btn-ghost rounded" onClick={() => { if (confirm(`Delete project ${p.code}?`)) remove.mutate(p.id); }}><Trash2 size={13} style={{ color: '#ff5a5a' }} /></button>
                  </div>
                </div>
                {/* Mobile */}
                <div className="md:hidden flex justify-between items-center w-full">
                  <div>
                    <span className="font-mono font-bold" style={{ color: 'var(--scch-green)' }}>{p.code}</span>
                    <p className="text-sm">{p.name}</p>
                    <FunderBadge funder={p.funder} />
                  </div>
                  <div className="flex gap-2">
                    <button className="p-1.5 scch-btn-ghost rounded" onClick={() => setEditId(p.id)}><Pencil size={13} /></button>
                    <button className="p-1.5 scch-btn-ghost rounded" onClick={() => remove.mutate(p.id)}><Trash2 size={13} style={{ color: '#ff5a5a' }} /></button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
        {projects.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: 'var(--scch-gray)' }}>No projects yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}

function EditProjectRow({ project, onSave, onCancel }: {
  project: Project;
  onSave: (d: Partial<Project>) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(project.code);
  const [name, setName] = useState(project.name);
  const [funder, setFunder] = useState<Funder>(project.funder);
  const [active, setActive] = useState(project.active);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_1fr_1fr_80px] gap-3 w-full items-center">
      <input className="scch-input px-2 py-1 text-sm" value={code} onChange={e => setCode(e.target.value)} />
      <input className="scch-input px-2 py-1 text-sm" value={name} onChange={e => setName(e.target.value)} />
      <select className="scch-input px-2 py-1 text-sm" value={funder} onChange={e => setFunder(e.target.value as Funder)}>
        {FUNDERS.map(f => <option key={f}>{f}</option>)}
      </select>
      <label className="flex items-center gap-1 text-xs cursor-pointer">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Active
      </label>
      <div className="flex gap-1">
        <button className="p-1.5 rounded" style={{ color: 'var(--scch-green)' }} onClick={() => onSave({ code, name, funder, active })}><Check size={14} /></button>
        <button className="p-1.5 rounded" style={{ color: '#ff5a5a' }} onClick={onCancel}><X size={14} /></button>
      </div>
    </div>
  );
}

function FunderBadge({ funder }: { funder: Funder }) {
  const colors: Record<Funder, string> = { FFG: 'var(--scch-green)', FWF: '#60aaff', CDG: '#c084fc', OTHER: 'var(--scch-gray)' };
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: colors[funder], background: `${colors[funder]}18`, border: `1px solid ${colors[funder]}30` }}>
      {funder}
    </span>
  );
}

// ── Rates Tab ────────────────────────────────────────────────────────────────────────────────────

function RatesTab() {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const { data: rates = [] } = useQuery({ queryKey: ['rates'], queryFn: getRates });

  const save = useMutation({
    mutationFn: () => updateRate(editId!, { amount: Number(editAmount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rates'] }); setEditId(null); toast.success('Rate updated'); },
    onError: () => toast.error('Failed to update rate'),
  });

  return (
    <div>
      <div
        className="scch-card p-4 mb-6 text-sm flex gap-3"
        style={{ border: '1px solid rgba(0,255,65,0.2)', background: 'rgba(0,255,65,0.05)' }}
      >
        <span style={{ color: 'var(--scch-green)' }}>ⓘ</span>
        <span style={{ color: 'hsl(var(--muted-foreground))' }}>
          Rates apply to all <strong style={{ color: 'var(--scch-green)' }}>new</strong> expense submissions immediately.
          Changes do not retroactively affect existing requests. Based on § 26 EStG and FFG guidelines.
        </span>
      </div>

      <div className="scch-card overflow-hidden">
        <div
          className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_80px] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--scch-gray)', borderBottom: '1px solid hsl(var(--border))' }}
        >
          <span>Rate</span><span>Notes</span><span>Amount</span><span>Unit</span><span></span>
        </div>
        {rates.map((rate: DailyRate) => (
          <div key={rate.id} className="px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            {editId === rate.id ? (
              <div className="flex items-center gap-3">
                <span className="flex-1 text-sm font-semibold">{rate.label}</span>
                <input
                  type="number" step="0.01" min="0"
                  className="scch-input px-3 py-1.5 text-sm w-28"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                />
                <span className="text-xs" style={{ color: 'var(--scch-gray)' }}>{rate.unit}</span>
                <button className="p-1.5" style={{ color: 'var(--scch-green)' }} onClick={() => save.mutate()}><Check size={14} /></button>
                <button className="p-1.5" style={{ color: '#ff5a5a' }} onClick={() => setEditId(null)}><X size={14} /></button>
              </div>
            ) : (
              <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_80px] gap-4 items-start">
                <div>
                  <p className="text-sm font-semibold">{rate.label}</p>
                  <p className="text-xs font-mono" style={{ color: 'var(--scch-gray)' }}>{rate.key}</p>
                </div>
                <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{rate.notes ?? '—'}</p>
                <p className="text-sm font-bold" style={{ color: 'var(--scch-green)' }}>
                  {formatCurrency(rate.amount)}
                </p>
                <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{rate.unit}</p>
                <button
                  className="p-1.5 scch-btn-ghost rounded"
                  onClick={() => { setEditId(rate.id); setEditAmount(String(rate.amount)); }}
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
            {/* Mobile */}
            <div className="md:hidden flex justify-between items-start gap-3">
              <div>
                <p className="text-sm font-semibold">{rate.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--scch-gray)' }}>{rate.notes}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold" style={{ color: 'var(--scch-green)' }}>{formatCurrency(rate.amount)}</p>
                <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{rate.unit}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
