import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Users, 
  TrendingUp, 
  ClipboardList, 
  MoreHorizontal, 
  Crown,
  Loader2
} from 'lucide-react';
import { useTrainersWithCategories, TrainerWithCategories } from '@/hooks/useTrainersWithCategories';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';
import { TrainerKPIsModal } from './TrainerKPIsModal';
import { TrainerCategoriesModal } from './TrainerCategoriesModal';

interface TrainersModuleProps {
  readOnly?: boolean;
}

export function TrainersModule({ readOnly = false }: TrainersModuleProps) {
  const { trainers, isLoading, refetch } = useTrainersWithCategories();
  const { isEnabled } = useOrgFeatures();
  const showPremiumKpis = isEnabled('trainer_evaluations');
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerWithCategories | null>(null);
  const [kpisModalOpen, setKpisModalOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);

  const handleViewKPIs = (trainer: TrainerWithCategories) => {
    setSelectedTrainer(trainer);
    setKpisModalOpen(true);
  };

  const handleViewCategories = (trainer: TrainerWithCategories) => {
    setSelectedTrainer(trainer);
    setCategoriesModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="stryk-card p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando entrenadores...</p>
      </div>
    );
  }

  if (trainers.length === 0) {
    return (
      <div className="stryk-card p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-display font-semibold text-foreground mb-3">
          Sin entrenadores registrados
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          El Fundador debe crear usuarios con rol de Entrenador para que aparezcan aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-display font-semibold text-foreground">
            Entrenadores
          </h3>
          <Badge variant="secondary">{trainers.length}</Badge>
        </div>
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
          <Crown className="w-3 h-3 mr-1" />
          Evaluación Premium
        </Badge>
      </div>

      {/* Trainers table */}
      <div className="stryk-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Entrenador
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                  Correo
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Categorías
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground w-12">
                  
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trainers.map((trainer) => (
                <tr key={trainer.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {trainer.full_name}
                      </span>
                      <p className="text-xs text-muted-foreground md:hidden">
                        {trainer.email}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                    {trainer.email}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={trainer.categories.length > 0 ? 'default' : 'secondary'}
                        className={trainer.categories.length > 0 ? 'bg-primary text-primary-foreground' : ''}
                      >
                        <ClipboardList className="w-3 h-3 mr-1" />
                        {trainer.categories.length}
                      </Badge>
                      {trainer.categories.length > 0 && (
                        <span className="text-xs text-muted-foreground hidden lg:inline">
                          {trainer.categories.slice(0, 2).map(c => c.name).join(', ')}
                          {trainer.categories.length > 2 && ` +${trainer.categories.length - 2}`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge 
                      variant={trainer.is_active ? 'default' : 'secondary'} 
                      className={trainer.is_active ? 'bg-success text-success-foreground' : ''}
                    >
                      {trainer.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewKPIs(trainer)}>
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Ver KPIs
                          <Crown className="w-3 h-3 ml-auto text-warning" />
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewCategories(trainer)}>
                          <ClipboardList className="w-4 h-4 mr-2" />
                          {readOnly ? 'Ver categorías' : 'Asignar categorías'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <TrainerKPIsModal
        open={kpisModalOpen}
        onOpenChange={setKpisModalOpen}
        trainer={selectedTrainer}
        isPremium={true}
      />
      <TrainerCategoriesModal
        open={categoriesModalOpen}
        onOpenChange={setCategoriesModalOpen}
        trainer={selectedTrainer}
        onUpdate={refetch}
        readOnly={readOnly}
      />
    </div>
  );
}
