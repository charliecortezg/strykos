import { Component, ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, LayoutDashboard } from 'lucide-react';
import { TrainingHome } from '@/components/training/TrainingHome';
import { ModuleView } from '@/components/training/ModuleView';
import { ComponentRouter } from '@/components/training/ComponentRouter';
import { CertificationDashboard } from '@/components/training/CertificationDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

class ErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error('[Training ErrorBoundary]', error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export default function TrainingPage() {
  const { activeRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canSeeDashboard = activeRole === 'director_deportivo' || activeRole === 'org_owner';
  const onDashboard = location.pathname.includes('/training/dashboard');

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-semibold">Capacitación WL</span>
          </div>
          {canSeeDashboard && (
            <Button
              variant={onDashboard ? 'default' : 'outline'}
              size="sm"
              onClick={() => navigate(onDashboard ? '/training/home' : '/training/dashboard')}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              {onDashboard ? 'Mi capacitación' : 'Panel DD'}
            </Button>
          )}
        </div>
      </div>

      <ErrorBoundary
        fallback={
          <div className="p-8 text-destructive">
            Error en training: revisa la consola del navegador.
          </div>
        }
      >
        <Routes>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<TrainingHome />} />
          <Route path="modules/:moduleId" element={<ModuleView />} />
          <Route path="modules/:moduleId/components/:componentId" element={<ComponentRouter />} />
          <Route path="dashboard" element={<CertificationDashboard />} />
          <Route path="*" element={<Navigate to="home" replace />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}
