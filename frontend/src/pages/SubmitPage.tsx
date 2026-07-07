import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Info, Plus, Trash2, Upload, CheckCircle2, Car,
  MapPin, RotateCcw, Loader2, Navigation, Receipt,
} from 'lucide-react';
import type { DailyRate, ReceiptDraft, ReceiptCategory } from '../lib/types';
import {
  getProjects, getRates, createRequest, saveRouteLegs,
  addItem, submitRequest, uploadReceipt, calculateRoute,
} from '../lib/api';
import { formatCurrency } from '../lib/utils';
import Layout from '../components/Layout';

const DEFAULT_LOCATION = 'Softwarepark 32a, 4232 Hagenberg';
const RECEIPT_CATS: { value: ReceiptCategory; label: string }[] = [
  { value: 'accommodation', label: 'Hotel / Accommodation' },
  { value: 'transport', label: 'Transport (flight, train, taxi)' },
  { value: 'other', label: 'Other' },
];

function genId() { return Math.random().toString(36).slice(2); }

// ── helpers ───────────────────────────────────────────────────────────────

function calcDailyAllowanceHours(departure: string, returnTime: string): number {
  if (!departure || !returnTime) return 0;
  const diff = (new Date(returnTime).getTime() - new Date(departure).getTime()) / 3600000;
  return Math.max(0, diff);
}

function hoursToAllowance(hours: number, rate: number): number {
  if (hours >= 12) return rate;
  if (hours >= 3) return rate / 2;
  return 0;
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({
  label, required, children, hint, className = '',
}: {
  label: string; required?: boolean; children: React.ReactNode;
  hint?: string; className?: string;
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

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon, title, subtitle, children, accent = false,
}: {
  icon: React.ElementType; title: string; subtitle?: string;
  children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-6 space-y-5"
      style={{
        background: 'hsl(var(--card))',
        border: `1px solid ${accent ? 'rgba(0,255,65,0.25)' : 'hsl(var(--border))'}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.2)' }}
        >
          <Icon size={18} style={{ color: 'var(--scch-green)' }} />
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ textTransform: 'none' }}>{title}</h2>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--scch-gray)' }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────────

export default function SubmitPage() {
  // Trip Details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [projectId, setProjectId] = useState('');
  const [workPackage, setWorkPackage] = useState('');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [returnTime, setReturnTime] = useState('');

  // Car route section
  const [carEnabled, setCarEnabled] = useState(false);
  const [origin, setOrigin] = useState(DEFAULT_LOCATION);
  const [routeDest, setRouteDest] = useState(DEFAULT_LOCATION);
  const [returnTrip, setReturnTrip] = useState(true);
  const [routeResult, setRouteResult] = useState<{ distance_km: number; duration_min: number } | null>(null);
  const [manualKm, setManualKm] = useState('');
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [noApiKey, setNoApiKey] = useState(false);

  // Receipts section
  const [receipts, setReceipts] = useState<ReceiptDraft[]>([]);

  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => getProjects(true) });
  const { data: rates = [] } = useQuery({ queryKey: ['rates'], queryFn: getRates });

  const rateMap = Object.fromEntries(rates.map((r: DailyRate) => [r.key, Number(r.amount)]));
  const kmRate = rateMap['mileage_car'] ?? 0.42;
  const daRate = rateMap['daily_allowance_domestic'] ?? 26.40;

  // Calculated values
  const tripHours = calcDailyAllowanceHours(departureTime, returnTime);
  const dailyAllowance = hoursToAllowance(tripHours, daRate);

  const effectiveKm = carEnabled
    ? (noApiKey || !routeResult
      ? Number(manualKm) || 0
      : (routeResult.distance_km ?? 0) * (returnTrip ? 2 : 1))
    : 0;
  const mileageCost = effectiveKm * kmRate;

  const receiptTotal = receipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const grandTotal = dailyAllowance + mileageCost + receiptTotal;

  // Route calculation
  const handleCalculateRoute = useCallback(async () => {
    setRouteLoading(true);
    setRouteError('');
    setRouteResult(null);
    try {
      const res = await calculateRoute(origin, routeDest);
      if (res.error === 'no_api_key') {
        setNoApiKey(true);
      } else if (res.error) {
        setRouteError(`Could not calculate route: ${res.error}`);
      } else if (res.distance_km !== undefined && res.duration_min !== undefined) {
        setRouteResult({ distance_km: res.distance_km, duration_min: res.duration_min });
        setNoApiKey(false);
      }
    } catch {
      setRouteError('Network error. Please enter km manually.');
      setNoApiKey(true);
    } finally {
      setRouteLoading(false);
    }
  }, [origin, routeDest]);

  // Open navigation in Google Maps
  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(routeDest)}`;
    window.open(url, '_blank');
  };

  // Receipts
  const addReceipt = () => {
    setReceipts(prev => [...prev, {
      _id: genId(), category: 'accommodation', description: '', amount: '', file: null, receipt_url: null,
    }]);
  };

  const updateReceipt = (id: string, patch: Partial<ReceiptDraft>) => {
    setReceipts(prev => prev.map(r => r._id === id ? { ...r, ...patch } : r));
  };

  const removeReceipt = (id: string) => setReceipts(prev => prev.filter(r => r._id !== id));

  // Validation
  const tripStart = departureTime ? departureTime.split('T')[0] : '';
  const tripEnd = returnTime ? returnTime.split('T')[0] : tripStart;
  const canSubmit = name && email && department && projectId && destination && purpose && departureTime && returnTime;

  // Submit
  const submitMutation = useMutation({
    mutationFn: async () => {
      const req = await createRequest({
        employee_name: name,
        employee_email: email,
        department,
        destination,
        purpose,
        work_package: workPackage || null,
        trip_start: tripStart,
        trip_end: tripEnd || tripStart,
        departure_time: departureTime ? new Date(departureTime).toISOString() : null,
        return_time: returnTime ? new Date(returnTime).toISOString() : null,
        project_id: projectId,
      });

      // Save route legs
      if (carEnabled && effectiveKm > 0) {
        await saveRouteLegs(req.id, [
          {
            origin,
            destination: routeDest,
            distance_km: routeResult ? routeResult.distance_km * (returnTrip ? 2 : 1) : effectiveKm,
            duration_min: routeResult ? routeResult.duration_min * (returnTrip ? 2 : 1) : null,
            return_trip: returnTrip,
            leg_order: 0,
          },
        ]);
        // Add mileage expense item
        await addItem(req.id, {
          category: 'mileage',
          date: tripStart,
          description: `Car trip: ${origin} → ${routeDest}${returnTrip ? ' (return)' : ''}`,
          km: effectiveKm,
          amount: mileageCost,
        });
      }

      // Add daily allowance item if applicable
      if (dailyAllowance > 0) {
        await addItem(req.id, {
          category: 'daily_allowance',
          date: tripStart,
          description: `Daily allowance — ${tripHours.toFixed(1)}h trip`,
          amount: dailyAllowance,
        });
      }

      // Upload receipts and add items
      for (const receipt of receipts) {
        let receipt_url: string | null = null;
        if (receipt.file) {
          try { receipt_url = await uploadReceipt(receipt.file); } catch {}
        }
        if (Number(receipt.amount) > 0) {
          await addItem(req.id, {
            category: receipt.category,
            date: tripStart,
            description: receipt.description || receipt.category,
            amount: Number(receipt.amount),
            receipt_url,
          });
        }
      }

      await submitRequest(req.id);
      return req.id;
    },
    onSuccess: id => {
      setSubmittedId(id);
      toast.success('Expense report submitted!');
    },
    onError: () => toast.error('Submission failed. Please try again.'),
  });

  // ── Success screen
  if (submittedId) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(0,255,65,0.12)', border: '2px solid var(--scch-green)' }}
          >
            <CheckCircle2 size={40} style={{ color: 'var(--scch-green)' }} />
          </div>
          <h1 className="text-3xl mb-3 normal-case">submitted!</h1>
          <p className="mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Your travel expense report has been submitted for approval.
          </p>
          <div className="scch-card p-4 mb-8" style={{ border: '1px solid rgba(0,255,65,0.3)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--scch-gray)' }}>Tracking ID</p>
            <p className="font-mono font-bold text-lg" style={{ color: 'var(--scch-green)' }}>
              #{submittedId.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--scch-gray)' }}>
              Total claimed: <strong style={{ color: 'hsl(var(--foreground))' }}>{formatCurrency(grandTotal)}</strong>
            </p>
          </div>
          <button
            onClick={() => {
              setSubmittedId(null);
              setName(''); setEmail(''); setDepartment(''); setProjectId('');
              setWorkPackage(''); setDestination(''); setPurpose('');
              setDepartureTime(''); setReturnTime('');
              setCarEnabled(false); setOrigin(DEFAULT_LOCATION); setRouteDest(DEFAULT_LOCATION);
              setRouteResult(null); setManualKm(''); setReceipts([]);
            }}
            className="scch-btn-primary px-8 py-3 font-semibold"
          >
            Submit another
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-4xl normal-case mb-1">travel expense</h1>
          <p style={{ color: 'var(--scch-gray)' }}>Complete the sections below and submit for approval.</p>
        </div>

        {/* ── SECTION 1: Trip Details ── */}
        <Section icon={Info} title="Trip Details" subtitle="General information about the business trip">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" required>
              <input className="scch-input w-full px-3 py-2 text-sm" value={name}
                onChange={e => setName(e.target.value)} placeholder="Maria Muster" />
            </Field>
            <Field label="Email" required>
              <input type="email" className="scch-input w-full px-3 py-2 text-sm" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="m.muster@scch.at" />
            </Field>
            <Field label="Department" required>
              <input className="scch-input w-full px-3 py-2 text-sm" value={department}
                onChange={e => setDepartment(e.target.value)} placeholder="e.g. Research" />
            </Field>
            <Field label="Project" required>
              <select className="scch-input w-full px-3 py-2 text-sm" value={projectId}
                onChange={e => setProjectId(e.target.value)}>
                <option value="">Select project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Work Package" hint="e.g. WP3.2 — Data Analysis" className="sm:col-span-2">
              <input className="scch-input w-full px-3 py-2 text-sm" value={workPackage}
                onChange={e => setWorkPackage(e.target.value)} placeholder="WP1, WP2.1, ..." />
            </Field>
            <Field label="Destination" required className="sm:col-span-2">
              <input className="scch-input w-full px-3 py-2 text-sm" value={destination}
                onChange={e => setDestination(e.target.value)} placeholder="e.g. Vienna, Austria" />
            </Field>
            <Field label="Purpose" required className="sm:col-span-2">
              <textarea className="scch-input w-full px-3 py-2 text-sm resize-none" rows={2} value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="Conference, client meeting, workshop..." />
            </Field>
            <Field label="Departure (date & time)" required
              hint="Used to calculate daily allowance (§ 26 EStG)">
              <input type="datetime-local" className="scch-input w-full px-3 py-2 text-sm"
                value={departureTime} onChange={e => setDepartureTime(e.target.value)} />
            </Field>
            <Field label="Return (date & time)" required>
              <input type="datetime-local" className="scch-input w-full px-3 py-2 text-sm"
                value={returnTime} onChange={e => setReturnTime(e.target.value)} />
            </Field>
          </div>

          {/* Daily allowance preview */}
          {tripHours > 0 && (
            <div
              className="flex items-center justify-between p-3 rounded-lg text-sm"
              style={{
                background: dailyAllowance > 0 ? 'rgba(0,255,65,0.07)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${dailyAllowance > 0 ? 'rgba(0,255,65,0.2)' : 'hsl(var(--border))'}`,
              }}
            >
              <div>
                <p className="font-semibold text-xs" style={{ color: 'var(--scch-gray)' }}>Daily Allowance (§ 26 EStG)</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--scch-gray)' }}>
                  {tripHours.toFixed(1)}h trip —
                  {tripHours >= 12 ? ' full rate (>12h)'
                    : tripHours >= 3 ? ' half rate (3–12h)'
                    : ' not eligible (<3h)'}
                </p>
              </div>
              <span className="font-bold text-base" style={{ color: dailyAllowance > 0 ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))' }}>
                {formatCurrency(dailyAllowance)}
              </span>
            </div>
          )}
        </Section>

        {/* ── SECTION 2: Car Route (optional) ── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: `1px solid ${carEnabled ? 'rgba(0,255,65,0.25)' : 'hsl(var(--border))'}`,
            background: 'hsl(var(--card))',
          }}
        >
          {/* Toggle header */}
          <button
            onClick={() => setCarEnabled(v => !v)}
            className="w-full flex items-center justify-between p-6 text-left"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: carEnabled ? 'rgba(0,255,65,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${carEnabled ? 'rgba(0,255,65,0.2)' : 'hsl(var(--border))'}`,
                }}
              >
                <Car size={18} style={{ color: carEnabled ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))' }} />
              </div>
              <div>
                <p className="font-bold text-sm">Car Trip</p>
                <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>
                  Optional — {carEnabled ? 'enabled' : 'enable if you travelled by private car'}
                </p>
              </div>
            </div>
            {/* Toggle pill */}
            <div
              className="w-11 h-6 rounded-full relative transition-colors shrink-0"
              style={{ background: carEnabled ? 'var(--scch-green)' : 'hsl(var(--muted))' }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                style={{
                  background: carEnabled ? '#0d1b2a' : 'hsl(var(--muted-foreground))',
                  left: carEnabled ? '22px' : '2px',
                }}
              />
            </div>
          </button>

          {/* Car route content */}
          {carEnabled && (
            <div className="px-6 pb-6 space-y-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="pt-4 grid grid-cols-1 gap-3">
                <Field label="Origin" hint={`Default: ${DEFAULT_LOCATION}`}>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--scch-gray)' }} />
                    <input className="scch-input w-full pl-9 pr-3 py-2 text-sm" value={origin}
                      onChange={e => setOrigin(e.target.value)} />
                  </div>
                </Field>
                <Field label="Destination">
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--scch-green)' }} />
                    <input className="scch-input w-full pl-9 pr-3 py-2 text-sm" value={routeDest}
                      onChange={e => setRouteDest(e.target.value)} placeholder="e.g. Vienna Hauptbahnhof" />
                  </div>
                </Field>
              </div>

              {/* Return trip toggle */}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={returnTrip} onChange={e => setReturnTrip(e.target.checked)} />
                <RotateCcw size={13} style={{ color: 'var(--scch-gray)' }} />
                Include return trip (km × 2)
              </label>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleCalculateRoute}
                  disabled={routeLoading || !origin || !routeDest}
                  className="scch-btn-primary px-4 py-2 text-sm flex items-center gap-2"
                >
                  {routeLoading
                    ? <><Loader2 size={14} className="animate-spin" /> Calculating...</>
                    : <><Car size={14} /> Calculate Route</>}
                </button>
                <button
                  onClick={handleNavigate}
                  className="scch-btn-ghost px-4 py-2 text-sm flex items-center gap-2"
                >
                  <Navigation size={14} /> Open in Maps
                </button>
              </div>

              {/* Route result */}
              {routeResult && !noApiKey && (
                <div
                  className="p-4 rounded-lg space-y-2"
                  style={{ background: 'rgba(0,255,65,0.06)', border: '1px solid rgba(0,255,65,0.2)' }}
                >
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>One way</p>
                      <p className="font-bold" style={{ color: 'var(--scch-green)' }}>
                        {routeResult.distance_km} km
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Total km</p>
                      <p className="font-bold" style={{ color: 'var(--scch-green)' }}>
                        {(routeResult.distance_km * (returnTrip ? 2 : 1)).toFixed(1)} km
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Drive time</p>
                      <p className="font-bold" style={{ color: 'var(--scch-green)' }}>
                        {formatDuration(routeResult.duration_min * (returnTrip ? 2 : 1))}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t" style={{ borderColor: 'rgba(0,255,65,0.15)' }}>
                    <span className="text-xs" style={{ color: 'var(--scch-gray)' }}>
                      Mileage allowance @ {kmRate.toFixed(2)}€/km
                    </span>
                    <span className="font-bold" style={{ color: 'var(--scch-green)' }}>
                      {formatCurrency(mileageCost)}
                    </span>
                  </div>
                </div>
              )}

              {/* Manual fallback */}
              {(noApiKey || routeError) && (
                <div className="space-y-3">
                  {routeError && (
                    <p className="text-xs px-3 py-2 rounded" style={{ color: '#ff5a5a', background: 'rgba(255,90,90,0.08)', border: '1px solid rgba(255,90,90,0.2)' }}>
                      {routeError}
                    </p>
                  )}
                  <Field label="Total kilometres (manual input)" hint="Enter total km including return trip if applicable">
                    <input type="number" min="0" step="0.1" className="scch-input w-full px-3 py-2 text-sm"
                      value={manualKm} onChange={e => setManualKm(e.target.value)} placeholder="e.g. 240" />
                  </Field>
                  {Number(manualKm) > 0 && (
                    <div className="flex justify-between items-center p-3 rounded text-sm"
                      style={{ background: 'rgba(0,255,65,0.06)', border: '1px solid rgba(0,255,65,0.2)' }}>
                      <span style={{ color: 'var(--scch-gray)' }}>{manualKm} km @ {kmRate.toFixed(2)}€/km</span>
                      <span className="font-bold" style={{ color: 'var(--scch-green)' }}>{formatCurrency(mileageCost)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 3: Receipts (optional) ── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.2)' }}
                >
                  <Receipt size={18} style={{ color: 'var(--scch-green)' }} />
                </div>
                <div>
                  <p className="font-bold text-sm">Receipts</p>
                  <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>
                    Optional — hotel, transport, other expenses with receipts
                  </p>
                </div>
              </div>
              <button
                onClick={addReceipt}
                className="scch-btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                <Plus size={13} /> Add Receipt
              </button>
            </div>

            {receipts.length === 0 ? (
              <div className="text-center py-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <p className="text-sm">No receipts added.</p>
                <p className="text-xs mt-1" style={{ color: 'var(--scch-gray)' }}>Click “Add Receipt“ to attach hotel or transport bills.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receipts.map(r => (
                  <div
                    key={r._id}
                    className="p-4 rounded-lg space-y-3"
                    style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_2fr_1fr] gap-3 items-end">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--scch-gray)' }}>Category</label>
                        <select
                          className="scch-input w-full px-2 py-1.5 text-sm"
                          value={r.category}
                          onChange={e => updateReceipt(r._id, { category: e.target.value as ReceiptCategory })}
                        >
                          {RECEIPT_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--scch-gray)' }}>Description</label>
                        <input
                          className="scch-input w-full px-2 py-1.5 text-sm"
                          placeholder="Hotel Vienna, 1 night"
                          value={r.description}
                          onChange={e => updateReceipt(r._id, { description: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--scch-gray)' }}>Amount (€)</label>
                        <input
                          type="number" min="0" step="0.01"
                          className="scch-input w-full px-2 py-1.5 text-sm"
                          placeholder="0.00"
                          value={r.amount}
                          onChange={e => updateReceipt(r._id, { amount: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 cursor-pointer text-xs scch-btn-ghost px-3 py-1.5 rounded">
                        <Upload size={12} />
                        {r.file ? r.file.name : 'Upload receipt (PDF/JPG)'}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                          onChange={e => updateReceipt(r._id, { file: e.target.files?.[0] ?? null })} />
                      </label>
                      <button onClick={() => removeReceipt(r._id)} className="p-1.5 rounded scch-btn-ghost">
                        <Trash2 size={13} style={{ color: '#ff5a5a' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Grand Total & Submit ── */}
        <div
          className="rounded-xl p-6 space-y-4"
          style={{ background: 'hsl(var(--card))', border: '1px solid rgba(0,255,65,0.2)' }}
        >
          <h2 className="text-base font-bold" style={{ textTransform: 'none' }}>Summary</h2>

          <div className="space-y-2 text-sm">
            {dailyAllowance > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--scch-gray)' }}>Daily Allowance ({tripHours.toFixed(1)}h)</span>
                <span className="font-semibold">{formatCurrency(dailyAllowance)}</span>
              </div>
            )}
            {carEnabled && effectiveKm > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--scch-gray)' }}>Mileage ({effectiveKm.toFixed(1)} km @ {kmRate.toFixed(2)}€)</span>
                <span className="font-semibold">{formatCurrency(mileageCost)}</span>
              </div>
            )}
            {receiptTotal > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--scch-gray)' }}>Receipts ({receipts.length} items)</span>
                <span className="font-semibold">{formatCurrency(receiptTotal)}</span>
              </div>
            )}
            <div
              className="flex justify-between font-bold text-base pt-2 border-t"
              style={{ borderColor: 'rgba(0,255,65,0.2)' }}
            >
              <span>Total</span>
              <span style={{ color: 'var(--scch-green)' }}>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* FFG notice */}
          <div className="p-3 rounded text-xs flex gap-2"
            style={{ background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.15)' }}>
            <Info size={12} style={{ color: 'var(--scch-green)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: 'var(--scch-gray)' }}>
              All amounts subject to <strong style={{ color: 'hsl(var(--foreground))' }}>FFG eligibility rules</strong> and
              § 26 EStG. Attach receipts for all accommodation and transport costs.
            </span>
          </div>

          <button
            className="w-full scch-btn-primary py-3 font-bold text-base"
            disabled={!canSubmit || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending
              ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Submitting...</span>
              : 'Submit for Approval'}
          </button>

          {!canSubmit && (
            <p className="text-xs text-center" style={{ color: 'var(--scch-gray)' }}>
              Fill in all required fields (marked with <span style={{ color: 'var(--scch-green)' }}>*</span>) to submit.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
