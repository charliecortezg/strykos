import { useState, useMemo } from 'react';
import { usePayments } from '@/hooks/usePayments';
import { usePlayers } from '@/hooks/usePlayers';
import { useCategories } from '@/hooks/useCategories';
import { useSports } from '@/hooks/useSports';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Filter
} from 'lucide-react';
import { CreatePaymentModal } from './CreatePaymentModal';
import { PAYMENT_METHOD_LABELS, type Player } from '@/types/categories';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentsDashboardProps {
  onViewAccountStatement: (player: Player) => void;
}

export function PaymentsDashboard({ onViewAccountStatement }: PaymentsDashboardProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSportId, setSelectedSportId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const { payments, stats, isLoading, refetch } = usePayments({
    month: selectedMonth || undefined,
    playerId: selectedPlayerId || undefined,
  });

  const { players } = usePlayers({ isActive: true });
  const { categories } = useCategories();
  const { sports } = useSports();

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

    const playersAlDia = relevantPlayers.filter(p => p.payment_status === 'al_dia').length;
    const pendingCount = relevantPlayers.filter(p => p.payment_status !== 'al_dia').length;
    const collectionRate = relevantPlayers.length > 0 
      ? Math.round((playersAlDia / relevantPlayers.length) * 100) 
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

    return result;
  }, [payments, selectedSportId, selectedCategoryId, selectedPlayerId, categories, players]);

  // Generate last 12 months for filter
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: format(date, 'MMMM yyyy', { locale: es }),
    };
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Reset dependent filters when parent changes
  const handleSportChange = (value: string) => {
    setSelectedSportId(value);
    setSelectedCategoryId('');
    setSelectedPlayerId('');
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategoryId(value);
    setSelectedPlayerId('');
  };

  const clearFilters = () => {
    setSelectedSportId('');
    setSelectedCategoryId('');
    setSelectedPlayerId('');
    setSelectedMonth('');
  };

  const hasActiveFilters = selectedSportId || selectedCategoryId || selectedPlayerId || selectedMonth;

  return (
    <div className="space-y-6">
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

      {/* Hierarchical Filters */}
      <Card className="stryk-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="ml-auto text-xs h-7"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Sport Filter */}
            <Select value={selectedSportId} onValueChange={handleSportChange}>
              <SelectTrigger>
                <SelectValue placeholder="Deporte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los deportes</SelectItem>
                {sports.map((sport) => (
                  <SelectItem key={sport.id} value={sport.id}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select 
              value={selectedCategoryId} 
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las categorías</SelectItem>
                {filteredCategories.filter(c => c.is_active).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Player Filter */}
            <Select 
              value={selectedPlayerId} 
              onValueChange={setSelectedPlayerId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Jugador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los jugadores</SelectItem>
                {filteredPlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Month Filter */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los meses</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Registrar Pago
        </Button>
      </div>

      {/* Payments Table */}
      <Card className="stryk-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jugador</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead className="hidden md:table-cell">Método</TableHead>
              <TableHead className="hidden md:table-cell">Mes</TableHead>
              <TableHead className="hidden sm:table-cell">Concepto</TableHead>
              <TableHead className="hidden lg:table-cell">Fecha</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Cargando...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Receipt className="w-8 h-8" />
                    <p>No hay pagos registrados</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => {
                const player = players.find(p => p.id === payment.player_id);
                
                return (
                  <TableRow key={payment.id}>
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
                      <Badge variant="outline">
                        {PAYMENT_METHOD_LABELS[payment.payment_method]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(payment.payment_month), 'MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {payment.concept}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {payment.evidence_url && (
                          <a
                            href={payment.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 p-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {player && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewAccountStatement(player)}
                            className="h-7 px-2 text-xs"
                          >
                            Ver cuenta
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
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
