import { useState } from 'react';
import { UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ORG_ROLE_LABELS, type OrgRole } from '@/types/auth';

interface ChangeRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string;
    role: OrgRole;
  } | null;
  onRoleChanged: () => void;
}

const ASSIGNABLE_ROLES: Exclude<OrgRole, 'org_owner'>[] = ['director_deportivo', 'entrenador', 'administrativo'];

export function ChangeRoleModal({ open, onOpenChange, user, onRoleChanged }: ChangeRoleModalProps) {
  const { toast } = useToast();
  
  const [selectedRole, setSelectedRole] = useState<Exclude<OrgRole, 'org_owner'>>('entrenador');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Error',
          description: 'Sesión expirada. Inicia sesión de nuevo.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('manage-org-user', {
        body: {
          action: 'change_role',
          userId: user.id,
          data: { role: selectedRole },
        },
      });

      if (error) {
        console.error('Change role error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Error al cambiar rol',
          variant: 'destructive',
        });
        return;
      }

      if (data.error) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Rol actualizado',
        description: `${user.full_name} ahora es ${ORG_ROLE_LABELS[selectedRole]}.`,
      });

      onOpenChange(false);
      onRoleChanged();

    } catch (err) {
      console.error('Error:', err);
      toast({
        title: 'Error',
        description: 'Error inesperado. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Cambiar rol
          </DialogTitle>
          <DialogDescription>
            Selecciona el nuevo rol para {user?.full_name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Nuevo rol</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Exclude<OrgRole, 'org_owner'>)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {ASSIGNABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ORG_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Cambiando...
                </>
              ) : (
                'Cambiar rol'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
