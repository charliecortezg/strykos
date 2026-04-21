import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCheerCampaigns } from '@/hooks/useCheer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Link2, Shirt, Loader2, Lock, Unlock } from 'lucide-react';
import { CreateCheerCampaignModal } from './CreateCheerCampaignModal';
import { getCheerPublicUrl } from '@/lib/cheer-utils';
import { toast } from 'sonner';

interface Props {
  onSelectCampaign: (id: string) => void;
}

export function CheerCampaignsList({ onSelectCampaign }: Props) {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const { list, close, reopen } = useCheerCampaigns(orgId);
  const [createOpen, setCreateOpen] = useState(false);

  function copyLink(token: string) {
    navigator.clipboard.writeText(getCheerPublicUrl(token));
    toast.success('Enlace copiado');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Shirt className="w-6 h-6" />
            Camisetas de Porra
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona campañas de venta para aficionados y familiares.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nueva campaña
        </Button>
      </div>

      {list.isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!list.isLoading && (list.data?.length ?? 0) === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          No hay campañas todavía. Crea la primera.
        </Card>
      )}

      <div className="grid gap-3">
        {list.data?.map((c) => (
          <Card
            key={c.id}
            className="p-4 hover:border-primary/50 transition-colors"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button
                className="text-left flex-1 min-w-0"
                onClick={() => onSelectCampaign(c.id)}
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold truncate">{c.name}</h3>
                  <Badge variant={c.status === 'open' ? 'default' : 'secondary'}>
                    {c.status === 'open' ? 'Abierta' : 'Cerrada'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                  {c.deadline && <span>Cierra: {c.deadline}</span>}
                  <span>{c.order_count} camisetas vendidas</span>
                  <span>${Number(c.revenue).toLocaleString()} MXN</span>
                </div>
              </button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyLink(c.public_token)}
                >
                  <Link2 className="w-4 h-4 mr-1" /> Link
                </Button>
                {c.status === 'open' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => close.mutate(c.id)}
                    disabled={close.isPending}
                  >
                    <Lock className="w-4 h-4 mr-1" /> Cerrar
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reopen.mutate(c.id)}
                    disabled={reopen.isPending}
                  >
                    <Unlock className="w-4 h-4 mr-1" /> Reabrir
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <CreateCheerCampaignModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
