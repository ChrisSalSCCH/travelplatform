import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, FileText, ExternalLink, CheckCircle, XCircle, Car, MapPin, Users } from 'lucide-react';
import type { TravelRequest } from '../lib/types';
import { approveRequest, rejectRequest } from '../lib/api';
import StatusBadge from './StatusBadge';
import FfgBadge from './FfgBadge';
import { formatDate, formatCurrency, CATEGORY_LABELS } from '../lib/utils';

interface Props {
  request: TravelRequest | null;
  onClose: () => void;
  showActions?: boolean;
}

function formatDuration(min: number | null): string {
  if (!min) return '—';
  const h = Math.floor(min / 60); const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export default function RequestDrawer({ request, onClose, showActions = false }: Props) {
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const approve = useMutation({
    mutationFn: () => approveRequest(request!.id),
    onSuccess: () => { toast.success('Request approved'); qc.invalidateQueries({ queryKey: ['requests'] }); onClose(); },
    onError: () => toast.error('Failed to approve'),
  });
  const reject = useMutation({
    mutationFn: () => rejectRequest(request!.id, rejectReason),
    onSuccess: () => { toast.success('Request rejected'); qc.invalidateQueries({ queryKey: ['requests'] }); onClose(); },
    onError: () => toast.error('Failed to reject'),
  });

  if (!request) return null;
  const total = request.items.reduce((s, i) => s + Number(i.amount), 0);

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="scch-card p-3">
      <dt className="text-xs" style={{ color: 'var(--scch-gray)' }}>{label}</dt>
      <dd className="text-sm font-medium mt-0.5 break-words">{value || '—'}</dd>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-y-auto"
        style={{ width: 'min(560px, 100vw)', background: 'hsl(var(--card))', borderLeft: '1px solid hsl(var(--border))' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <p className="text-xs font-mono" style={{ color: 'var(--scch-green)' }}>#{request.id.slice(0, 8).toUpperCase()}</p>
            <h3 className="mt-0.5" style={{ textTransform: 'none' }}>{request.first_name} {request.last_name}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded scch-btn-ghost"><X size={18} /></button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={request.status} />
            <FfgBadge request={request} />
          </div>

          {/* Trip info */}
          <section>
            <h4 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--scch-gray)' }}>Trip Details</h4>
            <dl className="grid grid-cols-2 gap-3">
              {request.employee_email && <InfoRow label="Email" value={request.employee_email} />}
              {request.department && <InfoRow label="Department" value={request.department} />}
              <InfoRow label="Purpose" value={request.purpose} />
              {request.work_package && <InfoRow label="Work Package" value={request.work_package} />}
              <InfoRow label="Project" value={request.project ? `${request.project.code} — ${request.project.name}` : request.project_id} />
              <InfoRow label="Funder" value={request.project?.funder ?? '—'} />
              <InfoRow label="Departure" value={request.departure_time ? new Date(request.departure_time).toLocaleString('en-AT') : formatDate(request.trip_start)} />
              <InfoRow label="Return" value={request.return_time ? new Date(request.return_time).toLocaleString('en-AT') : formatDate(request.trip_end)} />
            </dl>
          </section>

          {/* Per-day allowance */}
          {request.allowance_days && request.allowance_days.length > 0 && (
            <section>
              <h4 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--scch-gray)' }}>Daily Allowance Breakdown</h4>
              <div className="space-y-2">
                {request.allowance_days.map(d => (
                  <div key={d.id} className="scch-card p-3 flex justify-between items-start gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {new Date(d.day).toLocaleDateString('en-AT', { weekday: 'short', day: '2-digit', month: 'short' })}
                        {d.is_abroad && <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(96,170,255,0.12)', color: '#60aaff' }}>Abroad</span>}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--scch-gray)' }}>
                        {[d.meal_breakfast && 'Breakfast', d.meal_lunch && 'Lunch', d.meal_dinner && 'Dinner'].filter(Boolean).join(', ') || 'No meal invitations'}
                      </p>
                    </div>
                    <span className="font-bold text-sm" style={{ color: 'var(--scch-green)' }}>{formatCurrency(d.allowance_amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between p-3 rounded font-bold"
                  style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)' }}>
                  <span>Allowance Total</span>
                  <span style={{ color: 'var(--scch-green)' }}>
                    {formatCurrency(request.allowance_days.reduce((s, d) => s + Number(d.allowance_amount), 0))}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Route legs */}
          {request.route_legs && request.route_legs.length > 0 && (
            <section>
              <h4 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--scch-gray)' }}>Car Route</h4>
              {request.route_legs.map(leg => (
                <div key={leg.id} className="scch-card p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Car size={16} style={{ color: 'var(--scch-green)', marginTop: 2 }} />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 text-sm">
                        <MapPin size={11} style={{ color: 'var(--scch-gray)' }} />
                        <span style={{ color: 'var(--scch-gray)' }}>{leg.origin}</span>
                      </div>
                      {leg.waypoints && (() => { try { const wps: string[] = JSON.parse(leg.waypoints); return wps.map((wp, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-sm">
                          <MapPin size={11} style={{ color: '#60aaff' }} />
                          <span style={{ color: '#60aaff' }}>{wp}</span>
                        </div>
                      )); } catch { return null; } })()}
                      <div className="flex items-center gap-1.5 text-sm">
                        <MapPin size={11} style={{ color: 'var(--scch-green)' }} />
                        <span>{leg.destination}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="text-center">
                      <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Distance</p>
                      <p className="font-bold text-sm" style={{ color: 'var(--scch-green)' }}>{leg.distance_km ? `${Number(leg.distance_km).toFixed(1)} km` : '—'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Duration</p>
                      <p className="font-bold text-sm" style={{ color: 'var(--scch-green)' }}>{formatDuration(leg.duration_min)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Return</p>
                      <p className="font-bold text-sm" style={{ color: leg.return_trip ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))' }}>{leg.return_trip ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Passengers */}
          {request.passengers && request.passengers.length > 0 && (
            <section>
              <h4 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--scch-gray)' }}>Passengers</h4>
              <div className="space-y-2">
                {request.passengers.map(p => (
                  <div key={p.id} className="scch-card p-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Users size={13} style={{ color: 'var(--scch-green)' }} />
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: 'var(--scch-green)' }}>{Number(p.km).toFixed(1)} km</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Expense items */}
          <section>
            <h4 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--scch-gray)' }}>Expense Items</h4>
            {request.items.length === 0 ? (
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>No items.</p>
            ) : (
              <div className="space-y-2">
                {request.items.map(item => (
                  <div key={item.id} className="scch-card p-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--scch-green)' }}>{CATEGORY_LABELS[item.category]}</p>
                      <p className="text-sm mt-0.5 truncate">{item.description}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--scch-gray)' }}>{formatDate(item.date)}{item.km ? ` · ${item.km} km` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{formatCurrency(item.amount)}</p>
                      {item.receipt_url && (
                        <a href={item.receipt_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--scch-green)' }}>
                          <FileText size={11} /> Receipt <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 rounded font-bold"
                  style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--scch-green)' }}>{formatCurrency(total)}</span>
                </div>
              </div>
            )}
          </section>

          {request.rejection_reason && (
            <section>
              <h4 className="text-xs uppercase tracking-widest mb-2" style={{ color: '#ff5a5a' }}>Rejection Reason</h4>
              <p className="text-sm scch-card p-3" style={{ borderColor: 'rgba(255,90,90,0.3)', color: '#ff5a5a' }}>{request.rejection_reason}</p>
            </section>
          )}
        </div>

        {/* Actions */}
        {showActions && request.status === 'submitted' && (
          <div className="p-6 border-t border-border space-y-3">
            {showRejectForm ? (
              <div className="space-y-3">
                <textarea placeholder="Reason for rejection (required)" value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="scch-input w-full p-3 text-sm rounded resize-none" rows={3} />
                <div className="flex gap-2">
                  <button onClick={() => setShowRejectForm(false)} className="flex-1 py-2 px-4 text-sm scch-btn-ghost">Cancel</button>
                  <button onClick={() => reject.mutate()} disabled={!rejectReason.trim() || reject.isPending}
                    className="flex-1 py-2 px-4 text-sm font-bold rounded" style={{ background: '#ff5a5a', color: '#fff' }}>
                    {reject.isPending ? 'Rejecting...' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setShowRejectForm(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded font-semibold text-sm"
                  style={{ background: 'rgba(255,90,90,0.12)', color: '#ff5a5a', border: '1px solid rgba(255,90,90,0.3)' }}>
                  <XCircle size={16} /> Reject
                </button>
                <button onClick={() => approve.mutate()} disabled={approve.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 scch-btn-primary">
                  <CheckCircle size={16} />
                  {approve.isPending ? 'Approving...' : 'Approve'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
