// STRYK Date Input Component
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DateInputProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  format?: 'slash' | 'dot';
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function formatDateDisplay(date: Date | undefined, format: 'slash' | 'dot'): string {
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return format === 'slash' ? `${day}/${month}/${year}` : `${day}.${month}.${year}`;
}

function parseManualDate(input: string, format: 'slash' | 'dot'): Date | null {
  const cleaned = input.replace(/[^0-9]/g, '');
  let day: number, month: number, year: number;
  
  const formattedRegex = format === 'slash' 
    ? /^(\d{2})\/(\d{2})\/(\d{4})$/
    : /^(\d{2})\.(\d{2})\.(\d{4})$/;
  
  const formattedMatch = input.match(formattedRegex);
  
  if (formattedMatch) {
    day = parseInt(formattedMatch[1], 10);
    month = parseInt(formattedMatch[2], 10);
    year = parseInt(formattedMatch[3], 10);
  } else if (cleaned.length === 8) {
    day = parseInt(cleaned.substring(0, 2), 10);
    month = parseInt(cleaned.substring(2, 4), 10);
    year = parseInt(cleaned.substring(4, 8), 10);
  } else {
    return null;
  }
  
  if (day < 1 || day > 31) return null;
  if (month < 1 || month > 12) return null;
  if (year < 1900 || year > new Date().getFullYear() + 1) return null;
  
  const date = new Date(year, month - 1, day);
  
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  
  return date;
}

function autoFormat(input: string, format: 'slash' | 'dot'): string {
  const cleaned = input.replace(/[^0-9]/g, '');
  const separator = format === 'slash' ? '/' : '.';
  
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}${separator}${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)}${separator}${cleaned.slice(2, 4)}${separator}${cleaned.slice(4, 8)}`;
}

export function DateInput({
  value,
  onChange,
  format = 'slash',
  placeholder,
  className,
  disabled,
}: DateInputProps) {
  const [inputValue, setInputValue] = useState(() => formatDateDisplay(value, format));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(formatDateDisplay(value, format));
  }, [value, format]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const allowedChars = format === 'slash' ? /[0-9/]/g : /[0-9.]/g;
    const filtered = raw.match(allowedChars)?.join('') || '';
    const formatted = autoFormat(filtered, format);
    setInputValue(formatted);
    
    if (error) setError(null);
    
    const cleaned = formatted.replace(/[^0-9]/g, '');
    if (cleaned.length === 8) {
      const parsed = parseManualDate(formatted, format);
      if (parsed) {
        onChange(parsed);
        setError(null);
      } else {
        setError('Fecha inválida');
        onChange(undefined);
      }
    } else if (cleaned.length === 0) {
      onChange(undefined);
      setError(null);
    }
  };

  const handleBlur = () => {
    const cleaned = inputValue.replace(/[^0-9]/g, '');
    if (cleaned.length === 0) return;
    if (cleaned.length !== 8) {
      setError(format === 'slash' ? 'Usa formato DD/MM/AAAA' : 'Usa formato DD.MM.AAAA');
      return;
    }
    const parsed = parseManualDate(inputValue, format);
    if (!parsed) setError('Fecha inválida');
  };

  return (
    <div className="space-y-1">
      <Input
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder || (format === 'slash' ? 'DD/MM/AAAA' : 'DD.MM.AAAA')}
        className={cn(
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        disabled={disabled}
        maxLength={10}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
