import { useState } from 'react';
import { Plus, MoreHorizontal, Power, Edit, Trash2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePlans, PERIODICITY_OPTIONS, type Plan } from '@/hooks/usePlans';
import { CreatePlanModal } from './CreatePlanModal';
import { EditPlanModal } from './EditPlanModal';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function PlansModule() {
  const { plans, isLoading, togglePlanActive, deletePlan, refetch } = usePlans();
  const { toast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);

  const handleToggleActive = async (plan: Plan) => {
    const success = await togglePlanActive(plan.id, !plan.is_active);
    if (success) {
      toast({
        title: plan.is_active ? 'Plan desactivado' : 'Plan activado',
        description: `${plan.name} ha sido ${plan.is_active ? 'desactivado' : 'activado'}.`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingPlan) return;
    
    const success = await deletePlan(deletingPlan.id);
    if (success) {
      toast({
        title: 'Plan eliminado',
        description: `${deletingPlan.name} ha sido eliminado.`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el plan. Puede tener jugadores asociados.',
        variant: 'destructive',
      });
    }
    setDeletingPlan(null);
  };

  const getPeriodicityLabel = (value: string) => {
    return PERIODICITY_OPTIONS.find(p => p.value === value)?.label || value;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price);
  };

  // Calculate stats
  const activePlans = plans.filter(p => p.is_active).length;
  const totalPlans = plans.length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="stryk-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalPlans}</p>
              <p className="text-sm text-muted-foreground">Total planes</p>
            </div>
          </div>
        </div>
        <div className="stryk-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <DollarSign className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activePlans}</p>
              <p className="text-sm text-muted-foreground">Planes activos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold text-foreground">
          Planes de Pago
        </h2>
        <Button onClick={() => setCreateModalOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo plan
        </Button>
      </div>

      {/* Table */}
      <div className="stryk-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay planes registrados.</p>
            <p className="text-sm mt-2">Crea tu primer plan para comenzar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Precio</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">Periodicidad</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.map((plan) => (
                  <tr key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">{plan.name}</span>
                      <p className="text-xs text-muted-foreground md:hidden">
                        {getPeriodicityLabel(plan.periodicity)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {formatPrice(plan.price)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {getPeriodicityLabel(plan.periodicity)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        variant={plan.is_active ? 'default' : 'secondary'} 
                        className={plan.is_active ? 'bg-success text-success-foreground' : ''}
                      >
                        {plan.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingPlan(plan)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(plan)}>
                            <Power className="w-4 h-4 mr-2" />
                            {plan.is_active ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeletingPlan(plan)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreatePlanModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onPlanCreated={refetch}
      />

      <EditPlanModal
        open={!!editingPlan}
        onOpenChange={(open) => !open && setEditingPlan(null)}
        plan={editingPlan}
        onPlanUpdated={refetch}
      />

      <AlertDialog open={!!deletingPlan} onOpenChange={(open) => !open && setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el plan "{deletingPlan?.name}". Los jugadores asociados perderán su plan asignado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
