import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const { organization } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
    >
      <Logo className="h-12 mb-8" />
      
      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
        Bienvenido a STRYK
      </h1>
      
      <p className="text-lg text-muted-foreground max-w-xl mb-2">
        {organization?.name}, estás a punto de activar tu sistema operativo deportivo.
      </p>
      
      <p className="text-muted-foreground max-w-xl mb-8">
        STRYK no es solo una herramienta de gestión. Es el sistema que ordena, 
        controla y profesionaliza la operación de tu academia desde el primer día.
      </p>

      <div className="bg-muted/50 border border-border rounded-lg p-6 max-w-md mb-8">
        <p className="text-sm text-muted-foreground">
          En los próximos minutos vas a entender cómo funciona STRYK 
          y vas a configurar lo mínimo necesario para comenzar a operar.
        </p>
      </div>

      <Button size="lg" onClick={onNext} className="px-8">
        Entender cómo funciona STRYK
      </Button>
    </motion.div>
  );
}
