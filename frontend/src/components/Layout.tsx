import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../lib/auth';

const NAV = [
  { to: '/', label: 'Travel Expense' },
  { to: '/travel-request', label: 'Travel Request' },
  { to: '/approver', label: 'Approver' },
  { to: '/admin', label: 'Admin' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-border/50"
        style={{ background: 'hsl(var(--card))', backdropFilter: 'blur(10px)' }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
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
              className="ml-1 text-xs font-medium px-2 py-0.5 rounded hidden sm:inline"
              style={{
                background: 'rgba(0,255,65,0.12)',
                color: 'var(--scch-green)',
                border: '1px solid rgba(0,255,65,0.25)',
                letterSpacing: '0.05em',
              }}
            >
              travel portal
            </span>
          </Link>

          {/* Nav — desktop */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="px-4 py-2 text-sm font-medium rounded transition-all whitespace-nowrap"
                style={{
                  color: pathname === to ? 'var(--scch-green)' : 'hsl(var(--muted-foreground))',
                  background: pathname === to ? 'rgba(0,255,65,0.08)' : 'transparent',
                }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right: user + logout */}
          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
                  <User size={13} style={{ color: 'var(--scch-green)' }} />
                  <span className="text-sm font-medium">{user.first_name} {user.last_name}</span>
                  <span
                    className="text-xs font-semibold px-1.5 py-0.5 rounded capitalize"
                    style={{
                      background: user.is_demo ? 'rgba(255,170,0,0.12)' : 'rgba(0,255,65,0.1)',
                      color: user.is_demo ? '#ffaa00' : 'var(--scch-green)',
                      border: `1px solid ${user.is_demo ? 'rgba(255,170,0,0.25)' : 'rgba(0,255,65,0.2)'}`,
                    }}
                  >
                    {user.is_demo ? 'demo' : user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 rounded scch-btn-ghost"
                >
                  <LogOut size={15} style={{ color: 'hsl(var(--muted-foreground))' }} />
                </button>
              </>
            )}

            {/* Mobile nav toggle — compact links */}
            <div className="md:hidden flex gap-1">
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
                  {label.split(' ')[1] ?? label.split(' ')[0]}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-4 text-center">
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          SCCH — Software Competence Center Hagenberg — Austrian Travel Expense Rules (§ 26 EStG)
        </p>
      </footer>
    </div>
  );
}
