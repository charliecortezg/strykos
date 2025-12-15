import { useState } from 'react';
import { Plus, MoreHorizontal, Edit, Eye, Search, Filter, Upload, Power, DollarSign, X, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePlayers } from '@/hooks/usePlayers';
import { useCategories } from '@/hooks/useCategories';
import { usePlans } from '@/hooks/usePlans';
import { CreatePlayerModal } from './CreatePlayerModal';
import { EditPlayerModal } from './EditPlayerModal';
import { PlayerProfileModal } from './PlayerProfileModal';
import { ExcelImportModal } from './ExcelImportModal';
import { CreatePaymentModal } from '@/components/payments/CreatePaymentModal';
import { PAYMENT_STATUS_LABELS, type Player, type PaymentStatus } from '@/types/categories';
import { useToast } from '@/hooks/use-toast';

export function PlayersTable() {
  const { toast } = useToast();
  const { categories } = useCategories();
  const { plans } = usePlans();
  
  // Filters state
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { players, isLoading, togglePlayerActive, updatePlayer, refetch } = usePlayers({
    categoryId: categoryFilter || undefined,
    paymentStatus: (paymentFilter as PaymentStatus) || undefined,
    isActive: showActiveOnly ? true : undefined,
    search: searchQuery || undefined,
  });

  // Filter by plan client-side
  const filteredPlayers = planFilter 
    ? players.filter(p => p.plan_id === planFilter)
    : players;

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentPlayerId, setPaymentPlayerId] = useState<string | undefined>();
  const [deactivatePlayer, setDeactivatePlayer] = useState<Player | null>(null);

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

  const handleRegisterPayment = (player: Player) => {
    setPaymentPlayerId(player.id);
    setPaymentModalOpen(true);
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
    setPlanFilter('');
    setSearchQuery('');
    setShowActiveOnly(true);
    setFiltersOpen(false);
  };

  const hasFilters = categoryFilter || paymentFilter || planFilter || !showActiveOnly;
  const activePlans = plans.filter(p => p.is_active);
  const activeFilterCount = [categoryFilter, paymentFilter, planFilter, !showActiveOnly ? 'inactive' : ''].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-display font-semibold text-foreground">
          Jugadores
        </h2>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => {
              setPaymentPlayerId(undefined);
              setPaymentModalOpen(true);
            }} 
            className="flex-1 sm:flex-none"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Registrar pago
          </Button>
          <Button variant="outline" onClick={() => setImportModalOpen(true)} size="sm" className="hidden sm:inline-flex">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button variant="outline" onClick={() => setCreateModalOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            <span className="sm:inline">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Search + Filters button */}
      <div className="stryk-card p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o tutor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 relative shrink-0">
                <Filter className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="font-display">Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Categoría</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full h-11">
                      <SelectValue placeholder="Todas las categorías" />
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
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Estado de pago</label>
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="w-full h-11">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="al_dia">Al día</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Plan</label>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="w-full h-11">
                      <SelectValue placeholder="Todos los planes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los planes</SelectItem>
                      {activePlans.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Estado</label>
                  <div className="flex gap-2">
                    <Button
                      variant={showActiveOnly ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowActiveOnly(true)}
                      className="flex-1 h-11"
                    >
                      Solo activos
                    </Button>
                    <Button
                      variant={!showActiveOnly ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowActiveOnly(false)}
                      className="flex-1 h-11"
                    >
                      Todos
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t flex gap-2">
                  <Button variant="outline" onClick={clearFilters} className="flex-1">
                    Limpiar filtros
                  </Button>
                  <Button onClick={() => setFiltersOpen(false)} className="flex-1">
                    Aplicar
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Active filters tags */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mt-3">
            {categoryFilter && categoryFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {categories.find(c => c.id === categoryFilter)?.name}
                <button onClick={() => setCategoryFilter('')} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {paymentFilter && paymentFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {PAYMENT_STATUS_LABELS[paymentFilter as PaymentStatus]}
                <button onClick={() => setPaymentFilter('')} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {planFilter && planFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {plans.find(p => p.id === planFilter)?.name}
                <button onClick={() => setPlanFilter('')} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {!showActiveOnly && (
              <Badge variant="secondary" className="text-xs">
                Incluye inactivos
                <button onClick={() => setShowActiveOnly(true)} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredPlayers.length} jugador{filteredPlayers.length !== 1 ? 'es' : ''}
      </p>

      {/* Table/Cards */}
      <div className="stryk-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No hay jugadores registrados.</p>
            {hasFilters && (
              <p className="text-sm mt-2">
                Intenta ajustar los filtros o <button onClick={clearFilters} className="text-primary underline">limpiar filtros</button>.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nombre</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Categoría</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Plan</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Pago</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPlayers.map((player) => (
                    <tr key={player.id} className={`${!player.is_active ? 'opacity-60 bg-muted/20' : 'hover:bg-muted/30'} transition-colors`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{player.full_name}</span>
                          {player.is_scholarship && (
                            <Badge variant="outline" className="text-xs">Beca</Badge>
                          )}
                          {!player.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {player.category?.name || '—'}
                      </td>
                      {/* Plan inline dropdown */}
                      <td className="px-4 py-3">
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
                          <DropdownMenuContent align="end" className="bg-popover w-48">
                            <DropdownMenuItem onClick={() => handleRegisterPayment(player)} className="font-medium">
                              <DollarSign className="w-4 h-4 mr-2" />
                              Registrar pago
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setViewingPlayer(player)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingPlayer(player)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar jugador
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setViewingPlayer(player)}>
                              <History className="w-4 h-4 mr-2" />
                              Historial de pagos
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => player.is_active ? setDeactivatePlayer(player) : handleToggleActive(player)}
                              className={player.is_active ? 'text-destructive focus:text-destructive' : 'text-success focus:text-success'}
                            >
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

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {filteredPlayers.map((player) => (
                <div 
                  key={player.id} 
                  className={`p-4 ${!player.is_active ? 'opacity-60 bg-muted/20' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{player.full_name}</span>
                        {player.is_scholarship && (
                          <Badge variant="outline" className="text-xs">Beca</Badge>
                        )}
                        {!player.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {player.category?.name || 'Sin categoría'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant={getPaymentBadgeVariant(player.payment_status)}
                          className={`text-xs cursor-pointer ${
                            player.payment_status === 'al_dia' 
                              ? 'bg-success text-success-foreground' 
                              : player.payment_status === 'atrasado'
                              ? 'bg-destructive'
                              : ''
                          }`}
                          onClick={() => handleTogglePayment(player)}
                        >
                          {PAYMENT_STATUS_LABELS[player.payment_status]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {player.plan_data?.name || 'Sin plan'}
                          {player.monthly_fee && ` • $${player.monthly_fee}`}
                        </span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover w-52" sideOffset={5}>
                        <DropdownMenuItem onClick={() => handleRegisterPayment(player)} className="font-medium py-3">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Registrar pago
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setViewingPlayer(player)} className="py-3">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingPlayer(player)} className="py-3">
                          <Edit className="w-4 h-4 mr-2" />
                          Editar jugador
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setViewingPlayer(player)} className="py-3">
                          <History className="w-4 h-4 mr-2" />
                          Historial de pagos
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => player.is_active ? setDeactivatePlayer(player) : handleToggleActive(player)}
                          className={`py-3 ${player.is_active ? 'text-destructive focus:text-destructive' : 'text-success focus:text-success'}`}
                        >
                          <Power className="w-4 h-4 mr-2" />
                          {player.is_active ? 'Desactivar jugador' : 'Activar jugador'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Deactivation confirmation dialog */}
      <AlertDialog open={!!deactivatePlayer} onOpenChange={(open) => !open && setDeactivatePlayer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar jugador?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivatePlayer && (
                <>
                  Estás a punto de desactivar a <strong>{deactivatePlayer.full_name}</strong>. 
                  El jugador no aparecerá en las listas activas pero su historial se mantendrá.
                  Podrás reactivarlo en cualquier momento.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deactivatePlayer) {
                  handleToggleActive(deactivatePlayer);
                  setDeactivatePlayer(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <CreatePaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        onSuccess={() => {
          setPaymentModalOpen(false);
          setPaymentPlayerId(undefined);
          refetch();
        }}
        defaultPlayerId={paymentPlayerId}
      />
    </div>
  );
}