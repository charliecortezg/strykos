export const SIZE_OPTIONS = [
  { group: 'INFANTIL', value: '2-4', label: 'Talla 2-4', ancho: 29, largo: 44 },
  { group: 'INFANTIL', value: '6-8', label: 'Talla 6-8', ancho: 31, largo: 52 },
  { group: 'INFANTIL', value: '10-12', label: 'Talla 10-12', ancho: 33, largo: 57 },
  { group: 'INFANTIL', value: '14-16', label: 'Talla 14-16', ancho: 36, largo: 60 },
  { group: 'ADULTO', value: 'S', label: 'Talla S/36', ancho: 50, largo: 70 },
  { group: 'ADULTO', value: 'M', label: 'Talla M/38', ancho: 52, largo: 72 },
  { group: 'ADULTO', value: 'L', label: 'Talla L/40', ancho: 57, largo: 75 },
  { group: 'ADULTO', value: 'XL', label: 'Talla XL/42', ancho: 57, largo: 77 },
  { group: 'ADULTO', value: 'XXL', label: 'Talla XXL/44', ancho: 58, largo: 80 },
  { group: 'ADULTO', value: 'XXXL', label: 'Talla XXXL/46', ancho: 62, largo: 80 },
  { group: 'ADULTO', value: '4XL', label: 'Talla 4XL', ancho: 67, largo: 82 },
] as const;

export const SIZE_GROUPS = [...new Set(SIZE_OPTIONS.map((size) => size.group))];