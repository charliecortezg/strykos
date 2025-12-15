import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentsDashboard } from './PaymentsDashboard';
import { AccountStatementView } from './AccountStatementView';
import type { Player } from '@/types/categories';
import { CreditCard, FileText } from 'lucide-react';

export function FinanceModule() {
  const [activeTab, setActiveTab] = useState<'payments' | 'accounts'>('payments');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [returnTab, setReturnTab] = useState<'payments' | 'accounts'>('payments');

  // Navigate from PaymentsDashboard to account statement
  const handleViewAccountFromPayments = useCallback((player: Player) => {
    setReturnTab('payments');
    setSelectedPlayer(player);
    setActiveTab('accounts');
  }, []);

  // Navigate from account list to individual statement
  const handleSelectPlayerFromList = useCallback((player: Player) => {
    setReturnTab('accounts');
    setSelectedPlayer(player);
  }, []);

  // Go back to previous view
  const handleBack = useCallback(() => {
    if (returnTab === 'payments') {
      setSelectedPlayer(null);
      setActiveTab('payments');
    } else {
      setSelectedPlayer(null);
    }
  }, [returnTab]);

  // Clear selection when switching tabs manually
  const handleTabChange = (value: string) => {
    setActiveTab(value as 'payments' | 'accounts');
    if (value === 'payments') {
      setSelectedPlayer(null);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList className="grid grid-cols-2 w-full max-w-md">
        <TabsTrigger value="payments" className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          <span>Pagos</span>
        </TabsTrigger>
        <TabsTrigger value="accounts" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>Estados de Cuenta</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="payments" className="mt-6">
        <PaymentsDashboard onViewAccountStatement={handleViewAccountFromPayments} />
      </TabsContent>

      <TabsContent value="accounts" className="mt-6">
        <AccountStatementView
          selectedPlayer={selectedPlayer}
          onSelectPlayer={handleSelectPlayerFromList}
          onBack={handleBack}
          showBackToPayments={returnTab === 'payments'}
        />
      </TabsContent>
    </Tabs>
  );
}
