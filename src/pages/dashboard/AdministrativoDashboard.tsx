import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Users, Settings, UserPlus, Shirt, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IntakeHistory } from '@/components/fichajes/IntakeHistory';
import { IntakeSettingsPanel } from '@/components/fichajes/IntakeSettingsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceModule } from '@/components/payments/FinanceModule';
import { PlayersTable } from '@/components/players/PlayersTable';
import { BillingConfigurationPanel } from '@/components/billing/BillingConfigurationPanel';
import { UniformsModule } from '@/components/uniforms/UniformsModule';
import { CheerModule } from '@/components/cheer/CheerModule';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';

export default function AdministrativoDashboard() {
  const { user, organization } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('finanzas');
  const { isEnabled } = useOrgFeatures();
  const uniformsOn = isEnabled('uniforms');
  const cheerOn = isEnabled('cheer');

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
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="finanzas" className="gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Finanzas</span>
              <span className="sm:hidden">$</span>
            </TabsTrigger>
            <TabsTrigger value="jugadores" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Jugadores</span>
            </TabsTrigger>
            <TabsTrigger value="configuracion" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Cobranza</span>
            </TabsTrigger>
            <TabsTrigger value="fichajes" className="gap-2">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Fichajes</span>
            </TabsTrigger>
            {uniformsOn && (
              <TabsTrigger value="uniformes" className="gap-2">
                <Shirt className="w-4 h-4" />
                <span className="hidden sm:inline">Uniformes</span>
              </TabsTrigger>
            )}
            {cheerOn && (
              <TabsTrigger value="porra" className="gap-2">
                <Star className="w-4 h-4" />
                <span className="hidden sm:inline">Porra</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="finanzas">
            <FinanceModule />
          </TabsContent>

          <TabsContent value="jugadores">
            <PlayersTable />
          </TabsContent>

          <TabsContent value="configuracion">
            <BillingConfigurationPanel />
          </TabsContent>

          <TabsContent value="fichajes">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Historial de Fichajes</h2>
                  <p className="text-sm text-muted-foreground">
                    Registro de inscripciones y evidencias de pago
                  </p>
                </div>
                <Button onClick={() => navigate('/fichajes/terminal')} className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nuevo Fichaje</span>
                </Button>
              </div>
              <IntakeHistory />

              {/* Quick access to pricing settings */}
              <div className="pt-4">
                <IntakeSettingsPanel />
              </div>
            </div>
          </TabsContent>

          {uniformsOn && (
            <TabsContent value="uniformes">
              <UniformsModule />
            </TabsContent>
          )}

          {cheerOn && (
            <TabsContent value="porra">
              <CheerModule />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

