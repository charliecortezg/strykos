import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  CalendarCheck, 
  Receipt, 
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

interface OperationalModelStepProps {
  onNext: () => void;
  onPrev: () => void;
}

const cards = [
  {
    id: 'estructura',
    icon: Layers,
    title: 'Estructura',
    subtitle: 'Academia → Categorías → Jugadores',
    description: 'Tu academia se organiza en categorías (grupos). Cada categoría agrupa jugadores por nivel, edad o cualquier criterio que definas.',
    details: [
      'Las categorías son tus grupos de entrenamiento',
      'Cada jugador pertenece a una categoría',
      'Puedes tener tantas categorías como necesites',
    ],
  },
  {
    id: 'operacion',
    icon: CalendarCheck,
    title: 'Operación Diaria',
    subtitle: 'Entrenamientos → Asistencia → Seguimiento',
    description: 'Cada entrenamiento se registra con asistencia en segundos. El sistema construye automáticamente el historial de cada jugador.',
    details: [
      'Registra asistencia con 1-2 toques',
      'El sistema calcula automáticamente las métricas',
      'Visibilidad completa del progreso de cada jugador',
    ],
  },
  {
    id: 'administrativo',
    icon: Receipt,
    title: 'Control Administrativo',
    subtitle: 'Pagos → Estados de cuenta → Reportes',
    description: 'Registra pagos, consulta estados de cuenta por jugador y genera reportes. La administración apoya la operación, no la estorba.',
    details: [
      'Registro rápido de pagos con evidencia',
      'Estado de cuenta individual por jugador',
      'Reportes operativos y financieros',
    ],
  },
  {
    id: 'roles',
    icon: Users,
    title: 'Roles y Delegación',
    subtitle: 'Cada quien ve solo lo que necesita',
    description: 'Tú como fundador tienes control total. Cuando estés listo, puedes delegar funciones a directores, entrenadores y administrativos.',
    details: [
      'Fundador: control total de la academia',
      'Director Deportivo: operación deportiva',
      'Entrenador: asistencia y partidos',
      'Administrativo: pagos y finanzas',
    ],
  },
];

export function OperationalModelStep({ onNext, onPrev }: OperationalModelStepProps) {
  const [activeCard, setActiveCard] = useState(0);

  const nextCard = () => {
    if (activeCard < cards.length - 1) {
      setActiveCard(prev => prev + 1);
    }
  };

  const prevCard = () => {
    if (activeCard > 0) {
      setActiveCard(prev => prev - 1);
    }
  };

  const currentCard = cards[activeCard];
  const IconComponent = currentCard.icon;
  const isLastCard = activeCard === cards.length - 1;

  return (
    <div className="flex flex-col min-h-[70vh] px-4">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
          Cómo funciona STRYK
        </h2>
        <p className="text-muted-foreground">
          Entiende el modelo operativo antes de configurar
        </p>
      </div>

      {/* Progress indicators */}
      <div className="flex justify-center gap-2 mb-6">
        {cards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => setActiveCard(index)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              index === activeCard 
                ? 'bg-primary' 
                : index < activeCard 
                  ? 'bg-primary/50' 
                  : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Card content */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-lg"
          >
            <div className="bg-card border border-border rounded-lg p-6 md:p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground">
                    {currentCard.title}
                  </h3>
                  <p className="text-sm text-primary font-medium">
                    {currentCard.subtitle}
                  </p>
                </div>
              </div>

              <p className="text-muted-foreground mb-6">
                {currentCard.description}
              </p>

              <ul className="space-y-3">
                {currentCard.details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-sm text-foreground">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        <Button 
          variant="ghost" 
          onClick={activeCard === 0 ? onPrev : prevCard}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {activeCard === 0 ? 'Inicio' : 'Anterior'}
        </Button>

        {isLastCard ? (
          <Button onClick={onNext}>
            Comenzar configuración
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button variant="outline" onClick={nextCard}>
            Siguiente
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
