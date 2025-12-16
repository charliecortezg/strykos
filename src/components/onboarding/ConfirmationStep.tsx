import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  Check, 
  CalendarCheck, 
  Eye, 
  Users, 
  TrendingUp,
  ArrowRight
} from 'lucide-react';

interface ConfirmationStepProps {
  onComplete: () => void;
  categoriesCreated: number;
  playersCreated: number;
}

const capabilities = [
  {
    icon: CalendarCheck,
    title: 'Registrar asistencia',
    description: 'En cada entrenamiento, marca asistencia en segundos',
  },
  {
    icon: Eye,
    title: 'Ver operación diaria',
    description: 'Dashboard con métricas reales de tu academia',
  },
  {
    icon: Users,
    title: 'Delegar roles',
    description: 'Invita entrenadores y staff cuando estés listo',
  },
  {
    icon: TrendingUp,
    title: 'Crecer con orden',
    description: 'Escala tu academia sin perder el control',
  },
];

export function ConfirmationStep({ onComplete, categoriesCreated, playersCreated }: ConfirmationStepProps) {
  const { organization } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center min-h-[70vh] px-4"
    >
      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-6">
        <Check className="w-8 h-8 text-success" />
      </div>

      <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
        ¡{organization?.name} está lista!
      </h2>
      
      <p className="text-muted-foreground text-center max-w-md mb-4">
        Tu academia ya tiene lo necesario para comenzar a operar con STRYK.
      </p>

      <div className="flex gap-4 mb-8">
        <div className="bg-muted/50 border border-border rounded-lg px-4 py-2 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{categoriesCreated}</p>
          <p className="text-xs text-muted-foreground">Categoría{categoriesCreated > 1 ? 's' : ''}</p>
        </div>
        <div className="bg-muted/50 border border-border rounded-lg px-4 py-2 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{playersCreated}</p>
          <p className="text-xs text-muted-foreground">Jugador{playersCreated > 1 ? 'es' : ''}</p>
        </div>
      </div>

      <div className="w-full max-w-lg mb-8">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4 text-center">
          Ahora puedes:
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {capabilities.map((cap) => {
            const IconComponent = cap.icon;
            return (
              <div 
                key={cap.title}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <IconComponent className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{cap.title}</p>
                    <p className="text-xs text-muted-foreground">{cap.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Button size="lg" onClick={onComplete} className="px-8">
        Entrar al sistema
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>
  );
}
