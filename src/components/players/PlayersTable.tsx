import { useState } from 'react';
import { Plus, MoreHorizontal, Edit, Eye, Search, Filter, Upload, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { usePlans } from '@/hooks/usePlans';
import { CreatePlayerModal } from './CreatePlayerModal';
import { EditPlayerModal } from './EditPlayerModal';
import { PlayerProfileModal } from './PlayerProfileModal';
import { ExcelImportModal } from './ExcelImportModal';
import { PAYMENT_STATUS_LABELS, type Player, type PaymentStatus } from '@/types/categories';
import { useToast } from '@/hooks/use-toast';

export function PlayersTable() {
  const { toast } = useToast();
  const { categories } = useCategories();
  const { plans } = usePlans();
  
  // Filters state
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const { players, isLoading, togglePlayerActive, updatePlayer, refetch } = usePlayers({
    categoryId: categoryFilter || undefined,
    paymentStatus: (paymentFilter as PaymentStatus) || undefined,
    isActive: showActiveOnly ? true : undefined,
    search: searchQuery || undefined,
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);

  // Inline action handlers
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

  const handleTogglePayment = async (player: Player) => {
    const newStatus: PaymentStatus = player.payment_status === 'al_dia' ? 'pendiente' : 'al_dia';
    const success = await updatePlayer(player.id, { payment_status: newStatus });
    if (success) {
      toast({
        title: 'Estado de pago actualizado',
        description: `${player.full_name} ahora está ${newStatus === 'al_dia' ? 'al día' : 'pendiente'}.`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado de pago.',
        variant: 'destructive',
      });
    }
  };

  const handlePlanChange = async (player: Player, planId: string) => {
    const plan = plans.find(p => p.id === planId);
    const success = await updatePlayer(player.id, { 
      plan_id: planId === 'none' ? null : planId,
      monthly_fee: plan?.price || null 
    });
    if (success) {
      toast({
        title: 'Plan actualizado',
        description: `Plan de ${player.full_name} actualizado.`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el plan.',
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
  const activePlans = plans.filter(p => p.is_active);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-display font-semibold text-foreground">
          Jugadores
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportModalOpen(true)} size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Importar Excel
          </Button>
          <Button onClick={() => setCreateModalOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo jugador
          </Button>
        </div>
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">Plan</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Activo</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Pago</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {players.map((player) => {
                  const playerPlan = player.plan_data;
                  return (
                    <tr key={player.id} className={!player.is_active ? 'opacity-60 bg-muted/20' : 'hover:bg-muted/30 transition-colors'}>
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
                      {/* Plan inline dropdown */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Select 
                          value={player.plan_id || 'none'} 
                          onValueChange={(value) => handlePlanChange(player, value)}
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue placeholder="Sin plan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin plan</SelectItem>
                            {activePlans.map(plan => (
                              <SelectItem key={plan.id} value={plan.id}>
                                {plan.name} - ${plan.price}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Active toggle */}
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={player.is_active}
                          onCheckedChange={() => handleToggleActive(player)}
                          className="data-[state=checked]:bg-success"
                        />
                      </td>
                      {/* Payment toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleTogglePayment(player)}
                          className="inline-flex items-center justify-center transition-all hover:scale-105"
                          title={`Click para cambiar a ${player.payment_status === 'al_dia' ? 'Pendiente' : 'Al día'}`}
                        >
                          <Badge 
                            variant={getPaymentBadgeVariant(player.payment_status)}
                            className={`cursor-pointer transition-colors ${
                              player.payment_status === 'al_dia' 
                                ? 'bg-success hover:bg-success/80 text-success-foreground' 
                                : player.payment_status === 'atrasado'
                                ? 'bg-destructive hover:bg-destructive/80'
                                : 'hover:bg-secondary/80'
                            }`}
                          >
                            {PAYMENT_STATUS_LABELS[player.payment_status]}
                          </Badge>
                        </button>
                      </td>
                      {/* Actions menu */}
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem onClick={() => setViewingPlayer(player)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingPlayer(player)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar completo
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleActive(player)}
                              className={player.is_active ? 'text-destructive focus:text-destructive' : ''}
                            >
                              <Power className="w-4 h-4 mr-2" />
                              {player.is_active ? 'Desactivar' : 'Activar'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
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

      <ExcelImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportComplete={refetch}
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
