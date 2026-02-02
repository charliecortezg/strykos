
# Plan Actualizado: STRYK Way Implementation
## Clarificación de Terminología + Modelo Existente

---

## Clarificación Importante

Según lo confirmado:
- **Guardian = Tutor** (son sinónimos, usaremos "tutor" en la UI en español)
- **Player = Jugador** (el atleta/estudiante)
- Ejemplo: Jugador `Said Lopez Cebrero` tiene como Tutor `Satya Cebrero`

El sistema ya tiene:
- Tabla `guardians` con datos del tutor (nombre, email, teléfono, relación)
- Tabla `player_guardians` para vincular tutores con jugadores
- Campo legacy `players.tutor_name` (texto directo)

---

## Cambios al Plan Original

### 1. NO crear `guardian_player_links`
Ya existe `player_guardians` con la misma estructura:
```
player_guardians:
  - id
  - player_id
  - guardian_id
  - is_primary
  - created_at
```

### 2. Terminología UI
En toda la interfaz usar:
- "Tutor" (no "Guardian") 
- "Jugador" (no "Player")
- "Portal de Padres" o "Portal Familiar" (no "Player Portal")

### 3. Autenticación de Tutores
Los tutores (`guardians`) NO son usuarios de Supabase Auth. Necesitan:
- Login especial via código de organización + teléfono + PIN
- O magic link a su email
- Sesión separada del admin (similar a como funciona Platform Admin)

---

## Arquitectura Actualizada

### Modelo de Datos Fase 1 (Ajustado)

```sql
-- 1. FEATURE FLAGS EN ORGANIZATIONS (nuevo)
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS feature_stryk_way_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_portal_familiar_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_studio_pro_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_analytics_enabled boolean NOT NULL DEFAULT false;

-- 2. STRYK PACKS (contenedor de configuración)
CREATE TABLE public.stryk_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Core Pack',
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  published_at timestamptz,
  published_by uuid,
  UNIQUE(organization_id, name, version)
);

-- 3. STRYK RULESETS (reglas de XP, caps, multiplicadores)
CREATE TABLE public.stryk_rulesets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  pack_id uuid NOT NULL REFERENCES stryk_packs(id) ON DELETE CASCADE,
  economy jsonb NOT NULL DEFAULT '{"xp_per_attendance":10,"xp_per_level":100}'::jsonb,
  caps jsonb NOT NULL DEFAULT '{"daily_xp_cap":100,"weekly_xp_cap":500}'::jsonb,
  multipliers jsonb NOT NULL DEFAULT '{"amistoso":1.0,"liga":1.5}'::jsonb,
  ovr_weights jsonb NOT NULL DEFAULT '{"tecnica":0.25,"tactica":0.25,"fisica":0.25,"mental":0.25}'::jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pack_id)
);

-- 4. STRYK BADGES (logros desbloqueables)
CREATE TABLE public.stryk_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  pack_id uuid NOT NULL REFERENCES stryk_packs(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'trophy',
  rarity text DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  criteria jsonb NOT NULL DEFAULT '{"type":"attendance_count","threshold":10}'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, pack_id, key)
);

-- 5. STRYK CHALLENGES (retos temporales)
CREATE TABLE public.stryk_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  pack_id uuid NOT NULL REFERENCES stryk_packs(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  xp_reward integer DEFAULT 50,
  criteria jsonb NOT NULL DEFAULT '{"type":"weekly_attendance","threshold":3}'::jsonb,
  start_at timestamptz,
  end_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, pack_id, key)
);

-- 6. STRYK AUDIT LOGS (trazabilidad)
CREATE TABLE public.stryk_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

### Modelo de Datos Fase 2 (Progress Engine)

```sql
-- 7. STRYK EVENTS (ledger de progreso - inmutable)
CREATE TABLE public.stryk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('attendance','match','manual','challenge')),
  source_id uuid NOT NULL,
  xp_delta integer NOT NULL DEFAULT 0,
  attributes_delta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  -- DEDUPE: Un evento por fuente
  UNIQUE(organization_id, source_type, source_id, player_id)
);

-- 8. PLAYER PROGRESS (estado agregado - mutable)
CREATE TABLE public.player_progress (
  organization_id uuid NOT NULL,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  xp_total integer DEFAULT 0,
  level integer DEFAULT 1,
  streak integer DEFAULT 0,
  ovr integer DEFAULT 50,
  radar jsonb DEFAULT '{"tecnica":50,"tactica":50,"fisica":50,"mental":50}'::jsonb,
  last_event_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY(organization_id, player_id)
);

-- 9. PLAYER BADGES (badges ganados)
CREATE TABLE public.player_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  player_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES stryk_badges(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(player_id, badge_id)
);

-- 10. TUTOR AUTH TOKENS (login de tutores sin ser usuario Supabase)
CREATE TABLE public.tutor_auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  guardian_id uuid NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);
```

---

## Flujo del Portal Familiar (Tutores)

### Opción de Login

```text
┌─────────────────────────────────────────────────┐
│            PORTAL FAMILIAR STRYK                │
├─────────────────────────────────────────────────┤
│                                                 │
│  Código de Academia: [WHITE-LIONS]              │
│                                                 │
│  Teléfono: [6861393993]                         │
│                                                 │
│  [Enviar código de acceso]                      │
│                                                 │
│  ─────────────────────────────────────────────  │
│  Recibirás un código de 6 dígitos por SMS      │
│  o WhatsApp                                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Dashboard del Tutor

```text
┌─────────────────────────────────────────────────┐
│  👋 Hola, Satya                                 │
│  Tus jugadores:                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ [Avatar]  Said Lopez Cebrero              │  │
│  │           Escuelita Fútbol                │  │
│  │           ⭐ Nivel 3 • 280 XP             │  │
│  │           🔥 Racha: 5 días                │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  (Si tiene más hijos, aparecerán aquí)         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Perfil del Jugador (Vista Tutor)

```text
┌─────────────────────────────────────────────────┐
│  ← Said Lopez Cebrero                           │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────┐  ┌─────────────────────┐  │
│  │   PLAYER CARD   │  │      RADAR          │  │
│  │                 │  │     Técnica         │  │
│  │   OVR: 72       │  │    ┌───┐            │  │
│  │                 │  │  Táct│   │Física    │  │
│  │   [Badges]      │  │    └───┘            │  │
│  │   🏅 🎯 ⚽      │  │     Mental          │  │
│  └─────────────────┘  └─────────────────────┘  │
│                                                 │
│  ────────────────────────────────────────────  │
│                                                 │
│  XP: 280 / 300 para Nivel 4                    │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░ 93%                      │
│                                                 │
│  🔥 Racha actual: 5 días                       │
│                                                 │
│  ────────────────────────────────────────────  │
│                                                 │
│  RETOS ACTIVOS                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ 🎯 Asiste 3 veces esta semana             │  │
│  │    Progreso: 2/3  ▓▓▓▓▓▓░░░░ +30 XP       │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ACTIVIDAD RECIENTE                            │
│  • Hoy: Asistencia registrada (+10 XP)         │
│  • Ayer: Partido vs Tigres (+25 XP, 1 gol)     │
│  • Hace 3 días: Badge "Dedicado" desbloqueado  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Rutas Frontend

### Nuevas Rutas a Agregar

```tsx
// En App.tsx

// Portal Familiar (aislado con su propio auth provider)
function PortalFamiliarRoutes() {
  return (
    <PortalAuthProvider>
      <Routes>
        <Route path="login" element={<PortalLogin />} />
        <Route path="" element={
          <PortalAuthGuard>
            <PortalDashboard />
          </PortalAuthGuard>
        } />
        <Route path="jugador/:playerId" element={
          <PortalAuthGuard>
            <PortalPlayerView />
          </PortalAuthGuard>
        } />
      </Routes>
    </PortalAuthProvider>
  );
}

// En AcademyRoutes, agregar:
<Route path="/stryk-way" element={
  <ProtectedRoute allowedRoles={['org_owner', 'director_deportivo']}>
    <FeatureGate feature="stryk_way">
      <StudioPage />
    </FeatureGate>
  </ProtectedRoute>
} />

// Ruta separada para portal
<Route path="/portal/*" element={<PortalFamiliarRoutes />} />
```

---

## Estructura de Archivos

```text
src/
├── components/
│   ├── stryk-way/
│   │   ├── FeatureGate.tsx           # HOC para feature flags
│   │   ├── StudioLayout.tsx          # Layout del studio
│   │   ├── PackActivator.tsx         # Activar STRYK Way
│   │   ├── BadgesList.tsx            # CRUD badges
│   │   ├── BadgeFormModal.tsx        # Form badge
│   │   ├── ChallengesList.tsx        # CRUD retos
│   │   ├── ChallengeFormModal.tsx    # Form reto
│   │   └── StudioPreview.tsx         # Preview player card
│   │
│   └── portal/
│       ├── PortalLayout.tsx          # Layout para tutores
│       ├── PlayerSelector.tsx        # Selector de jugador
│       ├── ProgressCard.tsx          # XP, nivel, streak
│       ├── PlayerCard.tsx            # Card visual con OVR
│       ├── RadarChart.tsx            # Gráfica radar 6 ejes
│       ├── BadgesGrid.tsx            # Grid de badges
│       ├── ChallengesActive.tsx      # Retos activos
│       └── ActivityFeed.tsx          # Últimos eventos
│
├── contexts/
│   └── PortalAuthContext.tsx         # Auth separado tutores
│
├── hooks/
│   ├── useStrykWay/
│   │   ├── useFeatureFlags.ts
│   │   ├── usePacks.ts
│   │   ├── useBadges.ts
│   │   └── useChallenges.ts
│   │
│   └── usePortal/
│       ├── usePlayerProgress.ts
│       ├── usePlayerBadges.ts
│       └── usePlayerActivity.ts
│
├── pages/
│   ├── stryk-way/
│   │   └── StudioPage.tsx
│   │
│   └── portal/
│       ├── PortalLogin.tsx
│       ├── PortalDashboard.tsx
│       └── PortalPlayerView.tsx
│
└── types/
    └── stryk-way.ts
```

---

## RLS Policies (Críticas)

### Para Portal de Tutores

```sql
-- Tutores pueden ver SOLO jugadores vinculados a ellos
CREATE POLICY "Tutores ven sus jugadores"
ON public.player_progress FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM player_guardians pg
    JOIN tutor_auth_tokens tat ON tat.guardian_id = pg.guardian_id
    WHERE pg.player_id = player_progress.player_id
    AND tat.token_hash = current_setting('app.tutor_token', true)
    AND tat.expires_at > now()
  )
);
```

La seguridad es **doble aislamiento**:
1. Por `organization_id` (multi-tenant)
2. Por `guardian_id` via `player_guardians` (aislamiento familiar)

---

## Progress Engine (Trigger)

```sql
-- Cuando se registra asistencia "presente", generar XP
CREATE OR REPLACE FUNCTION process_attendance_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_ruleset record;
  v_xp_delta integer;
  v_daily_xp integer;
  v_daily_cap integer;
BEGIN
  -- Solo procesar status "presente"
  IF NEW.status != 'presente' THEN
    RETURN NEW;
  END IF;

  -- Obtener ruleset publicado
  SELECT rs.economy, rs.caps INTO v_ruleset
  FROM stryk_packs p
  JOIN stryk_rulesets rs ON rs.pack_id = p.id
  WHERE p.organization_id = NEW.organization_id
    AND p.status = 'published'
  LIMIT 1;

  -- Si no hay STRYK Way configurado, salir
  IF v_ruleset IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calcular XP con cap
  v_xp_delta := COALESCE((v_ruleset.economy->>'xp_per_attendance')::int, 10);
  v_daily_cap := COALESCE((v_ruleset.caps->>'daily_xp_cap')::int, 100);

  -- Verificar cap diario
  SELECT COALESCE(SUM(xp_delta), 0) INTO v_daily_xp
  FROM stryk_events
  WHERE organization_id = NEW.organization_id
    AND player_id = NEW.player_id
    AND created_at::date = NEW.date;

  IF v_daily_xp + v_xp_delta > v_daily_cap THEN
    v_xp_delta := GREATEST(0, v_daily_cap - v_daily_xp);
  END IF;

  -- Insertar evento (dedupe via UNIQUE)
  INSERT INTO stryk_events (organization_id, player_id, source_type, source_id, xp_delta, created_by)
  VALUES (NEW.organization_id, NEW.player_id, 'attendance', NEW.id, v_xp_delta, NEW.recorded_by)
  ON CONFLICT DO NOTHING;

  -- Actualizar progreso
  INSERT INTO player_progress (organization_id, player_id, xp_total, level, last_event_at)
  VALUES (NEW.organization_id, NEW.player_id, v_xp_delta, 1, now())
  ON CONFLICT (organization_id, player_id) DO UPDATE SET
    xp_total = player_progress.xp_total + v_xp_delta,
    level = GREATEST(1, (player_progress.xp_total + v_xp_delta) / 100 + 1),
    last_event_at = now(),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_attendance_xp
AFTER INSERT OR UPDATE OF status ON attendance
FOR EACH ROW EXECUTE FUNCTION process_attendance_xp();
```

---

## Orden de Implementación

### Fase 1: Foundation + Studio Básico
1. Migración SQL: Feature flags en `organizations`
2. Migración SQL: Tablas `stryk_packs`, `stryk_rulesets`, `stryk_badges`, `stryk_challenges`
3. RLS policies para admin
4. Edge function: Initialize Core Pack
5. UI: FeatureGate component
6. UI: StudioPage con CRUD badges/retos
7. Agregar menú "STRYK Way" en dashboard (si feature enabled)

### Fase 2: Portal Familiar + Engine
1. Migración SQL: `stryk_events`, `player_progress`, `player_badges`
2. Migración SQL: `tutor_auth_tokens`
3. Trigger: `process_attendance_xp()`
4. Edge function: Tutor login (generar/validar token)
5. Context: PortalAuthContext
6. UI: PortalLogin, PortalDashboard, PortalPlayerView
7. Componentes: RadarChart, ProgressCard, ActivityFeed

### Fase 3: Studio Pro + Analytics
1. UI: Editor de ruleset (economy, caps, weights)
2. UI: Versionado (publish/rollback)
3. Analytics: Queries de adopción
4. UI: Dashboard de analytics

---

## Métricas de Éxito

| Criterio | Validación |
|----------|------------|
| Multi-tenant | Org A no ve datos de Org B |
| Aislamiento familiar | Tutor A no ve hijos de Tutor B |
| Dedupe | Mismo attendance no genera doble XP |
| Caps | Después de 100 XP diarios, no suma más |
| Mobile-first | Todo funciona en viewport 375px |
| Demo-ready | Flujo completo en menos de 2 minutos |

---

## Notas Finales

Este plan:
- ✅ Reutiliza modelo existente (`guardians`, `player_guardians`)
- ✅ Usa terminología correcta (Tutor, Jugador)
- ✅ Mantiene RLS estricto (multi-tenant + aislamiento familiar)
- ✅ No agrega gamificación tipo RPG
- ✅ Deriva XP solo de eventos reales (asistencia, partidos)
- ✅ Es mobile-first

La implementación será incremental por fases, con feature flags para control por organización.
