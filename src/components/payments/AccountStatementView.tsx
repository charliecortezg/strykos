import { useState, useMemo } from 'react';
import { usePlayers } from '@/hooks/usePlayers';
import { useCategories } from '@/hooks/useCategories';
import { useSports } from '@/hooks/useSports';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, User, Filter, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlayerAccountStatement } from './PlayerAccountStatement';
import type { Player } from '@/types/categories';

interface AccountStatementViewProps {
  selectedPlayer: Player | null;
  onSelectPlayer: (player: Player) => void;
  onBack: () => void;
  showBackToPayments: boolean;
}

export function AccountStatementView({
  selectedPlayer,
  onSelectPlayer,
  onBack,
  showBackToPayments,
}: AccountStatementViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSportId, setSelectedSportId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('');

  const { players } = usePlayers({ isActive: true });
  const { categories } = useCategories();
  const { sports } = useSports();

  // Filter categories by sport
  const filteredCategories = useMemo(() => {
    if (!selectedSportId) return categories;
    return categories.filter(cat => cat.sport_id === selectedSportId);
  }, [categories, selectedSportId]);

  // Filter players by all criteria
  const filteredPlayers = useMemo(() => {
    let result = players;

    // Filter by sport (through category)
    if (selectedSportId) {
      const categoryIds = categories
        .filter(c => c.sport_id === selectedSportId)
        .map(c => c.id);
      result = result.filter(p => p.category_id && categoryIds.includes(p.category_id));
    }

    // Filter by category
    if (selectedCategoryId) {
      result = result.filter(p => p.category_id === selectedCategoryId);
    }

    // Filter by payment status
    if (selectedPaymentStatus) {
      result = result.filter(p => p.payment_status === selectedPaymentStatus);
    }

    // Filter by search query
    if (searchQuery) {
      result = result.filter(p =>
        p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [players, selectedSportId, selectedCategoryId, selectedPaymentStatus, searchQuery, categories]);

  // Reset dependent filters
  const handleSportChange = (value: string) => {
    setSelectedSportId(value === 'all' ? '' : value);
    setSelectedCategoryId('');
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategoryId(value === 'all' ? '' : value);
  };

  const handlePaymentStatusChange = (value: string) => {
    setSelectedPaymentStatus(value === 'all' ? '' : value);
  };

  const clearFilters = () => {
    setSelectedSportId('');
    setSelectedCategoryId('');
    setSelectedPaymentStatus('');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedSportId || selectedCategoryId || selectedPaymentStatus || searchQuery;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'al_dia':
        return <Badge className="bg-success/10 text-success border-success/20 text-xs">Al día</Badge>;
      case 'pendiente':
        return <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">Pendiente</Badge>;
      case 'atrasado':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Atrasado</Badge>;
      default:
        return null;
    }
  };

  // Show individual player statement
  if (selectedPlayer) {
    return (
      <PlayerAccountStatement
        player={selectedPlayer}
        onBack={onBack}
        backLabel={showBackToPayments ? 'Volver a Pagos' : 'Volver a Estados de Cuenta'}
      />
    );
  }

  // Show player list with filters
  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="stryk-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtrar jugadores</span>
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
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar jugador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sport Filter */}
            <Select value={selectedSportId || 'all'} onValueChange={handleSportChange}>
              <SelectTrigger>
                <SelectValue placeholder="Deporte" />
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

            {/* Category Filter */}
            <Select value={selectedCategoryId || 'all'} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
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

            {/* Payment Status Filter */}
            <Select value={selectedPaymentStatus || 'all'} onValueChange={handlePaymentStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Estado de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="al_dia">Al día</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Player List */}
      <Card className="stryk-card">
        <CardContent className="p-0">
          {filteredPlayers.length === 0 ? (
            <div className="p-8 text-center">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {hasActiveFilters ? 'No se encontraron jugadores con los filtros aplicados' : 'No hay jugadores registrados'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => onSelectPlayer(player)}
                  className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{player.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {player.category?.name || 'Sin categoría'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(player.payment_status)}
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {filteredPlayers.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Mostrando {filteredPlayers.length} jugador{filteredPlayers.length !== 1 ? 'es' : ''}
        </p>
      )}
    </div>
  );
}
