import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Info, Loader2, CheckCircle2, MapPin, Calendar, FileText, Car, Moon, Receipt } from 'lucide-react';
import { getProjects, getWorkPackages, createPreRequest, getPreRequests } from '../lib/api';
import type { TravelPreRequest } from '../lib/types';
import { useAuth } from '../lib/auth';
import Layout from '../components/Layout';
import Combobox from '../components/Combobox';
import StatusBadge from '../components/StatusBadge';
import { formatDate, formatCurrency } from '../lib/utils';

const PURPOSE_OPTIONS = [
  'Conference / Workshop', 'Client Meeting', 'Internal Meeting',
  'Training / Course', 'Site Visit', 'Trade Fair / Exhibition',
  'Research Visit', 'Other',
].map(p => ({ value: p, label: p }));

function Field({ label, required, hint, children, className = '' }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {label}{required && <span style={{ color: 'var(--scch-green)' }}> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--scch-gray)' }}>{hint}</p>}
    </div>
  );
}

export default function TravelRequestPage() {
  const { user } = useAuth();

  // Form state
  const [projectId, setProjectId] = useState('');
  const [workPackage, setWorkPackage] = useState('');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [travelStart, setTravelStart] = useState('');
  const [travelEnd, setTravelEnd] = useState('');
  const [estimatedKm, setEstimatedKm] = useState('');
  const [estimatedNights, setEstimatedNights] = useState('');
  const [estimatedOther, setEstimatedOther] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => getProjects(true) });
  const { data: workPackages = [] } = useQuery({
    queryKey: ['workpackages', projectId],
    queryFn: () => getWorkPackages(projectId || undefined, true),
  });
  const { data: myRequests = [], refetch } = useQuery({
    queryKey: ['pre-requests'],
    queryFn: () => getPreRequests(),
  });

  const projectOptions = projects.map(p => ({ value: p.id, label: `${p.code} — ${p.name}`, sub: p.funder }));
  const wpOptions = workPackages.map(wp => ({ value: `${wp.code} — ${wp.name}`, label: `${wp.code} — ${wp.name}` }));

  // Estimated daily allowance preview (domestic rate 30 €)
  const tripDays = travelStart && travelEnd
    ? Math.max(1, Math.round((new Date(travelEnd).getTime() - new Date(travelStart).getTime()) / 86400000) + 1)
    : 0;
  const estAllowance = tripDays * 30;
  const estMileage = Number(estimatedKm) * 0.5;
  const estNightCost = Number(estimatedNights) * 17;
  const estTotal = estAllowance + estMileage + estNightCost + Number(estimatedOther);

  const submitMutation = useMutation({
    mutationFn: () => createPreRequest({
      project_id: projectId,
      work_package: workPackage || null,
      destination,
      purpose,
      travel_start: travelStart,
      travel_end: travelEnd,
      estimated_km: estimatedKm ? Number(estimatedKm) : null,
      estimated_nights: estimatedNights ? Number(estimatedNights) : null,
      estimated_other_costs: estimatedOther ? Number(estimatedOther) : null,
      notes: notes || null,
    }),
    onSuccess: () => {
      toast.success('Travel request submitted!');
      setSubmitted(true);
      refetch();
    },
    onError: () => toast.error('Submission failed. Please try again.'),
  });

  const canSubmit = projectId && destination && purpose && travelStart && travelEnd;

  const resetForm = () => {
    setProjectId(''); setWorkPackage(''); setDestination(''); setPurpose('');
    setTravelStart(''); setTravelEnd('');
    setEstimatedKm(''); setEstimatedNights(''); setEstimatedOther(''); setNotes('');
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(0,255,65,0.12)', border: '2px solid var(--scch-green)' }}>
            <CheckCircle2 size={40} style={{ color: 'var(--scch-green)' }} />
          </div>
          <h1 className="text-3xl mb-3 normal-case">request submitted!</h1>
          <p className="mb-8" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Your travel request has been sent for approval.
          </p>
          <button onClick={resetForm} className="scch-btn-primary px-8 py-3 font-semibold">
            Submit another
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-5xl">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-4xl normal-case mb-1">travel request</h1>
            <p style={{ color: 'var(--scch-gray)' }}>
              Request approval for an upcoming business trip before you travel.
            </p>
            {user && (
              <p className="mt-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Submitting as{' '}
                <strong style={{ color: 'hsl(var(--foreground))' }}>
                  {user.first_name} {user.last_name}
                </strong>
                {user.department && <> · {user.department}</>}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            {/* Left: form */}
            <div className="space-y-5">
              {/* Trip info */}
              <div className="rounded-xl p-6 space-y-5"
                style={{ background: 'hsl(var(--card))', border: '1px solid rgba(0,255,65,0.2)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.2)' }}>
                    <MapPin size={18} style={{ color: 'var(--scch-green)' }} />
                  </div>
                  <div>
                    <p className="font-bold">Trip Details</p>
                    <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Where, when and why</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Project" required className="sm:col-span-2">
                    {projects.length > 0 ? (
                      <Combobox options={projectOptions} value={projectId}
                        onChange={val => { const m = projects.find(p => p.id === val || `${p.code} — ${p.name}` === val); setProjectId(m ? m.id : val); setWorkPackage(''); }}
                        placeholder="Select project..." />
                    ) : (
                      <input className="scch-input w-full px-3 py-2 text-sm"
                        placeholder="Enter project name..."
                        value={projectId} onChange={e => { setProjectId(e.target.value); setWorkPackage(''); }} />
                    )}
                  </Field>
                  <Field label="Work Package" className="sm:col-span-2">
                    {workPackages.length > 0 ? (
                      <Combobox options={wpOptions} value={workPackage} onChange={setWorkPackage}
                        placeholder={projectId ? 'Select work package...' : 'Select a project first...'} />
                    ) : (
                      <input className="scch-input w-full px-3 py-2 text-sm"
                        placeholder="Enter work package (optional)..."
                        value={workPackage} onChange={e => setWorkPackage(e.target.value)} />
                    )}
                  </Field>
                  <Field label="Destination" required className="sm:col-span-2">
                    <input className="scch-input w-full px-3 py-2 text-sm"
                      placeholder="e.g. Vienna, Austria" value={destination}
                      onChange={e => setDestination(e.target.value)} />
                  </Field>
                  <Field label="Purpose" required className="sm:col-span-2">
                    <Combobox options={PURPOSE_OPTIONS} value={purpose} onChange={setPurpose}
                      placeholder="Select or describe purpose..." />
                  </Field>
                  <Field label="Travel from" required>
                    <input type="date" className="scch-input w-full px-3 py-2 text-sm"
                      value={travelStart} onChange={e => setTravelStart(e.target.value)} />
                  </Field>
                  <Field label="Travel until" required>
                    <input type="date" className="scch-input w-full px-3 py-2 text-sm"
                      value={travelEnd} onChange={e => setTravelEnd(e.target.value)} />
                  </Field>
                </div>
              </div>

              {/* Cost estimates */}
              <div className="rounded-xl p-6 space-y-5"
                style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.2)' }}>
                    <Receipt size={18} style={{ color: 'var(--scch-green)' }} />
                  </div>
                  <div>
                    <p className="font-bold">Estimated Costs</p>
                    <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Optional — helps finance plan ahead</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Estimated km" hint="One-way km by private car">
                    <div className="relative">
                      <Car size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--scch-gray)' }} />
                      <input type="number" min="0" step="1" className="scch-input w-full pl-8 pr-3 py-2 text-sm"
                        placeholder="0" value={estimatedKm} onChange={e => setEstimatedKm(e.target.value)} />
                    </div>
                  </Field>
                  <Field label="Overnight stays" hint="Number of nights">
                    <div className="relative">
                      <Moon size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--scch-gray)' }} />
                      <input type="number" min="0" step="1" className="scch-input w-full pl-8 pr-3 py-2 text-sm"
                        placeholder="0" value={estimatedNights} onChange={e => setEstimatedNights(e.target.value)} />
                    </div>
                  </Field>
                  <Field label="Other costs (€)" hint="Flights, trains, etc.">
                    <input type="number" min="0" step="0.01" className="scch-input w-full px-3 py-2 text-sm"
                      placeholder="0.00" value={estimatedOther} onChange={e => setEstimatedOther(e.target.value)} />
                  </Field>
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-xl p-6"
                style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.2)' }}>
                    <FileText size={18} style={{ color: 'var(--scch-green)' }} />
                  </div>
                  <div>
                    <p className="font-bold">Justification / Notes</p>
                    <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Optional — why is this trip necessary?</p>
                  </div>
                </div>
                <textarea
                  className="scch-input w-full px-3 py-2 text-sm resize-none"
                  rows={4}
                  placeholder="Describe the business purpose and necessity of this trip..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Right: summary + submit */}
            <div className="space-y-4">
              {/* Cost preview */}
              {tripDays > 0 && (
                <div className="rounded-xl p-5 space-y-3"
                  style={{ background: 'hsl(var(--card))', border: '1px solid rgba(0,255,65,0.2)' }}>
                  <p className="text-sm font-bold">Estimated Total</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--scch-gray)' }}>Daily allowance ({tripDays}d)</span>
                      <span>{formatCurrency(estAllowance)}</span>
                    </div>
                    {estMileage > 0 && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--scch-gray)' }}>Mileage ({estimatedKm} km)</span>
                        <span>{formatCurrency(estMileage)}</span>
                      </div>
                    )}
                    {estNightCost > 0 && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--scch-gray)' }}>Overnight ({estimatedNights}×)</span>
                        <span>{formatCurrency(estNightCost)}</span>
                      </div>
                    )}
                    {Number(estimatedOther) > 0 && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--scch-gray)' }}>Other costs</span>
                        <span>{formatCurrency(Number(estimatedOther))}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t" style={{ borderColor: 'rgba(0,255,65,0.2)' }}>
                      <span>Total</span>
                      <span style={{ color: 'var(--scch-green)' }}>{formatCurrency(estTotal)}</span>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>
                    Daily allowance estimate based on domestic rate (30 €/day). Actual amounts may differ.
                  </p>
                </div>
              )}

              {/* FFG notice */}
              <div className="p-3 rounded-lg text-xs flex gap-2"
                style={{ background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.15)' }}>
                <Info size={12} style={{ color: 'var(--scch-green)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ color: 'var(--scch-gray)' }}>
                  Approval is required before the trip.
                  Submit the <strong style={{ color: 'hsl(var(--foreground))' }}>Travel Expense</strong> report after returning.
                </span>
              </div>

              {/* Submit */}
              <button
                className="w-full scch-btn-primary py-3 font-bold"
                disabled={!canSubmit || submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                {submitMutation.isPending
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Submitting…</span>
                  : 'Submit for Approval'
                }
              </button>
              {!canSubmit && (
                <p className="text-xs text-center" style={{ color: 'var(--scch-gray)' }}>
                  Project, destination, purpose and dates are required.
                </p>
              )}
            </div>
          </div>

          {/* My requests list */}
          {myRequests.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl mb-4 normal-case" style={{ textTransform: 'none' }}>My Travel Requests</h2>
              <div className="scch-card overflow-hidden">
                <div
                  className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--scch-gray)', borderBottom: '1px solid hsl(var(--border))' }}
                >
                  <span>Destination</span><span>Purpose</span><span>Project</span><span>Dates</span><span>Status</span>
                </div>
                {myRequests.map(r => (
                  <div key={r.id} className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1.5fr_1fr_1fr] gap-4 px-5 py-4 items-center"
                    style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <p className="font-semibold text-sm">{r.destination}</p>
                    <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{r.purpose}</p>
                    <p className="text-sm">{r.project?.code ?? '—'}</p>
                    <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{formatDate(r.travel_start)}</p>
                    <PreStatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
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
