import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface PreviewRow {
  full_name: string;
  phone?: string;
  tutor_name?: string;
  category_name?: string;
  category_id?: string | null;
  position?: string;
  plan?: string;
  monthly_fee?: number;
  status: 'valid' | 'error' | 'duplicate';
  error?: string;
}

export function ExcelImportModal({ open, onOpenChange, onImportComplete }: ExcelImportModalProps) {
  const { organization } = useAuth();
  const { categories } = useCategories();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  const resetState = useCallback(() => {
    setFile(null);
    setPreviewData([]);
    setStep('upload');
    setIsProcessing(false);
    setIsImporting(false);
  }, []);

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

      if (jsonData.length === 0) {
        toast({
          title: 'Archivo vacío',
          description: 'El archivo no contiene datos.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      // Fetch existing players to check duplicates
      const { data: existingPlayers } = await supabase
        .from('players')
        .select('full_name, category_id')
        .eq('organization_id', organization?.id || '');

      const existingSet = new Set(
        (existingPlayers || []).map(p => `${p.full_name.toLowerCase()}|${p.category_id || ''}`)
      );

      // Map columns (support both Spanish and English)
      const columnMap: Record<string, string> = {
        'nombre': 'full_name',
        'nombre completo': 'full_name',
        'full_name': 'full_name',
        'name': 'full_name',
        'telefono': 'phone',
        'teléfono': 'phone',
        'phone': 'phone',
        'tutor': 'tutor_name',
        'nombre tutor': 'tutor_name',
        'tutor_name': 'tutor_name',
        'categoria': 'category_name',
        'categoría': 'category_name',
        'category': 'category_name',
        'posicion': 'position',
        'posición': 'position',
        'position': 'position',
        'plan': 'plan',
        'mensualidad': 'monthly_fee',
        'cuota': 'monthly_fee',
        'monthly_fee': 'monthly_fee',
      };

      const preview: PreviewRow[] = jsonData.map((row) => {
        const mapped: Partial<PreviewRow> = {};
        
        Object.entries(row).forEach(([key, value]) => {
          const normalizedKey = key.toLowerCase().trim();
          const mappedKey = columnMap[normalizedKey];
          if (mappedKey && value) {
            if (mappedKey === 'monthly_fee') {
              mapped[mappedKey] = parseFloat(String(value)) || undefined;
            } else {
              mapped[mappedKey as keyof PreviewRow] = String(value).trim() as never;
            }
          }
        });

        // Validate required field
        if (!mapped.full_name) {
          return {
            full_name: '(Sin nombre)',
            ...mapped,
            status: 'error' as const,
            error: 'Nombre es obligatorio',
          };
        }

        // Match category
        let categoryId: string | null = null;
        if (mapped.category_name) {
          const matchedCategory = categories.find(
            c => c.name.toLowerCase() === mapped.category_name?.toLowerCase()
          );
          if (matchedCategory) {
            categoryId = matchedCategory.id;
          } else {
            return {
              ...mapped,
              full_name: mapped.full_name!,
              category_id: null,
              status: 'error' as const,
              error: `Categoría "${mapped.category_name}" no existe`,
            };
          }
        }

        // Check duplicate
        const key = `${mapped.full_name.toLowerCase()}|${categoryId || ''}`;
        if (existingSet.has(key)) {
          return {
            ...mapped,
            full_name: mapped.full_name!,
            category_id: categoryId,
            status: 'duplicate' as const,
            error: 'Jugador ya existe en esta categoría',
          };
        }

        return {
          ...mapped,
          full_name: mapped.full_name!,
          category_id: categoryId,
          status: 'valid' as const,
        };
      });

      setPreviewData(preview);
      setStep('preview');
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar el archivo.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processExcelFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.csv'))) {
      setFile(droppedFile);
      processExcelFile(droppedFile);
    }
  };

  const handleImport = async () => {
    const validRows = previewData.filter(row => row.status === 'valid');
    
    if (validRows.length === 0) {
      toast({
        title: 'Sin datos válidos',
        description: 'No hay jugadores válidos para importar.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      const playersToInsert = validRows.map(row => ({
        organization_id: organization?.id,
        full_name: row.full_name,
        phone: row.phone || null,
        tutor_name: row.tutor_name || null,
        category_id: row.category_id || null,
        position: row.position || null,
        plan: row.plan || null,
        monthly_fee: row.monthly_fee || null,
        payment_status: 'pendiente' as const,
        is_active: true,
        is_scholarship: false,
        is_trial: false,
      }));

      const { error } = await supabase
        .from('players')
        .insert(playersToInsert);

      if (error) throw error;

      toast({
        title: 'Importación exitosa',
        description: `Se importaron ${validRows.length} jugadores correctamente.`,
      });

      onImportComplete();
      handleClose();
    } catch (error) {
      console.error('Error importing:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron importar los jugadores.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = previewData.filter(r => r.status === 'valid').length;
  const errorCount = previewData.filter(r => r.status === 'error').length;
  const duplicateCount = previewData.filter(r => r.status === 'duplicate').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar jugadores desde Excel
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div 
            className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById('excel-input')?.click()}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-muted-foreground">Procesando archivo...</p>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  Arrastra tu archivo Excel aquí
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Formatos soportados: .xlsx, .csv
                </p>
              </>
            )}
            <input
              id="excel-input"
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {step === 'preview' && (
          <>
            {/* Summary */}
            <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {validCount} válidos
              </Badge>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                <AlertCircle className="w-3 h-3 mr-1" />
                {errorCount} con errores
              </Badge>
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                <X className="w-3 h-3 mr-1" />
                {duplicateCount} duplicados
              </Badge>
              <span className="text-sm text-muted-foreground ml-auto">
                {file?.name}
              </span>
            </div>

            {/* Preview table */}
            <div className="flex-1 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Estado</th>
                    <th className="px-3 py-2 text-left font-medium">Nombre</th>
                    <th className="px-3 py-2 text-left font-medium">Categoría</th>
                    <th className="px-3 py-2 text-left font-medium">Teléfono</th>
                    <th className="px-3 py-2 text-left font-medium">Tutor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewData.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={
                        row.status === 'error' ? 'bg-destructive/5' :
                        row.status === 'duplicate' ? 'bg-warning/5' : ''
                      }
                    >
                      <td className="px-3 py-2">
                        {row.status === 'valid' && (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        )}
                        {row.status === 'error' && (
                          <span className="flex items-center gap-1 text-destructive text-xs">
                            <AlertCircle className="w-4 h-4" />
                            {row.error}
                          </span>
                        )}
                        {row.status === 'duplicate' && (
                          <span className="flex items-center gap-1 text-warning text-xs">
                            <X className="w-4 h-4" />
                            Duplicado
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium">{row.full_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.category_name || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.phone || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.tutor_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button variant="outline" onClick={resetState}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={validCount === 0 || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>Importar {validCount} jugadores</>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}