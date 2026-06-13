import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Banknote,
  CheckSquare,
  UserCog,
  UserPlus,
  Upload,
  ClipboardList,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { OWNER_COPY } from '@/lib/owner-language';

import { FounderKPISection } from '@/components/dashboard/FounderKPISection';
import { EstadoAcademiaSection } from '@/components/dashboard/owner/EstadoAcademiaSection';
import { JugadoresPorRecuperar } from '@/components/dashboard/owner/JugadoresPorRecuperar';
import { MonthlyReportSection } from '@/components/reports/MonthlyReportSection';
import { PlayersTable } from '@/components/players/PlayersTable';
import { CategoriesTable } from '@/components/categories/CategoriesTable';
import { MoneySummaryCards } from '@/components/dashboard/owner/MoneySummaryCards';
import { PaymentsDashboard } from '@/components/payments/PaymentsDashboard';
import { ExpensesModule } from '@/components/expenses/ExpensesModule';
import { BillingConfigurationPanel } from '@/components/billing/BillingConfigurationPanel';
import { DirectorAttendanceView } from '@/components/attendance/DirectorAttendanceView';
import { TrainersModule } from '@/components/trainers/TrainersModule';
import { CreateUserModal } from '@/components/dashboard/CreateUserModal';
import { AcademyConfigPanel } from '@/components/dashboard/owner/AcademyConfigPanel';

type Section = 'inicio' | 'jugadores' | 'dinero' | 'asistencia' | 'equipo';

const SECTIONS: { value: Section; label: string; icon: typeof Home }[] = [
  { value: 'inicio', label: OWNER_COPY.inicio, icon: Home },
  { value: 'jugadores', label: OWNER_COPY.jugadores, icon: Users },
  { value: 'dinero', label: OWNER_COPY.dinero, icon: Banknote },
  { value: 'asistencia', label: OWNER_COPY.asistencia, icon: CheckSquare },
  { value: 'equipo', label: OWNER_COPY.equipo, icon: UserCog },
];

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { organization, user } = useAuth();
  const { isEnabled, profile } = useOrgFeatures();
  const [section, setSection] = useState<Section>('inicio');
  const [createTrainerOpen, setCreateTrainerOpen] = useState(false);

  // If org is 'full' (White Lions), route them back to the legacy panel.
  useEffect(() => {
    if (profile === 'full') {
      navigate('/dashboard/org-owner', { replace: true });
    }
  }, [profile, navigate]);

  if (!organization) return null;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <DashboardHeader />

      <main className="container px-4 py-6">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-foreground">
              {organization.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Hola, {user?.full_name?.split(' ')[0] || 'dueño'}.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => navigate('/fichajes/terminal')}
              size="sm"
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Fichar jugador</span>
            </Button>
          </div>
        </div>

        {/* Desktop tabs */}
        <Tabs value={section} onValueChange={(v) => setSection(v as Section)} className="w-full">
          <TabsList className="hidden lg:flex mb-6">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <TabsTrigger key={s.value} value={s.value} className="gap-2">
                  <Icon className="w-4 h-4" />
                  {s.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* INICIO */}
          <TabsContent value="inicio" className="space-y-6">
            <FounderKPISection />
            <EstadoAcademiaSection />
            <JugadoresPorRecuperar />
            <MonthlyReportSection />
          </TabsContent>

          {/* JUGADORES */}
          <TabsContent value="jugadores">
            <Tabs defaultValue="jugadores" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="jugadores">Jugadores</TabsTrigger>
                <TabsTrigger value="categorias">Categorías</TabsTrigger>
              </TabsList>
              <TabsContent value="jugadores">
                <PlayersTable />
              </TabsContent>
              <TabsContent value="categorias">
                <CategoriesTable />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* DINERO */}
          <TabsContent value="dinero" className="space-y-6">
            <MoneySummaryCards />
            <Tabs defaultValue="pagos" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="pagos">{OWNER_COPY.pagos}</TabsTrigger>
                <TabsTrigger value="gastos">{OWNER_COPY.gastos}</TabsTrigger>
                <TabsTrigger value="config">{OWNER_COPY.configuracion_cobranza}</TabsTrigger>
              </TabsList>
              <TabsContent value="pagos">
                <PaymentsDashboard />
              </TabsContent>
              <TabsContent value="gastos">
                <ExpensesModule />
              </TabsContent>
              <TabsContent value="config">
                <BillingConfigurationPanel />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ASISTENCIA */}
          <TabsContent value="asistencia">
            <DirectorAttendanceView />
          </TabsContent>

          {/* EQUIPO */}
          <TabsContent value="equipo" className="space-y-6">
            <Tabs defaultValue="equipo" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="equipo">Equipo</TabsTrigger>
                <TabsTrigger value="config">{OWNER_COPY.configuracion_academia}</TabsTrigger>
              </TabsList>
              <TabsContent value="equipo" className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    onClick={() => setCreateTrainerOpen(true)}
                    size="sm"
                    className="gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    {OWNER_COPY.crear_entrenador}
                  </Button>
                </div>
                <TrainersModule />
              </TabsContent>
              <TabsContent value="config">
                <AcademyConfigPanel />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border h-16 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch h-full">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setSection(s.value)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{s.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <CreateUserModal
        open={createTrainerOpen}
        onOpenChange={setCreateTrainerOpen}
        role="entrenador"
        lockedRole="entrenador"
        onUserCreated={() => {}}
      />
    </div>
  );
}
