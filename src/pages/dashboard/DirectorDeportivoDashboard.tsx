import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Users, ClipboardList, BarChart3, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoriesTable } from '@/components/categories/CategoriesTable';
import { PlayersTable } from '@/components/players/PlayersTable';
import { useCategories } from '@/hooks/useCategories';
import { usePlayers } from '@/hooks/usePlayers';

export default function DirectorDeportivoDashboard() {
  const { user, organization } = useAuth();
  const { categories } = useCategories();
  const { players } = usePlayers();
  const [activeTab, setActiveTab] = useState('jugadores');

  const activeCategories = categories.filter(c => c.is_active).length;
  const activePlayers = players.filter(p => p.is_active).length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-semibold text-foreground mb-2">
            Panel del Director Deportivo
          </h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.full_name}. Control deportivo de {organization?.name}.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">{activePlayers}</p>
                <p className="text-sm text-muted-foreground">Jugadores</p>
              </div>
            </div>
          </div>
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">{activeCategories}</p>
                <p className="text-sm text-muted-foreground">Categorías</p>
              </div>
            </div>
          </div>
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">0</p>
                <p className="text-sm text-muted-foreground">Sesiones hoy</p>
              </div>
            </div>
          </div>
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">0%</p>
                <p className="text-sm text-muted-foreground">Asistencia</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs for Categories and Players */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="jugadores" className="gap-2">
              <Users className="w-4 h-4" />
              Jugadores
            </TabsTrigger>
            <TabsTrigger value="categorias" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Categorías
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jugadores">
            <PlayersTable />
          </TabsContent>

          <TabsContent value="categorias">
            <CategoriesTable />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
