import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, UserCheck, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceModule } from '@/components/payments/FinanceModule';
import { TrainersModule } from '@/components/trainers/TrainersModule';
import { MatchHistoryModule } from '@/components/matches/MatchHistoryModule';

export default function AdministrativoDashboard() {
  const { user, organization } = useAuth();
  const [activeTab, setActiveTab] = useState('finanzas');

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-semibold text-foreground mb-2">
            Panel Administrativo
          </h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.full_name}. Control financiero de {organization?.name}.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="finanzas" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Finanzas
            </TabsTrigger>
            <TabsTrigger value="partidos" className="gap-2">
              <Trophy className="w-4 h-4" />
              Partidos
            </TabsTrigger>
            <TabsTrigger value="entrenadores" className="gap-2">
              <UserCheck className="w-4 h-4" />
              Entrenadores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="finanzas">
            <FinanceModule />
          </TabsContent>

          <TabsContent value="partidos">
            <MatchHistoryModule canEdit={false} />
          </TabsContent>

          <TabsContent value="entrenadores">
            <TrainersModule readOnly={true} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
