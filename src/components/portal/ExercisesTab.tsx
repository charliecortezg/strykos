import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Lock, Dumbbell, Clock, Search, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { useExerciseLibrary } from '@/hooks/usePortal/useExerciseLibrary';
import { getCategoryConfig, EXERCISE_CATEGORIES, DIFFICULTY_OPTIONS, extractYouTubeId } from '@/hooks/useStrykWay/useExercises';
import type { Exercise } from '@/hooks/useStrykWay/useExercises';
import { usePlayerLastEvaluation } from '@/hooks/usePortal/usePlayerLastEvaluation';
import { ExerciseDetail } from './ExerciseDetail';

interface ExercisesTabProps {
  playerId: string;
  playerName: string;
  initialCategory?: string | null;
  paywallSkillName?: string | null;
  paywallScores?: { current: number; target: number } | null;
}

const STAT_TO_CATEGORIES: Record<string, string[]> = {
  control_conduccion: ['control', 'conduccion'],
  pase_recepcion: ['pase'],
  decision_juego: ['decision'],
  actitud_esfuerzo: ['actitud'],
  disciplina_constancia: ['actitud'],
  autonomia_liderazgo: ['decision'],
};

const AGE_GROUPS = [
  { label: 'U6-U8', min: 4, max: 8 },
  { label: 'U9-U10', min: 9, max: 10 },
  { label: 'U11-U12', min: 11, max: 12 },
  { label: 'U13-U15', min: 13, max: 15 },
  { label: 'U16+', min: 16, max: 99 },
];

const DURATION_FILTERS = [
  { label: 'Todos', min: 0, max: 999 },
  { label: '-5 min', min: 0, max: 5 },
  { label: '5-15 min', min: 5, max: 15 },
  { label: '+15 min', min: 15, max: 999 },
];

export function ExercisesTab({ playerId, playerName, initialCategory, paywallSkillName, paywallScores }: ExercisesTabProps) {
  const { exercises, hasActiveSubscription, isLoading } = useExerciseLibrary();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory || 'todos');
  const [showFilters, setShowFilters] = useState(false);
  const [ageFilter, setAgeFilter] = useState<string>('todos');
  const [durationFilter, setDurationFilter] = useState<string>('Todos');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('todos');
  const [modeFilter, setModeFilter] = useState<string>('todos');

  const { lastEvaluation } = usePlayerLastEvaluation(playerId);

  // Smart recommendations: categories where player scored < 10/20
  const weakCategories = useMemo(() => {
    if (!lastEvaluation?.scores) return [];
    const weak: string[] = [];
    for (const [statKey, score] of Object.entries(lastEvaluation.scores)) {
      if ((score as number) < 10) {
        const cats = STAT_TO_CATEGORIES[statKey];
        if (cats) weak.push(...cats);
      }
    }
    return [...new Set(weak)];
  }, [lastEvaluation]);

  const recommendedExercises = useMemo(() => {
    if (weakCategories.length === 0) return [];
    return exercises.filter(e => weakCategories.includes(e.category)).slice(0, 3);
  }, [exercises, weakCategories]);

  const filteredExercises = useMemo(() => {
    let result = exercises;

    // Search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(s) ||
        (e.description || '').toLowerCase().includes(s) ||
        (e.skill_tags || []).some(t => t.toLowerCase().includes(s))
      );
    }

    // Category
    if (categoryFilter !== 'todos') {
      result = result.filter(e => e.category === categoryFilter);
    }

    // Age
    if (ageFilter !== 'todos') {
      const ag = AGE_GROUPS.find(g => g.label === ageFilter);
      if (ag) result = result.filter(e => e.age_min <= ag.max && e.age_max >= ag.min);
    }

    // Duration
    if (durationFilter !== 'Todos') {
      const df = DURATION_FILTERS.find(f => f.label === durationFilter);
      if (df) result = result.filter(e => e.duration_minutes && e.duration_minutes >= df.min && e.duration_minutes <= df.max);
    }

    // Difficulty
    if (difficultyFilter !== 'todos') {
      result = result.filter(e => e.difficulty === difficultyFilter);
    }

    // Mode
    if (modeFilter !== 'todos') {
      const pr = modeFilter === 'partner';
      result = result.filter(e => e.partner_required === pr);
    }

    return result;
  }, [exercises, search, categoryFilter, ageFilter, durationFilter, difficultyFilter, modeFilter]);

  if (isLoading) return <div className="h-40 bg-muted animate-pulse rounded-lg" />;

  // Exercise Detail View
  if (selectedExercise) {
    return <ExerciseDetail exercise={selectedExercise} onBack={() => setSelectedExercise(null)} />;
  }

  // PAYWALL
  if (!hasActiveSubscription) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
            <Dumbbell className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">
            {paywallSkillName ? `Practica ${paywallSkillName} en casa` : 'Banco de Ejercicios IDP'}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {paywallScores
              ? `Ejercicios específicos para que ${playerName} mejore del ${paywallScores.current} al ${paywallScores.target} trabajando en casa.`
              : `Ejercicios individuales para practicar en casa, diseñados para apoyar el desarrollo de ${playerName} fuera de los entrenamientos del club.`
            }
          </p>

          <div className="text-left max-w-sm mx-auto space-y-2 py-2">
            {[
              '+50 ejercicios individuales y en pareja',
              'Filtrados por edad y categoría',
              'Videos con explicación paso a paso',
              'Recomendados según el plan IDP de tu jugador',
              'Nuevos ejercicios cada mes',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="py-2">
            <p className="text-2xl font-bold">$99 MXN <span className="text-sm font-normal text-muted-foreground">/ mes</span></p>
            <p className="text-xs text-muted-foreground">Independiente de la mensualidad deportiva</p>
          </div>

          <Button size="lg" className="w-full max-w-sm">Activar Banco de Ejercicios</Button>
        </div>

        {/* Preview cards (blurred) */}
        {exercises.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Vista previa
            </p>
            <div className="grid grid-cols-2 gap-3 relative">
              <div className="absolute inset-0 z-10 bg-background/40 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              {exercises.slice(0, 4).map(ex => (
                <ExerciseCard key={ex.id} exercise={ex} onClick={() => {}} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ACTIVE SUBSCRIPTION VIEW
  return (
    <div className="space-y-4">
      {/* Smart Banner */}
      {initialCategory && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <p className="text-sm font-semibold text-primary">
              Ejercicios para mejorar {paywallSkillName || 'esta habilidad'}
            </p>
            <p className="text-xs text-muted-foreground">Filtro aplicado automáticamente</p>
          </CardContent>
        </Card>
      )}

      {!initialCategory && recommendedExercises.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-primary">Recomendados para {playerName}</p>
              <button className="text-xs text-primary" onClick={() => setCategoryFilter('todos')}>Ver todos →</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {recommendedExercises.map(ex => (
                <div key={ex.id} className="min-w-[140px]" onClick={() => setSelectedExercise(ex)}>
                  <MiniExerciseCard exercise={ex} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar ejercicio..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterChip label="Todos" active={categoryFilter === 'todos'} onClick={() => setCategoryFilter('todos')} />
        {EXERCISE_CATEGORIES.map(c => (
          <FilterChip key={c.value} label={c.label} active={categoryFilter === c.value} onClick={() => setCategoryFilter(c.value)} />
        ))}
      </div>

      {/* Secondary Filters */}
      <button className="flex items-center gap-1 text-xs text-muted-foreground" onClick={() => setShowFilters(!showFilters)}>
        Filtros {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {showFilters && (
        <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
          <div>
            <p className="text-xs font-medium mb-1.5">Edad</p>
            <div className="flex gap-1.5 flex-wrap">
              <FilterChip label="Todos" active={ageFilter === 'todos'} onClick={() => setAgeFilter('todos')} />
              {AGE_GROUPS.map(g => (
                <FilterChip key={g.label} label={g.label} active={ageFilter === g.label} onClick={() => setAgeFilter(g.label)} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium mb-1.5">Duración</p>
            <div className="flex gap-1.5 flex-wrap">
              {DURATION_FILTERS.map(f => (
                <FilterChip key={f.label} label={f.label} active={durationFilter === f.label} onClick={() => setDurationFilter(f.label)} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium mb-1.5">Dificultad</p>
            <div className="flex gap-1.5 flex-wrap">
              <FilterChip label="Todos" active={difficultyFilter === 'todos'} onClick={() => setDifficultyFilter('todos')} />
              {DIFFICULTY_OPTIONS.map(d => (
                <FilterChip key={d.value} label={`${d.emoji} ${d.label}`} active={difficultyFilter === d.value} onClick={() => setDifficultyFilter(d.value)} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium mb-1.5">Modalidad</p>
            <div className="flex gap-1.5 flex-wrap">
              <FilterChip label="Todos" active={modeFilter === 'todos'} onClick={() => setModeFilter('todos')} />
              <FilterChip label="👤 Individual" active={modeFilter === 'individual'} onClick={() => setModeFilter('individual')} />
              <FilterChip label="👥 Con pareja" active={modeFilter === 'partner'} onClick={() => setModeFilter('partner')} />
            </div>
          </div>
        </div>
      )}

      {/* Exercise Grid */}
      {filteredExercises.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No se encontraron ejercicios con estos filtros.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredExercises.map(ex => (
            <ExerciseCard key={ex.id} exercise={ex} onClick={() => setSelectedExercise(ex)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ exercise, onClick }: { exercise: Exercise; onClick: () => void }) {
  const catConfig = getCategoryConfig(exercise.category);
  const diffConfig = DIFFICULTY_OPTIONS.find(d => d.value === exercise.difficulty);
  const youtubeId = exercise.video_source === 'youtube' ? extractYouTubeId(exercise.video_url) : null;
  const thumbnail = exercise.thumbnail_url || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null);

  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${catConfig.color}`}>
            <Dumbbell className="w-8 h-8 opacity-60" />
          </div>
        )}
        <Badge variant="outline" className={`absolute top-1.5 left-1.5 text-[9px] ${catConfig.color}`}>
          {catConfig.label}
        </Badge>
      </div>

      <CardContent className="p-2.5 space-y-1">
        <h4 className="font-medium text-xs line-clamp-2">{exercise.title}</h4>
        <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
          <span>📅 {exercise.age_min}-{exercise.age_max} años</span>
          {exercise.duration_minutes && (
            <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {exercise.duration_minutes} min</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>{exercise.partner_required ? '👥 Pareja' : '👤 Individual'}</span>
          {diffConfig && <span>{diffConfig.emoji}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniExerciseCard({ exercise }: { exercise: Exercise }) {
  const catConfig = getCategoryConfig(exercise.category);
  const youtubeId = exercise.video_source === 'youtube' ? extractYouTubeId(exercise.video_url) : null;
  const thumbnail = exercise.thumbnail_url || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null);

  return (
    <div className="rounded-lg overflow-hidden border bg-card cursor-pointer hover:shadow-sm transition-shadow">
      <div className="aspect-video bg-muted">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${catConfig.color}`}>
            <Dumbbell className="w-5 h-5 opacity-60" />
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-[11px] font-medium line-clamp-1">{exercise.title}</p>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {label}
    </button>
  );
}
