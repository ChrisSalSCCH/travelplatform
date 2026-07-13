import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, User, FileText, Receipt, CheckSquare, Settings } from 'lucide-react';
import { useAuth } from '../lib/auth';

const NAV = [
  { to: '/travel-request', label: 'Travel Request', icon: FileText },
  { to: '/', label: 'Travel Expense', icon: Receipt },
  { to: '/approver', label: 'Approver', icon: CheckSquare },
  { to: '/admin', label: 'Admin', icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <div className="flex min-h-screen" style={{ background: 'hsl(var(--background))' }}>

      {/* ── Sidebar (desktop) ── */}
      <aside
        className="hidden md:flex flex-col sticky top-0 h-screen shrink-0"
        style={{
          width: '220px',
          background: 'hsl(var(--card))',
          borderRight: '1px solid hsl(var(--border))',
        }}
      >
        {/* Logo */}
        <Link to="/travel-request" className="flex items-center gap-2 px-5 py-5 shrink-0">
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
        </Link>

        <div className="px-3 pb-2">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded"
            style={{
              background: 'rgba(0,255,65,0.1)',
              color: 'var(--scch-green)',
              border: '1px solid rgba(0,255,65,0.2)',
              letterSpacing: '0.06em',
            }}
          >
            travel portal
          </span>
        </div>

        <div className="h-px mx-4 my-3" style={{ background: 'hsl(var(--border))' }} />

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: active ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))',
                  background: active ? 'rgba(0,255,65,0.08)' : 'transparent',
                  borderLeft: active ? '3px solid var(--scch-green)' : '3px solid transparent',
                }}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        {user && (
          <div className="px-3 pb-4 pt-3 border-t shrink-0" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
              style={{ background: 'hsl(var(--muted))' }}>
              <User size={13} style={{ color: 'var(--scch-green)', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{user.first_name} {user.last_name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--scch-gray)' }}>{user.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-1">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded capitalize"
                style={{
                  background: user.is_demo ? 'rgba(255,170,0,0.12)' : 'rgba(0,255,65,0.1)',
                  color: user.is_demo ? '#ffaa00' : 'var(--scch-green)',
                  border: `1px solid ${user.is_demo ? 'rgba(255,170,0,0.25)' : 'rgba(0,255,65,0.2)'}`,
                }}
              >
                {user.is_demo ? 'demo' : user.role}
              </span>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 rounded scch-btn-ghost flex items-center gap-1.5 text-xs"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
        style={{ background: 'hsl(var(--card))', borderBottom: '1px solid hsl(var(--border))' }}>
        <Link to="/travel-request" className="flex items-center gap-1.5">
          <span className="font-extrabold" style={{ fontFamily: 'Gilroy, sans-serif' }}>scch</span>
          <span className="font-extrabold" style={{ color: 'var(--scch-green)', fontFamily: 'Gilroy, sans-serif' }}>{'{}'}</span>
        </Link>
        <nav className="flex gap-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              title={label}
              className="p-2 rounded transition-all"
              style={{
                color: isActive(to) ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))',
                background: isActive(to) ? 'rgba(0,255,65,0.08)' : 'transparent',
              }}
            >
              <Icon size={18} />
            </Link>
          ))}
        </nav>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Spacer for mobile top bar */}
        <div className="md:hidden h-14 shrink-0" />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border/30 py-3 text-center">
          <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
            SCCH — Software Competence Center Hagenberg — Austrian Travel Expense Rules (§ 26 EStG)
          </p>
        </footer>
      </div>
    </div>
  );
}
