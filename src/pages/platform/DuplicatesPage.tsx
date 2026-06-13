import { useState } from 'react';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformOrganizations } from '@/hooks/usePlatformOrganizations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2, Merge, Search } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface DupRow {
  player_a_id: string;
  player_a_name: string;
  player_b_id: string;
  player_b_name: string;
  date_of_birth: string;
  category_id: string | null;
  distance: number;
}

export default function DuplicatesPage() {
  const { toast } = useToast();
  const { organizations } = usePlatformOrganizations();
  const [orgId, setOrgId] = useState<string>('');
  const [rows, setRows] = useState<DupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ keep: DupRow['player_a_id']; keepName: string; dup: DupRow['player_b_id']; dupName: string } | null>(null);

  const scan = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('find_player_duplicates' as any, { p_org_id: orgId });
      if (error) throw error;
      setRows((data as any[]) || []);
      if (!data || (data as any[]).length === 0) {
        toast({ title: 'Sin duplicados', description: 'No se encontraron pares sospechosos.' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const doMerge = async () => {
    if (!confirm) return;
    setMerging(confirm.dup);
    try {
      const { data, error } = await supabase.rpc('merge_players' as any, {
        p_keep_id: confirm.keep,
        p_duplicate_id: confirm.dup,
      });
      if (error) throw error;
      toast({
        title: 'Fusión completada',
        description: `${confirm.dupName} fusionado en ${confirm.keepName}.`,
      });
      setRows((r) => r.filter((x) => x.player_a_id !== confirm.dup && x.player_b_id !== confirm.dup));
      setConfirm(null);
    } catch (e: any) {
      toast({ title: 'Error al fusionar', description: e.message, variant: 'destructive' });
    } finally {
      setMerging(null);
    }
  };

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Detección de duplicados</h1>
          <p className="text-sm text-slate-400">Pares de jugadores con misma fecha de nacimiento y nombre similar (distancia ≤ 3).</p>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <Label className="text-slate-300">Organización</Label>
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecciona academia..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={scan} disabled={!orgId || loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Escanear
            </Button>
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {rows.length} pares sospechosos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50 text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left">Jugador A</th>
                      <th className="px-4 py-2 text-left">Jugador B</th>
                      <th className="px-4 py-2 text-left">Fecha nac.</th>
                      <th className="px-4 py-2 text-left">Dist.</th>
                      <th className="px-4 py-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {rows.map((r) => (
                      <tr key={`${r.player_a_id}-${r.player_b_id}`}>
                        <td className="px-4 py-3">{r.player_a_name}</td>
                        <td className="px-4 py-3">{r.player_b_name}</td>
                        <td className="px-4 py-3">{r.date_of_birth}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="border-slate-700 text-slate-300">{r.distance}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={merging !== null}
                            onClick={() => setConfirm({ keep: r.player_a_id, keepName: r.player_a_name, dup: r.player_b_id, dupName: r.player_b_name })}
                          >
                            <Merge className="w-3 h-3 mr-1" />
                            Mantener A
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={merging !== null}
                            onClick={() => setConfirm({ keep: r.player_b_id, keepName: r.player_b_name, dup: r.player_a_id, dupName: r.player_a_name })}
                          >
                            <Merge className="w-3 h-3 mr-1" />
                            Mantener B
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar fusión</AlertDialogTitle>
            <AlertDialogDescription>
              Se mantendrá <strong>{confirm?.keepName}</strong> y se fusionará <strong>{confirm?.dupName}</strong> en él. Toda la asistencia, pagos, evaluaciones y partidos del duplicado se re-apuntarán al principal. El duplicado quedará marcado como inactivo con nota "fusionado". Esta acción no es reversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doMerge} disabled={merging !== null}>
              {merging ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Fusionar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PlatformLayout>
  );
}
