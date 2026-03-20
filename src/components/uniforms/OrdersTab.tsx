import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, CheckCircle, Trash2 } from 'lucide-react';
import { useUniformOrders } from '@/hooks/useUniforms';
import { useCategories } from '@/hooks/useCategories';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

interface Props {
  campaignId: string;
}

export function OrdersTab({ campaignId }: Props) {
  const { orders, updateOrder, confirmNumber, deleteOrder } = useUniformOrders(campaignId);
  const { categories } = useCategories();
  const activeCategories = categories.filter(c => c.is_active);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const list = (orders.data || []).filter((o) => {
    if (filterCategory !== 'all' && o.category_id !== filterCategory) return false;
    if (filterStatus === 'unpaid' && o.paid) return false;
    if (filterStatus === 'unconfirmed' && o.number_status !== 'submitted') return false;
    if (filterStatus === 'undelivered' && o.delivered) return false;
    return true;
  });

  const handleExportCSV = () => {
    const confirmed = (orders.data || []).filter((o) => o.number_status === 'confirmed');
    if (!confirmed.length) {
      toast.info('No hay órdenes confirmadas para exportar');
      return;
    }
    const header = 'Jugador,Categoría,Tipo,Talla,Nombre Camiseta,Número\n';
    const rows = confirmed
      .map((o) =>
        [o.player_name, o.category_name, o.uniform_type === 'manga_corta' ? 'Manga Corta' : 'Manga Larga', o.jersey_size, o.name_on_jersey, o.assigned_number].join(',')
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'uniformes-proveedor.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTogglePaid = (id: string, currentValue: boolean) => {
    updateOrder.mutate({ id, paid: !currentValue });
  };

  const handleToggleDelivered = (id: string, currentValue: boolean) => {
    updateOrder.mutate({ id, delivered: !currentValue });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {activeCategories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="unpaid">Sin pagar</SelectItem>
            <SelectItem value="unconfirmed">Sin confirmar</SelectItem>
            <SelectItem value="undelivered">Sin entregar</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={handleExportCSV} className="gap-2">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jugador</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Talla</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-center">#</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Pagó</TableHead>
              <TableHead className="text-center">Entregado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.player_name}</TableCell>
                <TableCell>{o.category_name}</TableCell>
                <TableCell>
                  <Badge variant={o.uniform_type === 'manga_corta' ? 'secondary' : 'default'}>
                    {o.uniform_type === 'manga_corta' ? 'Corta · $500' : 'Larga · $600'}
                  </Badge>
                </TableCell>
                <TableCell>{o.jersey_size}</TableCell>
                <TableCell>{o.name_on_jersey}</TableCell>
                <TableCell className="text-center font-bold">{o.assigned_number}</TableCell>
                <TableCell>
                  <Badge
                    variant={o.number_status === 'confirmed' ? 'default' : 'outline'}
                    className={o.number_status === 'submitted' ? 'border-warning text-warning' : ''}
                  >
                    {o.number_status === 'confirmed' ? 'Confirmado' : 'Por confirmar'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={o.paid}
                    onCheckedChange={() => handleTogglePaid(o.id, o.paid)}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={o.delivered}
                    onCheckedChange={() => handleToggleDelivered(o.id, o.delivered)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {o.number_status === 'submitted' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => confirmNumber.mutate(o.id)}
                        title="Confirmar número"
                      >
                        <CheckCircle className="w-4 h-4 text-success" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteOrder.mutate(o.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!list.length && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No hay órdenes
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
