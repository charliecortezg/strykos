import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, User, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Logo } from '@/components/brand/Logo';
import { useToast } from '@/hooks/use-toast';
import { useSports } from '@/hooks/useSports';
import { supabase } from '@/integrations/supabase/client';
import { ORGANIZATION_TYPES, type OrganizationType } from '@/types/auth';

interface RegistrationResult {
  organization: {
    name: string;
    orgCode: string;
    orgAccessKey: string;
  };
}

export default function RegistroAcademia() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sports, isLoading: sportsLoading } = useSports();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Step 1 - Academy data
  const [academyName, setAcademyName] = useState('');
  const [organizationType, setOrganizationType] = useState<OrganizationType | ''>('');
  const [approximateStudents, setApproximateStudents] = useState('');
  const [primarySport, setPrimarySport] = useState('');
  const [customSport, setCustomSport] = useState('');
  const [sportPopoverOpen, setSportPopoverOpen] = useState(false);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  
  // Step 2 - Founder data
  const [founderName, setFounderName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const isStep1Valid = 
    academyName.trim() !== '' &&
    organizationType !== '' &&
    approximateStudents !== '' &&
    (primarySport !== '' || customSport.trim() !== '') &&
    city.trim() !== '' &&
    country.trim() !== '';

  const isStep2Valid = 
    founderName.trim() !== '' &&
    phone.trim() !== '' &&
    email.trim() !== '' &&
    password.length >= 6 &&
    password === confirmPassword &&
    acceptTerms;

  const handleNext = () => {
    if (step === 1 && isStep1Valid) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleSportSelect = (sportName: string) => {
    setPrimarySport(sportName);
    setCustomSport('');
    setSportPopoverOpen(false);
  };

  const handleCustomSportChange = (value: string) => {
    setCustomSport(value);
    if (value.trim()) {
      setPrimarySport('');
    }
  };

  const copyToClipboard = async () => {
    if (registrationResult) {
      const orgId = `${registrationResult.organization.orgCode} / ${registrationResult.organization.orgAccessKey}`;
      await navigator.clipboard.writeText(orgId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async () => {
    if (!isStep2Valid) return;
    
    setIsSubmitting(true);
    
    try {
      const finalSport = customSport.trim() || primarySport;
      
      const { data, error } = await supabase.functions.invoke('register-academy', {
        body: {
          academyName: academyName.trim(),
          organizationType,
          approximateStudents: parseInt(approximateStudents),
          primarySport: finalSport,
          city: city.trim(),
          country: country.trim(),
          phone: phone.trim(),
          founderName: founderName.trim(),
          email: email.trim().toLowerCase(),
          password,
        },
      });

      if (error) {
        console.error('Registration error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Error al registrar la academia',
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

      setRegistrationResult(data);
      setShowSuccess(true);

      // Sign in the user
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: 'Error',
        description: 'Error inesperado. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    navigate('/dashboard/org-owner');
  };

  if (showSuccess && registrationResult) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="container flex h-16 items-center px-4">
            <Logo />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <div className="stryk-card p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-success" />
              </div>

              <h1 className="text-2xl font-display font-semibold text-foreground mb-4">
                Academia creada
              </h1>

              <p className="text-muted-foreground mb-6">
                Tu academia ha sido creada bajo el <span className="font-semibold text-foreground">Plan Freemium</span>.
                Puedes comenzar a operar de inmediato.
              </p>

              <div className="bg-muted rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground mb-2">Organization ID</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-lg font-mono font-semibold text-foreground">
                    {registrationResult.organization.orgCode} / {registrationResult.organization.orgAccessKey}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-8">
                Este ID es obligatorio para que tu equipo pueda iniciar sesión.
              </p>

              <Button onClick={handleContinue} className="w-full" size="lg">
                Continuar al panel
              </Button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex h-16 items-center px-4">
          <Logo />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                <Building2 className="w-5 h-5" />
              </div>
              <span className="font-medium hidden sm:inline">Academia</span>
            </div>
            
            <div className="w-12 h-0.5 bg-border" />
            
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                <User className="w-5 h-5" />
              </div>
              <span className="font-medium hidden sm:inline">Fundador</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="stryk-card p-6 sm:p-8"
              >
                <h1 className="text-2xl font-display font-semibold text-foreground mb-2">
                  Registra tu academia
                </h1>
                <p className="text-muted-foreground mb-6">
                  Datos de tu organización deportiva
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="academyName">Nombre de la academia</Label>
                    <Input
                      id="academyName"
                      placeholder="Ej: Academia White Lions"
                      value={academyName}
                      onChange={(e) => setAcademyName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de organización</Label>
                    <Select value={organizationType} onValueChange={(v) => setOrganizationType(v as OrganizationType)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORGANIZATION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="students">Número aproximado de alumnos</Label>
                    <Input
                      id="students"
                      type="number"
                      min="1"
                      placeholder="Ej: 50"
                      value={approximateStudents}
                      onChange={(e) => setApproximateStudents(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Deporte principal</Label>
                    <Popover open={sportPopoverOpen} onOpenChange={setSportPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          {primarySport || customSport || 'Selecciona o escribe un deporte'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Buscar o escribir deporte..."
                            value={customSport}
                            onValueChange={handleCustomSportChange}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {customSport.trim() && (
                                <button
                                  className="w-full px-4 py-2 text-left hover:bg-muted"
                                  onClick={() => {
                                    setPrimarySport('');
                                    setSportPopoverOpen(false);
                                  }}
                                >
                                  Usar "{customSport}" como deporte
                                </button>
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              {!sportsLoading && sports.map((sport) => (
                                <CommandItem
                                  key={sport.id}
                                  value={sport.name}
                                  onSelect={() => handleSportSelect(sport.name)}
                                >
                                  {sport.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Ciudad</Label>
                      <Input
                        id="city"
                        placeholder="Ej: Ciudad de México"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">País</Label>
                      <Input
                        id="country"
                        placeholder="Ej: México"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8">
                  <Button onClick={handleNext} disabled={!isStep1Valid}>
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="stryk-card p-6 sm:p-8"
              >
                <h1 className="text-2xl font-display font-semibold text-foreground mb-2">
                  Datos del fundador
                </h1>
                <p className="text-muted-foreground mb-6">
                  Información del administrador de la academia
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="founderName">Nombre completo</Label>
                    <Input
                      id="founderName"
                      placeholder="Ej: Juan Pérez García"
                      value={founderName}
                      onChange={(e) => setFounderName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Ej: +52 55 1234 5678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
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
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
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
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-sm text-destructive">Las contraseñas no coinciden</p>
                    )}
                  </div>

                  <div className="flex items-start space-x-3 pt-2">
                    <Checkbox
                      id="terms"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                    />
                    <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                      Acepto los Términos y Condiciones de uso de STRYK
                    </Label>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Atrás
                  </Button>
                  <Button onClick={handleSubmit} disabled={!isStep2Valid || isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                        Creando...
                      </>
                    ) : (
                      'Crear academia'
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
