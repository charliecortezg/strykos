create table if not exists public.match_video_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  toques int default 0,
  tiros int default 0,
  pases_ok int default 0,
  pases_no int default 0,
  duelos_ok int default 0,
  duelos_no int default 0,
  recuperaciones int default 0,
  centros int default 0,
  pases_profundidad int default 0,
  tiros_primera int default 0,
  analyzed_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(match_id, player_id)
);

alter table public.match_video_stats enable row level security;

create policy "org members can manage video stats"
on public.match_video_stats for all
using (organization_id in (
  select organization_id from public.profiles where id = auth.uid()
))
with check (organization_id in (
  select organization_id from public.profiles where id = auth.uid()
));

create trigger update_match_video_stats_updated_at
before update on public.match_video_stats
for each row execute function public.update_updated_at_column();