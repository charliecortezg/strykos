import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/brand/Logo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { OrgRole } from '@/types/auth';

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [orgCode, setOrgCode] = useState('');
  const [orgAccessKey, setOrgAccessKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isValid = orgCode.trim() !== '' && orgAccessKey.trim() !== '' && email.trim() !== '' && password !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsLoading(true);

    try {
      // Academy Login - with org validation
      const { data: validationResult, error: validationError } = await supabase.rpc(
        'validate_org_access',
        {
          _org_code: orgCode.trim().toLowerCase(),
          _org_access_key: orgAccessKey.trim().toUpperCase(),
          _user_email: email.trim().toLowerCase(),
        }
      );

      if (validationError) {
        console.error('Validation error:', validationError);
        toast({
          title: 'Error',
          description: 'Error al validar acceso. Verifica tus datos.',
          variant: 'destructive',
        });
        return;
      }

      const validation = validationResult as { 
        valid: boolean; 
        error?: string; 
        role?: OrgRole;
        must_change_password?: boolean;
      };

      if (!validation.valid) {
        let errorMessage = 'Credenciales incorrectas o no perteneces a esta organización.';
        if (validation.error === 'organization_not_found') {
          errorMessage = 'Organización no encontrada. Verifica el Organization ID.';
        } else if (validation.error === 'user_not_in_org') {
          errorMessage = 'No perteneces a esta organización o tu cuenta está inactiva.';
        }
        
        toast({
          title: 'Acceso denegado',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        toast({
          title: 'Error',
          description: 'Contraseña incorrecta.',
          variant: 'destructive',
        });
        return;
      }

      // Determine redirect based on role and onboarding status
      if (validation.must_change_password) {
        navigate('/cambiar-password', { replace: true });
      } else if (validation.role === 'org_owner') {
        // Check onboarding status
        const { data: org } = await supabase
          .from('organizations')
          .select('onboarding_completed')
          .limit(1)
          .maybeSingle();

        if (org && !org.onboarding_completed) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/dashboard/org-owner', { replace: true });
        }
      } else {
        const rolePath = validation.role?.replace('_', '-') || 'org-owner';
        navigate(`/dashboard/${rolePath}`, { replace: true });
      }

    } catch (err) {
      console.error('Login error:', err);
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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/">
            <Logo />
          </Link>
          <Link to="/registro-academia">
            <Button variant="outline" size="sm">
              Crear academia
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="stryk-card p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-semibold text-foreground">
                Iniciar sesión
              </h1>
              <p className="text-muted-foreground mt-2">
                Accede a tu academia deportiva
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-foreground">Organization ID</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="orgCode" className="text-xs text-muted-foreground">
                      Código
                    </Label>
                    <Input
                      id="orgCode"
                      placeholder="white-lions"
                      value={orgCode}
                      onChange={(e) => setOrgCode(e.target.value)}
                      className="lowercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgAccessKey" className="text-xs text-muted-foreground">
                      Clave de acceso
                    </Label>
                    <Input
                      id="orgAccessKey"
                      placeholder="ABC-123"
                      value={orgAccessKey}
                      onChange={(e) => setOrgAccessKey(e.target.value.toUpperCase())}
                      className="uppercase font-mono"
                      maxLength={7}
                    />
                  </div>
                </div>
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
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
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
                <Link 
                  to="/recuperar-password" 
                  className="text-sm text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!isValid || isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Ingresando...
                  </>
                ) : (
                  'Ingresar'
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              ¿No tienes una academia?{' '}
              <Link to="/registro-academia" className="text-primary hover:underline font-medium">
                Créala aquí
              </Link>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
