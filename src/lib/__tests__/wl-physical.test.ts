import { describe, it, expect } from 'vitest';
import { getPhysicalColor } from '../wl-utils';
const abd = { kind: 'reps' as const, yellow_min: 20, green_min: 35 };
const beep = { kind: 'beep' as const, yellow_min: 4, green_min: 8 };
describe('pruebas físicas', () => {
  it('abdominales 19 rojo', () => expect(getPhysicalColor(abd, 19)).toBe('rojo'));
  it('abdominales 20 amarillo', () => expect(getPhysicalColor(abd, 20)).toBe('amarillo'));
  it('abdominales 35 verde', () => expect(getPhysicalColor(abd, 35)).toBe('verde'));
  it('vacío sin dato', () => expect(getPhysicalColor(abd, null)).toBe(null));
  it('beep 3.9 rojo', () => expect(getPhysicalColor(beep, { nivel: 3, recorrido: 9 })).toBe('rojo'));
  it('beep 5.7 amarillo', () => expect(getPhysicalColor(beep, { nivel: 5, recorrido: 7 })).toBe('amarillo'));
  it('beep 8.1 verde', () => expect(getPhysicalColor(beep, { nivel: 8, recorrido: 1 })).toBe('verde'));
});
