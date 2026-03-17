import { ArrowLeft, Copy, Check, Lock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUniformCampaigns, useUniformOrders } from '@/hooks/useUniforms';
import { OrdersTab } from './OrdersTab';
import { NumbersGridTab } from './NumbersGridTab';
import { ActivePlayersTab } from './ActivePlayersTab';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Props {
  campaignId: string;
  onBack: () => void;
}

export function CampaignDetail({ campaignId, onBack }: Props) {
  const { campaigns, closeCampaign } = useUniformCampaigns();
  const { orders } = useUniformOrders(campaignId);
  const [copied, setCopied] = useState(false);
  const [showClose, setShowClose] = useState(false);

  const campaign = campaigns.data?.find((c) => c.id === campaignId);
  if (!campaign) return null;

  const list = orders.data || [];
  const totalOrders = list.length;
  const confirmed = list.filter((o) => o.number_status === 'confirmed').length;
  const paid = list.filter((o) => o.paid).length;
  const delivered = list.filter((o) => o.delivered).length;

  const publicUrl = `${window.location.origin}/uniforme/${campaign.public_token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const kpis = [
    { label: 'Total órdenes', value: totalOrders, color: 'text-foreground' },
    { label: 'Confirmados', value: confirmed, color: 'text-success' },
    { label: 'Pagados', value: paid, color: 'text-primary' },
    { label: 'Entregados', value: delivered, color: 'text-accent-foreground' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{campaign.name}</h2>
            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
              {campaign.status === 'active' ? 'Activa' : 'Cerrada'}
            </Badge>
          </div>
          {campaign.deadline && (
            <p className="text-sm text-muted-foreground">Fecha límite: {campaign.deadline}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copiar link
          </Button>
          {campaign.status === 'active' && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowClose(true)}
              className="gap-2"
            >
              <Lock className="w-4 h-4" />
              Cerrar
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border bg-card p-4 text-center">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList>
          <TabsTrigger value="orders">Órdenes</TabsTrigger>
          <TabsTrigger value="numbers">Números por categoría</TabsTrigger>
          <TabsTrigger value="players">Jugadores activos</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <OrdersTab campaignId={campaignId} />
        </TabsContent>
        <TabsContent value="numbers">
          <NumbersGridTab campaignId={campaignId} />
        </TabsContent>
        <TabsContent value="players">
          <ActivePlayersTab />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={showClose}
        onOpenChange={setShowClose}
        title="¿Cerrar campaña?"
        description="No se podrán recibir más pedidos. Esta acción no se puede deshacer."
        confirmText="Cerrar campaña"
        onConfirm={() => closeCampaign.mutate(campaignId)}
        variant="destructive"
      />
    </div>
  );
}
