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
    // Refresh the attendance list
    queryClient.invalidateQueries({ queryKey: ['training-attendance'] });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with Trial Class Button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-7 h-7 md:w-8 md:h-8 text-primary" />
            <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground">
              Registro de Asistencia
            </h2>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Registra la asistencia de tus entrenamientos
          </p>
        </div>
        
        {/* Trial Class Button - Always visible */}
        <Button 
          onClick={() => setShowTrialModal(true)}
          variant="outline"
          className="h-12 gap-2 border-primary/30 text-primary hover:bg-primary/10 sm:self-start"
        >
          <UserPlus className="w-5 h-5" />
          Clase Muestra
        </Button>
      </div>

      {/* Selection Controls - Mobile optimized */}
      <Card className="p-3 md:p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Categoría
            </Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-base py-3">
                    {cat.name}
                    {cat.sport?.name && (
                      <span className="ml-2 text-muted-foreground">• {cat.sport.name}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha
            </Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="h-12 text-base"
            />
          </div>
        </div>

        {selectedCategory && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">{selectedCategory.sport?.name || 'Sin deporte'}</Badge>
              {selectedCategory.venue?.name && (
                <Badge variant="secondary">{selectedCategory.venue.name}</Badge>
              )}
              <span className="text-muted-foreground">
                {format(new Date(selectedDate), "EEEE d 'de' MMMM", { locale: es })}
              </span>
            </div>
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
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Selecciona una categoría para registrar asistencia
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
