import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Crown, TrendingUp, Users, Calendar, Target, Swords } from 'lucide-react';
import { useTrainerKPIs } from '@/hooks/useTrainerKPIs';

interface TrainerKPIsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainer: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  isPremium?: boolean;
}

const MONTHS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 3 }, (_, i) => currentYear - i);

export function TrainerKPIsModal({ open, onOpenChange, trainer, isPremium = true, showPremiumBadge = isPremium }: TrainerKPIsModalProps & { showPremiumBadge?: boolean }) {
  const { kpis, isLoading, fetchKPIs } = useTrainerKPIs();
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  useEffect(() => {
    if (open && trainer) {
      const month = selectedMonth === 'all' ? undefined : selectedMonth;
      fetchKPIs(trainer.id, month, selectedYear);
    }
  }, [open, trainer, selectedMonth, selectedYear, fetchKPIs]);

  if (!trainer) return null;

  if (!isPremium) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-warning" />
              Feature Premium
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-warning" />
            </div>
            <h3 className="text-lg font-display font-semibold text-foreground mb-2">
              KPIs de Entrenadores
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Accede a métricas detalladas de desempeño de tus entrenadores con un plan premium.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              KPIs del Entrenador
            </div>
            {showPremiumBadge && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Trainer info */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <p className="font-display font-semibold text-foreground">{trainer.full_name}</p>
          <p className="text-sm text-muted-foreground">{trainer.email}</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el año</SelectItem>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">
            Cargando métricas...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Training KPIs */}
            <div>
              <h4 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Entrenamientos
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-4 bg-background border border-border rounded-lg text-center">
                  <p className="text-2xl font-display font-bold text-primary">{kpis.totalSessions}</p>
                  <p className="text-xs text-muted-foreground">Sesiones impartidas</p>
                </div>
                <div className="p-4 bg-background border border-border rounded-lg text-center">
                  <p className="text-2xl font-display font-bold text-success">{kpis.attendanceRate}%</p>
                  <p className="text-xs text-muted-foreground">Asistencia</p>
                </div>
                <div className="p-4 bg-background border border-border rounded-lg text-center">
                  <p className="text-2xl font-display font-bold text-foreground">{kpis.totalPresent}</p>
                  <p className="text-xs text-muted-foreground">Presentes</p>
                </div>
                <div className="p-4 bg-background border border-border rounded-lg text-center">
                  <p className="text-2xl font-display font-bold text-destructive">{kpis.totalAbsent}</p>
                  <p className="text-xs text-muted-foreground">Ausencias</p>
                </div>
                <div className="p-4 bg-background border border-border rounded-lg text-center">
                  <p className="text-2xl font-display font-bold text-warning">{kpis.totalJustified}</p>
                  <p className="text-xs text-muted-foreground">Justificadas</p>
                </div>
              </div>
            </div>

            {/* Match KPIs - Coming Soon */}
            <div>
              <h4 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Swords className="w-4 h-4 text-primary" />
                Partidos
                <Badge variant="secondary" className="text-xs">Próximamente</Badge>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 bg-muted/30 border border-border rounded-lg text-center">
                  <p className="text-xl font-display font-bold text-muted-foreground">—</p>
                  <p className="text-xs text-muted-foreground">PJ</p>
                </div>
                <div className="p-4 bg-muted/30 border border-border rounded-lg text-center">
                  <p className="text-xl font-display font-bold text-muted-foreground">—</p>
                  <p className="text-xs text-muted-foreground">G / E / P</p>
                </div>
                <div className="p-4 bg-muted/30 border border-border rounded-lg text-center">
                  <p className="text-xl font-display font-bold text-muted-foreground">—</p>
                  <p className="text-xs text-muted-foreground">GF / GC</p>
                </div>
                <div className="p-4 bg-muted/30 border border-border rounded-lg text-center">
                  <p className="text-xl font-display font-bold text-muted-foreground">—%</p>
                  <p className="text-xs text-muted-foreground">Efectividad</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="p-4 bg-muted/30 border border-border rounded-lg text-center">
                  <p className="text-xl font-display font-bold text-muted-foreground">—</p>
                  <p className="text-xs text-muted-foreground">Diferencia de goles</p>
                </div>
                <div className="p-4 bg-muted/30 border border-border rounded-lg text-center">
                  <p className="text-xl font-display font-bold text-muted-foreground">—</p>
                  <p className="text-xs text-muted-foreground">Racha actual</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <p className="font-display font-semibold text-foreground">Resumen de evaluación</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {kpis.totalSessions > 0 
                  ? `${kpis.totalSessions} sesiones registradas con ${kpis.attendanceRate}% de asistencia promedio.`
                  : 'Sin datos de sesiones para el período seleccionado.'
                }
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
