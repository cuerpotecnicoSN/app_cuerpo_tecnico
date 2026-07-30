import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { PrintProvider } from './components/reports/PrintContext';

import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';

import PlayersPage from './pages/pro/PlayersPage';
import PlayerProfilePage from './pages/pro/PlayerProfilePage';

import CalendarPage from './pages/calendar/CalendarPage';
import TrainingPage from './pages/training/TrainingPage';
import MatchesPage from './pages/matches/MatchesPage';
import DynamicsPage from './pages/dynamics/DynamicsPage';

import UserManagement from './pages/admin/UserManagement';

function App() {
  return (
    <AuthProvider>
      <PrintProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<AuthGuard><MainLayout /></AuthGuard>}>
              <Route index element={<Dashboard />} />

              <Route path="calendar" element={<CalendarPage />} />

              <Route path="players" element={<PlayersPage />} />
              <Route path="players/:id" element={<PlayerProfilePage />} />

              <Route path="training" element={<TrainingPage />} />

              <Route path="matches" element={<MatchesPage />} />

              <Route path="dynamics" element={<DynamicsPage />} />

              <Route path="admin/users" element={<AuthGuard requireAdmin><UserManagement /></AuthGuard>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PrintProvider>
    </AuthProvider>
  );
}

export default App;
