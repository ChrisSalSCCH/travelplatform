import type { RequestStatus } from '../lib/types';

const CONFIG: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',     color: 'hsl(var(--muted-foreground))', bg: 'rgba(120,140,160,0.15)' },
  submitted: { label: 'Submitted', color: '#60aaff',                       bg: 'rgba(96,170,255,0.12)' },
  approved:  { label: 'Approved',  color: 'var(--scch-green)',             bg: 'rgba(0,255,65,0.12)'   },
  rejected:  { label: 'Rejected',  color: '#ff5a5a',                       bg: 'rgba(255,90,90,0.12)'  },
};

export default function StatusBadge({ status }: { status: RequestStatus }) {
  const c = CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.color}30` }}
    >
      {c.label}
    </span>
  );
}
