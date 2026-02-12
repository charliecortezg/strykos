

# Plan: Arreglar Navegacion y Agregar Logout en Vista del Jugador

## Problema

Hay dos problemas en la pantalla del jugador:

1. **La flecha de regreso no funciona**: Al hacer clic en la flecha, navega a `/portal`, pero como el tutor solo tiene un jugador vinculado, el `PortalDashboard` lo redirige automaticamente de vuelta a `/portal/jugador/:id`, creando un bucle infinito.

2. **No hay boton de cerrar sesion**: La pantalla del jugador no tiene un boton de "Salir" como si lo tiene el `PortalDashboard`.

## Solucion

### Archivo a modificar: `src/pages/portal/PortalPlayerView.tsx`

**Cambio 1 - Flecha de regreso inteligente:**
- Si el tutor tiene mas de 1 jugador vinculado: la flecha navega a `/portal` (para que pueda seleccionar otro jugador).
- Si el tutor tiene solo 1 jugador: la flecha no se muestra, ya que no hay a donde regresar (el dashboard lo redireccionaria de vuelta).

**Cambio 2 - Agregar boton "Salir" (logout):**
- Agregar un boton de "Salir" en el header, al lado derecho, similar al que ya existe en `PortalDashboard`.
- Al hacer clic, ejecuta `logout()` del contexto y redirige a `/portal/login`.

### Resultado visual del header

```text
Tutor con 1 jugador:
[Sparkles] Axel Fernando Ch...          [Salir]

Tutor con 2+ jugadores:
[<-] [Sparkles] Axel Fernando Ch...     [Salir]
```

## Seccion tecnica

### Cambios especificos en `PortalPlayerView.tsx`

1. Importar `LogOut` de lucide-react y `useNavigate`
2. Obtener `logout` del contexto `usePortalAuth()`
3. Condicionar la flecha de regreso: solo mostrar si `linkedPlayers.length > 1`
4. Agregar boton de logout en el header:

```text
<Button variant="ghost" size="sm" onClick={handleLogout}>
  <LogOut /> Salir
</Button>
```

Donde `handleLogout` llama a `logout()` y `navigate('/portal/login')`.

No se modifican otros archivos. No hay cambios en backend.
