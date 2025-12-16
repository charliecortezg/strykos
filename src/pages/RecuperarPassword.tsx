import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, KeyRound, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/brand/Logo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function RecuperarPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // Check if we're in reset mode (came from email link)
  useEffect(() => {
    const handleHashChange = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (accessToken && type === 'recovery') {
        setIsResetMode(true);
        // Set the session with the recovery token
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });
        
        if (error) {
          toast({
            title: 'Error',
            description: 'El enlace ha expirado. Solicita uno nuevo.',
            variant: 'destructive',
          });
          setIsResetMode(false);
        }
      }
    };

    handleHashChange();
  }, [toast]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/recuperar-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Password reset error:', error);
        toast({
          title: 'Error',
          description: 'Error al enviar el correo. Verifica tu email.',
          variant: 'destructive',
        });
        return;
      }

      setEmailSent(true);
      toast({
        title: 'Correo enviado',
        description: 'Revisa tu bandeja de entrada para restablecer tu contraseña.',
      });

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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6 || newPassword !== confirmPassword) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Password update error:', error);
        toast({
          title: 'Error',
          description: 'Error al cambiar la contraseña. Intenta de nuevo.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Contraseña actualizada',
        description: 'Tu contraseña ha sido cambiada correctamente.',
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate('/login');

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

  const isValidReset = newPassword.length >= 6 && newPassword === confirmPassword;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/">
            <Logo />
          </Link>
          <Link to="/login">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al login
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
            {isResetMode ? (
              // Reset password form (after clicking email link)
              <>
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="w-7 h-7 text-primary" />
                  </div>
                  <h1 className="text-2xl font-display font-semibold text-foreground">
                    Nueva contraseña
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Ingresa tu nueva contraseña
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva contraseña</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
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

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-sm text-destructive">Las contraseñas no coinciden</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={!isValidReset || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                        Actualizando...
                      </>
                    ) : (
                      'Cambiar contraseña'
                    )}
                  </Button>
                </form>
              </>
            ) : emailSent ? (
              // Email sent confirmation
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-success" />
                </div>
                <h1 className="text-2xl font-display font-semibold text-foreground">
                  Correo enviado
                </h1>
                <p className="text-muted-foreground mt-2 mb-6">
                  Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue las instrucciones para restablecer tu contraseña.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setEmailSent(false)}
                  className="w-full"
                >
                  Enviar de nuevo
                </Button>
              </div>
            ) : (
              // Request password reset form
              <>
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-primary" />
                  </div>
                  <h1 className="text-2xl font-display font-semibold text-foreground">
                    Recuperar contraseña
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                </div>

                <form onSubmit={handleSendEmail} className="space-y-4">
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

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={!email.trim() || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar enlace'
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
