import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Send, Loader2, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateCategoryReports, generateAndSendPlayerReport } from '@/lib/report-orchestrator';
import { MONTH_NAMES } from '@/lib/report-data';
import type { GenerationProgress } from '@/lib/report-types';

interface CategoryRow { id: string; name: string }
interface ReportRow {
  id: string;
  player_id: string;
  month: number;
  year: number;
  status: 'generated' | 'sent' | 'failed';
  pdf_url: string | null;
  sent_at: string | null;
  sent_to_email: string | null;
  category_id: string | null;
  player: { full_name: string } | null;
  category: { name: string } | null;
}

const now = new Date();
const YEARS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

export default function MonthlyReportsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user, organization } = useAuth();
  const [tab, setTab] = useState<'generar' | 'historial'>('generar');

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [retrying, setRetrying] = useState(false);

  const [history, setHistory] = useState<ReportRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load categories
  useEffect(() => {
    if (!organization?.id) return;
    supabase
      .from('categories')
      .select('id, name')
      .eq('organization_id', organization.id)
      .order('name')
      .then(({ data }) => setCategories((data as any) ?? []));
  }, [organization?.id]);

  // Active player count for the chosen category
  useEffect(() => {
    if (!selectedCategoryId) { setPlayerCount(0); return; }
    supabase
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', selectedCategoryId)
      .eq('is_active', true)
      .then(({ count }) => setPlayerCount(count ?? 0));
  }, [selectedCategoryId]);

  const loadHistory = async () => {
    if (!organization?.id) return;
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('player_monthly_reports')
      .select('id, player_id, month, year, status, pdf_url, sent_at, sent_to_email, category_id, player:players(full_name), category:categories(name)')
      .eq('organization_id', organization.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(200);
    if (!error) setHistory((data as any) ?? []);
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (tab === 'historial') loadHistory();
  }, [tab, organization?.id]);

  const selectedCategoryName = useMemo(
    () => categories.find(c => c.id === selectedCategoryId)?.name ?? '',
    [categories, selectedCategoryId],
  );

  const handleGenerate = async () => {
    if (!organization?.id || !user?.id || !selectedCategoryId) return;
    setShowConfirm(false);

    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('category_id', selectedCategoryId)
      .eq('is_active', true);

    const ids = (players ?? []).map((p: any) => p.id);
    if (ids.length === 0) {
      toast.error('No hay jugadores activos en esta categoría');
      return;
    }

    await generateCategoryReports(
      ids, selectedMonth, selectedYear,
      organization.id, user.id,
      (prog) => setProgress({ ...prog }),
    );

    toast.success('Proceso completado');
  };

  const handleRetryFailed = async () => {
    if (!progress || !organization?.id || !user?.id) return;
    setRetrying(true);

    // We only have names in failed list — re-fetch IDs
    const failedNames = progress.results.failed.map(f => f.name);
    const { data: players } = await supabase
      .from('players')
      .select('id, full_name')
      .in('full_name', failedNames)
      .eq('category_id', selectedCategoryId);

    const ids = (players ?? []).map((p: any) => p.id);
    let ok = 0; const failed: { name: string; reason: string }[] = [];
    for (const id of ids) {
      const player = (players as any).find((p: any) => p.id === id);
      const r = await generateAndSendPlayerReport(id, selectedMonth, selectedYear, organization.id, user.id);
      if (r.success) ok++;
      else failed.push({ name: player?.full_name ?? id, reason: r.reason ?? 'Error' });
    }

    setProgress({
      ...progress,
      results: { ok: [...progress.results.ok, ...Array(ok).fill('reintentado')], failed },
    });
    setRetrying(false);
    toast.success(`Reintento: ${ok} ok, ${failed.length} fallidos`);
  };

  const handleResend = async (row: ReportRow) => {
    if (!row.pdf_url || !row.sent_to_email) {
      toast.error('Falta PDF o correo destinatario');
      return;
    }
    const playerFull = row.player?.full_name ?? '';
    const [first, ...rest] = playerFull.split(' ');
    const last = rest.join(' ');
    const { error } = await supabase.functions.invoke('send-report-email', {
      body: {
        reportId: row.id,
        playerName: playerFull,
        firstName: first,
        lastName: last,
        parentEmail: row.sent_to_email,
        monthName: MONTH_NAMES[row.month],
        year: row.year,
        pdfUrl: row.pdf_url,
      },
    });
    if (error) {
      toast.error('Error al reenviar');
    } else {
      await supabase
        .from('player_monthly_reports')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', row.id);
      toast.success('Reenviado');
      loadHistory();
    }
  };

  const isRunning = progress?.status === 'running';
  const isDone = progress?.status === 'done';
  const progressPct = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100) : 0;

  const inner = (
    <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
      <TabsList className="grid grid-cols-2 w-full sm:w-[400px] mb-6">
        <TabsTrigger value="generar">Generar</TabsTrigger>
        <TabsTrigger value="historial">Historial</TabsTrigger>
      </TabsList>

      {/* GENERAR */}
          <TabsContent value="generar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generar y enviar reportes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Crea el reporte mensual de rendimiento de cada jugador y lo envía al correo de la familia.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                      <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Mes</label>
                    <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MONTH_NAMES).map(([n, name]) => (
                          <SelectItem key={n} value={n}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Año</label>
                    <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedCategoryId && (
                  <p className="text-sm text-muted-foreground">
                    {playerCount} jugador{playerCount === 1 ? '' : 'es'} activo{playerCount === 1 ? '' : 's'} en esta categoría.
                  </p>
                )}

                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={!selectedCategoryId || playerCount === 0 || isRunning}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Generar y enviar reportes
                </Button>
              </CardContent>
            </Card>

            {progress && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isRunning ? 'Generando…' : 'Resultado'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={progressPct} />
                  <p className="text-sm text-muted-foreground">
                    {isRunning
                      ? `Procesando ${progress.current} de ${progress.total}: ${progress.current_player_name}…`
                      : `${progress.current} de ${progress.total} procesados`}
                  </p>

                  {isDone && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span>{progress.results.ok.length} reportes enviados correctamente</span>
                      </div>
                      {progress.results.failed.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="w-4 h-4 text-destructive" />
                            <span>{progress.results.failed.length} no se pudieron enviar:</span>
                          </div>
                          <ul className="text-sm text-muted-foreground pl-6 list-disc space-y-0.5">
                            {progress.results.failed.map((f, i) => (
                              <li key={i}><strong>{f.name}</strong> — {f.reason}</li>
                            ))}
                          </ul>
                          <Button size="sm" variant="outline" onClick={handleRetryFailed} disabled={retrying} className="gap-1.5">
                            {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Reintentar fallidos
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* HISTORIAL */}
          <TabsContent value="historial">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Reportes generados</CardTitle>
                <Button size="sm" variant="outline" onClick={loadHistory} disabled={loadingHistory} className="gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Aún no se han generado reportes.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Jugador</th>
                          <th className="text-left px-3 py-2 font-medium">Categoría</th>
                          <th className="text-left px-3 py-2 font-medium">Mes</th>
                          <th className="text-left px-3 py-2 font-medium">Estado</th>
                          <th className="text-right px-3 py-2 font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {history.map(row => (
                          <tr key={row.id}>
                            <td className="px-3 py-2">{row.player?.full_name ?? '—'}</td>
                            <td className="px-3 py-2">{row.category?.name ?? '—'}</td>
                            <td className="px-3 py-2">{MONTH_NAMES[row.month]} {row.year}</td>
                            <td className="px-3 py-2">
                              {row.status === 'sent' && <Badge variant="outline" className="bg-success/10 text-success border-success/20">Enviado</Badge>}
                              {row.status === 'generated' && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Generado</Badge>}
                              {row.status === 'failed' && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Error</Badge>}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-1.5">
                                {row.pdf_url && (
                                  <Button size="sm" variant="ghost" onClick={() => window.open(row.pdf_url!, '_blank')} className="gap-1">
                                    <ExternalLink className="w-3.5 h-3.5" /> PDF
                                  </Button>
                                )}
                                {row.pdf_url && row.sent_to_email && (
                                  <Button size="sm" variant="ghost" onClick={() => handleResend(row)} className="gap-1">
                                    <Send className="w-3.5 h-3.5" /> Reenviar
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
  );

  const confirmDialog = (
    <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar envío</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Enviar el reporte de <strong>{MONTH_NAMES[selectedMonth]} {selectedYear}</strong>{' '}
            a <strong>{playerCount}</strong> familia{playerCount === 1 ? '' : 's'} de{' '}
            <strong>{selectedCategoryName}</strong>?<br />
            Esta acción enviará un correo electrónico a cada familia con el PDF del reporte.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleGenerate}>Confirmar envío</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {inner}
        {confirmDialog}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/dashboard/director-deportivo">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Volver
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">Reportes Mensuales</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {inner}
      </div>

      {confirmDialog}
    </div>
  );
}

