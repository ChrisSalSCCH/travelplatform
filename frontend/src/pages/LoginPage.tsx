import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, LogIn, Zap } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function LoginPage() {
  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      toast.error('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      await loginDemo();
      navigate('/', { replace: true });
    } catch {
      toast.error('Demo login failed');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'hsl(var(--background))' }}
    >
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-4xl font-extrabold tracking-tight" style={{ fontFamily: 'Gilroy, sans-serif' }}>
            scch
          </span>
          <span className="text-4xl font-extrabold" style={{ color: 'var(--scch-green)', fontFamily: 'Gilroy, sans-serif' }}>
            {'{}'}
          </span>
        </div>
        <span
          className="text-xs font-medium px-3 py-1 rounded"
          style={{
            background: 'rgba(0,255,65,0.1)',
            color: 'var(--scch-green)',
            border: '1px solid rgba(0,255,65,0.25)',
            letterSpacing: '0.08em',
          }}
        >
          travel portal
        </span>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8 space-y-6"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        <div>
          <h1 className="text-2xl normal-case mb-1">sign in</h1>
          <p className="text-sm" style={{ color: 'var(--scch-gray)' }}>Use your SCCH account to continue.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>Email</label>
            <input
              type="email"
              autoComplete="email"
              className="scch-input w-full px-3 py-2.5 text-sm"
              placeholder="name@scch.at"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>Password</label>
            <input
              type="password"
              autoComplete="current-password"
              className="scch-input w-full px-3 py-2.5 text-sm"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full scch-btn-primary py-2.5 font-bold flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Signing in...</>
              : <><LogIn size={15} /> Sign in</>
            }
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }} />
          <span className="text-xs" style={{ color: 'var(--scch-gray)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }} />
        </div>

        {/* Demo */}
        <button
          onClick={handleDemo}
          disabled={demoLoading}
          className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          style={{
            background: 'rgba(0,255,65,0.08)',
            border: '1px solid rgba(0,255,65,0.3)',
            color: 'var(--scch-green)',
          }}
        >
          {demoLoading
            ? <><Loader2 size={15} className="animate-spin" /> Loading demo...</>
            : <><Zap size={15} /> Continue in Demo Mode</>
          }
        </button>

        <p className="text-xs text-center" style={{ color: 'var(--scch-gray)' }}>
          Demo mode gives read/write access with a pre-filled test user.
        </p>
      </div>

      <p className="mt-8 text-xs" style={{ color: 'var(--scch-gray)' }}>
        SCCH — Software Competence Center Hagenberg
      </p>
    </div>
  );
}
