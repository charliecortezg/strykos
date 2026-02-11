import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { useExternalPlayers } from '@/hooks/useExternalPlayers';
import { AGE_GROUPS, type AgeGroup } from '@/types/assessment';

interface AddExternalPlayerFormProps {
  eventId: string;
  onPlayerCreated: (playerId: string) => void;
}

export function AddExternalPlayerForm({ eventId, onPlayerCreated }: AddExternalPlayerFormProps) {
  const [fullName, setFullName] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('8-9');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const { createExternalPlayer } = useExternalPlayers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !parentEmail.trim()) return;

    const result = await createExternalPlayer.mutateAsync({
      full_name: fullName.trim(),
      age_group: ageGroup,
      parent_email: parentEmail.trim(),
      parent_phone: parentPhone.trim() || undefined,
    });

    onPlayerCreated(result.id);
    setFullName('');
    setParentEmail('');
    setParentPhone('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-dashed rounded-lg bg-muted/30">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <UserPlus className="h-4 w-4" /> Agregar Jugador Externo
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Nombre completo *</Label>
          <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nombre del jugador" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Grupo de edad *</Label>
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
          <Label className="text-xs">Email del padre/tutor *</Label>
          <Input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} placeholder="email@ejemplo.com" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Teléfono (opcional)</Label>
          <Input value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="+52 ..." />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={createExternalPlayer.isPending || !fullName.trim() || !parentEmail.trim()}>
        {createExternalPlayer.isPending ? 'Agregando...' : 'Agregar al evento'}
      </Button>
    </form>
  );
}
