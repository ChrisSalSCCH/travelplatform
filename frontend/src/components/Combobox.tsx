import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ComboOption {
  value: string;
  label: string;
  sub?: string;
}

interface Props {
  options: ComboOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowFreeText?: boolean;
}

export default function Combobox({
  options, value, onChange, placeholder = 'Select or type...', disabled, allowFreeText = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query
    ? options.filter(
        o =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.value.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  const displayLabel = options.find(o => o.value === value)?.label ?? value;

  return (
    <div ref={ref} className="relative">
      <div
        className="scch-input flex items-center cursor-text"
        onClick={() => { if (!disabled) setOpen(true); }}
        style={{ padding: '0' }}
      >
        {open ? (
          <input
            autoFocus
            className="w-full px-3 py-2 text-sm bg-transparent outline-none"
            placeholder={placeholder}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              if (allowFreeText) onChange(e.target.value);
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') { setOpen(false); setQuery(''); }
              if (e.key === 'Enter' && filtered.length > 0) {
                onChange(filtered[0].value);
                setOpen(false);
                setQuery('');
              }
            }}
          />
        ) : (
          <div
            className="flex-1 px-3 py-2 text-sm truncate"
            style={{ color: value ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}
          >
            {value ? displayLabel : placeholder}
          </div>
        )}
        <ChevronDown
          size={14}
          className="mr-2 shrink-0 transition-transform"
          style={{ color: 'var(--scch-gray)', transform: open ? 'rotate(180deg)' : 'none' }}
          onClick={e => { e.stopPropagation(); setOpen(v => !v); setQuery(''); }}
        />
      </div>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden"
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {filtered.length === 0 && allowFreeText && query && (
            <button
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/5"
              onClick={() => { onChange(query); setOpen(false); setQuery(''); }}
            >
              <span style={{ color: 'var(--scch-gray)' }}>Use: </span>
              <span style={{ color: 'var(--scch-green)' }}>"{query}"</span>
            </button>
          )}
          {filtered.map(opt => (
            <button
              key={opt.value}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 transition-colors"
              style={{
                background: opt.value === value ? 'rgba(0,255,65,0.08)' : 'transparent',
                borderLeft: opt.value === value ? '2px solid var(--scch-green)' : '2px solid transparent',
              }}
              onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
            >
              <span className="font-medium">{opt.label}</span>
              {opt.sub && <span className="ml-2 text-xs" style={{ color: 'var(--scch-gray)' }}>{opt.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
