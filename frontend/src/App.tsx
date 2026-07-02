import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import SubmitPage from './pages/SubmitPage';
import ApproverPage from './pages/ApproverPage';
import AdminPage from './pages/AdminPage';
import './app.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

const router = createBrowserRouter([
  { path: '/', element: <SubmitPage />, handle: { ssg: true } },
  { path: '/approver', element: <ApproverPage /> },
  { path: '/admin', element: <AdminPage /> },
]);

export default function App() {
  return (
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
  );
}
