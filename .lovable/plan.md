

# Plan: Reordenar Tabs y Navegacion Secuencial en LoadResultsModal

## Problema

El usuario quiere dos cambios:
1. **Reordenar los tabs**: Asistencia > Stats > Marcador > Notas (en vez de Asistencia > Marcador > Stats > Notas)
2. **Navegacion secuencial**: En vez de solo "Guardar Resultado" al fondo, que el tab de Asistencia tenga un boton "Siguiente" que lleve al tab de Stats, y asi sucesivamente hasta el ultimo tab donde se guarda.

## Cambios en `src/components/matches/LoadResultsModal.tsx`

### 1. Reordenar tabs en el `TabsList`

Nuevo orden:
- Asistencia (attendance)
- Stats (stats)
- Marcador (result)
- Notas (notes)

### 2. Convertir tabs a controlados

Cambiar de `defaultValue` a `value` + `onValueChange` usando un estado `activeTab`. Esto permite navegar programaticamente entre tabs.

### 3. Agregar botones "Siguiente" por tab

Cada tab (excepto el ultimo) tendra un boton "Siguiente" al final de su contenido que avanza al siguiente tab en el orden:

- **Asistencia** -> boton "Siguiente" lleva a **Stats**
- **Stats** -> boton "Siguiente" lleva a **Marcador**
- **Marcador** -> boton "Siguiente" lleva a **Notas**
- **Notas** -> no tiene "Siguiente" (el boton global "Guardar Resultado" esta en el footer)

### 4. Footer se mantiene

El footer con "Cancelar" y "Guardar Resultado" permanece visible en todos los tabs para que el entrenador pueda guardar desde cualquier punto si ya termino.

## Seccion tecnica

### Estado controlado de tabs

```text
const [activeTab, setActiveTab] = useState(defaultTab);

// Tab order for sequential navigation
const TAB_ORDER = ['attendance', 'stats', 'result', 'notes'];

const goToNextTab = () => {
  const currentIdx = TAB_ORDER.indexOf(activeTab);
  if (currentIdx < TAB_ORDER.length - 1) {
    setActiveTab(TAB_ORDER[currentIdx + 1]);
  }
};
```

### Boton "Siguiente" en cada tab

Al final de cada TabsContent (excepto "notes"), agregar:

```text
<Button onClick={goToNextTab} className="w-full h-12 mt-4">
  Siguiente →
</Button>
```

### Solo se modifica un archivo

`src/components/matches/LoadResultsModal.tsx`

