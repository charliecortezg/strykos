import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCheerCampaigns } from '@/hooks/useCheer';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreateCheerCampaignModal({ open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const orgId = profile?.active_organization_id ?? profile?.organization_id ?? undefined;
  const { create } = useCheerCampaigns(orgId);

  const [name, setName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('350');

  function reset() {
    setName('');
    setDeadline('');
    setNotes('');
    setPrice('350');
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('Nombre requerido');
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error('Precio inválido');
      return;
    }
    await create.mutateAsync({
      name: name.trim(),
      deadline: deadline || null,
      notes: notes.trim() || null,
      price_per_item: priceNum,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva campaña de porra</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cname">Nombre</Label>
            <Input
              id="cname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Final estatal Sub-13"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cdate">Fecha límite (opcional)</Label>
              <Input
                id="cdate"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cprice">Precio MXN</Label>
              <Input
                id="cprice"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cnotes">Notas (opcional)</Label>
            <Textarea
              id="cnotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional para los compradores"
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={create.isPending}>
            {create.isPending ? 'Creando...' : 'Crear campaña'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
