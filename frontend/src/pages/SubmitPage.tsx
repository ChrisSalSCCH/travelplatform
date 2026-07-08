import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Info, Plus, Trash2, Upload, CheckCircle2, Car,
  MapPin, RotateCcw, Loader2, Navigation, Receipt, X, Users,
} from 'lucide-react';
import type { DailyRate, ReceiptDraft, ReceiptCategory, AllowanceDayDraft, PassengerDraft } from '../lib/types';
import {
  getProjects, getWorkPackages, getRates,
  createRequest, saveRouteLegs, savePassengers, saveAllowanceDays,
  addItem, submitRequest, uploadReceipt, calculateRoute,
} from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { calcDayAllowance, calcTripHours, formatDuration, generateAllowanceDays } from '../lib/allowance';
import Layout from '../components/Layout';
import Combobox from '../components/Combobox';

const DEFAULT_ORIGIN = 'Softwarepark 32a, 4232 Hagenberg';
const PURPOSE_OPTIONS = [
  'Conference / Workshop', 'Client Meeting', 'Internal Meeting',
  'Training / Course', 'Site Visit', 'Trade Fair / Exhibition',
  'Research Visit', 'Other',
];
const RECEIPT_CATS: { value: ReceiptCategory; label: string }[] = [
  { value: 'accommodation', label: 'Hotel / Accommodation' },
  { value: 'transport', label: 'Transport (flight, train, taxi)' },
  { value: 'other', label: 'Other' },
];

function genId() { return Math.random().toString(36).slice(2); }

// ── Field
function Field({ label, required, children, hint, className = '' }: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string; className?: string;
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

// ── Section card
function Section({ icon: Icon, title, subtitle, children, accent = false }: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className="rounded-xl p-6 space-y-5"
      style={{ background: 'hsl(var(--card))', border: `1px solid ${accent ? 'rgba(0,255,65,0.25)' : 'hsl(var(--border))'}` }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.2)' }}>
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

// ── AllowanceDayCard
function AllowanceDayCard({
  day, domesticRate, abroadRate, onChange,
}: {
  day: AllowanceDayDraft;
  domesticRate: number;
  abroadRate: number;
  onChange: (patch: Partial<AllowanceDayDraft>) => void;
}) {
  const rate = day.isAbroad ? abroadRate : domesticRate;
  const amount = calcDayAllowance(day.hours, rate, day.mealBreakfast, day.mealLunch, day.mealDinner);
  const eligible = day.hours >= 3;

  return (
    <div className="rounded-lg p-4 space-y-3"
      style={{ background: 'hsl(var(--muted))', border: `1px solid ${eligible ? 'hsl(var(--border))' : 'hsl(var(--border))'}` }}>

      {/* Day header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">{day.label}</p>
          <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>
            {day.hours.toFixed(1)}h
            {day.isFirstDay ? ' (departure day)' : day.isLastDay ? ' (return day)' : ' (full day)'}
            {!eligible ? ' — not eligible (<3h)' : day.hours < 12 ? ' — half rate' : ' — full rate'}
          </p>
        </div>
        <span className="font-bold text-base" style={{ color: eligible ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))' }}>
          {formatCurrency(amount)}
        </span>
      </div>

      {eligible && (
        <>
          {/* Inland / Abroad toggle */}
          <div className="flex gap-2">
            {(['Domestic', 'Abroad'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => onChange({ isAbroad: opt === 'Abroad' })}
                className="px-3 py-1 text-xs font-semibold rounded transition-all"
                style={{
                  background: (opt === 'Abroad') === day.isAbroad ? 'rgba(0,255,65,0.15)' : 'hsl(var(--card))',
                  color: (opt === 'Abroad') === day.isAbroad ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))',
                  border: `1px solid ${(opt === 'Abroad') === day.isAbroad ? 'rgba(0,255,65,0.35)' : 'hsl(var(--border))'}`,
                }}
              >
                {opt} {opt === 'Domestic' ? `(${formatCurrency(domesticRate)})` : `(${formatCurrency(abroadRate)})`}
              </button>
            ))}
          </div>

          {/* Meal checkboxes — only for full-rate days */}
          {day.hours >= 12 && (
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Invited to a meal? <span style={{ color: 'var(--scch-gray)' }}>(each reduces by 1/3 = {formatCurrency(rate / 3)})</span>
              </p>
              <div className="flex gap-5">
                {([
                  ['Breakfast', day.mealBreakfast, 'mealBreakfast'],
                  ['Lunch',     day.mealLunch,     'mealLunch'],
                  ['Dinner',    day.mealDinner,    'mealDinner'],
                ] as [string, boolean, keyof AllowanceDayDraft][]).map(([lbl, checked, key]) => (
                  <label key={lbl} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={checked}
                      onChange={e => onChange({ [key]: e.target.checked })} />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Page
export default function SubmitPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [projectId, setProjectId] = useState('');
  const [workPackage, setWorkPackage] = useState('');
  const [purpose, setPurpose] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [returnTime, setReturnTime] = useState('');

  // Per-day allowance
  const [allowanceDays, setAllowanceDays] = useState<AllowanceDayDraft[]>([]);
  const [allAbroad, setAllAbroad] = useState(false);

  // Car route
  const [carEnabled, setCarEnabled] = useState(false);
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [routeDest, setRouteDest] = useState('');
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [returnTrip, setReturnTrip] = useState(true);
  const [routeResult, setRouteResult] = useState<{ distance_km: number; duration_min: number } | null>(null);
  const [manualKm, setManualKm] = useState('');
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [noApiKey, setNoApiKey] = useState(false);

  // Passengers
  const [passengers, setPassengers] = useState<PassengerDraft[]>([]);

  // Receipts
  const [receipts, setReceipts] = useState<ReceiptDraft[]>([]);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => getProjects(true) });
  const { data: workPackages = [] } = useQuery({
    queryKey: ['workpackages', projectId],
    queryFn: () => getWorkPackages(projectId || undefined, true),
  });
  const { data: rates = [] } = useQuery({ queryKey: ['rates'], queryFn: getRates });

  const rateMap = Object.fromEntries(rates.map((r: DailyRate) => [r.key, Number(r.amount)]));
  const kmRate = rateMap['mileage_car'] ?? 0.42;
  const domesticRate = rateMap['daily_allowance_domestic'] ?? 26.40;
  const abroadRate = rateMap['daily_allowance_abroad'] ?? 35.80;

  // Regenerate allowance days when departure/return changes
  useEffect(() => {
    const days = generateAllowanceDays(departureTime, returnTime);
    setAllowanceDays(days);
  }, [departureTime, returnTime]);

  // Quick-set all abroad
  useEffect(() => {
    if (allowanceDays.length === 0) return;
    setAllowanceDays(prev => prev.map(d => ({ ...d, isAbroad: allAbroad })));
  }, [allAbroad]);

  const updateDay = (idx: number, patch: Partial<AllowanceDayDraft>) =>
    setAllowanceDays(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));

  // Totals
  const totalAllowance = allowanceDays.reduce((s, d) => {
    const rate = d.isAbroad ? abroadRate : domesticRate;
    return s + calcDayAllowance(d.hours, rate, d.mealBreakfast, d.mealLunch, d.mealDinner);
  }, 0);

  const effectiveKm = carEnabled
    ? (noApiKey || !routeResult ? Number(manualKm) || 0 : routeResult.distance_km * (returnTrip ? 2 : 1))
    : 0;
  const mileageCost = effectiveKm * kmRate;
  const receiptTotal = receipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const grandTotal = totalAllowance + mileageCost + receiptTotal;

  const tripStart = departureTime ? departureTime.split('T')[0] : '';
  const tripEnd = returnTime ? returnTime.split('T')[0] : tripStart;

  // Auto-fill passenger km when route changes
  const autoKm = effectiveKm > 0 ? String(effectiveKm.toFixed(1)) : '';
  const addPassenger = () =>
    setPassengers(prev => [...prev, { _id: genId(), name: '', km: autoKm }]);
  const updatePassenger = (id: string, patch: Partial<PassengerDraft>) =>
    setPassengers(prev => prev.map(p => p._id === id ? { ...p, ...patch } : p));
  const removePassenger = (id: string) =>
    setPassengers(prev => prev.filter(p => p._id !== id));

  // Update existing passenger km when route recalculates
  useEffect(() => {
    if (!effectiveKm) return;
    setPassengers(prev => prev.map(p =>
      p.km === '' || p.km === '0' ? { ...p, km: String(effectiveKm.toFixed(1)) } : p
    ));
  }, [effectiveKm]);

  // Route calculation
  const handleCalculateRoute = useCallback(async () => {
    if (!routeDest) return;
    setRouteLoading(true); setRouteError(''); setRouteResult(null);
    try {
      const res = await calculateRoute(origin, routeDest, waypoints.filter(Boolean));
      if (res.error === 'no_api_key') { setNoApiKey(true); }
      else if (res.error) { setRouteError(`Could not calculate: ${res.error}`); setNoApiKey(true); }
      else if (res.distance_km !== undefined) {
        setRouteResult({ distance_km: res.distance_km, duration_min: res.duration_min! });
        setNoApiKey(false);
      }
    } catch { setRouteError('Network error. Please enter km manually.'); setNoApiKey(true); }
    finally { setRouteLoading(false); }
  }, [origin, routeDest, waypoints]);

  const handleNavigate = () => {
    const wStr = waypoints.filter(Boolean).map(w => encodeURIComponent(w)).join('/');
    window.open(`https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${wStr ? wStr + '/' : ''}${encodeURIComponent(routeDest)}`, '_blank');
  };

  const addWaypoint = () => setWaypoints(prev => [...prev, '']);
  const updateWaypoint = (i: number, v: string) => setWaypoints(prev => prev.map((w, idx) => idx === i ? v : w));
  const removeWaypoint = (i: number) => setWaypoints(prev => prev.filter((_, idx) => idx !== i));

  const addReceipt = () => setReceipts(prev => [...prev, { _id: genId(), category: 'accommodation', description: '', amount: '', file: null, receipt_url: null }]);
  const updateReceipt = (id: string, patch: Partial<ReceiptDraft>) => setReceipts(prev => prev.map(r => r._id === id ? { ...r, ...patch } : r));
  const removeReceipt = (id: string) => setReceipts(prev => prev.filter(r => r._id !== id));

  const canSubmit = firstName && lastName && projectId && purpose && departureTime && returnTime;

  const projectOptions = projects.map(p => ({ value: p.id, label: `${p.code} — ${p.name}`, sub: p.funder }));
  const wpOptions = workPackages.map(wp => ({ value: `${wp.code} — ${wp.name}`, label: `${wp.code} — ${wp.name}` }));
  const purposeOptions = PURPOSE_OPTIONS.map(p => ({ value: p, label: p }));

  const submitMutation = useMutation({
    mutationFn: async () => {
      const req = await createRequest({
        first_name: firstName, last_name: lastName,
        employee_email: email || null, department: department || null,
        destination: routeDest || null, purpose,
        work_package: workPackage || null,
        trip_start: tripStart, trip_end: tripEnd || tripStart,
        departure_time: departureTime ? new Date(departureTime).toISOString() : null,
        return_time: returnTime ? new Date(returnTime).toISOString() : null,
        meal_breakfast: allowanceDays.some(d => d.mealBreakfast),
        meal_lunch: allowanceDays.some(d => d.mealLunch),
        meal_dinner: allowanceDays.some(d => d.mealDinner),
        project_id: projectId,
      });

      // Save allowance days
      if (allowanceDays.length > 0) {
        const rate = (d: AllowanceDayDraft) => d.isAbroad ? abroadRate : domesticRate;
        await saveAllowanceDays(req.id, allowanceDays.map(d => ({
          day: d.date,
          is_abroad: d.isAbroad,
          meal_breakfast: d.mealBreakfast,
          meal_lunch: d.mealLunch,
          meal_dinner: d.mealDinner,
          allowance_amount: calcDayAllowance(d.hours, rate(d), d.mealBreakfast, d.mealLunch, d.mealDinner),
        })));
        if (totalAllowance > 0) {
          await addItem(req.id, {
            category: 'daily_allowance', date: tripStart,
            description: `Daily allowance — ${allowanceDays.length} day(s)${allAbroad ? ' (abroad)' : ''}`,
            amount: totalAllowance,
          });
        }
      }

      // Save car route + passengers
      if (carEnabled && effectiveKm > 0) {
        await saveRouteLegs(req.id, [{
          origin, destination: routeDest,
          waypoints: waypoints.filter(Boolean),
          distance_km: effectiveKm,
          duration_min: routeResult ? routeResult.duration_min * (returnTrip ? 2 : 1) : null,
          return_trip: returnTrip, leg_order: 0,
        }]);
        await addItem(req.id, {
          category: 'mileage', date: tripStart,
          description: `Car: ${origin} →${waypoints.filter(Boolean).map(w => ` ${w} →`).join('')} ${routeDest}${returnTrip ? ' (return)' : ''}`,
          km: effectiveKm, amount: mileageCost,
        });
        const validPassengers = passengers.filter(p => p.name && Number(p.km) > 0);
        if (validPassengers.length > 0) {
          await savePassengers(req.id, validPassengers.map(p => ({ name: p.name, km: Number(p.km) })));
        }
      }

      // Receipts
      for (const receipt of receipts) {
        let receipt_url: string | null = null;
        if (receipt.file) { try { receipt_url = await uploadReceipt(receipt.file); } catch {} }
        if (Number(receipt.amount) > 0) {
          await addItem(req.id, {
            category: receipt.category, date: tripStart,
            description: receipt.description || receipt.category,
            amount: Number(receipt.amount), receipt_url,
          });
        }
      }

      await submitRequest(req.id);
      return req.id;
    },
    onSuccess: id => { setSubmittedId(id); toast.success('Expense report submitted!'); },
    onError: () => toast.error('Submission failed. Please try again.'),
  });

  const resetForm = () => {
    setSubmittedId(null);
    setFirstName(''); setLastName(''); setEmail(''); setDepartment('');
    setProjectId(''); setWorkPackage(''); setPurpose('');
    setDepartureTime(''); setReturnTime('');
    setAllowanceDays([]); setAllAbroad(false);
    setCarEnabled(false); setOrigin(DEFAULT_ORIGIN); setRouteDest('');
    setWaypoints([]); setRouteResult(null); setManualKm('');
    setPassengers([]); setReceipts([]);
  };

  if (submittedId) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(0,255,65,0.12)', border: '2px solid var(--scch-green)' }}>
            <CheckCircle2 size={40} style={{ color: 'var(--scch-green)' }} />
          </div>
          <h1 className="text-3xl mb-3 normal-case">submitted!</h1>
          <p className="mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>Your travel expense report has been submitted for approval.</p>
          <div className="scch-card p-4 mb-8" style={{ border: '1px solid rgba(0,255,65,0.3)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--scch-gray)' }}>Tracking ID</p>
            <p className="font-mono font-bold text-lg" style={{ color: 'var(--scch-green)' }}>#{submittedId.slice(0, 8).toUpperCase()}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--scch-gray)' }}>
              Total claimed: <strong style={{ color: 'hsl(var(--foreground))' }}>{formatCurrency(grandTotal)}</strong>
            </p>
          </div>
          <button onClick={resetForm} className="scch-btn-primary px-8 py-3 font-semibold">Submit another</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-4xl normal-case mb-1">travel expense</h1>
          <p style={{ color: 'var(--scch-gray)' }}>Complete the form below and submit for approval.</p>
        </div>

        {/* ── SECTION 1: Trip Details */}
        <Section icon={Info} title="Trip Details" subtitle="Required information about your business trip">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name" required>
              <input className="scch-input w-full px-3 py-2 text-sm" value={firstName}
                onChange={e => setFirstName(e.target.value)} placeholder="Maria" />
            </Field>
            <Field label="Last Name" required>
              <input className="scch-input w-full px-3 py-2 text-sm" value={lastName}
                onChange={e => setLastName(e.target.value)} placeholder="Muster" />
            </Field>
            <Field label="Email">
              <input type="email" className="scch-input w-full px-3 py-2 text-sm" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="m.muster@scch.at (optional)" />
            </Field>
            <Field label="Department">
              <input className="scch-input w-full px-3 py-2 text-sm" value={department}
                onChange={e => setDepartment(e.target.value)} placeholder="Research (optional)" />
            </Field>
            <Field label="Project" required className="sm:col-span-2">
              <Combobox options={projectOptions} value={projectId}
                onChange={val => {
                  const match = projects.find(p => p.id === val || `${p.code} — ${p.name}` === val);
                  setProjectId(match ? match.id : val);
                  setWorkPackage('');
                }}
                placeholder="Select or type project..." />
            </Field>
            <Field label="Work Package" className="sm:col-span-2">
              <Combobox options={wpOptions} value={workPackage} onChange={setWorkPackage}
                placeholder={projectId ? 'Select or type work package...' : 'Select a project first...'} />
            </Field>
            <Field label="Purpose" required className="sm:col-span-2">
              <Combobox options={purposeOptions} value={purpose} onChange={setPurpose}
                placeholder="Select or describe purpose..." />
            </Field>
            <Field label="Departure" required hint="Date & time — used to calculate daily allowance (§ 26 EStG)">
              <input type="datetime-local" className="scch-input w-full px-3 py-2 text-sm"
                value={departureTime} onChange={e => setDepartureTime(e.target.value)} />
            </Field>
            <Field label="Return" required>
              <input type="datetime-local" className="scch-input w-full px-3 py-2 text-sm"
                value={returnTime} onChange={e => setReturnTime(e.target.value)} />
            </Field>
          </div>

          {/* Per-day allowance cards */}
          {allowanceDays.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Daily Allowance — {allowanceDays.length} day(s) — Total:
                  <span className="ml-1 font-bold" style={{ color: totalAllowance > 0 ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))' }}>
                    {formatCurrency(totalAllowance)}
                  </span>
                </p>
                {/* Quick-set all abroad */}
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" checked={allAbroad} onChange={e => setAllAbroad(e.target.checked)} />
                  All abroad
                </label>
              </div>
              {allowanceDays.map((day, idx) => (
                <AllowanceDayCard
                  key={day.date}
                  day={day}
                  domesticRate={domesticRate}
                  abroadRate={abroadRate}
                  onChange={patch => updateDay(idx, patch)}
                />
              ))}
            </div>
          )}
        </Section>

        {/* ── SECTION 2: Car Trip (optional toggle) */}
        <div className="rounded-xl overflow-hidden"
          style={{ border: `1px solid ${carEnabled ? 'rgba(0,255,65,0.25)' : 'hsl(var(--border))'}`, background: 'hsl(var(--card))' }}>

          <button onClick={() => setCarEnabled(v => !v)} className="w-full flex items-center justify-between p-6 text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: carEnabled ? 'rgba(0,255,65,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${carEnabled ? 'rgba(0,255,65,0.2)' : 'hsl(var(--border))'}` }}>
                <Car size={18} style={{ color: carEnabled ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))' }} />
              </div>
              <div>
                <p className="font-bold text-sm">Car Trip</p>
                <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Optional — {carEnabled ? 'enabled' : 'enable if you travelled by private car'}</p>
              </div>
            </div>
            <div className="w-11 h-6 rounded-full relative transition-colors shrink-0"
              style={{ background: carEnabled ? 'var(--scch-green)' : 'hsl(var(--muted))' }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                style={{ background: carEnabled ? '#0d1b2a' : 'hsl(var(--muted-foreground))', left: carEnabled ? '22px' : '2px' }} />
            </div>
          </button>

          {carEnabled && (
            <div className="px-6 pb-6 space-y-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="pt-4 space-y-3">
                <Field label="Origin">
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--scch-gray)' }} />
                    <input className="scch-input w-full pl-9 pr-3 py-2 text-sm" value={origin} onChange={e => setOrigin(e.target.value)} />
                  </div>
                </Field>
                {waypoints.map((wp, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#60aaff' }} />
                      <input className="scch-input w-full pl-9 pr-3 py-2 text-sm"
                        placeholder={`Waypoint ${i + 1}`} value={wp} onChange={e => updateWaypoint(i, e.target.value)} />
                    </div>
                    <button onClick={() => removeWaypoint(i)} className="p-2 scch-btn-ghost rounded shrink-0">
                      <X size={13} style={{ color: '#ff5a5a' }} />
                    </button>
                  </div>
                ))}
                <Field label="Destination">
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--scch-green)' }} />
                    <input className="scch-input w-full pl-9 pr-3 py-2 text-sm" value={routeDest}
                      onChange={e => setRouteDest(e.target.value)} placeholder="e.g. Vienna Hauptbahnhof" />
                  </div>
                </Field>
                <button onClick={addWaypoint} className="scch-btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5">
                  <Plus size={12} /> Add waypoint
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={returnTrip} onChange={e => setReturnTrip(e.target.checked)} />
                <RotateCcw size={13} style={{ color: 'var(--scch-gray)' }} />
                Include return trip (km × 2)
              </label>

              <div className="flex gap-2 flex-wrap">
                <button onClick={handleCalculateRoute} disabled={routeLoading || !routeDest}
                  className="scch-btn-primary px-4 py-2 text-sm flex items-center gap-2">
                  {routeLoading ? <><Loader2 size={14} className="animate-spin" /> Calculating...</> : <><Car size={14} /> Calculate Route</>}
                </button>
                <button onClick={handleNavigate} disabled={!routeDest} className="scch-btn-ghost px-4 py-2 text-sm flex items-center gap-2">
                  <Navigation size={14} /> Open in Maps
                </button>
              </div>

              {routeResult && !noApiKey && (
                <div className="p-4 rounded-lg space-y-2"
                  style={{ background: 'rgba(0,255,65,0.06)', border: '1px solid rgba(0,255,65,0.2)' }}>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>One way</p>
                      <p className="font-bold" style={{ color: 'var(--scch-green)' }}>{routeResult.distance_km} km</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Total km</p>
                      <p className="font-bold" style={{ color: 'var(--scch-green)' }}>{(routeResult.distance_km * (returnTrip ? 2 : 1)).toFixed(1)} km</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Drive time</p>
                      <p className="font-bold" style={{ color: 'var(--scch-green)' }}>{formatDuration(routeResult.duration_min * (returnTrip ? 2 : 1))}</p>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'rgba(0,255,65,0.15)' }}>
                    <span className="text-xs" style={{ color: 'var(--scch-gray)' }}>Mileage @ {kmRate.toFixed(2)}€/km</span>
                    <span className="font-bold" style={{ color: 'var(--scch-green)' }}>{formatCurrency(mileageCost)}</span>
                  </div>
                </div>
              )}

              {(noApiKey || routeError) && (
                <div className="space-y-3">
                  {routeError && <p className="text-xs px-3 py-2 rounded" style={{ color: '#ff5a5a', background: 'rgba(255,90,90,0.08)', border: '1px solid rgba(255,90,90,0.2)' }}>{routeError}</p>}
                  <Field label="Total kilometres (manual)" hint="Enter total km including return if applicable">
                    <input type="number" min="0" step="0.1" className="scch-input w-full px-3 py-2 text-sm"
                      value={manualKm} onChange={e => setManualKm(e.target.value)} placeholder="e.g. 240" />
                  </Field>
                  {Number(manualKm) > 0 && (
                    <div className="flex justify-between p-3 rounded text-sm"
                      style={{ background: 'rgba(0,255,65,0.06)', border: '1px solid rgba(0,255,65,0.2)' }}>
                      <span style={{ color: 'var(--scch-gray)' }}>{manualKm} km @ {kmRate.toFixed(2)}€/km</span>
                      <span className="font-bold" style={{ color: 'var(--scch-green)' }}>{formatCurrency(mileageCost)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Passengers */}
              <div className="border-t pt-4 space-y-3" style={{ borderColor: 'hsl(var(--border))' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={14} style={{ color: 'var(--scch-green)' }} />
                    <p className="text-sm font-semibold">Passengers</p>
                  </div>
                  <button onClick={addPassenger} className="scch-btn-ghost px-3 py-1 text-xs flex items-center gap-1.5">
                    <Plus size={12} /> Add Passenger
                  </button>
                </div>

                {passengers.length > 0 && (
                  <div
                    className="p-3 rounded text-xs flex gap-2"
                    style={{ background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.15)' }}
                  >
                    <Info size={12} style={{ color: 'var(--scch-green)', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ color: 'var(--scch-gray)' }}>
                      Each passenger km is tracked separately for FFG reporting.
                      km is pre-filled with the total route distance — adjust if a passenger only joined part of the trip.
                    </span>
                  </div>
                )}

                {passengers.map(p => (
                  <div key={p._id} className="flex gap-2 items-center">
                    <input
                      className="scch-input flex-1 px-3 py-2 text-sm"
                      placeholder="Passenger name"
                      value={p.name}
                      onChange={e => updatePassenger(p._id, { name: e.target.value })}
                    />
                    <div className="relative w-28 shrink-0">
                      <input
                        type="number" min="0" step="0.1"
                        className="scch-input w-full px-3 py-2 text-sm pr-8"
                        value={p.km}
                        onChange={e => updatePassenger(p._id, { km: e.target.value })}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--scch-gray)' }}>km</span>
                    </div>
                    <button onClick={() => removePassenger(p._id)} className="p-2 scch-btn-ghost rounded shrink-0">
                      <X size={13} style={{ color: '#ff5a5a' }} />
                    </button>
                  </div>
                ))}

                {passengers.length === 0 && (
                  <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>No passengers — click "Add Passenger" if others joined the trip.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 3: Receipts */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.2)' }}>
                  <Receipt size={18} style={{ color: 'var(--scch-green)' }} />
                </div>
                <div>
                  <p className="font-bold text-sm">Receipts</p>
                  <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>Optional — hotel, transport and other expenses</p>
                </div>
              </div>
              <button onClick={addReceipt} className="scch-btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5">
                <Plus size={13} /> Add Receipt
              </button>
            </div>
            {receipts.length === 0 ? (
              <div className="text-center py-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <p className="text-sm">No receipts added.</p>
                <p className="text-xs mt-1" style={{ color: 'var(--scch-gray)' }}>Click "Add Receipt" to attach hotel or transport bills.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receipts.map(r => (
                  <div key={r._id} className="p-4 rounded-lg space-y-3"
                    style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_2fr_1fr] gap-3 items-end">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--scch-gray)' }}>Category</label>
                        <select className="scch-input w-full px-2 py-1.5 text-sm" value={r.category}
                          onChange={e => updateReceipt(r._id, { category: e.target.value as ReceiptCategory })}>
                          {RECEIPT_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--scch-gray)' }}>Description</label>
                        <input className="scch-input w-full px-2 py-1.5 text-sm" placeholder="Hotel Vienna, 1 night"
                          value={r.description} onChange={e => updateReceipt(r._id, { description: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--scch-gray)' }}>Amount (€)</label>
                        <input type="number" min="0" step="0.01" className="scch-input w-full px-2 py-1.5 text-sm"
                          placeholder="0.00" value={r.amount}
                          onChange={e => updateReceipt(r._id, { amount: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 cursor-pointer text-xs scch-btn-ghost px-3 py-1.5 rounded">
                        <Upload size={12} />
                        {r.file ? r.file.name : 'Upload receipt (PDF / JPG)'}
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

        {/* ── Summary & Submit */}
        <div className="rounded-xl p-6 space-y-4" style={{ background: 'hsl(var(--card))', border: '1px solid rgba(0,255,65,0.2)' }}>
          <h2 className="text-base font-bold" style={{ textTransform: 'none' }}>Summary</h2>
          <div className="space-y-2 text-sm">
            {totalAllowance > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--scch-gray)' }}>Daily Allowance ({allowanceDays.length} day{allowanceDays.length !== 1 ? 's' : ''})</span>
                <span className="font-semibold">{formatCurrency(totalAllowance)}</span>
              </div>
            )}
            {carEnabled && effectiveKm > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--scch-gray)' }}>Mileage ({effectiveKm.toFixed(1)} km @ {kmRate.toFixed(2)}€)</span>
                <span className="font-semibold">{formatCurrency(mileageCost)}</span>
              </div>
            )}
            {carEnabled && passengers.filter(p => p.name && Number(p.km) > 0).length > 0 && (
              <div className="flex justify-between text-xs" style={{ color: 'var(--scch-gray)' }}>
                <span>↳ {passengers.filter(p => p.name).length} passenger(s) tracked</span>
                <span>for FFG reporting</span>
              </div>
            )}
            {receiptTotal > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--scch-gray)' }}>Receipts ({receipts.length})</span>
                <span className="font-semibold">{formatCurrency(receiptTotal)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t" style={{ borderColor: 'rgba(0,255,65,0.2)' }}>
              <span>Total</span>
              <span style={{ color: 'var(--scch-green)' }}>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
          <div className="p-3 rounded text-xs flex gap-2"
            style={{ background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.15)' }}>
            <Info size={12} style={{ color: 'var(--scch-green)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: 'var(--scch-gray)' }}>
              All amounts subject to <strong style={{ color: 'hsl(var(--foreground))' }}>FFG eligibility rules</strong> and § 26 EStG.
            </span>
          </div>
          <button className="w-full scch-btn-primary py-3 font-bold text-base"
            disabled={!canSubmit || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}>
            {submitMutation.isPending
              ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Submitting...</span>
              : 'Submit for Approval'}
          </button>
          {!canSubmit && (
            <p className="text-xs text-center" style={{ color: 'var(--scch-gray)' }}>
              First name, last name, project, purpose, departure and return are required.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
