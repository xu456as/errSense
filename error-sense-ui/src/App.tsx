import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { AppShell } from './layout/AppShell';

const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage }))
);
const DeveloperReportPage = lazy(() =>
  import('./pages/DeveloperReportPage').then((module) => ({ default: module.DeveloperReportPage }))
);
const ReviewerReportPage = lazy(() =>
  import('./pages/ReviewerReportPage').then((module) => ({ default: module.ReviewerReportPage }))
);

function ProtectedRoutes() {
  const { isAuthenticated } = useAppContext();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Routes>
        <Route index element={<Navigate to="/developer-report" replace />} />
        <Route path="/developer-report" element={<DeveloperReportPage />} />
        <Route path="/reviewer-report" element={<ReviewerReportPage />} />
      </Routes>
    </AppShell>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAppContext();

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/developer-report" replace /> : <LoginPage />}
        />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
