import { Link, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Submit Expense' },
  { to: '/approver', label: 'Approver' },
  { to: '/admin', label: 'Admin' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-border/50"
        style={{ background: 'hsl(var(--card))', backdropFilter: 'blur(10px)' }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span
              className="text-xl font-extrabold tracking-tight"
              style={{ fontFamily: 'Gilroy, sans-serif', color: 'hsl(var(--foreground))' }}
            >
              scch
            </span>
            <span
              className="text-xl font-extrabold"
              style={{ color: 'var(--scch-green)', fontFamily: 'Gilroy, sans-serif' }}
            >
              {'{}'}
            </span>
            <span
              className="ml-2 text-xs font-medium px-2 py-0.5 rounded"
              style={{
                background: 'rgba(0,255,65,0.12)',
                color: 'var(--scch-green)',
                border: '1px solid rgba(0,255,65,0.25)',
                letterSpacing: '0.05em',
              }}
            >
              travel expenses
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="px-4 py-2 text-sm font-medium rounded transition-all"
                style={{
                  color: pathname === to ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))',
                  background: pathname === to ? 'rgba(0,255,65,0.08)' : 'transparent',
                }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Mobile nav */}
          <div className="sm:hidden flex gap-1">
            {NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="px-2 py-1 text-xs font-medium rounded transition-all"
                style={{
                  color: pathname === to ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))',
                  background: pathname === to ? 'rgba(0,255,65,0.08)' : 'transparent',
                }}
              >
                {label.split(' ')[0]}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-4 text-center">
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          SCCH &mdash; Software Competence Center Hagenberg &mdash; Austrian Travel Expense Rules (§ 26 EStG)
        </p>
      </footer>
    </div>
  );
}
