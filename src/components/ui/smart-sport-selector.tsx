import { useState, useEffect, useMemo } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface Sport {
  id: string;
  name: string;
  is_system?: boolean;
}

interface SmartSportSelectorProps {
  sports: Sport[];
  value: string;
  onChange: (value: string) => void;
  onCreateSport?: (name: string) => Promise<string | null>;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

// Normalize text for accent-insensitive comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .trim();
}

export function SmartSportSelector({
  sports,
  value,
  onChange,
  onCreateSport,
  placeholder = 'Buscar deporte...',
  disabled = false,
  isLoading = false,
}: SmartSportSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedSport = sports.find(s => s.id === value);

  // Filter sports based on normalized search
  const filteredSports = useMemo(() => {
    if (!searchValue) return sports;
    
    const normalizedSearch = normalizeText(searchValue);
    return sports.filter(sport => 
      normalizeText(sport.name).includes(normalizedSearch)
    );
  }, [sports, searchValue]);

  // Check if we should show "add new" option
  const showAddNew = useMemo(() => {
    if (!searchValue || !onCreateSport) return false;
    
    const normalizedSearch = normalizeText(searchValue);
    const exactMatch = sports.some(
      sport => normalizeText(sport.name) === normalizedSearch
    );
    
    return !exactMatch && searchValue.length >= 2;
  }, [sports, searchValue, onCreateSport]);

  const handleCreateSport = async () => {
    if (!onCreateSport || !searchValue) return;
    
    setIsCreating(true);
    const newId = await onCreateSport(searchValue.trim());
    setIsCreating(false);
    
    if (newId) {
      onChange(newId);
      setOpen(false);
      setSearchValue('');
    }
  };

  const handleSelect = (sportId: string) => {
    onChange(sportId);
    setOpen(false);
    setSearchValue('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="w-full justify-between font-normal"
        >
          {isLoading ? (
            'Cargando...'
          ) : selectedSport ? (
            selectedSport.name
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar deporte..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {searchValue ? 'No se encontró el deporte.' : 'Sin deportes.'}
            </CommandEmpty>
            <CommandGroup>
              {filteredSports.map((sport) => (
                <CommandItem
                  key={sport.id}
                  value={sport.id}
                  onSelect={() => handleSelect(sport.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === sport.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {sport.name}
                  {sport.is_system && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Sistema
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            
            {showAddNew && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreateSport}
                  disabled={isCreating}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isCreating ? 'Agregando...' : `Agregar "${searchValue}"`}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
