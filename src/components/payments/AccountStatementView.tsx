import { useState, useMemo, useEffect } from 'react';
import { usePlayers } from '@/hooks/usePlayers';
import { useCategories } from '@/hooks/useCategories';
import { useSports } from '@/hooks/useSports';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Search, User, Filter, ChevronRight, X } from 'lucide-react';
import { PlayerAccountStatement } from './PlayerAccountStatement';
import type { Player } from '@/types/categories';
import { normalizeSearch } from '@/lib/utils';

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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { players, refetch: refetchPlayers } = usePlayers({ isActive: true });
  const { categories } = useCategories();
  const { sports } = useSports();

  // Refetch players when component mounts or when returning from player detail
  useEffect(() => {
    if (!selectedPlayer) {
      refetchPlayers();
    }
  }, [selectedPlayer, refetchPlayers]);

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

    // Filter by search query (accent-tolerant)
    if (searchQuery) {
      const normalizedQuery = normalizeSearch(searchQuery);
      result = result.filter(p =>
        normalizeSearch(p.full_name).includes(normalizedQuery)
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
    setFiltersOpen(false);
  };

  const hasActiveFilters = selectedSportId || selectedCategoryId || selectedPaymentStatus;
  const activeFilterCount = [selectedSportId, selectedCategoryId, selectedPaymentStatus].filter(Boolean).length;

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
    <div className="space-y-4">
      {/* Search bar + Filter button */}
      <Card className="stryk-card">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar jugador..."
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

                  {/* Payment Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Estado de pago</label>
                    <Select value={selectedPaymentStatus || 'all'} onValueChange={handlePaymentStatusChange}>
                      <SelectTrigger className="w-full h-11">
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="al_dia">Al día</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="atrasado">Atrasado</SelectItem>
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
                  <button onClick={() => setSelectedSportId('')} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {selectedCategoryId && (
                <Badge variant="secondary" className="text-xs">
                  {categories.find(c => c.id === selectedCategoryId)?.name}
                  <button onClick={() => setSelectedCategoryId('')} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {selectedPaymentStatus && (
                <Badge variant="secondary" className="text-xs">
                  {selectedPaymentStatus === 'al_dia' ? 'Al día' : selectedPaymentStatus === 'pendiente' ? 'Pendiente' : 'Atrasado'}
                  <button onClick={() => setSelectedPaymentStatus('')} className="ml-1 hover:text-destructive">
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
        {filteredPlayers.length} jugador{filteredPlayers.length !== 1 ? 'es' : ''}
      </p>

      {/* Player List */}
      <Card className="stryk-card">
        <CardContent className="p-0">
          {filteredPlayers.length === 0 ? (
            <div className="p-8 text-center">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {hasActiveFilters || searchQuery ? 'No se encontraron jugadores con los filtros aplicados' : 'No hay jugadores registrados'}
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
    </div>
  );
}