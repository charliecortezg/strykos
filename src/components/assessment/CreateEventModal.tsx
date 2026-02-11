import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEvaluationEvents } from '@/hooks/useEvaluationEvents';

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEventModal({ open, onOpenChange }: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const { createEvent } = useEvaluationEvents();

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await createEvent.mutateAsync({ title: title.trim(), eventDate: eventDate || undefined });
    setTitle('');
    setEventDate('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Evento de Evaluación</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Título del evento</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Lion Assessment Day – Mar 2026"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha (opcional)</Label>
            <Input
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createEvent.isPending}>
            {createEvent.isPending ? 'Creando...' : 'Crear Evento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
