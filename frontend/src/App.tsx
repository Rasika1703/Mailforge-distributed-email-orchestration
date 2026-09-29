import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { ComposePage } from './pages/ComposePage';
import { EmailListPage } from './pages/EmailListPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="compose" element={<ComposePage />} />
            <Route path="scheduled" element={<EmailListPage kind="scheduled" />} />
            <Route path="sent" element={<EmailListPage kind="sent" />} />
            <Route path="settings" element={<SettingsPage />} />
          
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
