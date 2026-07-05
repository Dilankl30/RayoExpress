import { BrowserRouter, Routes, Route } from 'react-router';
import { AppProviders } from './providers';
import { ResponsiveLayout } from './layouts/ResponsiveLayout';
import { screenRoutes } from './router';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { ToastProvider } from '../shared/components/Toast';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppProviders>
          <ToastProvider>
            <ResponsiveLayout>
              <Routes>
                {screenRoutes.map((route) => (
                  <Route key={route.path} path={route.path} element={route.element} />
                ))}
              </Routes>
            </ResponsiveLayout>
          </ToastProvider>
        </AppProviders>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
