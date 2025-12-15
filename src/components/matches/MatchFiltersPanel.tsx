import { Calendar, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="stryk-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Filtros Avanzados</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-2 text-muted-foreground">
            <X className="w-4 h-4" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Desde
          </Label>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
            className="bg-background"
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
            className="bg-background"
          />
        </div>

        {/* Rival Search */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-2">
            <Search className="w-4 h-4" />
            Rival
          </Label>
          <Input
            type="text"
            placeholder="Buscar rival..."
            value={filters.rival}
            onChange={(e) => updateFilter('rival', e.target.value)}
            className="bg-background"
          />
        </div>

        {/* Sport Filter */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Deporte</Label>
          <Select value={filters.sportId || 'all'} onValueChange={(v) => updateFilter('sportId', v === 'all' ? '' : v)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Todos" />
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
          <Label className="text-sm text-muted-foreground">Categoría</Label>
          <Select value={filters.categoryId || 'all'} onValueChange={(v) => updateFilter('categoryId', v === 'all' ? '' : v)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Todas" />
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
          <Label className="text-sm text-muted-foreground">Entrenador</Label>
          <Select value={filters.trainerId || 'all'} onValueChange={(v) => updateFilter('trainerId', v === 'all' ? '' : v)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Todos" />
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
          <Label className="text-sm text-muted-foreground">Sede</Label>
          <Select value={filters.venueId || 'all'} onValueChange={(v) => updateFilter('venueId', v === 'all' ? '' : v)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Todas" />
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
          <Label className="text-sm text-muted-foreground">Tipo de Partido</Label>
          <Select value={filters.matchType || 'all'} onValueChange={(v) => updateFilter('matchType', v === 'all' ? '' : v)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Todos" />
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
          <Label className="text-sm text-muted-foreground">Resultado</Label>
          <Select value={filters.result || 'all'} onValueChange={(v) => updateFilter('result', v === 'all' ? '' : v)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los resultados</SelectItem>
              <SelectItem value="victoria">Victoria</SelectItem>
              <SelectItem value="empate">Empate</SelectItem>
              <SelectItem value="derrota">Derrota</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
