import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, CheckCircle, XCircle, FileText, Search, Image, CreditCard, Wallet } from 'lucide-react';
import { getRequests, getProjects, getPreRequests, approvePreRequest, rejectPreRequest } from '../lib/api';
import type { TravelRequest, TravelPreRequest } from '../lib/types';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import FfgBadge from '../components/FfgBadge';
import RequestDrawer from '../components/RequestDrawer';
import { formatDate, formatCurrency } from '../lib/utils';

export default function ApproverPage() {
  const [tab, setTab] = useState<'pre' | 'expense' | 'receipts'>('pre');

  return (
    <Layout>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-4xl normal-case mb-1">approvals</h1>
          <p style={{ color: 'var(--scch-gray)' }}>Review travel requests, expense reports and uploaded receipts.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 p-1 rounded-lg" style={{ background: 'hsl(var(--muted))' }}>
          {([
            { key: 'pre',      label: 'Travel Requests', icon: FileText },
            { key: 'expense',  label: 'Expense Reports', icon: Clock },
            { key: 'receipts', label: 'Receipts',        icon: Image },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center justify-center gap-2 flex-1 py-2 text-sm font-semibold rounded transition-all"
              style={{
                background: tab === key ? 'hsl(var(--card))' : 'transparent',
                color: tab === key ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))',
                border: tab === key ? '1px solid rgba(0,255,65,0.2)' : '1px solid transparent',
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {tab === 'pre'      && <PreRequestsTab />}
        {tab === 'expense'  && <ExpenseTab />}
        {tab === 'receipts' && <ReceiptsTab />}
      </div>
    </Layout>
  );
}

// ── Shared filter bar ───────────────────────────────────────────────────

function FilterBar({
  search, onSearch,
  projectFilter, onProject, projects,
  statusFilter, onStatus, statusOptions,
}: {
  search: string; onSearch: (v: string) => void;
  projectFilter: string; onProject: (v: string) => void; projects: { id: string; code: string; name: string }[];
  statusFilter?: string; onStatus?: (v: string) => void; statusOptions?: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--scch-gray)' }} />
        <input
          className="scch-input pl-9 pr-3 py-2 text-sm w-56"
          placeholder="Search by name..."
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>
      <select className="scch-input px-3 py-2 text-sm" value={projectFilter} onChange={e => onProject(e.target.value)}>
        <option value="">All projects</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
      </select>
      {statusOptions && onStatus && (
        <select className="scch-input px-3 py-2 text-sm" value={statusFilter} onChange={e => onStatus(e.target.value)}>
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </div>
  );
}

// ── Travel Requests Tab ─────────────────────────────────────────────────────

function PreRequestsTab() {
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');

  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['pre-requests'],
    queryFn: () => getPreRequests(),
    refetchInterval: 30_000,
  });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects });

  const items = useMemo(() => {
    return allItems
      .filter(r => !statusFilter || r.status === statusFilter)
      .filter(r => !projectFilter || r.project_id === projectFilter)
      .filter(r => !search || `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(a.travel_start).getTime() - new Date(b.travel_start).getTime());
  }, [allItems, statusFilter, projectFilter, search]);

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pre-requests'] }); setRejectId(null); setRejectReason(''); toast.success('Request rejected.'); },
    onError: () => toast.error('Failed to reject'),
  });

  return (
    <div>
      <FilterBar
        search={search} onSearch={setSearch}
        projectFilter={projectFilter} onProject={setProjectFilter} projects={projects}
        statusFilter={statusFilter} onStatus={setStatusFilter}
        statusOptions={[
          { value: 'submitted', label: 'Pending' },
          { value: 'approved',  label: 'Approved' },
          { value: 'rejected',  label: 'Rejected' },
          { value: '',          label: 'All statuses' },
        ]}
      />
      {isLoading ? <LoadingRows /> : items.length === 0 ? (
        <EmptyState icon={FileText} label="No travel requests match your filter." />
      ) : (
        <div className="scch-card overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_180px] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--scch-gray)', borderBottom: '1px solid hsl(var(--border))' }}>
            <span>Employee</span><span>Destination</span><span>Project</span>
            <span>Departure ↑</span><span>Est. Cost</span><span>Actions</span>
          </div>
          {items.map(req => {
            const estTotal =
              (Number(req.estimated_km) || 0) * 0.5 +
              (Number(req.estimated_nights) || 0) * 17 +
              (Number(req.estimated_other_costs) || 0);
            return (
              <div key={req.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_180px] gap-4 px-5 py-4 items-center">
                  <div>
                    <p className="font-semibold text-sm">{req.first_name} {req.last_name}</p>
                    <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{req.employee_email}</p>
                  </div>
                  <div>
                    <p className="text-sm">{req.destination}</p>
                    <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{req.purpose}</p>
                  </div>
                  <p className="text-sm">{req.project?.code ?? '—'}</p>
                  <div>
                    <p className="text-xs font-semibold">{formatDate(req.travel_start)}</p>
                    <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>→ {formatDate(req.travel_end)}</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: 'var(--scch-green)' }}>
                    {estTotal > 0 ? `~${formatCurrency(estTotal)}` : '—'}
                  </p>
                  <div className="flex gap-2">
                    {req.status !== 'submitted' ? (
                      <PreStatusBadge status={req.status as TravelPreRequest['status']} />
                    ) : rejectId === req.id ? (
                      <div className="flex flex-col gap-1 w-full">
                        <input className="scch-input px-2 py-1 text-xs w-full" placeholder="Reason" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                        <div className="flex gap-1">
                          <button className="flex-1 text-xs py-1 rounded font-semibold" style={{ background: 'rgba(255,90,90,0.15)', color: '#ff5a5a', border: '1px solid rgba(255,90,90,0.3)' }}
                            disabled={!rejectReason || reject.isPending} onClick={() => reject.mutate({ id: req.id, reason: rejectReason })}>Confirm</button>
                          <button className="flex-1 text-xs py-1 rounded scch-btn-ghost font-semibold" onClick={() => { setRejectId(null); setRejectReason(''); }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded" style={{ background: 'rgba(0,255,65,0.12)', color: 'var(--scch-green)', border: '1px solid rgba(0,255,65,0.3)' }}
                          disabled={approve.isPending} onClick={() => approve.mutate(req.id)}><CheckCircle size={12} /> Approve</button>
                        <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded" style={{ background: 'rgba(255,90,90,0.1)', color: '#ff5a5a', border: '1px solid rgba(255,90,90,0.25)' }}
                          onClick={() => setRejectId(req.id)}><XCircle size={12} /> Reject</button>
                      </>
                    )}
                  </div>
                </div>
                {/* Mobile */}
                <div className="md:hidden px-4 py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{req.first_name} {req.last_name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--scch-gray)' }}>{req.destination} · {formatDate(req.travel_start)}</p>
                    </div>
                    <PreStatusBadge status={req.status as TravelPreRequest['status']} />
                  </div>
                  {req.status === 'submitted' && (
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 text-xs py-1.5 font-semibold rounded" style={{ background: 'rgba(0,255,65,0.12)', color: 'var(--scch-green)', border: '1px solid rgba(0,255,65,0.3)' }}
                        onClick={() => approve.mutate(req.id)}>Approve</button>
                      <button className="flex-1 text-xs py-1.5 font-semibold rounded" style={{ background: 'rgba(255,90,90,0.1)', color: '#ff5a5a', border: '1px solid rgba(255,90,90,0.25)' }}
                        onClick={() => setRejectId(req.id)}>Reject</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Expense Reports Tab ─────────────────────────────────────────────────────

function ExpenseTab() {
  const [selected, setSelected] = useState<TravelRequest | null>(null);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');

  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ['requests', 'all'],
    queryFn: () => getRequests(),
    refetchInterval: 30_000,
  });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects });

  const requests = useMemo(() => {
    return allRequests
      .filter(r => !statusFilter || r.status === statusFilter)
      .filter(r => !projectFilter || r.project_id === projectFilter)
      .filter(r => !search || `${r.first_name} ${r.last_name} ${r.employee_name}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const aDate = a.departure_time ?? a.trip_start;
        const bDate = b.departure_time ?? b.trip_start;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });
  }, [allRequests, statusFilter, projectFilter, search]);

  return (
    <div>
      <FilterBar
        search={search} onSearch={setSearch}
        projectFilter={projectFilter} onProject={setProjectFilter} projects={projects}
        statusFilter={statusFilter} onStatus={setStatusFilter}
        statusOptions={[
          { value: 'submitted', label: 'Pending' },
          { value: 'approved',  label: 'Approved' },
          { value: 'rejected',  label: 'Rejected' },
          { value: 'draft',     label: 'Draft' },
          { value: '',          label: 'All statuses' },
        ]}
      />
      {isLoading ? <LoadingRows /> : requests.length === 0 ? (
        <EmptyState icon={Clock} label="No expense reports match your filter." />
      ) : (
        <div className="scch-card overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--scch-gray)', borderBottom: '1px solid hsl(var(--border))' }}>
            <span>Employee</span><span>Destination</span><span>Project</span>
            <span>Departure ↑</span><span>Total</span><span>Status</span>
          </div>
          {requests.map(req => {
            const total = req.items.reduce((s, i) => s + Number(i.amount), 0);
            const departure = req.departure_time
              ? new Date(req.departure_time).toLocaleDateString('en-AT', { day: '2-digit', month: 'short', year: '2-digit' })
              : formatDate(req.trip_start);
            return (
              <button key={req.id} onClick={() => setSelected(req)}
                className="w-full text-left transition-colors hover:bg-white/5"
                style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-4 items-center">
                  <div>
                    <p className="font-semibold text-sm">{req.employee_name}</p>
                    <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{req.employee_email}</p>
                  </div>
                  <p className="text-sm">{req.destination ?? '—'}</p>
                  <p className="text-sm">{req.project?.code ?? '—'}</p>
                  <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{departure}</p>
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
      <RequestDrawer request={selected} onClose={() => setSelected(null)} showActions />
    </div>
  );
}

// ── Receipts Gallery Tab ────────────────────────────────────────────────────

function ReceiptsTab() {
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [enlarged, setEnlarged] = useState<string | null>(null);

  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ['requests', 'all'],
    queryFn: () => getRequests(),
  });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects });

  // Collect all items that have a receipt_url
  const receipts = useMemo(() => {
    return allRequests
      .filter(r => !projectFilter || r.project_id === projectFilter)
      .filter(r => !search || `${r.employee_name} ${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase()))
      .flatMap(req =>
        req.items
          .filter(item => item.receipt_url)
          .map(item => ({
            item,
            req,
            // paidPrivately is stored in description as a suffix when submitted
            paidPrivately: !item.description.includes('[SCCH CC]'),
          }))
      )
      .sort((a, b) => new Date(a.req.trip_start).getTime() - new Date(b.req.trip_start).getTime());
  }, [allRequests, projectFilter, search]);

  return (
    <div>
      <FilterBar
        search={search} onSearch={setSearch}
        projectFilter={projectFilter} onProject={setProjectFilter} projects={projects}
      />
      {isLoading ? <LoadingRows /> : receipts.length === 0 ? (
        <EmptyState icon={Image} label="No receipts with uploaded files found." />
      ) : (
        <>
          <p className="text-xs mb-4" style={{ color: 'var(--scch-gray)' }}>
            {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} found
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {receipts.map(({ item, req, paidPrivately }) => (
              <div
                key={item.id}
                className="relative group rounded-xl overflow-hidden cursor-pointer"
                style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', aspectRatio: '3/4' }}
                onClick={() => setEnlarged(item.receipt_url!)}
              >
                {/* Receipt image / PDF icon */}
                {item.receipt_url?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                  <img
                    src={item.receipt_url}
                    alt={item.description}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'hsl(var(--muted))' }}>
                    <FileText size={40} style={{ color: 'var(--scch-gray)' }} />
                  </div>
                )}

                {/* Overlay */}
                <div
                  className="absolute inset-0 flex flex-col justify-between p-2.5"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 40%, transparent 55%, rgba(0,0,0,0.72) 100%)' }}
                >
                  {/* Top: payment badge */}
                  <div className="flex justify-end">
                    <span
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: paidPrivately ? 'rgba(0,255,65,0.2)' : 'rgba(255,170,0,0.2)',
                        color: paidPrivately ? 'var(--scch-green)' : '#ffaa00',
                        border: `1px solid ${paidPrivately ? 'rgba(0,255,65,0.4)' : 'rgba(255,170,0,0.4)'}`,
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {paidPrivately
                        ? <><Wallet size={10} /> Private</>
                        : <><CreditCard size={10} /> SCCH CC</>}
                    </span>
                  </div>

                  {/* Bottom: amount + person */}
                  <div>
                    <p className="font-bold text-white text-lg leading-tight">{formatCurrency(item.amount)}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {req.employee_name || `${req.first_name} ${req.last_name}`}
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Lightbox */}
      {enlarged && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          onClick={() => setEnlarged(null)}
        >
          {enlarged.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
            <img src={enlarged} alt="Receipt" className="max-w-full max-h-full rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
          ) : (
            <iframe src={enlarged} className="w-full max-w-3xl h-[80vh] rounded-xl" onClick={e => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared helpers ──────────────────────────────────────────────────────────

function LoadingRows() {
  return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="scch-card h-16 animate-pulse" />)}</div>;
}

function EmptyState({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)' }}>
        <Icon size={28} style={{ color: 'var(--scch-green)' }} />
      </div>
      <p className="text-sm" style={{ color: 'var(--scch-gray)' }}>{label}</p>
    </div>
  );
}

function PreStatusBadge({ status }: { status: TravelPreRequest['status'] }) {
  const cfg = {
    submitted: { color: '#ffaa00', bg: 'rgba(255,170,0,0.1)', label: 'Pending' },
    approved:  { color: 'var(--scch-green)', bg: 'rgba(0,255,65,0.1)', label: 'Approved' },
    rejected:  { color: '#ff5a5a', bg: 'rgba(255,90,90,0.1)', label: 'Rejected' },
  }[status];
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded inline-block"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
      {cfg.label}
    </span>
  );
}
