import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check } from 'lucide-react';
import { useUniformCampaigns } from '@/hooks/useUniforms';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCampaignModal({ open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { createCampaign } = useUniformCampaigns();

  const publicUrl = createdToken
    ? `${window.location.origin}/uniforme/${createdToken}`
    : '';

  const handleCreate = async () => {
    const result = await createCampaign.mutateAsync({
      name,
      deadline: deadline || undefined,
      notes: notes || undefined,
    });
    setCreatedToken(result.public_token);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setName('');
    setDeadline('');
    setNotes('');
    setCreatedToken(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{createdToken ? '¡Campaña creada!' : 'Nueva campaña de uniformes'}</DialogTitle>
        </DialogHeader>

        {createdToken ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Comparte este link con los padres de familia:
            </p>
            <div className="flex gap-2">
              <Input value={publicUrl} readOnly className="text-xs" />
              <Button size="icon" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button onClick={handleClose} className="w-full">Cerrar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Nombre de la campaña</Label>
              <Input
                placeholder="Ej: Uniformes 2025-2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Fecha límite (opcional)</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || createCampaign.isPending}
              className="w-full"
            >
              {createCampaign.isPending ? 'Creando...' : 'Crear campaña'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
