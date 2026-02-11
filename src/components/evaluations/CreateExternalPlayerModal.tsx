import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AGE_GROUPS, type AgeGroup } from '@/types/assessment';
import { UserPlus } from 'lucide-react';

interface CreateExternalPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { full_name: string; age_group: AgeGroup; parent_email: string; parent_phone?: string }) => Promise<void>;
  isPending: boolean;
}

export function CreateExternalPlayerModal({ open, onOpenChange, onSubmit, isPending }: CreateExternalPlayerModalProps) {
  const [fullName, setFullName] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('8-9');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !parentEmail.trim()) return;
    await onSubmit({
      full_name: fullName.trim(),
      age_group: ageGroup,
      parent_email: parentEmail.trim(),
      parent_phone: parentPhone.trim() || undefined,
    });
    // Reset form
    setFullName('');
    setParentEmail('');
    setParentPhone('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Agregar Jugador (Solo Evaluación)
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre completo *</Label>
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nombre del jugador"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Grupo de edad *</Label>
            <Select value={ageGroup} onValueChange={v => setAgeGroup(v as AgeGroup)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGE_GROUPS.map(ag => (
                  <SelectItem key={ag.value} value={ag.value}>{ag.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Email del padre/tutor *</Label>
            <Input
              type="email"
              value={parentEmail}
              onChange={e => setParentEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono (opcional)</Label>
            <Input
              value={parentPhone}
              onChange={e => setParentPhone(e.target.value)}
              placeholder="+52 ..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !fullName.trim() || !parentEmail.trim()}>
              {isPending ? 'Agregando...' : 'Agregar al evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
