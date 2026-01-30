import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface DateInputProps {
  value: string; // ISO format (YYYY-MM-DD) or empty
  onChange: (isoDate: string, age: number | null) => void;
  label?: string;
  placeholder?: string;
  minAge?: number;
  maxAge?: number;
  required?: boolean;
  error?: string;
  className?: string;
}

function parseInputToDate(input: string): Date | null {
  // Remove all non-numeric characters
  const digits = input.replace(/\D/g, '');
  
  if (digits.length !== 8) return null;
  
  const day = parseInt(digits.slice(0, 2), 10);
  const month = parseInt(digits.slice(2, 4), 10);
  const year = parseInt(digits.slice(4, 8), 10);
  
  // Basic validation
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > new Date().getFullYear()) return null;
  
  // Create date and verify it's valid
  const date = new Date(year, month - 1, day);
  if (
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    return null;
  }
  
  return date;
}

function formatDisplayValue(input: string): string {
  const digits = input.replace(/\D/g, '');
  
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function dateToIso(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function DateInput({
  value,
  onChange,
  label = 'Fecha de Nacimiento',
  placeholder = 'DD/MM/AAAA',
  minAge = 3,
  maxAge = 25,
  required = false,
  error,
  className,
}: DateInputProps) {
  const [displayValue, setDisplayValue] = useState(() => isoToDisplay(value));
  const [localError, setLocalError] = useState<string | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync from external value changes
  useEffect(() => {
    if (value && !displayValue) {
      setDisplayValue(isoToDisplay(value));
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setAge(calculateAge(date));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const formatted = formatDisplayValue(rawInput);
    
    // Limit to DD/MM/YYYY format length
    if (formatted.length > 10) return;
    
    setDisplayValue(formatted);
    setLocalError(null);
    
    // Try to parse when we have full date
    if (formatted.length === 10) {
      const date = parseInputToDate(formatted);
      
      if (!date) {
        setLocalError('Fecha inválida');
        setAge(null);
        onChange('', null);
        return;
      }
      
      const calculatedAge = calculateAge(date);
      
      // Validate age range
      if (calculatedAge < minAge) {
        setLocalError(`Edad mínima: ${minAge} años`);
        setAge(calculatedAge);
        onChange('', null);
        return;
      }
      
      if (calculatedAge > maxAge) {
        setLocalError(`Edad máxima: ${maxAge} años`);
        setAge(calculatedAge);
        onChange('', null);
        return;
      }
      
      // Valid date within age range
      setAge(calculatedAge);
      onChange(dateToIso(date), calculatedAge);
    } else {
      // Incomplete date
      setAge(null);
      onChange('', null);
    }
  };

  const handleBlur = () => {
    if (displayValue && displayValue.length < 10 && displayValue.length > 0) {
      setLocalError('Fecha incompleta');
    }
  };

  const showError = error || localError;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor="date-input" className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          id="date-input"
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            'pr-16',
            showError && 'border-destructive focus-visible:ring-destructive'
          )}
          autoComplete="off"
        />
        {age !== null && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <span className={cn(
              'text-sm font-medium px-2 py-0.5 rounded-full',
              localError 
                ? 'bg-destructive/10 text-destructive' 
                : 'bg-primary/10 text-primary'
            )}>
              {age} años
            </span>
          </div>
        )}
      </div>
      {showError && (
        <p className="text-xs text-destructive">{showError}</p>
      )}
    </div>
  );
}
