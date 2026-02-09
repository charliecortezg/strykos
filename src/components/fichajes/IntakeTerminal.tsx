import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DateInput } from './DateInput';
import { CameraCapture } from './CameraCapture';
import { TransferQRDisplay } from './TransferQRDisplay';
import { useIntakeSettings, useCreateIntake, calculateIntakeFees, CreateIntakeData } from '@/hooks/useIntake';
import { useSports } from '@/hooks/useSports';
import { useCategories } from '@/hooks/useCategories';
import { useVenues } from '@/hooks/useVenues';
import { usePlans } from '@/hooks/usePlans';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown, ChevronUp, User, Users, Trophy, CreditCard, Check, AlertCircle, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Step = 'form' | 'success' | 'error';
type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';

interface FormData {
  playerName: string;
  playerBirthDate: string;
  playerAge: number | null;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianOccupation: string;
  sportId: string;
  categoryId: string;
  venueId: string;
  planId: string;
  isPitchSigning: boolean;
  paymentMethod: PaymentMethod;
  evidenceFile: File | null;
}

const initialFormData: FormData = {
  playerName: '',
  playerBirthDate: '',
  playerAge: null,
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  guardianOccupation: '',
  sportId: '',
  categoryId: '',
  venueId: '',
  planId: '',
  isPitchSigning: false,
  paymentMethod: 'efectivo',
  evidenceFile: null,
};

export function IntakeTerminal() {
  const { organization } = useAuth();
  const { settings, isLoading: settingsLoading } = useIntakeSettings();
  const { sports } = useSports();
  const { categories } = useCategories();
  const { activeVenues: venues } = useVenues();
  const { plans } = usePlans();
  const { createIntake, isCreating } = useCreateIntake();

  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [openSections, setOpenSections] = useState({
    player: true,
    guardian: false,
    sport: false,
    payment: false,
  });
  const [createdPlayerId, setCreatedPlayerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter sports to only show Futbol (accent-insensitive)
  const filteredSports = sports.filter(s => {
    const normalized = s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalized.includes('fut') || normalized.includes('soccer');
  });

  // Auto-select Futbol when it's the only sport
  useEffect(() => {
    if (filteredSports.length === 1 && !formData.sportId) {
      setFormData(prev => ({ ...prev, sportId: filteredSports[0].id }));
    }
  }, [filteredSports.length, formData.sportId]);

  // Determine if sport is soccer (for promo toggle)
  const selectedSport = sports.find(s => s.id === formData.sportId);
  const isSoccer = selectedSport
    ? (selectedSport.name.toLowerCase().includes('fut') || selectedSport.name.toLowerCase().includes('soccer'))
    : false;

  // Calculate fees based on sport + pitch signing
  const fees = settings && selectedSport
    ? calculateIntakeFees(selectedSport.name, formData.isPitchSigning, settings)
    : { registrationFee: 400, monthlyFee: 450, promoApplied: false };

  const totalAmount = fees.registrationFee + fees.monthlyFee;

  // Filter categories by selected sport
  const filteredCategories = categories.filter(c => 
    c.is_active && (!formData.sportId || c.sport_id === formData.sportId)
  );

  // Filter venues by selected sport (venues linked via categories or all if no sport filter on venues)
  const filteredVenues = venues;

  // Filter plans by selected sport
  const filteredPlans = plans.filter(p => 
    p.is_active && (!formData.sportId || !p.sport_id || p.sport_id === formData.sportId)
  );

  // Auto-open next section when current is complete
  useEffect(() => {
    if (formData.playerName && formData.playerBirthDate && formData.playerAge) {
      if (!openSections.guardian) {
        setOpenSections(prev => ({ ...prev, guardian: true }));
      }
    }
  }, [formData.playerName, formData.playerBirthDate, formData.playerAge]);

  useEffect(() => {
    if (formData.guardianName && formData.guardianPhone) {
      if (!openSections.sport) {
        setOpenSections(prev => ({ ...prev, sport: true }));
      }
    }
  }, [formData.guardianName, formData.guardianPhone]);

  useEffect(() => {
    if (formData.sportId) {
      if (!openSections.payment) {
        setOpenSections(prev => ({ ...prev, payment: true }));
      }
    }
  }, [formData.sportId]);

  // Validation
  const isPlayerValid = formData.playerName.trim() !== '' && formData.playerBirthDate && formData.playerAge !== null;
  const isGuardianValid = formData.guardianName.trim() !== '' && formData.guardianPhone.trim().length >= 10;
  const isSportValid = formData.sportId !== '';
  const isPaymentValid = formData.paymentMethod === 'efectivo' 
    ? formData.evidenceFile !== null 
    : true;

  const isFormValid = isPlayerValid && isGuardianValid && isSportValid && isPaymentValid;

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSubmit = async () => {
    if (!isFormValid || !settings) return;

    try {
      const data: CreateIntakeData = {
        playerName: formData.playerName,
        playerBirthDate: formData.playerBirthDate,
        playerAge: formData.playerAge!,
        guardianName: formData.guardianName,
        guardianPhone: formData.guardianPhone,
        guardianEmail: formData.guardianEmail || undefined,
        guardianOccupation: formData.guardianOccupation || undefined,
        sportId: formData.sportId,
        categoryId: formData.categoryId || undefined,
        venueId: formData.venueId || undefined,
        planId: formData.planId || undefined,
        paymentMethod: formData.paymentMethod,
        registrationFee: fees.registrationFee,
        monthlyFee: fees.monthlyFee,
        totalAmount,
        promoApplied: fees.promoApplied,
        evidenceFile: formData.evidenceFile || undefined,
      };

      const result = await createIntake(data);
      setCreatedPlayerId(result.playerId || null);
      setStep('success');
      toast.success('¡Fichaje registrado exitosamente!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setErrorMessage(message);
      setStep('error');
      toast.error(message);
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setStep('form');
    setCreatedPlayerId(null);
    setErrorMessage(null);
    setOpenSections({
      player: true,
      guardian: false,
      sport: false,
      payment: false,
    });
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Success Screen
  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto p-4">
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-success" />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">
                ¡Fichaje Completado!
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {formData.playerName} ha sido registrado exitosamente.
              </p>
            </div>
            {fees.promoApplied && (
              <Badge className="bg-success/10 text-success border-success/20">
                🎉 Promo aplicada
              </Badge>
            )}
            <div className="pt-4">
              <Button onClick={handleReset} className="w-full" size="lg">
                Nuevo Fichaje
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error Screen
  if (step === 'error') {
    return (
      <div className="max-w-md mx-auto p-4">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">
                Error al Registrar
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {errorMessage}
              </p>
            </div>
            <div className="pt-4 space-y-2">
              <Button onClick={handleSubmit} className="w-full" size="lg" disabled={isCreating}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Reintentar
              </Button>
              <Button onClick={handleReset} variant="outline" className="w-full">
                Empezar de Nuevo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form
  return (
    <div className="max-w-md mx-auto pb-24">
      <div className="space-y-3 p-4">
        {/* Section 1: Player Data */}
        <Collapsible open={openSections.player} onOpenChange={() => toggleSection('player')}>
          <Card className={cn(isPlayerValid && 'border-success/30')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      isPlayerValid ? 'bg-success/10' : 'bg-muted'
                    )}>
                      {isPlayerValid ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <CardTitle className="text-base">Datos del Jugador</CardTitle>
                  </div>
                  {openSections.player ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                <div>
                  <Label htmlFor="playerName">Nombre Completo *</Label>
                  <Input
                    id="playerName"
                    placeholder="Nombre del jugador"
                    value={formData.playerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, playerName: e.target.value }))}
                    className="mt-1.5 h-12"
                  />
                </div>
                <DateInput
                  value={formData.playerBirthDate}
                  onChange={(isoDate, age) => setFormData(prev => ({ 
                    ...prev, 
                    playerBirthDate: isoDate,
                    playerAge: age
                  }))}
                  minAge={3}
                  maxAge={25}
                  required
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 2: Guardian Data */}
        <Collapsible open={openSections.guardian} onOpenChange={() => toggleSection('guardian')}>
          <Card className={cn(isGuardianValid && 'border-success/30')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      isGuardianValid ? 'bg-success/10' : 'bg-muted'
                    )}>
                      {isGuardianValid ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Users className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <CardTitle className="text-base">Datos del Tutor</CardTitle>
                  </div>
                  {openSections.guardian ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                <div>
                  <Label htmlFor="guardianName">Nombre del Tutor *</Label>
                  <Input
                    id="guardianName"
                    placeholder="Nombre completo"
                    value={formData.guardianName}
                    onChange={(e) => setFormData(prev => ({ ...prev, guardianName: e.target.value }))}
                    className="mt-1.5 h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="guardianPhone">WhatsApp *</Label>
                  <Input
                    id="guardianPhone"
                    type="tel"
                    inputMode="tel"
                    placeholder="10 dígitos"
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, guardianPhone: e.target.value }))}
                    className="mt-1.5 h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="guardianEmail">Email (para recibo)</Label>
                  <Input
                    id="guardianEmail"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={formData.guardianEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, guardianEmail: e.target.value }))}
                    className="mt-1.5 h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="guardianOccupation">Ocupación (opcional)</Label>
                  <Input
                    id="guardianOccupation"
                    placeholder="Ej: Ingeniero, Comerciante..."
                    value={formData.guardianOccupation}
                    onChange={(e) => setFormData(prev => ({ ...prev, guardianOccupation: e.target.value }))}
                    className="mt-1.5 h-12"
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 3: Sport, Venue & Category */}
        <Collapsible open={openSections.sport} onOpenChange={() => toggleSection('sport')}>
          <Card className={cn(isSportValid && 'border-success/30')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      isSportValid ? 'bg-success/10' : 'bg-muted'
                    )}>
                      {isSportValid ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Trophy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <CardTitle className="text-base">Deporte, Sede y Categoría</CardTitle>
                  </div>
                  {openSections.sport ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                {/* Sport */}
                <div>
                  <Label>Deporte *</Label>
                  <Select
                    value={formData.sportId}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      sportId: value,
                      categoryId: '',
                      venueId: '',
                      planId: '',
                      isPitchSigning: false,
                    }))}
                  >
                    <SelectTrigger className="mt-1.5 h-12">
                      <SelectValue placeholder="Seleccionar deporte" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSports.map(sport => (
                        <SelectItem key={sport.id} value={sport.id}>
                          {sport.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pitch Signing Toggle - Only for Soccer */}
                {formData.sportId && isSoccer && settings?.promo_active && (
                  <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Fichaje en Cancha</Label>
                      <p className="text-xs text-muted-foreground">
                        Aplica promo: mensualidad a ${settings.promo_fee || 300}
                      </p>
                    </div>
                    <Switch
                      checked={formData.isPitchSigning}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPitchSigning: checked }))}
                    />
                  </div>
                )}

                {/* Venue */}
                {formData.sportId && filteredVenues.length > 0 && (
                  <div>
                    <Label className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Sede (opcional)
                    </Label>
                    <Select
                      value={formData.venueId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, venueId: value }))}
                    >
                      <SelectTrigger className="mt-1.5 h-12">
                        <SelectValue placeholder="Seleccionar sede" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredVenues.map(venue => (
                          <SelectItem key={venue.id} value={venue.id}>
                            {venue.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Category */}
                {formData.sportId && (
                  <div>
                    <Label>Categoría (opcional)</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                    >
                      <SelectTrigger className="mt-1.5 h-12">
                        <SelectValue placeholder="Se asignará después" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Plan */}
                {formData.sportId && filteredPlans.length > 0 && (
                  <div>
                    <Label>Plan (opcional)</Label>
                    <Select
                      value={formData.planId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, planId: value }))}
                    >
                      <SelectTrigger className="mt-1.5 h-12">
                        <SelectValue placeholder="Sin plan específico" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPlans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} — ${plan.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 4: Payment */}
        <Collapsible open={openSections.payment} onOpenChange={() => toggleSection('payment')}>
          <Card className={cn(isPaymentValid && 'border-success/30')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      isPaymentValid ? 'bg-success/10' : 'bg-muted'
                    )}>
                      {isPaymentValid ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <CardTitle className="text-base">Pago</CardTitle>
                  </div>
                  {openSections.payment ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                {/* Fees Summary */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Inscripción</span>
                    <span>${fees.registrationFee}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Mensualidad
                      {fees.promoApplied && (
                        <Badge variant="secondary" className="ml-2 text-xs">PROMO 🔥</Badge>
                      )}
                    </span>
                    <span>${fees.monthlyFee}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary">${totalAmount}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <Label>Método de Pago</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value: PaymentMethod) => setFormData(prev => ({ 
                      ...prev, 
                      paymentMethod: value,
                      evidenceFile: null
                    }))}
                  >
                    <SelectTrigger className="mt-1.5 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Transfer QR */}
                {formData.paymentMethod === 'transferencia' && (
                  <TransferQRDisplay
                    qrUrl={settings?.transfer_qr_url}
                    bankInfo={settings?.transfer_bank_info}
                  />
                )}

                {/* Evidence Capture */}
                <CameraCapture
                  onCapture={(file) => setFormData(prev => ({ ...prev, evidenceFile: file }))}
                  required={formData.paymentMethod === 'efectivo'}
                  label={formData.paymentMethod === 'efectivo' 
                    ? 'Foto del Pago (obligatorio)'
                    : 'Comprobante (opcional)'}
                />

                {formData.paymentMethod === 'efectivo' && !formData.evidenceFile && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Para pagos en efectivo, la evidencia es obligatoria
                  </p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-pb">
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isCreating}
          className="w-full h-14 text-base font-semibold"
          size="lg"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Registrando...
            </>
          ) : (
            <>
              Registrar Fichaje — ${totalAmount}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
