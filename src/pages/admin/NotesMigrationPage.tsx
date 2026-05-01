import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import {
  parseTechnicalNotes,
  matchParsedToRoster,
  type RosterPlayer,
} from '@/lib/notes-migration-parser';

const PRIORITY_RIVALS = ['nido', 'portales', 'xolos', 'inter'];

type Summary = {
  migrated: number;
  notFound: string[];
  matchesProcessed: number;
};

export default function NotesMigrationPage() {
  const navigate = useNavigate();
  const { user, organization, activeRole, status } = useAuth();
  const [running, setRunning] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  // Access guard: org_owner / director_deportivo / administrativo / org owner
  // Wait until activeRole is loaded; do NOT redirect on null/undefined.
  const allowed =
    activeRole === 'org_owner' ||
    activeRole === 'director_deportivo' ||
    activeRole === 'administrativo' ||
    (user && organization && (organization as any).owner_id === user.id);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!organization?.id) return;
    if (activeRole === null || activeRole === undefined) return; // wait
    if (!allowed) {
      navigate('/');
      return;
    }
    if (ranRef.current) return;
    ranRef.current = true;
    runMigration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, organization?.id, activeRole, allowed]);

  const runMigration = async () => {
    setRunning(true);
    setError(null);
    try {
      // 1. Find candidate matches with technical_notes
      const { data: allMatches, error: mErr } = await supabase
        .from('matches')
        .select('id, match_date, rival_name, technical_notes, organization_id')
        .eq('organization_id', organization!.id)
        .not('technical_notes', 'is', null)
        .order('match_date', { ascending: false });
      if (mErr) throw mErr;

      const filtered = (allMatches ?? []).filter(
        (m) => (m.technical_notes ?? '').trim().length > 30
      );

      // Prioritize the 4 known rivals, but also include any other matches with notes.
      const priority = filtered.filter((m) =>
        PRIORITY_RIVALS.some((r) => (m.rival_name ?? '').toLowerCase().includes(r))
      );
      const targets = priority.length > 0 ? priority : filtered;

      // Org-wide active roster (fallback dictionary)
      const { data: orgPlayers } = await supabase
        .from('players')
        .select('id, full_name')
        .eq('organization_id', organization!.id)
        .eq('is_active', true);
      const orgRoster: RosterPlayer[] = (orgPlayers ?? []) as RosterPlayer[];

      let migrated = 0;
      const notFound = new Set<string>();

      for (const match of targets) {
        // Roster of the match
        const { data: mpRows } = await supabase
          .from('match_players')
          .select('player_id, player:players(id, full_name)')
          .eq('match_id', match.id);

        const matchRoster: RosterPlayer[] = ((mpRows ?? []) as any[])
          .map((r) => r.player)
          .filter((p): p is RosterPlayer => !!p);

        const fullRoster: RosterPlayer[] = [
          ...matchRoster,
          ...orgRoster.filter((p) => !matchRoster.some((mr) => mr.id === p.id)),
        ];

        const segments = parseTechnicalNotes(match.technical_notes ?? '', fullRoster);

        for (const seg of segments) {
          // Try match-roster first, then full org roster
          let res = matchParsedToRoster(seg, matchRoster);
          if (res.status !== 'ready') {
            const alt = matchParsedToRoster(seg, fullRoster);
            if (alt.status === 'ready') res = alt;
          }

          if (res.status !== 'ready' || !res.playerId) {
            notFound.add(seg.rawName);
            continue;
          }

          const noteContent = (seg.position
            ? `[Migrado de notas del partido] [${seg.position}] ${seg.note}`
            : `[Migrado de notas del partido] ${seg.note}`).trim();

          // Upsert match_player
          const { data: existing } = await supabase
            .from('match_players')
            .select('id, note')
            .eq('match_id', match.id)
            .eq('player_id', res.playerId)
            .maybeSingle();

          if (existing) {
            const merged = existing.note
              ? `${existing.note}\n---\n${noteContent}`
              : noteContent;
            const { error: uErr } = await supabase
              .from('match_players')
              .update({ note: merged })
              .eq('id', existing.id);
            if (uErr) {
              notFound.add(seg.rawName);
              continue;
            }
          } else {
            const { error: iErr } = await supabase.from('match_players').insert({
              match_id: match.id,
              player_id: res.playerId,
              organization_id: match.organization_id,
              attended: true,
              note: noteContent,
            });
            if (iErr) {
              notFound.add(seg.rawName);
              continue;
            }
          }
          migrated++;
        }
      }

      setSummary({
        migrated,
        notFound: Array.from(notFound),
        matchesProcessed: targets.length,
      });
    } catch (e: any) {
      console.error('[NotesMigration] error', e);
      setError(e.message ?? 'Error desconocido');
    } finally {
      setRunning(false);
    }
  };

  // Loading auth context
  if (status === 'loading' || activeRole === null || activeRole === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-display font-bold">Migración de Notas</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {running ? (
              <>
                <Loader2 className="animate-spin" /> Ejecutando migración de notas...
              </>
            ) : error ? (
              <>
                <AlertTriangle className="text-destructive" /> Error en la migración
              </>
            ) : (
              <>
                <CheckCircle2 className="text-success" /> Migración completada
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {running && (
            <p className="text-sm text-muted-foreground">
              Analizando partidos con notas técnicas y reasignando notas individuales por jugador. No cierres esta ventana.
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {summary && !error && (
            <div className="space-y-3">
              <p className="text-sm">
                ✅ <strong>{summary.migrated}</strong> notas migradas
                {' '}({summary.matchesProcessed} partidos procesados).
              </p>
              {summary.notFound.length > 0 ? (
                <div className="text-sm">
                  ⚠️ <strong>{summary.notFound.length}</strong> jugadores no encontrados:
                  <ul className="list-disc ml-6 mt-1 text-muted-foreground">
                    {summary.notFound.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Todos los jugadores fueron identificados correctamente.</p>
              )}
              <p className="text-xs text-muted-foreground">
                El campo "Notas Técnicas" del partido se mantuvo intacto como respaldo.
              </p>
              <Button onClick={() => navigate('/partidos')}>Ver partidos</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
