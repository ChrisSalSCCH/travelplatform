import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  X, FileText, CheckCircle, XCircle, Car, MapPin, Users,
  Wallet, CreditCard, Check, AlertCircle, Clock, Download,
} from 'lucide-react';
import type { TravelRequest, ExpenseItem } from '../lib/types';
import { approveRequest, rejectRequest, approveItem, rejectItem } from '../lib/api';
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

function ReceiptApprovalBadge({ approved }: { approved: boolean | null }) {
  if (approved === true)
    return (
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(0,255,65,0.15)', color: 'var(--scch-green)', border: '1px solid rgba(0,255,65,0.3)' }}>
        <Check size={10} /> Approved
      </span>
    );
  if (approved === false)
    return (
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(255,90,90,0.15)', color: '#ff5a5a', border: '1px solid rgba(255,90,90,0.3)' }}>
        <XCircle size={10} /> Rejected
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: 'rgba(255,170,0,0.12)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.25)' }}>
      <Clock size={10} /> Pending
    </span>
  );
}

export default function RequestDrawer({ request, onClose, showActions = false }: Props) {
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ExpenseItem | null>(null);

  // Per-receipt approval fields
  const [kreditor, setKreditor] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<string>('');
  const [approvalComment, setApprovalComment] = useState('');
  const [vatRate, setVatRate] = useState<string>('');

  // Pre-fill fields when a receipt is selected
  useEffect(() => {
    if (!activeReceipt) return;
    setKreditor(activeReceipt.kreditor ?? '');
    setApprovedAmount(activeReceipt.approved_amount != null ? String(activeReceipt.approved_amount) : String(activeReceipt.amount));
    setApprovalComment(activeReceipt.approval_comment ?? '');
    setVatRate(activeReceipt.vat_rate != null ? String(activeReceipt.vat_rate) : '');
  }, [activeReceipt?.id]);

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
  const approveItemMut = useMutation({
    mutationFn: (id: string) => approveItem(id, {
      kreditor,
      approved_amount: approvedAmount !== '' ? Number(approvedAmount) : null,
      approval_comment: approvalComment || null,
      vat_rate: vatRate !== '' ? Number(vatRate) : null,
    }),
    onSuccess: (updated) => {
      toast.success('Receipt approved');
      qc.invalidateQueries({ queryKey: ['requests'] });
      setActiveReceipt(updated);
    },
    onError: () => toast.error('Failed to approve receipt'),
  });
  const rejectItemMut = useMutation({
    mutationFn: (id: string) => rejectItem(id),
    onSuccess: (updated) => {
      toast.success('Receipt rejected');
      qc.invalidateQueries({ queryKey: ['requests'] });
      setActiveReceipt(updated);
    },
    onError: () => toast.error('Failed to reject receipt'),
  });

  if (!request) return null;
  const total = request.items.reduce((s, i) => s + Number(i.amount), 0);
  const receiptItems = request.items.filter(i => i.receipt_url);
  const nonReceiptItems = request.items.filter(i => !i.receipt_url);

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
        style={{ width: 'min(620px, 100vw)', background: 'hsl(var(--card))', borderLeft: '1px solid hsl(var(--border))' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div>
            <p className="text-xs font-mono" style={{ color: 'var(--scch-green)' }}>#{request.id.slice(0, 8).toUpperCase()}</p>
            <h3 className="mt-0.5" style={{ textTransform: 'none' }}>{request.first_name} {request.last_name}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded scch-btn-ghost"><X size={18} /></button>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
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

          {/* ── Receipt Gallery ── */}
          {receiptItems.length > 0 && (
            <section>
              <h4 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--scch-gray)' }}>
                Receipts ({receiptItems.length})
              </h4>

              {/* Thumbnail grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {receiptItems.map(item => {
                  const isActive = activeReceipt?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveReceipt(isActive ? null : item)}
                      className="relative rounded-lg overflow-hidden group"
                      style={{
                        aspectRatio: '3/4',
                        border: `2px solid ${
                          isActive ? 'var(--scch-green)'
                          : item.receipt_approved === true ? 'rgba(0,255,65,0.4)'
                          : item.receipt_approved === false ? 'rgba(255,90,90,0.4)'
                          : 'hsl(var(--border))'
                        }`,
                      }}
                    >
                      {/* Image or PDF icon */}
                      {item.receipt_url?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                        <img src={item.receipt_url} alt={item.description}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'hsl(var(--muted))' }}>
                          <FileText size={28} style={{ color: 'var(--scch-gray)' }} />
                        </div>
                      )}

                      {/* Overlay gradient */}
                      <div className="absolute inset-0 pointer-events-none"
                        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 40%, transparent 50%, rgba(0,0,0,0.75) 100%)' }}>
                        {/* Top: payment */}
                        <div className="absolute top-1.5 left-1.5">
                          {item.paid_privately
                            ? <span className="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,255,65,0.25)', color: 'var(--scch-green)' }}><Wallet size={9} /> Priv.</span>
                            : <span className="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,170,0,0.25)', color: '#ffaa00' }}><CreditCard size={9} /> CC</span>
                          }
                        </div>
                        {/* Top right: approval status */}
                        <div className="absolute top-1.5 right-1.5">
                          {item.receipt_approved === true && <Check size={14} style={{ color: 'var(--scch-green)' }} />}
                          {item.receipt_approved === false && <XCircle size={14} style={{ color: '#ff5a5a' }} />}
                          {item.receipt_approved === null && <Clock size={14} style={{ color: '#ffaa00' }} />}
                        </div>
                        {/* Bottom: amount */}
                        <div className="absolute bottom-2 left-2">
                          <p className="text-white font-bold text-sm leading-tight">{formatCurrency(item.amount)}</p>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>{item.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active receipt detail */}
              {activeReceipt && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,255,65,0.25)', background: 'hsl(var(--muted))' }}>
                  {/* Large image */}
                  <div className="relative cursor-pointer" onClick={() => setLightbox(activeReceipt.receipt_url)}>
                    {activeReceipt.receipt_url?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                      <img src={activeReceipt.receipt_url} alt={activeReceipt.description}
                        className="w-full max-h-72 object-contain" style={{ background: 'hsl(var(--card))' }} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <FileText size={48} style={{ color: 'var(--scch-gray)' }} />
                        <a href={activeReceipt.receipt_url!} target="_blank" rel="noreferrer"
                          className="text-sm" style={{ color: 'var(--scch-green)' }}>Open PDF</a>
                      </div>
                    )}
                    <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>click to enlarge</span>
                  </div>

                  {/* Meta + approval */}
                  <div className="p-4 space-y-3">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{activeReceipt.description || CATEGORY_LABELS[activeReceipt.category]}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--scch-gray)' }}>{formatDate(activeReceipt.date)}</p>
                      </div>
                      <p className="font-bold text-lg" style={{ color: 'var(--scch-green)' }}>{formatCurrency(activeReceipt.amount)}</p>
                    </div>

                    {/* Payment method + status + download */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {activeReceipt.paid_privately
                          ? <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded" style={{ background: 'rgba(0,255,65,0.1)', color: 'var(--scch-green)', border: '1px solid rgba(0,255,65,0.2)' }}><Wallet size={11} /> Paid privately</span>
                          : <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded" style={{ background: 'rgba(255,170,0,0.1)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.2)' }}><CreditCard size={11} /> SCCH Credit Card</span>
                        }
                        <ReceiptApprovalBadge approved={activeReceipt.receipt_approved} />
                      </div>
                      {activeReceipt.receipt_url && (
                        <a href={activeReceipt.receipt_url} download target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded transition-all"
                          style={{ background: 'rgba(0,255,65,0.08)', color: 'var(--scch-green)', border: '1px solid rgba(0,255,65,0.2)' }}>
                          <Download size={11} /> Download
                        </a>
                      )}
                    </div>

                    {/* ── Approval fields (edit mode) ── */}
                    {showActions ? (() => {
                      const amountChanged = approvedAmount !== '' && Number(approvedAmount) !== Number(activeReceipt.amount);
                      const canApprove = kreditor.trim().length > 0 && (!amountChanged || approvalComment.trim().length > 0);
                      return (
                        <div className="space-y-2 pt-1">
                          {/* Kreditor — required */}
                          <div>
                            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--scch-gray)' }}>
                              Kreditor <span style={{ color: '#ff5a5a' }}>*</span>
                            </label>
                            <input
                              className="scch-input w-full px-3 py-2 text-sm"
                              placeholder="e.g. Hotel Beispiel GmbH"
                              value={kreditor}
                              onChange={e => setKreditor(e.target.value)}
                            />
                          </div>

                          {/* Approved amount + VAT row */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--scch-gray)' }}>Approved amount (€)</label>
                              <input
                                type="number" step="0.01" min="0"
                                className="scch-input w-full px-3 py-2 text-sm"
                                value={approvedAmount}
                                onChange={e => setApprovedAmount(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--scch-gray)' }}>VAT rate (%)</label>
                              <input
                                type="number" step="0.01" min="0" max="100"
                                className="scch-input w-full px-3 py-2 text-sm"
                                placeholder="e.g. 20"
                                value={vatRate}
                                onChange={e => setVatRate(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Comment — required when amount changed */}
                          {amountChanged && (
                            <div>
                              <label className="text-xs font-semibold mb-1 block" style={{ color: '#ffaa00' }}>
                                Comment required — amount differs from original <span style={{ color: '#ff5a5a' }}>*</span>
                              </label>
                              <textarea
                                rows={2}
                                className="scch-input w-full px-3 py-2 text-sm resize-none"
                                placeholder="Reason for adjustment..."
                                value={approvalComment}
                                onChange={e => setApprovalComment(e.target.value)}
                              />
                            </div>
                          )}

                          {/* Approve / Reject */}
                          <div className="flex gap-2 pt-1">
                            <button
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded transition-all"
                              style={{
                                background: canApprove ? (activeReceipt.receipt_approved === true ? 'rgba(0,255,65,0.25)' : 'rgba(0,255,65,0.12)') : 'rgba(0,255,65,0.05)',
                                color: canApprove ? 'var(--scch-green)' : 'rgba(0,255,65,0.35)',
                                border: '1px solid rgba(0,255,65,0.3)',
                                cursor: canApprove ? 'pointer' : 'not-allowed',
                              }}
                              disabled={!canApprove || approveItemMut.isPending}
                              onClick={() => approveItemMut.mutate(activeReceipt.id)}
                            >
                              <CheckCircle size={14} />
                              {activeReceipt.receipt_approved === true ? 'Approved ✔' : 'Approve Receipt'}
                            </button>
                            <button
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded transition-all"
                              style={{
                                background: activeReceipt.receipt_approved === false ? 'rgba(255,90,90,0.2)' : 'rgba(255,90,90,0.08)',
                                color: '#ff5a5a',
                                border: '1px solid rgba(255,90,90,0.25)',
                              }}
                              disabled={rejectItemMut.isPending}
                              onClick={() => rejectItemMut.mutate(activeReceipt.id)}
                            >
                              <XCircle size={14} />
                              {activeReceipt.receipt_approved === false ? 'Rejected ✗' : 'Reject Receipt'}
                            </button>
                          </div>
                        </div>
                      );
                    })() : (
                      /* Read-only view of saved approval data */
                      (activeReceipt.kreditor || activeReceipt.approved_amount != null || activeReceipt.vat_rate != null) && (
                        <div className="space-y-1 pt-1">
                          {activeReceipt.kreditor && (
                            <div className="scch-card px-3 py-2">
                              <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Kreditor</p>
                              <p className="text-sm font-medium">{activeReceipt.kreditor}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            {activeReceipt.approved_amount != null && (
                              <div className="scch-card px-3 py-2">
                                <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Approved</p>
                                <p className="text-sm font-bold" style={{ color: 'var(--scch-green)' }}>{formatCurrency(activeReceipt.approved_amount)}</p>
                              </div>
                            )}
                            {activeReceipt.vat_rate != null && (
                              <div className="scch-card px-3 py-2">
                                <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>VAT</p>
                                <p className="text-sm font-bold">{activeReceipt.vat_rate} %</p>
                              </div>
                            )}
                          </div>
                          {activeReceipt.approval_comment && (
                            <div className="scch-card px-3 py-2">
                              <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Comment</p>
                              <p className="text-sm">{activeReceipt.approval_comment}</p>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>                </div>
              )}
            </section>
          )}

          {/* Other expense items (no receipt) */}
          {nonReceiptItems.length > 0 && (
            <section>
              <h4 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--scch-gray)' }}>Other Expense Items</h4>
              <div className="space-y-2">
                {nonReceiptItems.map(item => (
                  <div key={item.id} className="scch-card p-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--scch-green)' }}>{CATEGORY_LABELS[item.category]}</p>
                      <p className="text-sm mt-0.5 truncate">{item.description}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--scch-gray)' }}>{formatDate(item.date)}{item.km ? ` · ${item.km} km` : ''}</p>
                    </div>
                    <p className="text-sm font-bold shrink-0">{formatCurrency(item.amount)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Total */}
          {request.items.length > 0 && (
            <div className="flex justify-between items-center p-3 rounded font-bold"
              style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)' }}>
              <span>Total</span>
              <span style={{ color: 'var(--scch-green)' }}>{formatCurrency(total)}</span>
            </div>
          )}

          {request.rejection_reason && (
            <section>
              <h4 className="text-xs uppercase tracking-widest mb-2" style={{ color: '#ff5a5a' }}>Rejection Reason</h4>
              <p className="text-sm scch-card p-3" style={{ borderColor: 'rgba(255,90,90,0.3)', color: '#ff5a5a' }}>{request.rejection_reason}</p>
            </section>
          )}
        </div>

        {/* Request-level approve/reject */}
        {showActions && request.status === 'submitted' && (
          <div className="p-6 border-t border-border space-y-3 shrink-0">
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
                  {approve.isPending ? 'Approving...' : 'Approve Report'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setLightbox(null)}>
          {lightbox.match(/\.(jpg|jpeg|png|webp|gif)$/i)
            ? <img src={lightbox} alt="Receipt" className="max-w-full max-h-full rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
            : <iframe src={lightbox} className="w-full max-w-3xl h-[85vh] rounded-xl" />
          }
          <button className="absolute top-4 right-4 p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} onClick={() => setLightbox(null)}>
            <X size={20} style={{ color: 'white' }} />
          </button>
        </div>
      )}
    </>
  );
}
