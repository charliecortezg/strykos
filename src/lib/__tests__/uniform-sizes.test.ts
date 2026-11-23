import { describe, expect, it } from 'vitest';
import { SIZE_OPTIONS, SIZE_GROUPS, formatUniformSize } from '../uniform-sizes';

describe('Uniform measurements', () => {
  it.each([
    ['2-4', 29, 44], ['6-8', 31, 52], ['10-12', 33, 57], ['14-16', 36, 60],
    ['S', 50, 70], ['M', 52, 72], ['L', 57, 75], ['XL', 57, 77],
    ['XXL', 58, 80], ['XXXL', 62, 80], ['4XL', 67, 82],
  ])('preserves measurements for %s', (value, ancho, largo) => {
    expect(SIZE_OPTIONS.find((size) => size.value === value)).toMatchObject({ ancho, largo });
  });

  it('includes every size in a selectable group', () => {
    const selectable = SIZE_GROUPS.flatMap((group) => SIZE_OPTIONS.filter((size) => size.group === group));
    expect(selectable.map((size) => size.value)).toEqual(['2-4', '6-8', '10-12', '14-16', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL']);
  });

  it('uses the selected measurements in the new order summary and confirmation', () => {
    expect(formatUniformSize('6-8')).toBe('INFANTIL Talla 6-8 — Ancho 31 cm · Largo 52 cm');
    expect(formatUniformSize('4XL')).toBe('ADULTO Talla 4XL — Ancho 67 cm · Largo 82 cm');
  });

  it('does not reinterpret unknown legacy sizes', () => {
    expect(formatUniformSize('FEMENINO M')).toBe('FEMENINO M');
  });
});