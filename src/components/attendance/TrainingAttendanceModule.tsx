import { useState } from 'react';
import { CheckCircle, AlertCircle, UserPlus, CalendarIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AttendanceRegistration } from './AttendanceRegistration';
import { TrialClassModal } from './TrialClassModal';
import { TrainerCategory } from '@/hooks/useTrainerCategories';
import { useQueryClient } from '@tanstack/react-query';
import { getLocalToday, formatLocalDate, parseDateOnly } from '@/lib/time-utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TrainingAttendanceModuleProps {
  categories: TrainerCategory[];
}

/** Local YYYY-MM-DD from a Date, avoiding UTC drift */
function toLocalKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function TrainingAttendanceModule({ categories }: TrainingAttendanceModuleProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
  // Use getLocalToday() for consistent local date handling
  const today = getLocalToday();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const queryClient = useQueryClient();

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const isRetroactive = selectedDate !== today;

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
          type="button"
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

          {/* Date - selectable (today or past), using parseDateOnly to avoid UTC drift */}
          <div className="w-full sm:w-56 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Fecha</Label>
            <div className="flex gap-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'h-12 flex-1 justify-start text-left text-base font-normal',
                      isRetroactive && 'border-primary text-primary'
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
                    {format(parseDateOnly(selectedDate), 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={parseDateOnly(selectedDate)}
                    onSelect={(d) => {
                      if (d) setSelectedDate(toLocalKey(d));
                      setCalendarOpen(false);
                    }}
                    disabled={(d) => d > parseDateOnly(today)}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
              {isRetroactive && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-12 px-3 text-sm"
                  onClick={() => setSelectedDate(today)}
                >
                  Hoy
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Context Info - using formatLocalDate for consistent timezone handling */}
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
            <span className="text-muted-foreground text-xs capitalize">
              {formatLocalDate(selectedDate)}
            </span>
            {isRetroactive && (
              <Badge variant="secondary" className="text-[10px]">
                Registro retroactivo
              </Badge>
            )}
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
