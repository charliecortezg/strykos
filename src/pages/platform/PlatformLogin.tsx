import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/brand/Logo';
import { supabase } from '@/integrations/supabase/client';

export default function PlatformLogin() {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = email.trim() !== '' && password !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Authenticate with Supabase
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError('Credenciales incorrectas.');
        return;
      }

      // Step 2: Verify platform admin role
      const { data: platformRole, error: roleError } = await supabase
        .from('platform_roles')
        .select('role')
        .eq('user_id', signInData.user.id)
        .eq('role', 'platform_super_admin')
        .maybeSingle();

      if (roleError) {
        console.error('[PlatformLogin] Role check error:', roleError);
        await supabase.auth.signOut();
        setError('Error al verificar permisos.');
        return;
      }

      if (!platformRole) {
        await supabase.auth.signOut();
        setError('No tienes permisos de Platform Admin.');
        return;
      }

      // Step 3: Redirect to platform dashboard
      navigate('/platform-admin', { replace: true });

    } catch (err) {
      console.error('[PlatformLogin] Unexpected error:', err);
      setError('Error inesperado. Intenta de nuevo.');
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
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="stryk-card p-6 sm:p-8 border-amber-500/20">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-amber-500" />
              </div>
              <h1 className="text-2xl font-display font-semibold text-foreground">
                Platform Admin
              </h1>
              <p className="text-muted-foreground mt-2">
                Acceso exclusivo para administradores de plataforma
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
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
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                size="lg"
                disabled={!isValid || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Acceder
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border">
              <Link 
                to="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block text-center"
              >
                ← Volver al login de academia
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
