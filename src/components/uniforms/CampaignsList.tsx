import { useState } from 'react';
import { Plus, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUniformCampaigns, useUniformOrders } from '@/hooks/useUniforms';
import { CreateCampaignModal } from './CreateCampaignModal';
import { Skeleton } from '@/components/ui/skeleton';
import { getUniformPublicUrl } from '@/lib/uniform-utils';

interface Props {
  onSelectCampaign: (id: string) => void;
}

function CampaignRow({ campaign, onClick }: { campaign: any; onClick: () => void }) {
  const { orders } = useUniformOrders(campaign.id);
  const [copied, setCopied] = useState(false);
  const list = orders.data || [];
  const confirmed = list.filter((o) => o.number_status === 'confirmed').length;
  const paid = list.filter((o) => o.paid).length;
  const delivered = list.filter((o) => o.delivered).length;

  const publicUrl = `${window.location.origin}/uniforme/${campaign.public_token}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onClick}>
      <TableCell className="font-medium">{campaign.name}</TableCell>
      <TableCell>{campaign.deadline || '—'}</TableCell>
      <TableCell className="text-center">{list.length}</TableCell>
      <TableCell className="text-center">{confirmed}</TableCell>
      <TableCell className="text-center">{paid}</TableCell>
      <TableCell className="text-center">{delivered}</TableCell>
      <TableCell>
        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
          {campaign.status === 'active' ? 'Activa' : 'Cerrada'}
        </Badge>
      </TableCell>
      <TableCell>
        <Button size="sm" variant="ghost" onClick={handleCopy}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function CampaignsList({ onSelectCampaign }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const { campaigns } = useUniformCampaigns();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Campañas de Uniformes</h2>
          <p className="text-sm text-muted-foreground">Gestiona pedidos de uniformes por campaña</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva campaña</span>
        </Button>
      </div>

      {campaigns.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : !campaigns.data?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No hay campañas aún.</p>
          <p className="text-sm">Crea tu primera campaña para empezar a recibir pedidos.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Fecha límite</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Confirmados</TableHead>
              <TableHead className="text-center">Pagados</TableHead>
              <TableHead className="text-center">Entregados</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.data.map((c) => (
              <CampaignRow
                key={c.id}
                campaign={c}
                onClick={() => onSelectCampaign(c.id)}
              />
            ))}
          </TableBody>
        </Table>
      )}

      <CreateCampaignModal open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
