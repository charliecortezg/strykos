import { useState, useMemo } from 'react';
import { Check, Plus, MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface FieldSelectorProps {
  value: string;
  onChange: (value: string) => void;
  fields: string[];
  onAddField?: (field: string) => void;
  placeholder?: string;
  className?: string;
}

export function FieldSelector({
  value,
  onChange,
  fields,
  onAddField,
  placeholder = "Buscar o agregar campo...",
  className,
}: FieldSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredFields = useMemo(() => {
    if (!search.trim()) return fields;
    const normalizedSearch = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return fields.filter(field => 
      field.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedSearch)
    );
  }, [fields, search]);

  const showAddOption = search.trim() && !fields.some(
    field => field.toLowerCase() === search.trim().toLowerCase()
  );

  const handleSelect = (field: string) => {
    onChange(field);
    setOpen(false);
    setSearch('');
  };

  const handleAddNew = () => {
    const newField = search.trim();
    if (newField && onAddField) {
      onAddField(newField);
      onChange(newField);
    }
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-start text-left font-normal h-12",
            !value && "text-muted-foreground",
            className
          )}
        >
          <MapPin className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 min-w-[280px]" align="start">
        <div className="p-2 border-b">
          <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-md">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              placeholder={placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 bg-transparent h-8 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto p-1">
          {filteredFields.length === 0 && !showAddOption && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No se encontraron campos
            </p>
          )}
          {filteredFields.map((field) => (
            <button
              key={field}
              onClick={() => handleSelect(field)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-3 text-sm rounded-md text-left",
                "hover:bg-muted transition-colors",
                value === field && "bg-primary/10 text-primary"
              )}
            >
              <MapPin className="w-4 h-4 shrink-0 opacity-50" />
              <span className="flex-1">{field}</span>
              {value === field && <Check className="w-4 h-4 shrink-0" />}
            </button>
          ))}
          {showAddOption && onAddField && (
            <button
              onClick={handleAddNew}
              className="w-full flex items-center gap-2 px-3 py-3 text-sm rounded-md text-left hover:bg-primary/10 text-primary border-t mt-1"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Agregar "{search.trim()}"</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
