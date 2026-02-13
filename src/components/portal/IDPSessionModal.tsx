import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionNumber: number;
  onConfirm: () => void;
  isPending: boolean;
}

export function IDPSessionModal({ open, onOpenChange, sessionNumber, onConfirm, isPending }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Registrar Sesión
          </DialogTitle>
          <DialogDescription>
            Sesión #{sessionNumber} completada
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Al registrar esta sesión ganarás <strong>+10 XP</strong> y se actualizará tu racha.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
