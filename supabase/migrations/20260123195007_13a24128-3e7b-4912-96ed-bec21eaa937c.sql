-- Iteración 1: DB + Backfill para Semáforo de Rendimiento

-- 1. Crear enum para estados de rendimiento
CREATE TYPE public.attendance_performance_status AS ENUM ('excellent', 'focus', 'challenge');

-- 2. Agregar columna a tabla attendance
ALTER TABLE public.attendance 
ADD COLUMN performance_status public.attendance_performance_status NULL;

-- 3. Backfill: registros históricos con status='presente' → excellent, otros → NULL
UPDATE public.attendance 
SET performance_status = 'excellent'::attendance_performance_status
WHERE status = 'presente' AND performance_status IS NULL;

-- 4. Crear índice para filtros rápidos por performance_status
CREATE INDEX idx_attendance_performance_status 
ON public.attendance (organization_id, date, performance_status) 
WHERE performance_status IS NOT NULL;

-- 5. Comentario para documentación
COMMENT ON COLUMN public.attendance.performance_status IS 'Semáforo de rendimiento: excellent (🟢), focus (🟡), challenge (🔴). NULL cuando ausente/justificado.';