import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normaliza un texto eliminando diacríticos (acentos) para búsquedas
 * Ej: "León" → "leon", "José" → "jose"
 */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Formats a year range ensuring ascending order.
 * Prevents display like "2017-2016" → always "2016-2017"
 */
export function formatYearRange(a: number, b: number): string {
  const [start, end] = [a, b].sort((x, y) => x - y);
  return `${start}-${end}`;
}
