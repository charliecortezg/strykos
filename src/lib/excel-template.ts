import * as XLSX from 'xlsx';

export const PLAYER_TEMPLATE_COLUMNS = [
  { header: 'Nombre Completo', key: 'full_name', example: 'Juan Pérez García' },
  { header: 'Categoría', key: 'category', example: 'Sub-12 Varonil' },
  { header: 'Teléfono', key: 'phone', example: '555-123-4567' },
  { header: 'Nombre Tutor', key: 'tutor_name', example: 'María García' },
  { header: 'Posición', key: 'position', example: 'Delantero' },
  { header: 'Plan', key: 'plan', example: 'Mensual' },
  { header: 'Mensualidad', key: 'monthly_fee', example: '500' },
];

export function downloadPlayerTemplate(categoryNames: string[] = []) {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Create data with headers and example rows
  const data = [
    PLAYER_TEMPLATE_COLUMNS.map(col => col.header),
    PLAYER_TEMPLATE_COLUMNS.map(col => col.example),
    ['Ana López Martínez', categoryNames[0] || 'Sub-10 Mixto', '555-987-6543', 'Roberto López', 'Portero', 'Mensual', '500'],
  ];
  
  // Create main worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Nombre
    { wch: 20 }, // Categoría
    { wch: 15 }, // Teléfono
    { wch: 20 }, // Tutor
    { wch: 15 }, // Posición
    { wch: 12 }, // Plan
    { wch: 12 }, // Mensualidad
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Jugadores');
  
  // Create instructions sheet
  const instructionsData = [
    ['Instrucciones para importar jugadores a STRYK'],
    [''],
    ['1. La columna "Nombre Completo" es OBLIGATORIA'],
    ['2. La columna "Categoría" debe coincidir EXACTAMENTE con el nombre de una categoría existente'],
    ['3. Las demás columnas son opcionales'],
    ['4. Elimina las filas de ejemplo antes de importar'],
    ['5. Guarda el archivo como .xlsx o .csv'],
    [''],
    ['Categorías existentes en tu academia:'],
    ...categoryNames.map(name => [`  • ${name}`]),
  ];
  
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');
  
  // Download
  XLSX.writeFile(wb, 'plantilla_jugadores_stryk.xlsx');
}
