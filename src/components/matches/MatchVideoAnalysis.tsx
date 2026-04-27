import { useState, useRef, useEffect } from 'react';
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
interface Props { matchId: string; organizationId: string; categoryName: string; attendedPlayers: AttendedPlayer[]; }

const ALL_STATS: StatDef[] = [
  { key: 'toques',            label: 'Toques',   short: 'TOQ', icon: '👣' },
  { key: 'tiros',             label: 'Tiros',    short: 'TIR', icon: '⚽' },
  { key: 'pases_ok',          label: 'Pase ✓',  short: 'P✓',  icon: '✅' },
  { key: 'pases_no',          label: 'Pase ✗',  short: 'P✗',  icon: '❌' },
  { key: 'duelos_ok',         label: 'Duelo ✓', short: 'D✓',  icon: '💪' },
  { key: 'duelos_no',         label: 'Duelo ✗', short: 'D✗',  icon: '🤜' },
  { key: 'recuperaciones',    label: 'Recup.',   short: 'REC', icon: '🔄' },
  { key: 'centros',           label: 'Centros',  short: 'CEN', icon: '🎯' },
  { key: 'pases_profundidad', label: 'Prof.',    short: 'PRO', icon: '↗️' },
  { key: 'tiros_primera',     label: '1ª',       short: '1RA', icon: '⚡' },
];

function getActiveStats(categoryName: string): StatDef[] {
  const n = categoryName.toLowerCase();
  if (n.includes('biberón') || n.includes('biberon') || n.includes('escuelita') || n.includes('sub-5') || n.includes('sub-6'))
    return ALL_STATS.slice(0, 4);
  if (n.includes('estrellita') || n.includes('sub-7') || n.includes('sub-8'))
    return ALL_STATS.slice(0, 7);
  if (n.includes('infantil') || n.includes('sub-9') || n.includes('sub-10') || n.includes('sub-11'))
    return ALL_STATS.slice(0, 9);
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

export function MatchVideoAnalysis({ matchId, organizationId, categoryName, attendedPlayers }: Props) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'capture' | 'summary'>('capture');
  const [stats, setStats] = useState<Record<string, PlayerStat>>({});
  const [lastAction, setLastAction] = useState<{ playerId: string; key: StatKey } | null>(null);
  const [flash, setFlash] = useState<{ playerId: string; key: StatKey } | null>(null);
  const initialized = useRef(false);
  const activeStats = getActiveStats(categoryName);

  const { data: existing = [], isLoading } = useQuery({
    queryKey: ['match-video-stats', matchId],
    queryFn: async () => {
      const { data, error } = await supabase.from('match_video_stats' as any).select('*').eq('match_id', matchId);
      if (error) throw error;
      return (data as any[]) ?? [];
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

  const { mutate: saveStats, isPending: saving } = useMutation({
    mutationFn: async () => {
      const rows = Object.values(stats).map(s => ({
        match_id: matchId, organization_id: organizationId, player_id: s.player_id,
        toques: s.toques, tiros: s.tiros, pases_ok: s.pases_ok, pases_no: s.pases_no,
        duelos_ok: s.duelos_ok, duelos_no: s.duelos_no, recuperaciones: s.recuperaciones,
        centros: s.centros, pases_profundidad: s.pases_profundidad, tiros_primera: s.tiros_primera,
      }));
      const { error } = await supabase.from('match_video_stats' as any).upsert(rows, { onConflict: 'match_id,player_id' });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['match-video-stats', matchId] }); toast.success('Análisis guardado'); setView('summary'); },
    onError: () => toast.error('Error al guardar'),
  });

  const increment = (playerId: string, key: StatKey) => {
    setStats(prev => ({ ...prev, [playerId]: { ...prev[playerId], [key]: (prev[playerId]?.[key] ?? 0) + 1 } }));
    setLastAction({ playerId, key });
    setFlash({ playerId, key });
    setTimeout(() => setFlash(null), 250);
  };

  const undo = () => {
    if (!lastAction) return;
    const { playerId, key } = lastAction;
    setStats(prev => ({ ...prev, [playerId]: { ...prev[playerId], [key]: Math.max(0, (prev[playerId]?.[key] ?? 1) - 1) } }));
    setLastAction(null);
  };

  const teamTotal = (key: StatKey) => attendedPlayers.reduce((sum, p) => sum + (stats[p.player_id]?.[key] ?? 0), 0);
  const playerTotal = (pid: string) => activeStats.reduce((sum, s) => sum + (stats[pid]?.[s.key] ?? 0), 0);

  if (isLoading) return <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Cargando...</div>;
  if (attendedPlayers.length === 0) return <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No hay jugadores con asistencia registrada.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #f0f0f0', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{attendedPlayers.length} jugadores · {categoryName}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {view === 'capture' && lastAction && (
            <button onClick={undo} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', fontSize: 12, cursor: 'pointer', color: '#374151' }}>
              ↩ Deshacer
            </button>
          )}
          <button onClick={() => setView(v => v === 'capture' ? 'summary' : 'capture')} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid #3b82f6', color: view === 'summary' ? 'white' : '#3b82f6', background: view === 'summary' ? '#3b82f6' : 'white' }}>
            {view === 'capture' ? 'Ver resumen' : 'Editar'}
          </button>
        </div>
      </div>

      {view === 'capture' ? (
        <>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${90 + activeStats.length * 52}px` }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ position: 'sticky', left: 0, background: '#f9fafb', zIndex: 2, padding: '8px 12px', textAlign: 'left', fontSize: 10, color: '#9ca3af', letterSpacing: '0.08em', fontWeight: 600, minWidth: 90, borderRight: '1px solid #e5e7eb' }}>JUGADOR</th>
                  {activeStats.map(s => (
                    <th key={s.key} style={{ padding: '6px 4px', textAlign: 'center', minWidth: 52 }}>
                      <div style={{ fontSize: 14 }}>{s.icon}</div>
                      <div style={{ fontSize: 9, color: '#9ca3af', letterSpacing: '0.06em', marginTop: 1 }}>{s.short}</div>
                    </th>
                  ))}
                  <th style={{ padding: '6px 8px', textAlign: 'center', borderLeft: '1px solid #e5e7eb', fontSize: 9, color: '#9ca3af', minWidth: 36 }}>TOT</th>
                </tr>
              </thead>
              <tbody>
                {attendedPlayers.map((player, idx) => (
                  <tr key={player.player_id} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ position: 'sticky', left: 0, background: idx % 2 === 0 ? 'white' : '#fafafa', zIndex: 1, padding: '4px 12px', borderRight: '1px solid #e5e7eb', fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                      {player.player?.full_name?.split(' ')[0] ?? '—'}
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>{player.player?.full_name?.split(' ').slice(1).join(' ')}</div>
                    </td>
                    {activeStats.map(s => {
                      const val = stats[player.player_id]?.[s.key] ?? 0;
                      const isFlash = flash?.playerId === player.player_id && flash?.key === s.key;
                      return (
                        <td key={s.key} style={{ padding: '3px 2px', textAlign: 'center' }}>
                          <button onClick={() => increment(player.player_id, s.key)} style={{ width: 44, height: 44, borderRadius: 8, border: isFlash ? '1.5px solid #3b82f6' : val > 0 ? '1px solid #d1d5db' : '1px solid #f3f4f6', background: isFlash ? '#eff6ff' : val > 0 ? '#f9fafb' : 'white', color: val > 0 ? '#111827' : '#d1d5db', fontSize: val >= 10 ? 13 : 16, fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                            {val === 0 ? '·' : val}
                          </button>
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center', borderLeft: '1px solid #e5e7eb', fontSize: 12, fontWeight: 700, color: playerTotal(player.player_id) > 0 ? '#3b82f6' : '#d1d5db', padding: '4px 8px' }}>
                      {playerTotal(player.player_id) || '—'}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#f0f9ff', borderTop: '2px solid #bfdbfe' }}>
                  <td style={{ position: 'sticky', left: 0, background: '#f0f9ff', zIndex: 1, padding: '8px 12px', fontSize: 10, fontWeight: 700, color: '#3b82f6', letterSpacing: '0.08em', borderRight: '1px solid #e5e7eb' }}>EQUIPO</td>
                  {activeStats.map(s => (
                    <td key={s.key} style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: teamTotal(s.key) > 0 ? '#1d4ed8' : '#d1d5db', padding: '8px 2px' }}>
                      {teamTotal(s.key) || '—'}
                    </td>
                  ))}
                  <td style={{ borderLeft: '1px solid #e5e7eb' }} />
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
            <button onClick={() => saveStats()} disabled={saving} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: saving ? '#93c5fd' : '#3b82f6', color: 'white', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Guardando...' : 'Guardar análisis'}
            </button>
          </div>
        </>
      ) : (
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
          <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.1em', marginBottom: 10, fontWeight: 600 }}>POR JUGADOR</div>
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
                    return <span key={s.key} style={{ background: '#f0f9ff', borderRadius: 5, padding: '2px 7px', fontSize: 11, color: '#374151', border: '1px solid #dbeafe', display: 'inline-flex', gap: 3, alignItems: 'center' }}>{s.icon} <strong>{val}</strong></span>;
                  })}
                  {total === 0 && <span style={{ fontSize: 11, color: '#d1d5db' }}>Sin acciones</span>}
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
