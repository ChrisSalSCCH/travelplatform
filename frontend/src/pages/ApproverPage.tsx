import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { getRequests, getProjects, getPreRequests, approvePreRequest, rejectPreRequest } from '../lib/api';
import type { TravelRequest, TravelPreRequest } from '../lib/types';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import FfgBadge from '../components/FfgBadge';
import RequestDrawer from '../components/RequestDrawer';
import { formatDate, formatCurrency } from '../lib/utils';

export default function ApproverPage() {
  const [tab, setTab] = useState<'pre' | 'expense'>('pre');

  return (
    <Layout>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl normal-case mb-1">approvals</h1>
            <p style={{ color: 'var(--scch-gray)' }}>Review and approve travel requests and expense reports.</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 p-1 rounded-lg" style={{ background: 'hsl(var(--muted))' }}>
          <button
            onClick={() => setTab('pre')}
            className="flex items-center gap-2 flex-1 py-2 text-sm font-semibold rounded capitalize transition-all"
            style={{
              background: tab === 'pre' ? 'hsl(var(--card))' : 'transparent',
              color: tab === 'pre' ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))',
              border: tab === 'pre' ? '1px solid rgba(0,255,65,0.2)' : '1px solid transparent',
            }}
          >
            <FileText size={14} /> Travel Requests
          </button>
          <button
            onClick={() => setTab('expense')}
            className="flex items-center gap-2 flex-1 py-2 text-sm font-semibold rounded capitalize transition-all"
            style={{
              background: tab === 'expense' ? 'hsl(var(--card))' : 'transparent',
              color: tab === 'expense' ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))',
              border: tab === 'expense' ? '1px solid rgba(0,255,65,0.2)' : '1px solid transparent',
            }}
          >
            <Clock size={14} /> Expense Reports
          </button>
        </div>

        {tab === 'pre' && <PreRequestsTab />}
        {tab === 'expense' && <ExpenseTab />}
      </div>
    </Layout>
  );
}

// ── Travel Requests Tab ──────────────────────────────────────────────────────

function PreRequestsTab() {
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['pre-requests', 'submitted'],
    queryFn: () => getPreRequests({ status: 'submitted' }),
    refetchInterval: 30_000,
  });

  const approve = useMutation({
    mutationFn: (id: string) => approvePreRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pre-requests'] });
      qc.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Request approved — a draft Travel Expense has been created automatically.');
    },
    onError: () => toast.error('Failed to approve'),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectPreRequest(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pre-requests'] });
      setRejectId(null); setRejectReason('');
      toast.success('Request rejected.');
    },
    onError: () => toast.error('Failed to reject'),
  });

  if (isLoading) return <LoadingRows />;

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)' }}>
          <FileText size={28} style={{ color: 'var(--scch-green)' }} />
        </div>
        <h3 style={{ textTransform: 'none' }}>All clear!</h3>
        <p className="text-sm mt-2" style={{ color: 'var(--scch-gray)' }}>No pending travel requests.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="scch-card overflow-hidden">
        <div
          className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_180px] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--scch-gray)', borderBottom: '1px solid hsl(var(--border))' }}
        >
          <span>Employee</span><span>Destination</span><span>Project</span>
          <span>Dates</span><span>Est. Cost</span><span>Actions</span>
        </div>
        {items.map(req => {
          const estTotal =
            (Number(req.estimated_km) || 0) * 0.5 +
            (Number(req.estimated_nights) || 0) * 17 +
            (Number(req.estimated_other_costs) || 0);
          return (
            <div key={req.id}>
              <div
                className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_180px] gap-4 px-5 py-4 items-center"
                style={{ borderBottom: '1px solid hsl(var(--border))' }}
              >
                <div>
                  <p className="font-semibold text-sm">{req.first_name} {req.last_name}</p>
                  <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{req.employee_email}</p>
                </div>
                <div>
                  <p className="text-sm">{req.destination}</p>
                  <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{req.purpose}</p>
                </div>
                <p className="text-sm">{req.project?.code ?? '—'}</p>
                <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>
                  {formatDate(req.travel_start)}<br />→ {formatDate(req.travel_end)}
                </p>
                <p className="text-sm font-bold" style={{ color: 'var(--scch-green)' }}>
                  {estTotal > 0 ? `~${formatCurrency(estTotal)}` : '—'}
                </p>
                <div className="flex gap-2">
                  {rejectId === req.id ? (
                    <div className="flex flex-col gap-1 w-full">
                      <input
                        className="scch-input px-2 py-1 text-xs w-full"
                        placeholder="Reason for rejection"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                      />
                      <div className="flex gap-1">
                        <button
                          className="flex-1 text-xs py-1 rounded font-semibold"
                          style={{ background: 'rgba(255,90,90,0.15)', color: '#ff5a5a', border: '1px solid rgba(255,90,90,0.3)' }}
                          disabled={!rejectReason || reject.isPending}
                          onClick={() => reject.mutate({ id: req.id, reason: rejectReason })}
                        >Confirm</button>
                        <button
                          className="flex-1 text-xs py-1 rounded scch-btn-ghost font-semibold"
                          onClick={() => { setRejectId(null); setRejectReason(''); }}
                        >Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded transition-all"
                        style={{ background: 'rgba(0,255,65,0.12)', color: 'var(--scch-green)', border: '1px solid rgba(0,255,65,0.3)' }}
                        disabled={approve.isPending}
                        onClick={() => approve.mutate(req.id)}
                      >
                        <CheckCircle size={12} /> Approve
                      </button>
                      <button
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded transition-all"
                        style={{ background: 'rgba(255,90,90,0.1)', color: '#ff5a5a', border: '1px solid rgba(255,90,90,0.25)' }}
                        onClick={() => setRejectId(req.id)}
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* Mobile */}
              <div className="md:hidden px-4 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{req.first_name} {req.last_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--scch-gray)' }}>{req.destination}</p>
                  </div>
                  {estTotal > 0 && <p className="font-bold" style={{ color: 'var(--scch-green)' }}>~{formatCurrency(estTotal)}</p>}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    className="flex-1 text-xs py-1.5 font-semibold rounded"
                    style={{ background: 'rgba(0,255,65,0.12)', color: 'var(--scch-green)', border: '1px solid rgba(0,255,65,0.3)' }}
                    onClick={() => approve.mutate(req.id)}
                  >Approve</button>
                  <button
                    className="flex-1 text-xs py-1.5 font-semibold rounded"
                    style={{ background: 'rgba(255,90,90,0.1)', color: '#ff5a5a', border: '1px solid rgba(255,90,90,0.25)' }}
                    onClick={() => setRejectId(req.id)}
                  >Reject</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Expense Reports Tab ─────────────────────────────────────────────────────

function ExpenseTab() {
  const [selected, setSelected] = useState<TravelRequest | null>(null);
  const [projectFilter, setProjectFilter] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', 'submitted'],
    queryFn: () => getRequests({ status: 'submitted' }),
    refetchInterval: 30_000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  const filtered = requests.filter(r =>
    !projectFilter || r.project_id === projectFilter,
  );

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded"
          style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)' }}
        >
          <Clock size={14} style={{ color: 'var(--scch-green)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--scch-green)' }}>
            {filtered.length} pending
          </span>
        </div>
        <select
          className="scch-input px-3 py-2 text-sm"
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
        >
          <option value="">All projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? <LoadingRows /> : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)' }}>
            <Clock size={28} style={{ color: 'var(--scch-green)' }} />
          </div>
          <h3 style={{ textTransform: 'none' }}>All clear!</h3>
          <p className="text-sm mt-2" style={{ color: 'var(--scch-gray)' }}>No pending expense reports.</p>
        </div>
      ) : (
        <div className="scch-card overflow-hidden">
          <div
            className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--scch-gray)', borderBottom: '1px solid hsl(var(--border))' }}
          >
            <span>Employee</span><span>Destination</span><span>Project</span>
            <span>Period</span><span>Total</span><span>Funding</span>
          </div>
          {filtered.map(req => {
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
                  <FfgBadge request={req} />
                </div>
                <div className="md:hidden px-4 py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{req.employee_name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--scch-gray)' }}>{req.destination}</p>
                    </div>
                    <p className="font-bold" style={{ color: 'var(--scch-green)' }}>{formatCurrency(total)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <RequestDrawer request={selected} onClose={() => setSelected(null)} showActions />
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => <div key={i} className="scch-card h-16 animate-pulse" />)}
    </div>
  );
}
