import { useState } from 'react';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ORG_ROLE_LABELS, type OrgRole } from '@/types/auth';

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Exclude<OrgRole, 'org_owner'>;
  onUserCreated: () => void;
}

export function CreateUserModal({ open, onOpenChange, role, onUserCreated }: CreateUserModalProps) {
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isValid = fullName.trim() !== '' && email.trim() !== '' && password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

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

      const { data, error } = await supabase.functions.invoke('create-org-user', {
        body: {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        },
      });

      if (error) {
        console.error('Create user error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Error al crear usuario',
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

      // Show appropriate message based on invite email status
      if (data.inviteEmailSent) {
        toast({
          title: `${ORG_ROLE_LABELS[role]} creado`,
          description: 'Usuario creado y correo de invitación enviado.',
        });
      } else if (data.inviteEmailError) {
        toast({
          title: `${ORG_ROLE_LABELS[role]} creado`,
          description: `Usuario creado, pero no se pudo enviar el correo: ${data.inviteEmailError}`,
          variant: 'default',
        });
      } else if (data.isExisting) {
        toast({
          title: 'Usuario existente',
          description: 'El usuario ya tenía acceso con este rol.',
        });
      } else {
        toast({
          title: `${ORG_ROLE_LABELS[role]} creado`,
          description: 'Usuario creado. Comparte las credenciales manualmente.',
        });
      }

      // Reset form and close
      setFullName('');
      setEmail('');
      setPassword('');
      onOpenChange(false);
      onUserCreated();

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
            <UserPlus className="h-5 w-5 text-primary" />
            Crear {ORG_ROLE_LABELS[role]}
          </DialogTitle>
          <DialogDescription>
            El usuario deberá cambiar su contraseña en el primer inicio de sesión.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              placeholder="Nombre completo del usuario"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña temporal</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                'Crear usuario'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
