import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './providers/auth-provider';
import { FinanceProvider } from './providers/finance-provider';

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </FinanceProvider>
    </AuthProvider>
  );
}
