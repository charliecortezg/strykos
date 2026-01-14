import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Users, DollarSign, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceModule } from '@/components/payments/FinanceModule';
import { PlayersTable } from '@/components/players/PlayersTable';
import { PlansModule } from '@/components/plans/PlansModule';
import { BillingConfigurationPanel } from '@/components/billing/BillingConfigurationPanel';

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
          <TabsList className="mb-6 w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
            <TabsTrigger value="finanzas" className="gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Finanzas</span>
              <span className="sm:hidden">$</span>
            </TabsTrigger>
            <TabsTrigger value="jugadores" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Jugadores</span>
            </TabsTrigger>
            <TabsTrigger value="planes" className="gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Planes</span>
            </TabsTrigger>
            <TabsTrigger value="configuracion" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Cobranza</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="finanzas">
            <FinanceModule />
          </TabsContent>

          <TabsContent value="jugadores">
            <PlayersTable />
          </TabsContent>

          <TabsContent value="planes">
            <PlansModule />
          </TabsContent>

          <TabsContent value="configuracion">
            <BillingConfigurationPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
