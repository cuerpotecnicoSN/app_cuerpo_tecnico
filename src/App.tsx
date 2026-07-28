import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';

// Placeholder components for other routes
const Placeholder = ({ title }: { title: string }) => (
  <div className="animate-fade-in card">
    <h2 className="h2">{title}</h2>
    <p className="text-muted" style={{ marginTop: '1rem' }}>Módulo en desarrollo.</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="team" element={<Placeholder title="Mi Equipo" />} />
          <Route path="planning" element={<Placeholder title="Planificación" />} />
          <Route path="matches" element={<Placeholder title="Partidos" />} />
          <Route path="reports" element={<Placeholder title="Informes" />} />
          <Route path="settings" element={<Placeholder title="Configuración" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
