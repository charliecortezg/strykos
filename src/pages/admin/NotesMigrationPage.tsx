import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, AlertCircle, CheckCircle2, FileSearch, Loader2 } from 'lucide-react';
import {
  parseTechnicalNotes,
  matchParsedToRoster,
  type MatchResult,
  type RosterPlayer,
} from '@/lib/notes-migration-parser';

type MatchRow = {
  id: string;
  match_date: string;
  rival_name: string | null;
  technical_notes: string | null;
  organization_id: string;
};

type RosterRow = {
  player_id: string;
  player: { id: string; full_name: string } | null;
};

const PRESELECT_RIVALS = ['nido', 'portales', 'xolos', 'inter fc'];

export default function NotesMigrationPage() {
  const navigate = useNavigate();
  const { user, organization, activeRole } = useAuth();
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  const [parseResults, setParseResults] = useState<
    Record<string, MatchResult[]>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{
    ok: number;
    manual: number;
    failed: number;
  } | null>(null);

  // Solo permitido para org_owner / director_deportivo
  useEffect(() => {
    if (activeRole && !['org_owner', 'director_deportivo'].includes(activeRole)) {
      toast.error('No tienes acceso a esta herramienta');
      navigate('/');
    }
  }, [activeRole, navigate]);

  const { data: matches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ['migration-matches', organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('id, match_date, rival_name, technical_notes, organization_id')
        .eq('organization_id', organization!.id)
        .not('technical_notes', 'is', null)
        .order('match_date', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as MatchRow[]).filter(
        (m) => (m.technical_notes ?? '').trim().length > 30
      );
    },
  });

  // Preselección automática de los 4 partidos
  useEffect(() => {
    if (!matches.length || selectedMatchIds.size > 0) return;
    const pre = new Set<string>();
    for (const rival of PRESELECT_RIVALS) {
      const found = matches.find((m) =>
        (m.rival_name ?? '').toLowerCase().includes(rival)
      );
      if (found) pre.add(found.id);
    }
    if (pre.size > 0) setSelectedMatchIds(pre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const toggleMatch = (id: string) => {
    setSelectedMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setParseResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const runParse = async () => {
    if (selectedMatchIds.size === 0) {
      toast.error('Selecciona al menos un partido');
      return;
    }
    const out: Record<string, MatchResult[]> = {};
    for (const matchId of selectedMatchIds) {
      const match = matches.find((m) => m.id === matchId);
      if (!match) continue;
      // Roster del partido = match_players + jugadores activos de la org como fallback
      const { data: mpRows } = await supabase
        .from('match_players')
        .select('player_id, player:players(id, full_name)')
        .eq('match_id', matchId);
      const matchRoster: RosterPlayer[] = (mpRows as RosterRow[] | null ?? [])
        .map((r) => r.player)
        .filter((p): p is RosterPlayer => !!p);

      const { data: orgPlayers } = await supabase
        .from('players')
        .select('id, full_name')
        .eq('organization_id', organization!.id)
        .eq('is_active', true);
      const fullRoster: RosterPlayer[] = [
        ...matchRoster,
        ...((orgPlayers ?? []) as RosterPlayer[]).filter(
          (p) => !matchRoster.some((mr) => mr.id === p.id)
        ),
      ];

      const segments = parseTechnicalNotes(match.technical_notes ?? '', fullRoster);
      const matched = segments.map((seg) => {
        // Preferimos buscar primero en el roster del partido (más probable)
        let res = matchParsedToRoster(seg, matchRoster);
        if (res.status !== 'ready') {
          const alt = matchParsedToRoster(seg, fullRoster);
          if (alt.status === 'ready') res = alt;
          else if (alt.candidates.length > res.candidates.length) res = alt;
        }
        return res;
      });
      out[matchId] = matched;
    }
    setParseResults(out);
    toast.success('Parsing completado. Revisa el preview.');
  };

  const updateAssignment = (matchId: string, idx: number, playerId: string) => {
    setParseResults((prev) => {
      const next = { ...prev };
      const arr = [...(next[matchId] ?? [])];
      const r = arr[idx];
      if (!r) return prev;
      arr[idx] = {
        ...r,
        playerId: playerId || null,
        playerFullName: r.candidates.find((c) => c.id === playerId)?.full_name ?? null,
        status: playerId ? 'ready' : 'not_found',
      };
      next[matchId] = arr;
      return next;
    });
  };

  const totals = useMemo(() => {
    let ready = 0,
      review = 0,
      notFound = 0;
    for (const arr of Object.values(parseResults)) {
      for (const r of arr) {
        if (r.status === 'ready') ready++;
        else if (r.status === 'review') review++;
        else notFound++;
      }
    }
    return { ready, review, notFound, total: ready + review + notFound };
  }, [parseResults]);

  const allReady =
    totals.total > 0 && totals.review === 0 && totals.notFound === 0;

  const confirmMigration = async () => {
    if (!allReady) return;
    setSubmitting(true);
    let ok = 0;
    let failed = 0;
    const logEntries: any[] = [];

    for (const [matchId, results] of Object.entries(parseResults)) {
      const match = matches.find((m) => m.id === matchId);
      for (const r of results) {
        if (r.status !== 'ready' || !r.playerId) {
          failed++;
          continue;
        }
        const noteContent = formatNote(r);
        // Verifica si match_player existe
        const { data: existing } = await supabase
          .from('match_players')
          .select('id, note')
          .eq('match_id', matchId)
          .eq('player_id', r.playerId)
          .maybeSingle();

        if (existing) {
          const merged = existing.note
            ? `${existing.note}\n---\n${noteContent}`
            : noteContent;
          const { error } = await supabase
            .from('match_players')
            .update({ note: merged })
            .eq('id', existing.id);
          if (error) {
            failed++;
            continue;
          }
        } else {
          const { error } = await supabase.from('match_players').insert({
            match_id: matchId,
            player_id: r.playerId,
            organization_id: match!.organization_id,
            attended: true,
            note: noteContent,
          });
          if (error) {
            failed++;
            continue;
          }
        }
        ok++;
        logEntries.push({
          match_id: matchId,
          rival: match?.rival_name,
          player_id: r.playerId,
          player_name: r.playerFullName,
          parsed_name: r.parsed.rawName,
          position: r.parsed.position,
        });
      }
    }

    // Log auditoría (best effort, no bloquea)
    try {
      console.info('[NotesMigration] Operación completada', {
        executor: user?.id,
        organization_id: organization?.id,
        timestamp: new Date().toISOString(),
        entries: logEntries,
      });
    } catch (e) {
      console.warn('Audit log warning', e);
    }

    setSubmitting(false);
    setSubmitted({ ok, manual: 0, failed });
    toast.success(`Migración completada: ${ok} notas migradas, ${failed} con error.`);
  };

  if (submitted) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-success" /> Migración completada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              <strong>{submitted.ok}</strong> notas migradas exitosamente.
            </p>
            <p>
              <strong>{submitted.failed}</strong> no se pudieron migrar.
            </p>
            <p className="text-sm text-muted-foreground">
              El campo "Notas Técnicas" del partido se mantuvo intacto como respaldo.
            </p>
            <Button onClick={() => navigate(-1)}>Volver</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">Migración de Notas</h1>
          <p className="text-sm text-muted-foreground">
            Herramienta interna para reclasificar notas técnicas masivas a notas
            individuales por jugador.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="w-5 h-5" /> 1. Selecciona los partidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingMatches && <Loader2 className="animate-spin" />}
          {matches.map((m) => (
            <label
              key={m.id}
              className="flex items-start gap-3 p-3 border border-border rounded-md hover:bg-muted/40 cursor-pointer"
            >
              <Checkbox
                checked={selectedMatchIds.has(m.id)}
                onCheckedChange={() => toggleMatch(m.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {m.rival_name || 'Sin rival'} —{' '}
                  <span className="text-muted-foreground text-sm">
                    {new Date(m.match_date).toLocaleDateString('es-MX')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {m.technical_notes?.slice(0, 200)}
                </div>
              </div>
            </label>
          ))}
          <Button onClick={runParse} disabled={selectedMatchIds.size === 0}>
            Analizar notas seleccionadas
          </Button>
        </CardContent>
      </Card>

      {Object.keys(parseResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Preview de migración</CardTitle>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="bg-success/20 text-success">
                ✅ Listo: {totals.ready}
              </Badge>
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">
                ⚠️ Revisar: {totals.review}
              </Badge>
              <Badge variant="secondary" className="bg-destructive/20 text-destructive">
                ❌ No encontrado: {totals.notFound}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(parseResults).map(([matchId, results]) => {
              const match = matches.find((m) => m.id === matchId);
              return (
                <div key={matchId} className="space-y-2">
                  <h3 className="font-semibold">
                    {match?.rival_name} —{' '}
                    {match && new Date(match.match_date).toLocaleDateString('es-MX')}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-2">Nombre parseado</th>
                          <th className="text-left p-2">Jugador</th>
                          <th className="text-left p-2">Pos.</th>
                          <th className="text-left p-2">Nota</th>
                          <th className="text-left p-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, idx) => (
                          <tr key={idx} className="border-b border-border align-top">
                            <td className="p-2 whitespace-nowrap">{r.parsed.rawName}</td>
                            <td className="p-2">
                              {r.status === 'ready' ? (
                                <span>{r.playerFullName}</span>
                              ) : (
                                <PlayerPicker
                                  candidates={r.candidates}
                                  value={r.playerId ?? ''}
                                  onChange={(pid) => updateAssignment(matchId, idx, pid)}
                                  matchId={matchId}
                                  organizationId={organization!.id}
                                />
                              )}
                            </td>
                            <td className="p-2 text-xs text-muted-foreground">
                              {r.parsed.position ?? '—'}
                            </td>
                            <td className="p-2 max-w-md text-xs">{r.parsed.note}</td>
                            <td className="p-2">
                              <StatusBadge status={r.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-4 border-t border-border">
              {!allReady && (
                <div className="flex items-center gap-2 text-sm text-yellow-700">
                  <AlertCircle className="w-4 h-4" />
                  Resuelve todos los registros antes de confirmar.
                </div>
              )}
              <Button
                onClick={confirmMigration}
                disabled={!allReady || submitting}
                variant="success"
                className="ml-auto"
              >
                {submitting && <Loader2 className="animate-spin" />}
                Confirmar migración ({totals.ready})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: MatchResult['status'] }) {
  if (status === 'ready')
    return <Badge className="bg-success/20 text-success">✅ Listo</Badge>;
  if (status === 'review')
    return (
      <Badge className="bg-yellow-500/20 text-yellow-700">⚠️ Revisar</Badge>
    );
  return <Badge className="bg-destructive/20 text-destructive">❌ No encontrado</Badge>;
}

function formatNote(r: MatchResult): string {
  const pos = r.parsed.position ? ` [${r.parsed.position}]` : '';
  return `[Migrado de notas del partido]${pos} ${r.parsed.note}`.trim();
}

function PlayerPicker({
  candidates,
  value,
  onChange,
  matchId,
  organizationId,
}: {
  candidates: { id: string; full_name: string }[];
  value: string;
  onChange: (id: string) => void;
  matchId: string;
  organizationId: string;
}) {
  // Si no hay candidatos, cargamos roster del partido para que el admin pueda elegir.
  const { data: fallbackRoster = [] } = useQuery({
    queryKey: ['fallback-roster', matchId],
    enabled: candidates.length === 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('players')
        .select('id, full_name')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('full_name');
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });

  const options = candidates.length > 0 ? candidates : fallbackRoster;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-56 text-xs">
        <SelectValue placeholder="Seleccionar jugador..." />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
