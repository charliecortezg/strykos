
-- Drop old check constraint and add expanded one
ALTER TABLE public.stryk_events DROP CONSTRAINT stryk_events_source_type_check;
ALTER TABLE public.stryk_events ADD CONSTRAINT stryk_events_source_type_check 
  CHECK (source_type = ANY (ARRAY[
    'attendance', 'match', 'manual', 'challenge',
    'evaluation', 'match_performance', 'match_mvp', 'block_progression',
    'idp_started', 'idp_updated', 'idp_accepted', 'idp_session'
  ]));

-- Now insert retroactive data for Carlos Cortez
INSERT INTO stryk_events (organization_id, player_id, source_type, source_id, xp_delta)
VALUES (
  '982f355c-0196-46d3-8da9-3e5e83813dad',
  'c11e045d-6624-4121-8efa-425142fdefc9',
  'evaluation',
  'b6cab1ca-f1de-45d0-90de-a03df7da80a1',
  51
)
ON CONFLICT (organization_id, source_type, source_id, player_id) DO NOTHING;

-- The trigger trg_sync_stryk_event_xp should auto-create player_progress
-- But just in case, also directly set radar + OVR
-- Carlos scores: control_conduccion=8, pase_recepcion=10, decision_juego=13, actitud_esfuerzo=14, disciplina_constancia=4, autonomia_liderazgo=11
INSERT INTO player_progress (organization_id, player_id, xp_total, level, ovr, radar, last_event_at)
VALUES (
  '982f355c-0196-46d3-8da9-3e5e83813dad',
  'c11e045d-6624-4121-8efa-425142fdefc9',
  51,
  1,
  51,
  '{"tecnica": 40, "tactica": 65, "fisica": 50, "mental": 70, "social": 55, "disciplina": 20}'::jsonb,
  now()
)
ON CONFLICT (organization_id, player_id) DO UPDATE SET
  xp_total = GREATEST(player_progress.xp_total, 51),
  ovr = 51,
  radar = '{"tecnica": 40, "tactica": 65, "fisica": 50, "mental": 70, "social": 55, "disciplina": 20}'::jsonb,
  updated_at = now();
