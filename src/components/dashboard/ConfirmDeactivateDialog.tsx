import { UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDeactivateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string;
    is_active: boolean;
  } | null;
  isLoading: boolean;
  onConfirm: () => void;
}

export function ConfirmDeactivateDialog({
  open,
  onOpenChange,
  user,
  isLoading,
  onConfirm,
}: ConfirmDeactivateDialogProps) {
  const isActivating = !user?.is_active;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isActivating ? (
              <UserCheck className="h-5 w-5 text-success" />
            ) : (
              <UserX className="h-5 w-5 text-destructive" />
            )}
            {isActivating ? 'Activar usuario' : 'Desactivar usuario'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isActivating
              ? `¿Confirmas que deseas activar a ${user?.full_name}? Podrá acceder al sistema nuevamente.`
              : `¿Confirmas que deseas desactivar a ${user?.full_name}? No podrá acceder al sistema hasta que lo reactives.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant={isActivating ? 'default' : 'destructive'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Procesando...
              </>
            ) : isActivating ? (
              'Activar'
            ) : (
              'Desactivar'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
