import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  Circle,
  CalendarCheck, 
  UserPlus, 
  Receipt,
  X
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: typeof CalendarCheck;
  isCompleted: boolean;
}

export function OnboardingChecklist() {
  const { organization } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: 'attendance',
      title: 'Registrar tu primera asistencia',
      description: 'Ve al dashboard de Entrenador y marca asistencia',
      icon: CalendarCheck,
      isCompleted: false,
    },
    {
      id: 'player',
      title: 'Agregar más jugadores',
      description: 'Completa tu roster en el módulo de Jugadores',
      icon: UserPlus,
      isCompleted: false,
    },
    {
      id: 'payment',
      title: 'Registrar un pago',
      description: 'Prueba el módulo de Finanzas',
      icon: Receipt,
      isCompleted: false,
    },
  ]);

  useEffect(() => {
    const checkProgress = async () => {
      if (!organization?.id) return;

      // Check attendance
      const { count: attendanceCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id);

      // Check players (more than initial)
      const { count: playersCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      // Check payments
      const { count: paymentsCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id);

      setItems(prev => prev.map(item => {
        if (item.id === 'attendance') {
          return { ...item, isCompleted: (attendanceCount || 0) > 0 };
        }
        if (item.id === 'player') {
          return { ...item, isCompleted: (playersCount || 0) > 2 };
        }
        if (item.id === 'payment') {
          return { ...item, isCompleted: (paymentsCount || 0) > 0 };
        }
        return item;
      }));
    };

    checkProgress();
  }, [organization?.id]);

  const completedCount = items.filter(i => i.isCompleted).length;
  const allCompleted = completedCount === items.length;

  // Hide if all completed or dismissed
  const dismissedKey = `stryk_checklist_dismissed_${organization?.id}`;
  useEffect(() => {
    const dismissed = localStorage.getItem(dismissedKey);
    if (dismissed === 'true') {
      setIsVisible(false);
    }
  }, [dismissedKey]);

  const handleDismiss = () => {
    localStorage.setItem(dismissedKey, 'true');
    setIsVisible(false);
  };

  if (!isVisible || allCompleted) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-card border border-border rounded-lg p-4 mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-semibold text-foreground">
              Primeros pasos
            </h3>
            <p className="text-sm text-muted-foreground">
              {completedCount}/{items.length} completados
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const IconComponent = item.icon;
            return (
              <div 
                key={item.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  item.isCompleted ? 'bg-success/5' : 'hover:bg-muted/50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  item.isCompleted 
                    ? 'bg-success text-success-foreground' 
                    : 'border border-border text-muted-foreground'
                }`}>
                  {item.isCompleted ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Circle className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    item.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
                  }`}>
                    {item.title}
                  </p>
                  {!item.isCompleted && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  )}
                </div>
                <IconComponent className={`w-4 h-4 flex-shrink-0 ${
                  item.isCompleted ? 'text-success' : 'text-muted-foreground'
                }`} />
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
