import { FileCheck2 } from 'lucide-react';
import { useDocsCompletitud } from '@/hooks/useDocsCompletitud';

export function DocsCompletitudIndicator() {
  const { enabled, map, isLoading } = useDocsCompletitud();
  if (!enabled || isLoading) return null;
  const rows = Array.from(map.values());
  const done = rows.filter((r) => r.completo).length;
  const pending = rows.reduce((a, r) => a + r.por_revisar, 0);
  return (
    <div className="stryk-card p-4 flex items-center gap-3">
      <FileCheck2 className="w-5 h-5 text-primary shrink-0" />
      <div className="text-sm">
        <p className="font-medium text-foreground">Documentos completos: {done} de {rows.length} jugadores</p>
        {pending > 0 && <p className="text-xs text-muted-foreground">{pending} documento(s) por revisar</p>}
      </div>
    </div>
  );
}
