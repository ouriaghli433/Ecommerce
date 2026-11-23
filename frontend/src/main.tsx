import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthHydrator } from '@/app/providers/AuthHydrator';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { ToastProvider } from '@/app/providers/ToastProvider';
import { AppRouter } from '@/app/router/AppRouter';
import '@/styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <ToastProvider>
        <AuthHydrator>
          <AppRouter />
        </AuthHydrator>
      </ToastProvider>
    </QueryProvider>
  </StrictMode>
);
