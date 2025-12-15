import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentsDashboard } from '@/components/payments/PaymentsDashboard';
import { PlayerAccountStatement } from '@/components/payments/PlayerAccountStatement';
import { AccountStatement } from '@/components/payments/AccountStatement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Player } from '@/types/categories';

export default function AdministrativoDashboard() {
  const { user, organization } = useAuth();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState('payments');

  const handleViewAccountStatement = (player: Player) => {
    setSelectedPlayer(player);
  };

  const handleBackToPayments = () => {
    setSelectedPlayer(null);
  };

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

        {/* Show individual player statement or main dashboard */}
        {selectedPlayer ? (
          <PlayerAccountStatement 
            player={selectedPlayer} 
            onBack={handleBackToPayments} 
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="payments">Pagos</TabsTrigger>
              <TabsTrigger value="accounts">Estados de Cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="payments">
              <PaymentsDashboard onViewAccountStatement={handleViewAccountStatement} />
            </TabsContent>

            <TabsContent value="accounts">
              <AccountStatement />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
