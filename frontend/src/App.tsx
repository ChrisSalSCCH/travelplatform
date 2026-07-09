import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './lib/auth';
import SubmitPage from './pages/SubmitPage';
import ApproverPage from './pages/ApproverPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import TravelRequestPage from './pages/TravelRequestPage';
import RequireAuth from './components/RequireAuth';
import './app.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <RedirectIfAuthed><LoginPage /></RedirectIfAuthed>,
  },
  {
    path: '/',
    element: <RequireAuth><SubmitPage /></RequireAuth>,
  },
  {
    path: '/travel-request',
    element: <RequireAuth><TravelRequestPage /></RequireAuth>,
  },
  {
    path: '/approver',
    element: <RequireAuth><ApproverPage /></RequireAuth>,
  },
  {
    path: '/admin',
    element: <RequireAuth><AdminPage /></RequireAuth>,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
              fontFamily: 'Gilroy, sans-serif',
            },
          }}
        />
      </QueryClientProvider>
    </AuthProvider>
  );
}
