import { useState } from 'react';
import { Plus, MoreHorizontal, Power, Edit, Eye, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlayers } from '@/hooks/usePlayers';
import { useCategories } from '@/hooks/useCategories';
import { CreatePlayerModal } from './CreatePlayerModal';
import { EditPlayerModal } from './EditPlayerModal';
import { PlayerProfileModal } from './PlayerProfileModal';
import { PAYMENT_STATUS_LABELS, type Player, type PaymentStatus } from '@/types/categories';
import { useToast } from '@/hooks/use-toast';

export function PlayersTable() {
  const { toast } = useToast();
  const { categories } = useCategories();
  
  // Filters state
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const { players, isLoading, togglePlayerActive, refetch } = usePlayers({
    categoryId: categoryFilter || undefined,
    paymentStatus: (paymentFilter as PaymentStatus) || undefined,
    isActive: showActiveOnly ? true : undefined,
    search: searchQuery || undefined,
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);

  const handleToggleActive = async (player: Player) => {
    const success = await togglePlayerActive(player.id, !player.is_active);
    if (success) {
      toast({
        title: player.is_active ? 'Jugador desactivado' : 'Jugador activado',
        description: `${player.full_name} ha sido ${player.is_active ? 'desactivado' : 'activado'}.`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado.',
        variant: 'destructive',
      });
    }
  };

  const getPaymentBadgeVariant = (status: PaymentStatus) => {
    switch (status) {
      case 'al_dia': return 'default';
      case 'pendiente': return 'secondary';
      case 'atrasado': return 'destructive';
      default: return 'secondary';
    }
  };

  const clearFilters = () => {
    setCategoryFilter('');
    setPaymentFilter('');
    setSearchQuery('');
    setShowActiveOnly(true);
  };

  const hasFilters = categoryFilter || paymentFilter || searchQuery || !showActiveOnly;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-display font-semibold text-foreground">
          Jugadores
        </h2>
        <Button onClick={() => setCreateModalOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo jugador
        </Button>
      </div>

      {/* Filters */}
      <div className="stryk-card p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o tutor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.filter(c => c.is_active).map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="Estado pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="al_dia">Al día</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showActiveOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className="whitespace-nowrap"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showActiveOnly ? 'Solo activos' : 'Todos'}
          </Button>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="stryk-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : players.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No hay jugadores registrados.</p>
            {hasFilters && (
              <p className="text-sm mt-2">
                Intenta ajustar los filtros o <button onClick={clearFilters} className="text-primary underline">limpiar filtros</button>.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">Categoría</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">Tutor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden xl:table-cell">Posición</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Pago</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell">Estado</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {players.map((player) => (
                  <tr key={player.id} className={!player.is_active ? 'opacity-60' : ''}>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm font-medium text-foreground">{player.full_name}</span>
                        {player.is_scholarship && (
                          <Badge variant="outline" className="ml-2 text-xs">Beca</Badge>
                        )}
                        <p className="text-xs text-muted-foreground md:hidden">
                          {player.category?.name || 'Sin categoría'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {player.category?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                      {player.tutor_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell">
                      {player.position || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        variant={getPaymentBadgeVariant(player.payment_status)}
                        className={player.payment_status === 'al_dia' ? 'bg-success text-success-foreground' : ''}
                      >
                        {PAYMENT_STATUS_LABELS[player.payment_status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={player.is_active ? 'default' : 'secondary'} className={player.is_active ? 'bg-success text-success-foreground' : ''}>
                        {player.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingPlayer(player)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver ficha
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingPlayer(player)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(player)}>
                            <Power className="w-4 h-4 mr-2" />
                            {player.is_active ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreatePlayerModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onPlayerCreated={refetch}
      />

      <EditPlayerModal
        open={!!editingPlayer}
        onOpenChange={(open) => !open && setEditingPlayer(null)}
        player={editingPlayer}
        onPlayerUpdated={refetch}
      />

      <PlayerProfileModal
        open={!!viewingPlayer}
        onOpenChange={(open) => !open && setViewingPlayer(null)}
        player={viewingPlayer}
      />
    </div>
  );
}
