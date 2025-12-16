import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, Calendar, Users, AlertCircle, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AttendanceRegistration } from './AttendanceRegistration';
import { TrialClassModal } from './TrialClassModal';
import { TrainerCategory } from '@/hooks/useTrainerCategories';
import { useQueryClient } from '@tanstack/react-query';

interface TrainingAttendanceModuleProps {
  categories: TrainerCategory[];
}

export function TrainingAttendanceModule({ categories }: TrainingAttendanceModuleProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showTrialModal, setShowTrialModal] = useState(false);
  const queryClient = useQueryClient();

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const handleTrialSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['training-attendance'] });
  };

  return (
    <div className="space-y-4">
      {/* Header - Compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display font-semibold">
            Asistencia
          </h2>
        </div>
        <Button 
          onClick={() => setShowTrialModal(true)}
          variant="outline"
          className="h-10 gap-2 text-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Clase Muestra</span>
        </Button>
      </div>

      {/* Selection Controls - Optimized for quick selection */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Category - Full width on mobile */}
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Categoría</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-base py-3">
                    <span className="font-medium">{cat.name}</span>
                    {cat.sport?.name && (
                      <span className="ml-2 text-muted-foreground text-sm">
                        {cat.sport.name}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date - Locked to today */}
          <div className="w-full sm:w-44 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Fecha</Label>
            <div className="h-12 flex items-center px-3 bg-muted/50 border border-input rounded-md text-base">
              {format(new Date(selectedDate), "dd/MM/yyyy")}
            </div>
          </div>
        </div>

        {/* Context Info */}
        {selectedCategory && (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline" className="text-xs">
              {selectedCategory.sport?.name || 'Sin deporte'}
            </Badge>
            {selectedCategory.venue?.name && (
              <Badge variant="secondary" className="text-xs">
                {selectedCategory.venue.name}
              </Badge>
            )}
            <span className="text-muted-foreground text-xs">
              {format(new Date(selectedDate), "EEEE d 'de' MMMM", { locale: es })}
            </span>
          </div>
        )}
      </Card>

      {/* Attendance Registration */}
      {selectedCategoryId ? (
        <AttendanceRegistration
          categoryId={selectedCategoryId}
          date={selectedDate}
        />
      ) : (
        <Card className="p-8 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            Selecciona una categoría
          </p>
        </Card>
      )}

      {/* Trial Class Modal */}
      <TrialClassModal
        open={showTrialModal}
        onOpenChange={setShowTrialModal}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        selectedDate={selectedDate}
        onSuccess={handleTrialSuccess}
      />
    </div>
  );
}
