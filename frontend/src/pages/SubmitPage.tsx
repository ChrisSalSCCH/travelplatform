import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Info, Plus, Trash2, Upload, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import type { DailyRate, ExpenseItemDraft, ExpenseCategory } from '../lib/types';
import { getProjects, getRates, createRequest, addItem, submitRequest, uploadReceipt } from '../lib/api';
import { formatCurrency, CATEGORY_LABELS, CATEGORY_TOOLTIPS } from '../lib/utils';
import Layout from '../components/Layout';

const STEPS = ['Trip Details', 'Expenses', 'Review & Submit'];

function genId() {
  return Math.random().toString(36).slice(2);
}

const CATEGORIES: ExpenseCategory[] = [
  'daily_allowance', 'mileage', 'accommodation', 'transport', 'other',
];

interface TripForm {
  employee_name: string;
  employee_email: string;
  department: string;
  destination: string;
  purpose: string;
  trip_start: string;
  trip_end: string;
  project_id: string;
}

export default function SubmitPage() {
  const [step, setStep] = useState(0);
  const [trip, setTrip] = useState<TripForm>({
    employee_name: '', employee_email: '', department: '',
    destination: '', purpose: '', trip_start: '', trip_end: '', project_id: '',
  });
  const [items, setItems] = useState<ExpenseItemDraft[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<ExpenseItemDraft | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => getProjects(true) });
  const { data: rates = [] } = useQuery({ queryKey: ['rates'], queryFn: getRates });

  const rateMap = Object.fromEntries(rates.map((r: DailyRate) => [r.key, r.amount]));

  function calcAmount(cat: ExpenseCategory, km: string, amount: string): number {
    if (cat === 'mileage' && km) {
      return Number(km) * (rateMap['mileage_car'] ?? 0.42);
    }
    return Number(amount) || 0;
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const req = await createRequest(trip);
      for (const item of items) {
        let receipt_url: string | null = null;
        if (item.receipt_file) {
          try { receipt_url = await uploadReceipt(item.receipt_file); } catch {}
        }
        await addItem(req.id, {
          category: item.category,
          date: item.date,
          description: item.description,
          km: item.km ? Number(item.km) : null,
          amount: calcAmount(item.category, item.km, item.amount),
          receipt_url,
        });
      }
      await submitRequest(req.id);
      return req.id;
    },
    onSuccess: (id) => {
      setSubmittedId(id);
      toast.success('Expense report submitted successfully!');
    },
    onError: () => toast.error('Submission failed. Please try again.'),
  });

  // Validation
  const step1Valid =
    trip.employee_name && trip.employee_email && trip.department &&
    trip.destination && trip.purpose && trip.trip_start && trip.trip_end && trip.project_id;

  const total = items.reduce(
    (s, i) => s + calcAmount(i.category, i.km, i.amount),
    0,
  );

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
          <h1 className="text-3xl mb-3 normal-case">Submitted!</h1>
          <p className="mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Your travel expense report has been submitted for approval.
          </p>
          <div
            className="scch-card p-4 mb-8"
            style={{ border: '1px solid rgba(0,255,65,0.3)' }}
          >
            <p className="text-xs mb-1" style={{ color: 'var(--scch-gray)' }}>Tracking ID</p>
            <p className="font-mono font-bold text-lg" style={{ color: 'var(--scch-green)' }}>
              #{submittedId.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={() => {
              setSubmittedId(null); setStep(0);
              setTrip({ employee_name: '', employee_email: '', department: '', destination: '', purpose: '', trip_start: '', trip_end: '', project_id: '' });
              setItems([]);
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
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-4xl normal-case mb-1">travel expense</h1>
          <p style={{ color: 'var(--scch-gray)' }}>Submit your travel costs for approval and FFG reimbursement.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-10">
          {STEPS.map((s, i) => (
            <>
              <div key={s} className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    background: i <= step ? 'var(--scch-green)' : 'hsl(var(--muted))',
                    color: i <= step ? '#0d1b2a' : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {i + 1}
                </div>
                <span
                  className="text-xs mt-1 hidden sm:block"
                  style={{ color: i === step ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))' }}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  key={`line-${i}`}
                  className="flex-1 h-px mx-2"
                  style={{ background: i < step ? 'var(--scch-green)' : 'hsl(var(--border))' }}
                />
              )}
            </>
          ))}
        </div>

        {/* Step 1 */}
        {step === 0 && (
          <div className="scch-card p-6 space-y-4">
            <h2 className="text-xl mb-4" style={{ textTransform: 'none' }}>Trip Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" required>
                <input className="scch-input w-full px-3 py-2 text-sm" value={trip.employee_name}
                  onChange={e => setTrip(t => ({ ...t, employee_name: e.target.value }))} placeholder="Maria Muster" />
              </Field>
              <Field label="Email" required>
                <input type="email" className="scch-input w-full px-3 py-2 text-sm" value={trip.employee_email}
                  onChange={e => setTrip(t => ({ ...t, employee_email: e.target.value }))} placeholder="m.muster@scch.at" />
              </Field>
              <Field label="Department" required>
                <input className="scch-input w-full px-3 py-2 text-sm" value={trip.department}
                  onChange={e => setTrip(t => ({ ...t, department: e.target.value }))} placeholder="e.g. Research" />
              </Field>
              <Field label="Project" required>
                <select className="scch-input w-full px-3 py-2 text-sm" value={trip.project_id}
                  onChange={e => setTrip(t => ({ ...t, project_id: e.target.value }))}>
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Destination" required className="sm:col-span-2">
                <input className="scch-input w-full px-3 py-2 text-sm" value={trip.destination}
                  onChange={e => setTrip(t => ({ ...t, destination: e.target.value }))} placeholder="e.g. Vienna, Austria" />
              </Field>
              <Field label="Purpose" required className="sm:col-span-2">
                <textarea className="scch-input w-full px-3 py-2 text-sm resize-none" rows={2} value={trip.purpose}
                  onChange={e => setTrip(t => ({ ...t, purpose: e.target.value }))} placeholder="Conference attendance / client meeting..." />
              </Field>
              <Field label="Trip Start" required>
                <input type="date" className="scch-input w-full px-3 py-2 text-sm" value={trip.trip_start}
                  onChange={e => setTrip(t => ({ ...t, trip_start: e.target.value }))} />
              </Field>
              <Field label="Trip End" required>
                <input type="date" className="scch-input w-full px-3 py-2 text-sm" value={trip.trip_end}
                  onChange={e => setTrip(t => ({ ...t, trip_end: e.target.value }))} />
              </Field>
            </div>
            <div className="flex justify-end pt-2">
              <button className="scch-btn-primary px-6 py-2.5 flex items-center gap-2" disabled={!step1Valid}
                onClick={() => setStep(1)}>
                Next: Expenses <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="scch-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl" style={{ textTransform: 'none' }}>Expense Items</h2>
                <button className="scch-btn-primary px-4 py-2 text-sm flex items-center gap-2"
                  onClick={() => { setEditItem({ _id: genId(), category: 'transport', date: trip.trip_start, description: '', km: '', amount: '' }); setShowItemModal(true); }}>
                  <Plus size={15} /> Add Item
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-10" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <p className="text-sm">No expense items yet.</p>
                  <p className="text-xs mt-1">Click “Add Item” to start.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item._id} className="flex items-center justify-between gap-3 p-3 rounded"
                      style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: 'var(--scch-green)' }}>{CATEGORY_LABELS[item.category]}</p>
                        <p className="text-sm truncate">{item.description || '—'}</p>
                        <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{item.date}{item.km ? ` · ${item.km} km` : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">{formatCurrency(calcAmount(item.category, item.km, item.amount))}</p>
                        {item.receipt_file && <p className="text-xs" style={{ color: 'var(--scch-green)' }}>✓ receipt</p>}
                      </div>
                      <button onClick={() => setItems(prev => prev.filter(i => i._id !== item._id))}
                        className="p-1.5 rounded scch-btn-ghost shrink-0">
                        <Trash2 size={14} style={{ color: '#ff5a5a' }} />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 rounded font-bold mt-2"
                    style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)' }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--scch-green)' }}>{formatCurrency(total)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button className="scch-btn-ghost px-5 py-2.5 flex items-center gap-2 text-sm" onClick={() => setStep(0)}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="scch-btn-primary px-6 py-2.5 flex items-center gap-2" onClick={() => setStep(2)}>
                Review <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="scch-card p-6 space-y-4">
              <h2 className="text-xl" style={{ textTransform: 'none' }}>Review & Submit</h2>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Name', trip.employee_name], ['Email', trip.employee_email],
                  ['Department', trip.department],
                  ['Project', projects.find(p => p.id === trip.project_id)?.code ?? trip.project_id],
                  ['Destination', trip.destination], ['Purpose', trip.purpose],
                  ['From', trip.trip_start], ['To', trip.trip_end],
                ].map(([k, v]) => (
                  <div key={k} className="scch-card p-3">
                    <p className="text-xs" style={{ color: 'var(--scch-gray)' }}>{k}</p>
                    <p className="font-medium mt-0.5 truncate">{v}</p>
                  </div>
                ))}
              </div>

              {/* FFG notice */}
              <div className="p-3 rounded text-sm flex gap-3"
                style={{ background: 'rgba(0,255,65,0.06)', border: '1px solid rgba(0,255,65,0.2)' }}>
                <Info size={16} style={{ color: 'var(--scch-green)', flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: 'hsl(var(--muted-foreground))' }}>
                  All expenses are subject to <strong style={{ color: 'var(--scch-green)' }}>FFG funding eligibility rules</strong> and
                  § 26 EStG. Ensure receipts are attached for accommodation and transport items.
                </p>
              </div>

              {/* Items summary */}
              {items.length > 0 && (
                <div className="space-y-1.5">
                  {items.map(item => (
                    <div key={item._id} className="flex justify-between text-sm p-2.5 rounded"
                      style={{ background: 'hsl(var(--muted))' }}>
                      <span>{CATEGORY_LABELS[item.category]} — {item.description}</span>
                      <span className="font-bold">{formatCurrency(calcAmount(item.category, item.km, item.amount))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold p-2.5 rounded"
                    style={{ background: 'rgba(0,255,65,0.08)', color: 'var(--scch-green)' }}>
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button className="scch-btn-ghost px-5 py-2.5 flex items-center gap-2 text-sm" onClick={() => setStep(1)}>
                <ChevronLeft size={16} /> Back
              </button>
              <button
                className="scch-btn-primary px-8 py-2.5 font-bold"
                disabled={submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showItemModal && editItem && (
        <ItemModal
          item={editItem}
          rateMap={rateMap}
          onChange={setEditItem}
          onAdd={() => {
            setItems(prev => [...prev, editItem]);
            setShowItemModal(false);
          }}
          onClose={() => setShowItemModal(false)}
        />
      )}
    </Layout>
  );
}

function Field({ label, required, children, className }: {
  label: string; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {label}{required && <span style={{ color: 'var(--scch-green)' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function ItemModal({ item, rateMap, onChange, onAdd, onClose }: {
  item: ExpenseItemDraft;
  rateMap: Record<string, number>;
  onChange: (i: ExpenseItemDraft) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  const kmRate = rateMap['mileage_car'] ?? 0.42;
  const daRate = rateMap['daily_allowance_domestic'] ?? 26.40;

  function calcPreview() {
    if (item.category === 'mileage' && item.km) return Number(item.km) * kmRate;
    if (item.category === 'daily_allowance' && item.amount) return Number(item.amount) * daRate;
    return Number(item.amount) || 0;
  }

  const isValid = item.date && item.description;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70" onClick={onClose} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-xl p-6 space-y-4"
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          onClick={e => e.stopPropagation()}
        >
          <h3 style={{ textTransform: 'none' }}>Add Expense Item</h3>

          <Field label="Category" required>
            <select className="scch-input w-full px-3 py-2 text-sm" value={item.category}
              onChange={e => onChange({ ...item, category: e.target.value as ExpenseCategory, km: '', amount: '' })}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </Field>

          {/* Tooltip */}
          <div className="p-3 rounded text-xs flex gap-2"
            style={{ background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.15)' }}>
            <Info size={13} style={{ color: 'var(--scch-green)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: 'var(--scch-gray)' }}>{CATEGORY_TOOLTIPS[item.category]}</span>
          </div>

          <Field label="Date" required>
            <input type="date" className="scch-input w-full px-3 py-2 text-sm" value={item.date}
              onChange={e => onChange({ ...item, date: e.target.value })} />
          </Field>

          <Field label="Description" required>
            <input className="scch-input w-full px-3 py-2 text-sm" value={item.description}
              onChange={e => onChange({ ...item, description: e.target.value })}
              placeholder={item.category === 'mileage' ? 'Drive to Vienna office' : 'Hotel Vienna'} />
          </Field>

          {item.category === 'mileage' && (
            <Field label="Kilometers" required>
              <input type="number" min="0" className="scch-input w-full px-3 py-2 text-sm" value={item.km}
                onChange={e => onChange({ ...item, km: e.target.value })} placeholder="e.g. 120" />
            </Field>
          )}

          {item.category === 'daily_allowance' && (
            <Field label="Number of days" required>
              <input type="number" min="0.5" step="0.5" className="scch-input w-full px-3 py-2 text-sm" value={item.amount}
                onChange={e => onChange({ ...item, amount: e.target.value })} placeholder="e.g. 2" />
            </Field>
          )}

          {!['mileage', 'daily_allowance'].includes(item.category) && (
            <Field label="Amount (€)" required>
              <input type="number" min="0" step="0.01" className="scch-input w-full px-3 py-2 text-sm" value={item.amount}
                onChange={e => onChange({ ...item, amount: e.target.value })} placeholder="0.00" />
            </Field>
          )}

          {/* Preview */}
          {calcPreview() > 0 && (
            <div className="flex justify-between items-center p-2.5 rounded text-sm"
              style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)' }}>
              <span style={{ color: 'var(--scch-gray)' }}>Calculated amount</span>
              <span className="font-bold" style={{ color: 'var(--scch-green)' }}>{formatCurrency(calcPreview())}</span>
            </div>
          )}

          {/* Receipt upload */}
          <Field label="Receipt (optional)">
            <label
              className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm scch-btn-ghost w-full"
              style={{ justifyContent: 'flex-start' }}
            >
              <Upload size={14} />
              {item.receipt_file ? item.receipt_file.name : 'Upload PDF / JPEG / PNG'}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                onChange={e => onChange({ ...item, receipt_file: e.target.files?.[0] ?? null })} />
            </label>
          </Field>

          <div className="flex gap-3 pt-2">
            <button className="flex-1 scch-btn-ghost py-2.5 text-sm" onClick={onClose}>Cancel</button>
            <button className="flex-1 scch-btn-primary py-2.5 font-semibold" disabled={!isValid} onClick={onAdd}>
              Add Item
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
