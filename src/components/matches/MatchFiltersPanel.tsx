import { useState } from 'react';
import { Calendar, Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MatchFilters } from '@/types/matches';
import { useCategories } from '@/hooks/useCategories';
import { useVenues } from '@/hooks/useVenues';
import { useSports } from '@/hooks/useSports';
import { useTrainersWithCategories } from '@/hooks/useTrainersWithCategories';

interface MatchFiltersPanelProps {
  filters: MatchFilters;
  onFiltersChange: (filters: MatchFilters) => void;
  onClearFilters: () => void;
}

export function MatchFiltersPanel({ filters, onFiltersChange, onClearFilters }: MatchFiltersPanelProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { categories } = useCategories();
  const { venues } = useVenues();
  const { sports } = useSports();
  const { trainers } = useTrainersWithCategories();

  const activeCategories = categories.filter(c => c.is_active);
  const activeVenues = venues.filter(v => v.is_active);
  const activeTrainers = trainers.filter(t => t.is_active);

  const updateFilter = <K extends keyof MatchFilters>(key: K, value: MatchFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, v]) => v !== '' && key !== 'rival');
  const activeFilterCount = Object.entries(filters).filter(([key, v]) => v !== '' && key !== 'rival').length;

  const handleClearAndClose = () => {
    onClearFilters();
    setFiltersOpen(false);
  };

  const getFilterLabel = (key: string, value: string) => {
    switch (key) {
      case 'sportId': return sports.find(s => s.id === value)?.name || value;
      case 'categoryId': return activeCategories.find(c => c.id === value)?.name || value;
      case 'trainerId': return activeTrainers.find(t => t.id === value)?.full_name || value;
      case 'venueId': return activeVenues.find(v => v.id === value)?.name || value;
      case 'matchType': return value === 'liga' ? 'Liga' : value === 'torneo' ? 'Torneo' : 'Amistoso';
      case 'result': return value === 'victoria' ? 'Victoria' : value === 'empate' ? 'Empate' : 'Derrota';
      case 'dateFrom': return `Desde: ${value}`;
      case 'dateTo': return `Hasta: ${value}`;
      default: return value;
    }
  };

  return (
    <div className="stryk-card p-3 space-y-3">
      {/* Search bar + Filter button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por rival..."
            value={filters.rival}
            onChange={(e) => updateFilter('rival', e.target.value)}
            className="pl-9 h-11"
          />
          {filters.rival && (
            <button
              onClick={() => updateFilter('rival', '')}
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
          <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-display">Filtros Avanzados</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-5">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Desde
                  </Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter('dateFrom', e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Hasta
                  </Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter('dateTo', e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              {/* Sport Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Deporte</Label>
                <Select value={filters.sportId || 'all'} onValueChange={(v) => updateFilter('sportId', v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-11">
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
                <Label className="text-sm font-medium text-foreground">Categoría</Label>
                <Select value={filters.categoryId || 'all'} onValueChange={(v) => updateFilter('categoryId', v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {activeCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Trainer Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Entrenador</Label>
                <Select value={filters.trainerId || 'all'} onValueChange={(v) => updateFilter('trainerId', v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Todos los entrenadores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los entrenadores</SelectItem>
                    {activeTrainers.map((trainer) => (
                      <SelectItem key={trainer.id} value={trainer.id}>
                        {trainer.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Venue Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Sede</Label>
                <Select value={filters.venueId || 'all'} onValueChange={(v) => updateFilter('venueId', v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Todas las sedes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sedes</SelectItem>
                    {activeVenues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Match Type Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Tipo de Partido</Label>
                <Select value={filters.matchType || 'all'} onValueChange={(v) => updateFilter('matchType', v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="liga">Liga</SelectItem>
                    <SelectItem value="torneo">Torneo</SelectItem>
                    <SelectItem value="amistoso">Amistoso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Result Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Resultado</Label>
                <Select value={filters.result || 'all'} onValueChange={(v) => updateFilter('result', v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Todos los resultados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los resultados</SelectItem>
                    <SelectItem value="victoria">Victoria</SelectItem>
                    <SelectItem value="empate">Empate</SelectItem>
                    <SelectItem value="derrota">Derrota</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t flex gap-2">
                <Button variant="outline" onClick={handleClearAndClose} className="flex-1">
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
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([key, value]) => {
            if (!value || key === 'rival') return null;
            return (
              <Badge key={key} variant="secondary" className="text-xs">
                {getFilterLabel(key, value)}
                <button 
                  onClick={() => updateFilter(key as keyof MatchFilters, '')} 
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}