import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, Calendar, Users, Save, History, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttendanceRegistration } from './AttendanceRegistration';
import { AttendanceHistory } from './AttendanceHistory';
import { TrainerCategory } from '@/hooks/useTrainerCategories';

interface TrainingAttendanceModuleProps {
  categories: TrainerCategory[];
}

export function TrainingAttendanceModule({ categories }: TrainingAttendanceModuleProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState('registro');

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-display font-semibold text-foreground">
              Registro de Asistencia
            </h2>
          </div>
          <p className="text-muted-foreground">
            Registra la asistencia de tus entrenamientos de forma rápida
          </p>
        </div>
      </div>

      {/* Selection Controls */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Categoría
            </Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
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
            />
          </div>
        </div>

        {selectedCategory && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">{selectedCategory.sport?.name || 'Sin deporte'}</Badge>
              {selectedCategory.venue?.name && (
                <Badge variant="secondary">{selectedCategory.venue.name}</Badge>
              )}
              <span className="text-muted-foreground">
                {format(new Date(selectedDate), "EEEE d 'de' MMMM, yyyy", { locale: es })}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Tabs for Registration and History */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="registro" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Registro
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <History className="w-4 h-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registro">
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
        </TabsContent>

        <TabsContent value="historial">
          {selectedCategoryId ? (
            <AttendanceHistory categoryId={selectedCategoryId} />
          ) : (
            <Card className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Selecciona una categoría para ver el historial
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
