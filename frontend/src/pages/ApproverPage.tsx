import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Clock } from 'lucide-react';
import { getRequests, getProjects } from '../lib/api';
import type { TravelRequest } from '../lib/types';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import FfgBadge from '../components/FfgBadge';
import RequestDrawer from '../components/RequestDrawer';
import { formatDate, formatCurrency } from '../lib/utils';

export default function ApproverPage() {
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
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl normal-case mb-1">approvals</h1>
            <p style={{ color: 'var(--scch-gray)' }}>Pending travel expense requests awaiting your decision.</p>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded"
            style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)' }}
          >
            <Clock size={14} style={{ color: 'var(--scch-green)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--scch-green)' }}>
              {filtered.length} pending
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
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

        {/* Table */}
        {isLoading ? (
          <LoadingRows />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="scch-card overflow-hidden">
            {/* Desktop header */}
            <div
              className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--scch-gray)', borderBottom: '1px solid hsl(var(--border))' }}
            >
              <span>Employee</span>
              <span>Destination</span>
              <span>Project</span>
              <span>Period</span>
              <span>Total</span>
              <span>Funding</span>
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
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-4 items-center">
                    <div>
                      <p className="font-semibold text-sm">{req.employee_name}</p>
                      <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{req.employee_email}</p>
                    </div>
                    <p className="text-sm">{req.destination}</p>
                    <p className="text-sm">{req.project?.code ?? '—'}</p>
                    <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>
                      {formatDate(req.trip_start)}
                    </p>
                    <p className="text-sm font-bold" style={{ color: 'var(--scch-green)' }}>
                      {formatCurrency(total)}
                    </p>
                    <FfgBadge request={req} />
                  </div>

                  {/* Mobile row */}
                  <div className="md:hidden px-4 py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{req.employee_name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--scch-gray)' }}>{req.destination}</p>
                      </div>
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
      </div>

      <RequestDrawer request={selected} onClose={() => setSelected(null)} showActions />
    </Layout>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="scch-card h-16 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)' }}
      >
        <Clock size={28} style={{ color: 'var(--scch-green)' }} />
      </div>
      <h3 style={{ textTransform: 'none' }}>All clear!</h3>
      <p className="text-sm mt-2" style={{ color: 'var(--scch-gray)' }}>No pending requests awaiting approval.</p>
    </div>
  );
}
