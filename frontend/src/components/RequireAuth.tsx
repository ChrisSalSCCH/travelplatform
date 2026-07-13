// import { Navigate } from 'react-router-dom';
// import { useAuth } from '../lib/auth';

// Auth check disabled — all users are granted access without login.
// Re-enable by uncommenting the Navigate redirect below.
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
