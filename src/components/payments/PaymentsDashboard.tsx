import { useState, useMemo } from 'react';
import { usePayments } from '@/hooks/usePayments';
import { usePlayers } from '@/hooks/usePlayers';
import { useCategories } from '@/hooks/useCategories';
import { useSports } from '@/hooks/useSports';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Plus, 
  Receipt, 
  ExternalLink, 
  CreditCard, 
  Users, 
  AlertCircle, 
  TrendingUp,
  ChevronRight,
  Filter,
  Search,
  X,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  MailX,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { CreatePaymentModal } from './CreatePaymentModal';
import { PAYMENT_METHOD_LABELS, RECEIPT_STATUS_LABELS, type Player, type ReceiptStatus } from '@/types/categories';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface PaymentsDashboardProps {
  onViewAccountStatement: (player: Player) => void;
}

export function PaymentsDashboard({ onViewAccountStatement }: PaymentsDashboardProps) {
  const { roles } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSportId, setSelectedSportId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { payments, stats, isLoading, refetch, sendPaymentReceipt } = usePayments({
    month: selectedMonth || undefined,
    playerId: selectedPlayerId || undefined,
  });

  const { players } = usePlayers({ isActive: true });
  const { categories } = useCategories();
  const { sports } = useSports();

  // Check if user can manage receipts
  const canManageReceipts = roles.some(r => 
    ['org_owner', 'director_deportivo', 'administrativo'].includes(r)
  );

  // Handle resend receipt
  const handleResendReceipt = async (paymentId: string) => {
    setResendingId(paymentId);
    try {
      const result = await sendPaymentReceipt(paymentId);
      if (result.ok) {
        toast.success(result.message || 'Recibo enviado');
        refetch();
      } else {
        toast.error(result.message || 'Error al enviar recibo');
      }
    } catch (error) {
      toast.error('Error inesperado al enviar recibo');
    } finally {
      setResendingId(null);
    }
  };

  // Get receipt status badge info
  const getReceiptStatusInfo = (status: ReceiptStatus | null) => {
    switch (status) {
      case 'sent':
        return { icon: CheckCircle2, label: 'Enviado', variant: 'default' as const, color: 'text-success' };
      case 'sent_admin_only':
        return { icon: Send, label: 'Solo Admin', variant: 'secondary' as const, color: 'text-warning' };
      case 'failed':
        return { icon: XCircle, label: 'Error', variant: 'destructive' as const, color: 'text-destructive' };
      case 'no_email':
        return { icon: MailX, label: 'Sin Email', variant: 'outline' as const, color: 'text-muted-foreground' };
      case 'pending':
      default:
        return { icon: Clock, label: 'Pendiente', variant: 'outline' as const, color: 'text-muted-foreground' };
    }
  };

  // Filter categories by selected sport
  const filteredCategories = useMemo(() => {
    if (!selectedSportId) return categories;
    return categories.filter(cat => cat.sport_id === selectedSportId);
  }, [categories, selectedSportId]);

  // Filter players by selected category
  const filteredPlayers = useMemo(() => {
    if (!selectedCategoryId) {
      if (selectedSportId) {
        const categoryIds = filteredCategories.map(c => c.id);
        return players.filter(p => p.category_id && categoryIds.includes(p.category_id));
      }
      return players;
    }
    return players.filter(p => p.category_id === selectedCategoryId);
  }, [players, selectedCategoryId, selectedSportId, filteredCategories]);

  // Calculate real-time stats based on filters
  const filteredStats = useMemo(() => {
    let relevantPlayers = players;
    
    if (selectedSportId) {
      const categoryIds = categories
        .filter(c => c.sport_id === selectedSportId)
        .map(c => c.id);
      relevantPlayers = players.filter(p => p.category_id && categoryIds.includes(p.category_id));
    }
    
    if (selectedCategoryId) {
      relevantPlayers = relevantPlayers.filter(p => p.category_id === selectedCategoryId);
    }

    const billablePlayers = relevantPlayers.filter(p => !p.is_scholarship);
    const playersAlDia = billablePlayers.filter(p => p.payment_status === 'al_dia').length;
    const pendingCount = billablePlayers.filter(p => p.payment_status !== 'al_dia').length;
    const collectionRate = billablePlayers.length > 0 
      ? Math.round((playersAlDia / billablePlayers.length) * 100) 
      : 0;

    return {
      totalMonth: stats.totalMonth,
      playersAlDia,
      pendingCount,
      collectionRate,
    };
  }, [players, categories, selectedSportId, selectedCategoryId, stats.totalMonth]);

  // Filter payments based on all criteria
  const filteredPayments = useMemo(() => {
    let result = payments;

    if (selectedSportId && !selectedCategoryId && !selectedPlayerId) {
      const categoryIds = categories
        .filter(c => c.sport_id === selectedSportId)
        .map(c => c.id);
      const playerIds = players
        .filter(p => p.category_id && categoryIds.includes(p.category_id))
        .map(p => p.id);
      result = result.filter(p => playerIds.includes(p.player_id));
    }

    if (selectedCategoryId && !selectedPlayerId) {
      const playerIds = players
        .filter(p => p.category_id === selectedCategoryId)
        .map(p => p.id);
      result = result.filter(p => playerIds.includes(p.player_id));
    }

    // Search by player name
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.player?.full_name?.toLowerCase().includes(query) ||
        p.player?.category?.name?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [payments, selectedSportId, selectedCategoryId, selectedPlayerId, categories, players, searchQuery]);

  // Generate last 12 months for filter (using local dates to avoid timezone issues)
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: format(date, 'MMMM yyyy', { locale: es }),
      };
    });
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Reset dependent filters when parent changes
  const handleSportChange = (value: string) => {
    setSelectedSportId(value === 'all' ? '' : value);
    setSelectedCategoryId('');
    setSelectedPlayerId('');
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategoryId(value === 'all' ? '' : value);
    setSelectedPlayerId('');
  };

  const handlePlayerChange = (value: string) => {
    setSelectedPlayerId(value === 'all' ? '' : value);
  };

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value === 'all' ? '' : value);
  };

  const clearFilters = () => {
    setSelectedSportId('');
    setSelectedCategoryId('');
    setSelectedPlayerId('');
    setSelectedMonth('');
    setSearchQuery('');
    setFiltersOpen(false);
  };

  const hasActiveFilters = selectedSportId || selectedCategoryId || selectedPlayerId || selectedMonth;
  const activeFilterCount = [selectedSportId, selectedCategoryId, selectedPlayerId, selectedMonth].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="stryk-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">
                  {formatCurrency(filteredStats.totalMonth)}
                </p>
                <p className="text-sm text-muted-foreground">Recaudado</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="stryk-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">{filteredStats.playersAlDia}</p>
                <p className="text-sm text-muted-foreground">Al día</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="stryk-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">{filteredStats.pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="stryk-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">{filteredStats.collectionRate}%</p>
                <p className="text-sm text-muted-foreground">Cobranza</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-display font-semibold text-foreground">
          Pagos
        </h2>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Registrar Pago
        </Button>
      </div>

      {/* Search + Filters */}
      <Card className="stryk-card">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por jugador..."
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
                  {/* Sport Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Deporte</label>
                    <Select value={selectedSportId || 'all'} onValueChange={handleSportChange}>
                      <SelectTrigger className="w-full h-11">
                        <SelectValue placeholder="Todos los deportes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los deportes</SelectItem>
                        {sports.map((sport) => (
                          <SelectItem key={sport.id} value={sport.id}>
                            {sport.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Categoría</label>
                    <Select value={selectedCategoryId || 'all'} onValueChange={handleCategoryChange}>
                      <SelectTrigger className="w-full h-11">
                        <SelectValue placeholder="Todas las categorías" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {filteredCategories.filter(c => c.is_active).map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Player Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Jugador</label>
                    <Select value={selectedPlayerId || 'all'} onValueChange={handlePlayerChange}>
                      <SelectTrigger className="w-full h-11">
                        <SelectValue placeholder="Todos los jugadores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los jugadores</SelectItem>
                        {filteredPlayers.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Month Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Mes</label>
                    <Select value={selectedMonth || 'all'} onValueChange={handleMonthChange}>
                      <SelectTrigger className="w-full h-11">
                        <SelectValue placeholder="Todos los meses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los meses</SelectItem>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedSportId && (
                <Badge variant="secondary" className="text-xs">
                  {sports.find(s => s.id === selectedSportId)?.name}
                  <button onClick={() => handleSportChange('all')} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {selectedCategoryId && (
                <Badge variant="secondary" className="text-xs">
                  {categories.find(c => c.id === selectedCategoryId)?.name}
                  <button onClick={() => handleCategoryChange('all')} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {selectedPlayerId && (
                <Badge variant="secondary" className="text-xs">
                  {players.find(p => p.id === selectedPlayerId)?.full_name}
                  <button onClick={() => handlePlayerChange('all')} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {selectedMonth && (
                <Badge variant="secondary" className="text-xs">
                  {months.find(m => m.value === selectedMonth)?.label}
                  <button onClick={() => handleMonthChange('all')} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredPayments.length} pago{filteredPayments.length !== 1 ? 's' : ''}
      </p>

      {/* Payments Table */}
      <Card className="stryk-card overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Jugador</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead className="hidden md:table-cell">Mes</TableHead>
                <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                {canManageReceipts && <TableHead>Recibo</TableHead>}
                <TableHead className="w-[80px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={canManageReceipts ? 7 : 6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Cargando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManageReceipts ? 7 : 6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Receipt className="w-10 h-10 opacity-50" />
                      <p className="font-medium">Aún no hay pagos registrados</p>
                      <p className="text-sm">Registra el primer pago para comenzar el control financiero.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => {
                  const player = players.find(p => p.id === payment.player_id);
                  const statusInfo = getReceiptStatusInfo(payment.receipt_status);
                  const StatusIcon = statusInfo.icon;
                  const canResend = payment.receipt_status === 'failed' || payment.receipt_status === 'pending' || !payment.receipt_status;
                  
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                          {payment.receipt_folio || '—'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.player?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.player?.category?.name || 'Sin categoría'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-success">
                          {formatCurrency(payment.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {format(new Date(payment.payment_month), 'MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">{format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}</span>
                          {payment.recorded_by_profile?.full_name && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <UserCheck className="w-3 h-3" />
                              {payment.recorded_by_profile.full_name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {canManageReceipts && (
                        <TableCell>
                          <TooltipProvider>
                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant={statusInfo.variant} className="gap-1">
                                    <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                                    <span className="hidden sm:inline">{statusInfo.label}</span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {payment.receipt_error || statusInfo.label}
                                </TooltipContent>
                              </Tooltip>
                              {canResend && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleResendReceipt(payment.id)}
                                  disabled={resendingId === payment.id}
                                >
                                  {resendingId === payment.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-3 h-3" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      )}
                      <TableCell>
                        {player && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewAccountStatement(player)}
                            className="h-7 px-2"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground font-medium">Aún no hay pagos registrados</p>
              <p className="text-sm text-muted-foreground mt-1">Registra el primer pago para comenzar el control financiero.</p>
            </div>
          ) : (
            filteredPayments.map((payment) => {
              const player = players.find(p => p.id === payment.player_id);
              
              return (
                <div key={payment.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{payment.player?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.player?.category?.name || 'Sin categoría'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-semibold text-success">
                          {formatCurrency(payment.amount)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {PAYMENT_METHOD_LABELS[payment.payment_method]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(payment.payment_month), 'MMM yyyy', { locale: es })} • {payment.concept}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <UserCheck className="w-3 h-3" />
                        {payment.recorded_by_profile?.full_name || 'Sistema'} • {format(new Date(payment.created_at), 'dd/MM HH:mm')}
                      </p>
                    </div>
                    {player && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewAccountStatement(player)}
                        className="shrink-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <CreatePaymentModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          refetch();
          setIsCreateOpen(false);
        }}
      />
    </div>
  );
}