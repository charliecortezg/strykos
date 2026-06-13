import { useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AttendanceRegistration } from '@/components/attendance/AttendanceRegistration';
import { useCategories } from '@/hooks/useCategories';
import { getLocalToday, formatLocalDate } from '@/lib/time-utils';

/**
 * Owner-facing attendance editor.
 * Allows selecting ANY date (today or past) to register/edit attendance.
 * Reuses AttendanceRegistration (same component the trainer uses).
 */
export function OwnerAttendanceSection() {
  const { categories } = useCategories();
  const activeCategories = categories.filter((c) => c.is_active);
  const [categoryId, setCategoryId] = useState<string>('');
  // Always start with local today (no UTC drift)
  const [date, setDate] = useState<string>(getLocalToday());

  const today = getLocalToday();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-display font-semibold">Asistencia</h2>
      </div>

      <Card className="p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Categoría</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {activeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-base py-3">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-48 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Fecha</Label>
            <Input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value || today)}
              className="h-12 text-base"
            />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground text-xs capitalize">
            {formatLocalDate(date)}
          </span>
          {date !== today && (
            <Badge variant="secondary" className="text-[10px]">
              Registro retroactivo
            </Badge>
          )}
        </div>
      </Card>

      {categoryId ? (
        <AttendanceRegistration categoryId={categoryId} date={date} />
      ) : (
        <Card className="p-8 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Selecciona una categoría</p>
        </Card>
      )}
    </div>
  );
}
