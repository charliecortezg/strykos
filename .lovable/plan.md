## Limpieza de seguridad — usuarios y org de prueba

Antes de borrar nada, esta es la lista exacta encontrada (todos los emails terminan en `@stryk-test.com`, verificado). **Necesito tu confirmación explícita antes de ejecutar.**

### 1. Usuarios a eliminar de `auth.users` + `profiles` (5, no 4)

Encontré un usuario extra que no estaba en tu lista — `test2-owner@stryk-test.com` (huérfano, sin profile ni org). Te confirmo si lo incluyo:


| Email                                            | user_id      | Org actual                  |
| ------------------------------------------------ | ------------ | --------------------------- |
| `wl-test-owner@stryk-test.com` ⚠️                | `b26e1709-…` | White Lions (org_owner)     |
| `demo-test-owner@stryk-test.com`                 | `caf7c42b-…` | Academia Demo (org_owner)   |
| `test2b-owner@stryk-test.com`                    | `816220e1-…` | Academia Test 2 (org_owner) |
| `demo-owner@stryk-test.com`                      | `75be2426-…` | Academia Demo (4 roles)     |
| `test2-owner@stryk-test.com` *(extra, huérfano)* | `3a2ae5b6-…` | — sin profile               |


Tu usuario real `charliecortezg@gmail.com` **NO** está en esta lista. Verificado.

### 2. Filas de `user_org_roles` a eliminar (7)

- demo-owner: 4 roles en Academia Demo (org_owner, director_deportivo, entrenador, administrativo)
- demo-test-owner: 1 en Academia Demo (org_owner)
- test2b-owner: 1 en Academia Test 2 (org_owner)
- **wl-test-owner: 1 en White Lions (org_owner)** ← única fila que se toca de WL

### 3. Organización a eliminar: Academia Test 2 (`aaaaaaaa-…-2222`)

Datos a borrar junto con la org:

- 2 players, 1 payment, 1 category, 1 organization row

### 4. Datos que **NO** se tocan (garantizado)

- White Lions org, sus 75 jugadores, 178 pagos, categorías, etc. — intactos. Solo se quita la fila de role del usuario de prueba.
- Academia Demo (`9ad70018-…`) — se conserva como entorno de pruebas (queda sin usuarios de acceso).
- `charliecortezg@gmail.com` y cualquier email que no termine en `@stryk-test.com` — intocables.

### Ejecución (orden, una vez confirmes)

1. Por cada uno de los 5 user_ids, en este orden, con guard SQL `WHERE email LIKE '%@stryk-test.com'` antes de cada delete:
  - DELETE de `user_org_roles` (vía migration)
  - DELETE de `profiles` (vía migration)
  - DELETE de `auth.users` vía edge function admin (usando `supabase.auth.admin.deleteUser`) — extender `manage-org-user` o crear una función one-shot `cleanup-test-users` con allowlist hardcoded de los 5 emails y verificación `endsWith('@stryk-test.com')`.
2. DELETE en cascada de Academia Test 2: players → payments → categories → organization (en migration, scoped a `organization_id='aaaaaaaa-…-2222'`).
3. Verificación final:
  ```sql
   SELECT count(*) FROM auth.users WHERE email ILIKE '%@stryk-test.com';
   SELECT count(*) FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE u.email ILIKE '%@stryk-test.com';
   SELECT count(*) FROM public.organizations WHERE id='aaaaaaaa-2222-4222-8222-222222222222';
  ```
   Esperado: 0, 0, 0.

### Preguntas antes de ejecutar

1. ¿Incluyo el 5º usuario huérfano `test2-owner@stryk-test.com`? (recomiendo sí)
2. ¿Apruebas el plan completo tal cual? Responde "sí, ejecuta" y procedo.

Sí, ejecuta — incluye el 5º usuario huérfano test2-owner.

&nbsp;

Agrega a la verificación final estas dos consultas de control para

confirmar que White Lions quedó intacto:

&nbsp;

  SELECT count(*) FROM players WHERE organization_id='982f355c-0196-46d3-8da9-3e5e83813dad';

  SELECT count(*) FROM payments WHERE organization_id='982f355c-0196-46d3-8da9-3e5e83813dad';

&nbsp;

Esperado: 75 jugadores y 178 pagos (los mismos de antes). Si esos

números cambiaron, algo salió mal y hay que detenerse.

&nbsp;

También confirma que mi usuario charliecortezg@gmail.com sigue

existiendo en auth.users y conserva su rol en White Lions.