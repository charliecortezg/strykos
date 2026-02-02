import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Phone, KeyRound, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { toast } from 'sonner';

export default function PortalLogin() {
  const navigate = useNavigate();
  const { login, isLoading, error } = usePortalAuth();
  
  const [orgCode, setOrgCode] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgCode.trim() || !phone.trim() || !pin.trim()) {
      toast.error('Completa todos los campos');
      return;
    }

    const success = await login(orgCode, phone, pin);
    if (success) {
      toast.success('¡Bienvenido al Portal Familiar!');
      navigate('/portal');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Portal Familiar</h1>
          <p className="text-muted-foreground">
            Accede al progreso de tus jugadores
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>
              Ingresa los datos proporcionados por la academia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Organization Code */}
              <div className="space-y-2">
                <Label htmlFor="orgCode">Código de Academia</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="orgCode"
                    placeholder="ej: white-lions"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value)}
                    className="pl-10"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono registrado</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="10 dígitos"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* PIN */}
              <div className="space-y-2">
                <Label htmlFor="pin">PIN de acceso</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pin"
                    type="password"
                    placeholder="4 dígitos"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="pl-10"
                    maxLength={4}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Por defecto: últimos 4 dígitos de tu teléfono
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Verificando...' : 'Entrar al Portal'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help text */}
        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes acceso? Contacta a tu academia para registrarte.
        </p>
      </div>
    </div>
  );
}
