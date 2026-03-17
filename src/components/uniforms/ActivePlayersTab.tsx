import { useRef, useState } from 'react';
import { Upload, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBlockedNumbers } from '@/hooks/useUniforms';

export function ActivePlayersTab() {
  const { blocked, importCSV } = useBlockedNumbers();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{
    updated: number;
    blocked: number;
    warnings: string[];
  } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim());

    // Skip header if present
    const startIdx = lines[0]?.toLowerCase().includes('categoria') ? 1 : 0;
    const rows: { category: string; player: string; number: number }[] = [];

    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(',').map((s) => s.trim());
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num >= 1 && num <= 99) {
          rows.push({ category: parts[0], player: parts[1], number: num });
        }
      }
    }

    if (rows.length === 0) return;
    const result = await importCSV.mutateAsync(rows);
    setImportResult(result);

    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Jugadores con número asignado</h3>
          <p className="text-sm text-muted-foreground">
            Estos números están bloqueados globalmente en su categoría.
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={importCSV.isPending}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            {importCSV.isPending ? 'Importando...' : 'Importar CSV'}
          </Button>
        </div>
      </div>

      {importResult && importResult.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <p className="font-medium mb-1">
              {importResult.updated} actualizados · {importResult.blocked} bloqueados · {importResult.warnings.length} advertencias
            </p>
            <ul className="text-xs space-y-0.5">
              {importResult.warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Categoría</TableHead>
            <TableHead>Jugador</TableHead>
            <TableHead className="text-center">Número</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {blocked.data?.map((b) => (
            <TableRow key={b.id}>
              <TableCell>{b.category_name}</TableCell>
              <TableCell>{b.player_name}</TableCell>
              <TableCell className="text-center font-bold">{b.number}</TableCell>
            </TableRow>
          ))}
          {!blocked.data?.length && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                No hay números bloqueados. Importa un CSV para comenzar.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
