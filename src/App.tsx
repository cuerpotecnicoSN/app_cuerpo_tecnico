import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { PrintProvider } from './components/reports/PrintContext';

import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import PlaceholderSection from './pages/PlaceholderSection';
import { navigation } from './config/navigation';

import StaffList from './pages/staff/StaffList';
import TeamList from './pages/team/TeamList';
import PlayerProfile from './pages/team/PlayerProfile';
import MeetingsList from './pages/meetings/MeetingsList';
import PlanningDashboard from './pages/planning/PlanningDashboard';
import TrainingSessionView from './pages/planning/TrainingSessionView';
import TaskLibrary from './pages/planning/TaskLibrary';

import MatchList from './pages/matches/MatchList';
import MatchView from './pages/matches/MatchView';
import LiveTracker from './pages/matches/LiveTracker';

import ReportsDashboard from './pages/reports/ReportsDashboard';
import SettingsDashboard from './pages/settings/SettingsDashboard';
import UserManagement from './pages/admin/UserManagement';

import PlayersPage from './pages/pro/PlayersPage';
import PlayerProfilePage from './pages/pro/PlayerProfilePage';

// Rutas ya implementadas explícitamente: no se generan como placeholder aunque
// aparezcan en la navegación (evita solapar con las páginas reales de abajo).
const IMPLEMENTED_PATHS = new Set([
  '/',
  '/staff',
  '/players',
  '/players/meetings',
  '/training',
  '/training/tasks',
  '/matches',
  '/stats',
]);

function App() {
  const placeholderRoutes = navigation.flatMap((section) => {
    const entries = [{ path: section.path, label: section.label, parent: section.label }];
    if (section.children) {
      section.children.forEach((child) => entries.push({ path: child.path, label: child.label, parent: section.label }));
    }
    return entries.filter((e) => !IMPLEMENTED_PATHS.has(e.path));
  });

  // Deduplicate by path (e.g. section path === first child path)
  const seen = new Set<string>();
  const uniquePlaceholders = placeholderRoutes.filter((r) => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });

  return (
    <AuthProvider>
      <PrintProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<AuthGuard><MainLayout /></AuthGuard>}>
              <Route index element={<Dashboard />} />

              {/* Equipo Técnico */}
              <Route path="staff" element={<StaffList />} />

              {/* Jugadores */}
              <Route path="players" element={<PlayersPage />} />
              <Route path="players/:id" element={<PlayerProfilePage />} />
              <Route path="players/meetings" element={<MeetingsList />} />

              {/* Entrenamientos */}
              <Route path="training" element={<PlanningDashboard />} />
              <Route path="training/tasks" element={<TaskLibrary />} />
              <Route path="training/session/:id" element={<TrainingSessionView />} />

              {/* Partidos */}
              <Route path="matches" element={<MatchList />} />
              <Route path="matches/:id" element={<MatchView />} />
              <Route path="matches/:id/live" element={<LiveTracker />} />

              {/* Estadísticas e Historial */}
              <Route path="stats" element={<ReportsDashboard />} />

              {/* Legacy / utilidades */}
              <Route path="team" element={<TeamList />} />
              <Route path="team/player/:id" element={<PlayerProfile />} />
              <Route path="settings" element={<SettingsDashboard />} />
              <Route path="admin/users" element={<AuthGuard requireAdmin><UserManagement /></AuthGuard>} />

              {/* Secciones aún no desarrolladas: esqueleto navegable */}
              {uniquePlaceholders.map((route) => (
                <Route
                  key={route.path}
                  path={route.path.slice(1)}
                  element={<PlaceholderSection title={route.label} breadcrumb={route.parent} />}
                />
              ))}
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PrintProvider>
    </AuthProvider>
  );
}

export default App;
