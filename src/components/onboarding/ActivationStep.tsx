import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCategories } from '@/hooks/useCategories';
import { usePlayers } from '@/hooks/usePlayers';
import { useSports } from '@/hooks/useSports';
import { useToast } from '@/hooks/use-toast';
import { SmartSportSelector } from '@/components/ui/smart-sport-selector';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Check,
  AlertCircle,
  Layers,
  Users
} from 'lucide-react';

interface ActivationStepProps {
  onNext: () => void;
  onPrev: () => void;
  categoriesCreated: number;
  playersCreated: number;
  onRefetch: () => void;
}

type ActivationPhase = 'categories' | 'players';

export function ActivationStep({ 
  onNext, 
  onPrev, 
  categoriesCreated, 
  playersCreated,
  onRefetch 
}: ActivationStepProps) {
  const [phase, setPhase] = useState<ActivationPhase>('categories');
  const [categoryName, setCategoryName] = useState('');
  const [sportId, setSportId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBlockWarning, setShowBlockWarning] = useState(false);

  const { createCategory } = useCategories();
  const { createPlayer } = usePlayers();
  const { sports, isLoading: loadingSports, createSport } = useSports();
  const { toast } = useToast();

  const canProceedToPlayers = categoriesCreated >= 1;
  const canComplete = categoriesCreated >= 1 && playersCreated >= 1;

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast({
        title: 'Nombre requerido',
        description: 'Ingresa un nombre para la categoría.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const success = await createCategory({
      name: categoryName.trim(),
      sport_id: sportId || undefined,
    });
    setIsSubmitting(false);

    if (success) {
      toast({
        title: 'Categoría creada',
        description: `"${categoryName}" ha sido registrada.`,
      });
      setCategoryName('');
      setSportId('');
      onRefetch();
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo crear la categoría.',
        variant: 'destructive',
      });
    }
  };

  const handleCreatePlayer = async () => {
    if (!playerName.trim()) {
      toast({
        title: 'Nombre requerido',
        description: 'Ingresa el nombre del jugador.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const success = await createPlayer({
      full_name: playerName.trim(),
      phone: playerPhone || undefined,
    });
    setIsSubmitting(false);

    if (success) {
      toast({
        title: 'Jugador registrado',
        description: `"${playerName}" ha sido agregado.`,
      });
      setPlayerName('');
      setPlayerPhone('');
      onRefetch();
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo registrar el jugador.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateSport = async (name: string): Promise<string | null> => {
    const newId = await createSport(name);
    if (newId) {
      toast({
        title: 'Deporte agregado',
        description: `"${name}" ha sido agregado.`,
      });
    }
    return newId;
  };

  const handleTrySkipCategories = () => {
    if (!canProceedToPlayers) {
      setShowBlockWarning(true);
      setTimeout(() => setShowBlockWarning(false), 3000);
    } else {
      setPhase('players');
    }
  };

  const handleTryComplete = () => {
    if (!canComplete) {
      setShowBlockWarning(true);
      setTimeout(() => setShowBlockWarning(false), 3000);
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col min-h-[70vh] px-4">
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
          Activación de tu academia
        </h2>
        <p className="text-muted-foreground">
          Configura lo mínimo necesario para comenzar a operar
        </p>
      </div>

      {/* Progress */}
      <div className="flex justify-center gap-8 mb-8">
        <div className={`flex items-center gap-2 ${phase === 'categories' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            categoriesCreated > 0 ? 'bg-success text-success-foreground' : phase === 'categories' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            {categoriesCreated > 0 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <span className="text-sm font-medium">Categorías</span>
        </div>
        <div className={`flex items-center gap-2 ${phase === 'players' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            playersCreated > 0 ? 'bg-success text-success-foreground' : phase === 'players' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            {playersCreated > 0 ? <Check className="w-4 h-4" /> : '2'}
          </div>
          <span className="text-sm font-medium">Jugadores</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {phase === 'categories' ? (
            <motion.div
              key="categories"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-md"
            >
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">
                      Crear categoría
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Grupos de entrenamiento
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  Una categoría es un grupo de jugadores (ej: Sub-12, Avanzados, Principiantes). 
                  Necesitas al menos una para comenzar.
                </p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="categoryName">Nombre de la categoría *</Label>
                    <Input
                      id="categoryName"
                      placeholder="Ej: Sub-12 Varonil"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label>Deporte (opcional)</Label>
                    <div className="mt-1.5">
                      <SmartSportSelector
                        sports={sports}
                        value={sportId}
                        onChange={setSportId}
                        onCreateSport={handleCreateSport}
                        isLoading={loadingSports}
                        placeholder="Buscar deporte..."
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleCreateCategory} 
                    disabled={isSubmitting || !categoryName.trim()}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Creando...' : 'Crear categoría'}
                  </Button>
                </div>

                {categoriesCreated > 0 && (
                  <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg">
                    <p className="text-sm text-success font-medium flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      {categoriesCreated} categoría{categoriesCreated > 1 ? 's' : ''} creada{categoriesCreated > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="players"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-md"
            >
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">
                      Registrar jugador
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Datos reales, no de prueba
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  STRYK trabaja con datos reales. Registra al menos un jugador 
                  de tu academia para comenzar a operar.
                </p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="playerName">Nombre completo *</Label>
                    <Input
                      id="playerName"
                      placeholder="Ej: Juan Pérez García"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="playerPhone">Teléfono (opcional)</Label>
                    <Input
                      id="playerPhone"
                      placeholder="Ej: 555-123-4567"
                      value={playerPhone}
                      onChange={(e) => setPlayerPhone(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>

                  <Button 
                    onClick={handleCreatePlayer} 
                    disabled={isSubmitting || !playerName.trim()}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Registrando...' : 'Registrar jugador'}
                  </Button>
                </div>

                {playersCreated > 0 && (
                  <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg">
                    <p className="text-sm text-success font-medium flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      {playersCreated} jugador{playersCreated > 1 ? 'es' : ''} registrado{playersCreated > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Block warning */}
      <AnimatePresence>
        {showBlockWarning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-warning text-warning-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {phase === 'categories' 
                ? 'Necesitas crear al menos 1 categoría' 
                : 'Necesitas registrar al menos 1 jugador'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        <Button 
          variant="ghost" 
          onClick={phase === 'categories' ? onPrev : () => setPhase('categories')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {phase === 'categories' ? 'Modelo operativo' : 'Categorías'}
        </Button>

        {phase === 'categories' ? (
          <Button onClick={handleTrySkipCategories}>
            Siguiente: Jugadores
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleTryComplete}>
            Finalizar configuración
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
