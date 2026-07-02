import type { TravelRequest } from '../lib/types';

function isFfgEligible(req: TravelRequest): 'green' | 'yellow' | 'red' {
  if (!req.project) return 'red';
  if (req.project.funder === 'FFG') {
    const hasItems = req.items.length > 0;
    return hasItems ? 'green' : 'yellow';
  }
  if (req.project.funder === 'FWF' || req.project.funder === 'CDG') return 'yellow';
  return 'red';
}

const STYLE = {
  green:  { label: 'FFG eligible',     color: 'var(--scch-green)', bg: 'rgba(0,255,65,0.1)' },
  yellow: { label: 'Funding: check',   color: '#f5c518',           bg: 'rgba(245,197,24,0.1)' },
  red:    { label: 'Not FFG-funded',   color: '#ff5a5a',           bg: 'rgba(255,90,90,0.1)' },
};

export default function FfgBadge({ request }: { request: TravelRequest }) {
  const state = isFfgEligible(request);
  const s = STYLE[state];
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}30` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}
