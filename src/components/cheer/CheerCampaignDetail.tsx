import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCheerCampaigns, useCheerOrders, type CheerOrder } from '@/hooks/useCheer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Download,
  Loader2,
  ChevronDown,
  ChevronRight,
  Trash2,
  Shirt,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Props {
  campaignId: string;
  onBack: () => void;
}

export function CheerCampaignDetail({ campaignId, onBack }: Props) {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const { list: campaignsList } = useCheerCampaigns(orgId);
  const { list, togglePaid, toggleDelivered, remove } = useCheerOrders(campaignId);

  const campaign = campaignsList.data?.find((c) => c.id === campaignId);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [toDelete, setToDelete] = useState<CheerOrder | null>(null);

  const summary = useMemo(() => {
    const orders = list.data ?? [];
    const totalOrders = orders.length;
    const totalItems = orders.reduce((s, o) => s + o.total_items, 0);
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total_price), 0);
    const pending = orders
      .filter((o) => !o.paid)
      .reduce((s, o) => s + Number(o.total_price), 0);
    return { totalOrders, totalItems, totalRevenue, pending };
  }, [list.data]);

  function exportCSV() {
    const orders = list.data ?? [];
    const rows: string[][] = [
      [
        'order_id',
        'buyer_name',
        'buyer_whatsapp',
        'name_on_jersey',
        'number_on_jersey',
        'size',
        'item_price',
        'paid',
        'delivered',
        'created_at',
      ],
    ];
    for (const o of orders) {
      for (const it of o.items) {
        rows.push([
          o.id,
          o.buyer_name,
          o.buyer_whatsapp,
          it.name_on_jersey,
          it.number_on_jersey != null ? String(it.number_on_jersey) : '',
          it.size,
          String(it.item_price),
          o.paid ? 'sí' : 'no',
          o.delivered ? 'sí' : 'no',
          o.created_at,
        ]);
      }
    }
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? '');
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(','),
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `porra-${campaign?.name ?? campaignId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">
            {campaign?.name ?? 'Campaña'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {campaign && (
              <Badge variant={campaign.status === 'open' ? 'default' : 'secondary'}>
                {campaign.status === 'open' ? 'Abierta' : 'Cerrada'}
              </Badge>
            )}
            {campaign?.deadline && (
              <span className="text-xs text-muted-foreground">
                Cierra: {campaign.deadline}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total pedidos" value={summary.totalOrders} />
        <SummaryCard label="Total camisetas" value={summary.totalItems} />
        <SummaryCard
          label="Total recaudado"
          value={`$${summary.totalRevenue.toLocaleString()}`}
        />
        <SummaryCard
          label="Pendiente de cobro"
          value={`$${summary.pending.toLocaleString()}`}
          accent={summary.pending > 0}
        />
      </div>

      <Card className="p-0 overflow-hidden">
        {list.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (list.data?.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Aún no hay pedidos en esta campaña.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Comprador</TableHead>
                <TableHead>Camisetas</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pagó</TableHead>
                <TableHead>Entregado</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data!.map((o) => {
                const isOpen = !!expanded[o.id];
                return (
                  <>
                    <TableRow key={o.id}>
                      <TableCell>
                        <button
                          onClick={() =>
                            setExpanded((p) => ({ ...p, [o.id]: !p[o.id] }))
                          }
                          aria-label="Expandir"
                        >
                          {isOpen ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{o.buyer_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.buyer_whatsapp}
                        </div>
                      </TableCell>
                      <TableCell>{o.total_items} camisetas</TableCell>
                      <TableCell className="font-medium">
                        ${Number(o.total_price).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={o.paid}
                          onCheckedChange={(v) =>
                            togglePaid.mutate({ id: o.id, paid: !!v })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={o.delivered}
                          onCheckedChange={(v) =>
                            toggleDelivered.mutate({
                              id: o.id,
                              delivered: !!v,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToDelete(o)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow key={o.id + '-items'} className="bg-muted/30">
                        <TableCell />
                        <TableCell colSpan={6}>
                          <div className="space-y-1 py-2">
                            {o.items.map((it) => (
                              <div
                                key={it.id}
                                className="flex items-center gap-3 text-sm"
                              >
                                <Shirt className="w-4 h-4 text-primary shrink-0" />
                                <span className="font-medium">
                                  {it.name_on_jersey}
                                </span>
                                <span className="text-muted-foreground">
                                  {it.number_on_jersey
                                    ? `#${it.number_on_jersey}`
                                    : 'Sin número'}
                                </span>
                                <span className="text-muted-foreground">
                                  · Talla {it.size}
                                </span>
                                <span className="text-muted-foreground ml-auto">
                                  ${Number(it.item_price).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Eliminar pedido"
        description={`¿Eliminar el pedido de ${toDelete?.buyer_name}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          if (toDelete) await remove.mutateAsync(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-xl font-display font-bold ${accent ? 'text-destructive' : ''}`}
      >
        {value}
      </div>
    </Card>
  );
}
