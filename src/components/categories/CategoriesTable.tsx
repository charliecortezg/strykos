import { useState } from 'react';
import { Plus, MoreHorizontal, Power, Edit, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCategories } from '@/hooks/useCategories';
import { CreateCategoryModal } from './CreateCategoryModal';
import { EditCategoryModal } from './EditCategoryModal';
import { DAYS_OF_WEEK, type Category } from '@/types/categories';
import { useToast } from '@/hooks/use-toast';
import { formatTimeRange12h } from '@/lib/time-utils';

export function CategoriesTable() {
  const { categories, isLoading, toggleCategoryActive, refetch } = useCategories();
  const { toast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleToggleActive = async (category: Category) => {
    const success = await toggleCategoryActive(category.id, !category.is_active);
    if (success) {
      toast({
        title: category.is_active ? 'Categoría desactivada' : 'Categoría activada',
        description: `${category.name} ha sido ${category.is_active ? 'desactivada' : 'activada'}.`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado.',
        variant: 'destructive',
      });
    }
  };

  const formatDays = (days: string[]) => {
    if (!days || days.length === 0) return '—';
    return days
      .map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.label || d)
      .join(', ');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold text-foreground">
          Categorías
        </h2>
        <Button onClick={() => setCreateModalOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nueva categoría
        </Button>
      </div>

      <div className="stryk-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay categorías registradas.</p>
            <p className="text-sm mt-2">Crea tu primera categoría para comenzar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">Deporte</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">Sede</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">Horario</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">Días</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden xl:table-cell">Entrenador</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.map((category) => (
                  <tr key={category.id} className={!category.is_active ? 'opacity-60' : ''}>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">{category.name}</span>
                      <p className="text-xs text-muted-foreground md:hidden">
                        {category.sport?.name || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {category.sport?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                      {category.venue?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {formatTimeRange12h(category.start_time, category.end_time)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                      {formatDays(category.days_of_week)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell">
                      {category.trainer?.full_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={category.is_active ? 'default' : 'secondary'} className={category.is_active ? 'bg-success text-success-foreground' : ''}>
                        {category.is_active ? 'Activa' : 'Inactiva'}
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
                          <DropdownMenuItem onClick={() => setEditingCategory(category)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(category)}>
                            <Power className="w-4 h-4 mr-2" />
                            {category.is_active ? 'Desactivar' : 'Activar'}
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

      <CreateCategoryModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCategoryCreated={refetch}
      />

      <EditCategoryModal
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
        category={editingCategory}
        onCategoryUpdated={refetch}
      />
    </div>
  );
}
