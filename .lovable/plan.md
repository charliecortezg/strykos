

# Plan: Módulo de Uniformes + Formulario Público

## Resumen

Crear un sistema completo de gestión de pedidos de uniformes con: tablas en base de datos, Edge Function pública, panel admin con 3 tabs, formulario público mobile-first para padres, e importación del PDF adjunto de jugadores activos.

---

## 1. Base de datos (migración SQL)

**Tablas nuevas:**
- `uniform_campaigns` — campañas con `public_token`, `status`, `deadline`
- `uniform_orders` — pedidos con datos del uniforme, número, pago, entrega. UNIQUE en `(org_id, category_id, assigned_number)`
- `uniform_blocked_numbers` — números bloqueados permanentes por categoría

**Columna nueva en `players`:**
- `jersey_number INT` — número de uniforme del jugador activo

**RLS:** Usando `get_current_org_id()` para aislamiento multi-tenant (patrón existente). Políticas adicionales para acceso público anónimo en SELECT de `uniform_campaigns` (por token) y para INSERT en `uniform_orders` (vía Edge Function con service role).

**Trigger:** `update_updated_at_column` en `uniform_orders`.

---

## 2. Edge Function: `uniform-campaign`

Función pública (`verify_jwt = false`), usa `SUPABASE_SERVICE_ROLE_KEY`.

3 endpoints:
- **GET `?token=`** → Devuelve datos de campaña + categorías de la org
- **GET `?token=&action=available-numbers&category_id=`** → Devuelve números ocupados (unión de: permanent blocks + players.jersey_number + blocked_numbers + orders submitted/confirmed)
- **POST `?token=`** → Crea orden con triple validación del número. Calcula precio según tipo.

Constantes hardcoded: `PERMANENT_BLOCKS = [67, 69]`, precios manga_corta=$500, manga_larga=$600.

---

## 3. Panel Admin — Tab "Uniformes" en AdministrativoDashboard

Agregar tab con icono `Shirt` al `AdministrativoDashboard.tsx` existente.

**Componentes nuevos en `src/components/uniforms/`:**

| Componente | Función |
|---|---|
| `UniformsModule.tsx` | Contenedor principal: lista campañas + detalle |
| `CampaignsList.tsx` | Tabla de campañas con KPIs, botón nueva campaña, modal crear |
| `CampaignDetail.tsx` | Vista con 3 sub-tabs: Órdenes, Números, Jugadores Activos |
| `OrdersTab.tsx` | Tabla de órdenes con filtros, checkboxes paid/delivered optimistic, confirmar número, exportar CSV |
| `NumbersGridTab.tsx` | Grid visual 1-99 por categoría con estados coloreados |
| `ActivePlayersTab.tsx` | Tabla de jugadores con número + importador CSV |
| `CreateCampaignModal.tsx` | Modal crear campaña + copiar link |

**Hook:** `src/hooks/useUniforms.ts` — React Query para CRUD de campañas, órdenes, blocked numbers.

---

## 4. Formulario Público — `/uniforme/:token`

**Ruta nueva** en `App.tsx` fuera de `AcademyRoutes` y sin auth.

**Página:** `src/pages/uniforms/UniformOrderPage.tsx`

Diseño dark (#0A0A0A) con acentos dorados (#C9A84C). Sin layout de STRYK. Mobile-first.

**Flujo:**
1. Carga campaña via Edge Function
2. Formulario en secciones: datos jugador → tipo uniforme (cards) → nombre camiseta (uppercase, 12 max) → talla (3 grupos colapsables con medidas) → número (grid táctil 1-99 + validación real-time)
3. Resumen sticky al pie
4. POST → confirmación con datos de pago (Citibanamex)
5. Estados: cargando, activo, cerrado, inválido

---

## 5. Importación del PDF adjunto

El PDF contiene 15 registros de jugadores de campañas pasadas. Al implementar, crearé un seed SQL que:
1. Actualiza `players.jersey_number` haciendo match por nombre + categoría en org `982f355c-...` (White Lions Academies)
2. Inserta en `uniform_blocked_numbers` para bloquear esos números

Datos extraídos del PDF:

| Categoría | Jugador | Número |
|---|---|---|
| Juvenil A | Roberto Franco Gómez Flores | 9 |
| Estrellita | Ian Jesús González flores | 12 |
| Infantil | Luis Mario Vazquez Nieves | 3 |
| Estrellita | Axel Fernando Chico Martinez | 93 |
| Infantil | Alaim Contreras Cota | 9 |
| Infantil | Ian raydel García serena | 19 |
| Infantil | Derek Fernando Salazar Pérez | 8 |
| Infantil | Dylan gutierrez | 10 |
| Juvenil A | Roberto Franco Gómez Flores | 9 (duplicado) |
| Estrellita | Leonardo Espinoza soto | 35 |
| Estrellita | ANDRU MARTINEZ FLORES | 7 |
| Estrellita | Angel Javier Lopez Lopez | 1 |
| Estrellita | Jaziel salvador Rangel cárdenas | 30 |
| Estrellita | Emilio Moisés Mayorga Galindo | 21 |
| Estrellita | Mateo Avila Cervantes | 9 |
| Infantil | Mario elian Valenzuela Hernández | 51 |

---

## 6. Perfil del jugador + Portal de padres

- **PlayerProfileModal**: Mostrar `jersey_number` con badge destacado
- **PlayerCard** (portal padres): Mostrar número de uniforme visible

---

## Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `supabase/migrations/..._uniforms.sql` | Migración: 3 tablas + columna + RLS |
| `supabase/functions/uniform-campaign/index.ts` | Edge Function pública |
| `supabase/config.toml` | Agregar `[functions.uniform-campaign] verify_jwt = false` |
| `src/hooks/useUniforms.ts` | Hook React Query |
| `src/components/uniforms/UniformsModule.tsx` | Módulo principal admin |
| `src/components/uniforms/CampaignsList.tsx` | Lista de campañas |
| `src/components/uniforms/CampaignDetail.tsx` | Detalle campaña 3 tabs |
| `src/components/uniforms/OrdersTab.tsx` | Tab órdenes |
| `src/components/uniforms/NumbersGridTab.tsx` | Grid visual números |
| `src/components/uniforms/ActivePlayersTab.tsx` | Tab jugadores + importador |
| `src/components/uniforms/CreateCampaignModal.tsx` | Modal crear campaña |
| `src/pages/uniforms/UniformOrderPage.tsx` | Formulario público padres |
| `src/pages/dashboard/AdministrativoDashboard.tsx` | Agregar tab Uniformes |
| `src/App.tsx` | Agregar ruta `/uniforme/:token` |
| `src/components/players/PlayerProfileModal.tsx` | Mostrar jersey_number |
| `src/components/portal/PlayerCard.tsx` | Mostrar jersey_number |

---

## Consideraciones técnicas

- RLS usa `get_current_org_id()` para admin, service role para Edge Function pública
- Validación triple del número: frontend (occupied[]), Edge Function (query BD), constraint SQL
- Optimistic updates en checkboxes paid/delivered
- El formulario público es completamente independiente del layout STRYK
- Todos los textos en español

