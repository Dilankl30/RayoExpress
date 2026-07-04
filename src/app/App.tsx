import { BrowserRouter, Routes, Route } from 'react-router';
import { AppProviders } from './providers';
import { ResponsiveLayout } from './layouts/ResponsiveLayout';
import { screenRoutes } from './router';

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <ResponsiveLayout>
          <Routes>
            {screenRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Routes>
        </ResponsiveLayout>
      </AppProviders>
    </BrowserRouter>
  );
}
