import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type StatKey =
  | 'toques' | 'tiros' | 'pases_ok' | 'pases_no'
  | 'duelos_ok' | 'duelos_no' | 'recuperaciones'
  | 'centros' | 'pases_profundidad' | 'tiros_primera';

interface StatDef { key: StatKey; label: string; short: string; icon: string; }
interface PlayerStat { player_id: string; toques: number; tiros: number; pases_ok: number; pases_no: number; duelos_ok: number; duelos_no: number; recuperaciones: number; centros: number; pases_profundidad: number; tiros_primera: number; }
interface AttendedPlayer { player_id: string; player?: { full_name: string }; }
interface Props {
  matchId: string;
  organizationId: string;
  categoryName: string;
  attendedPlayers: AttendedPlayer[];
  matchRival?: string;
  matchDate?: string;
}

const ALL_STATS: StatDef[] = [
  { key: 'toques',            label: 'Toques',          short: 'TOQ', icon: '👣' },
  { key: 'tiros',             label: 'Tiros a portería', short: 'TIR', icon: '⚽' },
  { key: 'pases_ok',          label: 'Pase completado', short: 'P✓',  icon: '✅' },
  { key: 'pases_no',          label: 'Pase fallado',    short: 'P✗',  icon: '❌' },
  { key: 'duelos_ok',         label: 'Duelo ganado',    short: 'D✓',  icon: '💪' },
  { key: 'duelos_no',         label: 'Duelo perdido',   short: 'D✗',  icon: '🤜' },
  { key: 'recuperaciones',    label: 'Recuperaciones',  short: 'REC', icon: '🔄' },
  { key: 'centros',           label: 'Centros',         short: 'CEN', icon: '🎯' },
  { key: 'pases_profundidad', label: 'Pase profundo',   short: 'PRO', icon: '↗️' },
  { key: 'tiros_primera',     label: 'Tiro de primera', short: '1RA', icon: '⚡' },
];

function getActiveStats(categoryName: string): StatDef[] {
  const n = categoryName.toLowerCase();
  // Sub-5 only — Biberón
  if (n.includes('biberón') || n.includes('biberon') || n.includes('sub-5'))
    return ALL_STATS.slice(0, 4);
  // Sub-6, Sub-7, Sub-8 — Escuelita y Estrellita
  if (n.includes('escuelita') || n.includes('estrellita') || n.includes('sub-6') || n.includes('sub-7') || n.includes('sub-8'))
    return ALL_STATS.slice(0, 7);
  // Sub-9, Sub-10, Sub-11 — Infantil
  if (n.includes('infantil') || n.includes('sub-9') || n.includes('sub-10') || n.includes('sub-11'))
    return ALL_STATS.slice(0, 9);
  // Sub-12, Sub-13 — Juvenil
  if (n.includes('juvenil') || n.includes('sub-12') || n.includes('sub-13'))
    return ALL_STATS;
  return ALL_STATS.slice(0, 7);
}

function initStats(players: AttendedPlayer[], existing: any[]): Record<string, PlayerStat> {
  const map: Record<string, PlayerStat> = {};
  players.forEach(p => {
    const ex = existing.find(e => e.player_id === p.player_id);
    map[p.player_id] = {
      player_id: p.player_id,
      toques: ex?.toques ?? 0, tiros: ex?.tiros ?? 0,
      pases_ok: ex?.pases_ok ?? 0, pases_no: ex?.pases_no ?? 0,
      duelos_ok: ex?.duelos_ok ?? 0, duelos_no: ex?.duelos_no ?? 0,
      recuperaciones: ex?.recuperaciones ?? 0, centros: ex?.centros ?? 0,
      pases_profundidad: ex?.pases_profundidad ?? 0, tiros_primera: ex?.tiros_primera ?? 0,
    };
  });
  return map;
}

export function MatchVideoAnalysis({ matchId, organizationId, categoryName, attendedPlayers, matchRival, matchDate }: Props) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'capture' | 'summary'>('capture');
  const [stats, setStats] = useState<Record<string, PlayerStat>>({});
  const [actionStack, setActionStack] = useState<{ playerId: string; key: StatKey }[]>([]);
  const [flash, setFlash] = useState<{ playerId: string; key: StatKey } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const initialized = useRef(false);
  const activeStats = getActiveStats(categoryName);

  // ── Fetch existing stats ──────────────────────────────────────────────────
  const { data: existing = [], isLoading } = useQuery({
    queryKey: ['match-video-stats', matchId],
    queryFn: async () => {
      const { data, error } = await supabase.from('match_video_stats').select('*').eq('match_id', matchId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!matchId,
  });

  useEffect(() => {
    if (!initialized.current && attendedPlayers.length > 0) {
      setStats(initStats(attendedPlayers, existing));
      if (existing.length > 0) setView('summary');
      initialized.current = true;
    }
  }, [existing, attendedPlayers]);

  // ── Prevent accidental browser close/refresh when dirty ──────────────────
  useEffect(() => {
    const handle = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [isDirty]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const { mutate: saveStats, isPending: saving } = useMutation({
    mutationFn: async () => {
      const rows = Object.values(stats).map(s => ({
        match_id: matchId, organization_id: organizationId, player_id: s.player_id,
        toques: s.toques, tiros: s.tiros, pases_ok: s.pases_ok, pases_no: s.pases_no,
        duelos_ok: s.duelos_ok, duelos_no: s.duelos_no, recuperaciones: s.recuperaciones,
        centros: s.centros, pases_profundidad: s.pases_profundidad, tiros_primera: s.tiros_primera,
      }));
      const { error } = await supabase.from('match_video_stats').upsert(rows, { onConflict: 'match_id,player_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-video-stats', matchId] });
      setIsDirty(false);
      setActionStack([]);
      toast.success('Análisis guardado correctamente');
      setView('summary');
    },
    onError: () => toast.error('Error al guardar — intenta de nuevo'),
  });

  // ── Increment / Undo ──────────────────────────────────────────────────────
  const increment = (playerId: string, key: StatKey) => {
    setStats(prev => ({ ...prev, [playerId]: { ...prev[playerId], [key]: (prev[playerId]?.[key] ?? 0) + 1 } }));
    setActionStack(prev => [...prev, { playerId, key }]);
    setIsDirty(true);
    setFlash({ playerId, key });
    setTimeout(() => setFlash(null), 250);
  };

  const undo = () => {
    if (actionStack.length === 0) return;
    const last = actionStack[actionStack.length - 1];
    setStats(prev => ({
      ...prev,
      [last.playerId]: { ...prev[last.playerId], [last.key]: Math.max(0, (prev[last.playerId]?.[last.key] ?? 1) - 1) }
    }));
    setActionStack(prev => prev.slice(0, -1));
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const teamTotal = (key: StatKey) => attendedPlayers.reduce((sum, p) => sum + (stats[p.player_id]?.[key] ?? 0), 0);
  const playerTotal = (pid: string) => activeStats.reduce((sum, s) => sum + (stats[pid]?.[s.key] ?? 0), 0);

  // ── Handle view toggle with dirty check ───────────────────────────────────
  const handleViewToggle = () => {
    if (view === 'capture' && isDirty) {
      setShowExitDialog(true);
    } else {
      setView(v => v === 'capture' ? 'summary' : 'capture');
    }
  };

  if (isLoading) return <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Cargando análisis...</div>;
  if (attendedPlayers.length === 0) return <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No hay jugadores con asistencia registrada en este partido.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Exit confirmation dialog ── */}
      {showExitDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 320, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>¿Salir sin guardar?</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Tienes {actionStack.length} acción{actionStack.length !== 1 ? 'es' : ''} sin guardar. Si sales ahora se perderán.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowExitDialog(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                Seguir editando
              </button>
              <button onClick={() => { setShowExitDialog(false); setView('summary'); }} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'white' }}>
                Salir sin guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 2 }}>
          📹 Análisis de Video{matchRival ? ` — vs ${matchRival}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>
            {attendedPlayers.length} jugadores · {categoryName}{matchDate ? ` · ${matchDate}` : ''}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isDirty && (
              <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, background: '#fef3c7', padding: '2px 7px', borderRadius: 20, border: '1px solid #fde68a' }}>
                Sin guardar
              </span>
            )}
            {view === 'capture' && actionStack.length > 0 && (
              <button onClick={undo} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', fontSize: 12, cursor: 'pointer', color: '#374151' }}>
                ↩ Deshacer ({actionStack.length})
              </button>
            )}
            <button onClick={handleViewToggle} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid #3b82f6', color: view === 'summary' ? 'white' : '#3b82f6', background: view === 'summary' ? '#3b82f6' : 'white' }}>
              {view === 'capture' ? 'Ver resumen' : 'Editar'}
            </button>
          </div>
        </div>
      </div>

      {view === 'capture' ? (
        <>
          {/* ── Capture grid ── */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${100 + activeStats.length * 54}px` }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ position: 'sticky', left: 0, background: '#f9fafb', zIndex: 2, padding: '8px 12px', textAlign: 'left', fontSize: 10, color: '#9ca3af', letterSpacing: '0.08em', fontWeight: 600, minWidth: 100, borderRight: '1px solid #e5e7eb' }}>
                    JUGADOR
                  </th>
                  {activeStats.map(s => (
                    <th key={s.key} style={{ padding: '6px 4px', textAlign: 'center', minWidth: 54 }}>
                      <div style={{ fontSize: 14 }}>{s.icon}</div>
                      <div style={{ fontSize: 9, color: '#9ca3af', letterSpacing: '0.06em', marginTop: 1 }}>{s.short}</div>
                    </th>
                  ))}
                  <th style={{ padding: '6px 8px', textAlign: 'center', borderLeft: '1px solid #e5e7eb', minWidth: 44 }}>
                    <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700 }}>Acc.</div>
                    <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 1 }}>totales</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendedPlayers.map((player, idx) => (
                  <tr key={player.player_id} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ position: 'sticky', left: 0, background: idx % 2 === 0 ? 'white' : '#fafafa', zIndex: 1, padding: '4px 12px', borderRight: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{player.player?.full_name?.split(' ')[0] ?? '—'}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{player.player?.full_name?.split(' ').slice(1).join(' ')}</div>
                    </td>
                    {activeStats.map(s => {
                      const val = stats[player.player_id]?.[s.key] ?? 0;
                      const isFlash = flash?.playerId === player.player_id && flash?.key === s.key;
                      return (
                        <td key={s.key} style={{ padding: '3px 2px', textAlign: 'center' }}>
                          <button
                            onClick={() => increment(player.player_id, s.key)}
                            title={s.label}
                            style={{ width: 46, height: 46, borderRadius: 8, border: isFlash ? '1.5px solid #3b82f6' : val > 0 ? '1px solid #d1d5db' : '1px solid #f3f4f6', background: isFlash ? '#eff6ff' : val > 0 ? '#f9fafb' : 'white', color: val > 0 ? '#111827' : '#d1d5db', fontSize: val >= 10 ? 13 : 16, fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                          >
                            {val === 0 ? '·' : val}
                          </button>
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center', borderLeft: '1px solid #e5e7eb', padding: '4px 8px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: playerTotal(player.player_id) > 0 ? '#3b82f6' : '#d1d5db' }}>
                        {playerTotal(player.player_id) || '—'}
                      </div>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#f0f9ff', borderTop: '2px solid #bfdbfe' }}>
                  <td style={{ position: 'sticky', left: 0, background: '#f0f9ff', zIndex: 1, padding: '8px 12px', fontSize: 10, fontWeight: 700, color: '#3b82f6', letterSpacing: '0.08em', borderRight: '1px solid #e5e7eb' }}>
                    EQUIPO
                  </td>
                  {activeStats.map(s => (
                    <td key={s.key} style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: teamTotal(s.key) > 0 ? '#1d4ed8' : '#d1d5db', padding: '8px 2px' }}>
                      {teamTotal(s.key) || '—'}
                    </td>
                  ))}
                  <td style={{ textAlign: 'center', borderLeft: '1px solid #e5e7eb', fontSize: 13, fontWeight: 700, color: '#1d4ed8', padding: '8px' }}>
                    {attendedPlayers.reduce((sum, p) => sum + playerTotal(p.player_id), 0) || '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Save button ── */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
            {isDirty && (
              <div style={{ fontSize: 11, color: '#f59e0b', textAlign: 'center', marginBottom: 8 }}>
                ⚠️ Tienes {actionStack.length} acción{actionStack.length !== 1 ? 'es' : ''} sin guardar
              </div>
            )}
            <button onClick={() => saveStats()} disabled={saving} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: saving ? '#93c5fd' : '#3b82f6', color: 'white', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Guardando...' : 'Guardar análisis'}
            </button>
          </div>
        </>
      ) : (
        /* ── Summary view ── */
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, minHeight: 0 }}>
          <div style={{ background: '#f0f9ff', borderRadius: 12, border: '1px solid #bfdbfe', padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>TOTALES DEL EQUIPO</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {activeStats.map(s => (
                <div key={s.key} style={{ flex: '1 1 68px', background: 'white', borderRadius: 8, padding: '8px 6px', textAlign: 'center', border: '1px solid #dbeafe' }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1d4ed8' }}>{teamTotal(s.key)}</div>
                  <div style={{ fontSize: 8, color: '#9ca3af', letterSpacing: '0.06em' }}>{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
            {(teamTotal('pases_ok') + teamTotal('pases_no')) > 0 && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid #dbeafe', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>Precisión de pase</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8' }}>{Math.round(teamTotal('pases_ok') / (teamTotal('pases_ok') + teamTotal('pases_no')) * 100)}%</span>
              </div>
            )}
            {(teamTotal('duelos_ok') + teamTotal('duelos_no')) > 0 && (
              <div style={{ marginTop: 6, padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid #dbeafe', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>Duelos ganados</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8' }}>{Math.round(teamTotal('duelos_ok') / (teamTotal('duelos_ok') + teamTotal('duelos_no')) * 100)}%</span>
              </div>
            )}
          </div>

          <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.1em', marginBottom: 10, fontWeight: 600 }}>PARTICIPACIÓN POR JUGADOR — acciones totales registradas</div>
          {[...attendedPlayers].sort((a, b) => playerTotal(b.player_id) - playerTotal(a.player_id)).map(player => {
            const total = playerTotal(player.player_id);
            const maxTotal = Math.max(...attendedPlayers.map(p => playerTotal(p.player_id)), 1);
            return (
              <div key={player.player_id} style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{player.player?.full_name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>{total} acc.</span>
                </div>
                <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: '#3b82f6', width: `${(total / maxTotal) * 100}%` }} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {activeStats.map(s => {
                    const val = stats[player.player_id]?.[s.key] ?? 0;
                    if (val === 0) return null;
                    return (
                      <span key={s.key} style={{ background: '#f0f9ff', borderRadius: 5, padding: '2px 8px', fontSize: 11, color: '#374151', border: '1px solid #dbeafe', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        {s.icon} <strong>{val}</strong> <span style={{ color: '#9ca3af', fontSize: 9 }}>{s.short}</span>
                      </span>
                    );
                  })}
                  {total === 0 && <span style={{ fontSize: 11, color: '#d1d5db' }}>Sin acciones registradas</span>}
                </div>
              </div>
            );
          })}
          <button onClick={() => setView('capture')} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #d1d5db', background: 'white', fontSize: 13, color: '#374151', cursor: 'pointer', marginTop: 8 }}>
            Editar análisis
          </button>
        </div>
      )}
    </div>
  );
}
