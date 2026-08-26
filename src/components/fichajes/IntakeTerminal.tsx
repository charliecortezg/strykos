import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DateInput } from './DateInput';
import { CameraCapture } from './CameraCapture';
import { TransferQRDisplay } from './TransferQRDisplay';
import { useIntakeSettings, useCreateIntake, CreateIntakeData } from '@/hooks/useIntake';
import { useSports } from '@/hooks/useSports';
import { useCategories } from '@/hooks/useCategories';
import { useVenues } from '@/hooks/useVenues';
import { usePlans } from '@/hooks/usePlans';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronUp, User, Users, Trophy, CreditCard, Check, AlertCircle, AlertTriangle, Loader2, MapPin, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const normalizeName = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

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
  selectedPlanIds: string[];
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
  selectedPlanIds: [],
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
  const { isEnabled } = useOrgFeatures();
  const venuesEnabled = isEnabled('venues');
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
  const [duplicateMatch, setDuplicateMatch] = useState<{ id: string; name: string; categoryName?: string } | null>(null);
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);

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

  // Filter categories by selected sport
  const filteredCategories = categories.filter(c => 
    c.is_active && (!formData.sportId || c.sport_id === formData.sportId)
  );

  // Filter venues
  const filteredVenues = venues;

  // Filter plans by selected sport
  const filteredPlans = plans.filter(p => 
    p.is_active && (!formData.sportId || !p.sport_id || p.sport_id === formData.sportId)
  );

  // Calculate ticket breakdown from selected plans
  const ticketBreakdown = useMemo(() => {
    const lines: { planId: string; name: string; periodicity: string; originalPrice: number; finalPrice: number; isPromo: boolean }[] = [];
    
    for (const planId of formData.selectedPlanIds) {
      const plan = plans.find(p => p.id === planId);
      if (!plan) continue;

      let finalPrice = plan.price;
      let isPromo = false;

      // Apply promo on monthly soccer plan if pitch signing is active
      if (
        formData.isPitchSigning &&
        settings?.promo_active &&
        isSoccer &&
        plan.periodicity === 'monthly'
      ) {
        finalPrice = settings.promo_fee || plan.price;
        isPromo = true;
      }

      const periodicityLabel = plan.periodicity === 'annual' ? 'Anual' 
        : plan.periodicity === 'monthly' ? 'Mensual' 
        : plan.periodicity === 'quarterly' ? 'Trimestral'
        : plan.periodicity === 'semester' ? 'Semestral'
        : plan.periodicity;

      lines.push({
        planId: plan.id,
        name: plan.name,
        periodicity: periodicityLabel,
        originalPrice: plan.price,
        finalPrice,
        isPromo,
      });
    }

    // La promo de fichaje en cancha es un COMBINADO: inscripción + primer mes por
    // un solo precio (settings.promo_fee). Si además de la mensualidad con promo
    // también se seleccionó la línea de Inscripción (periodicidad "Anual"), esa
    // línea queda incluida sin costo adicional — el total de la transacción debe
    // ser igual a promo_fee, no promo_fee + inscripción.
    const hasMonthlyPromo = lines.some(l => l.isPromo && l.periodicity === 'Mensual');
    if (hasMonthlyPromo) {
      for (const line of lines) {
        if (line.periodicity === 'Anual') {
          line.finalPrice = 0;
          line.isPromo = true;
        }
      }
    }

    const total = lines.reduce((sum, l) => sum + l.finalPrice, 0);
    const hasPromo = lines.some(l => l.isPromo);

    return { lines, total, hasPromo };
  }, [formData.selectedPlanIds, formData.isPitchSigning, plans, settings, isSoccer]);

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
  const isSportValid = formData.sportId !== '' && formData.selectedPlanIds.length >= 1;
  const isPaymentValid = formData.paymentMethod === 'efectivo' 
    ? formData.evidenceFile !== null 
    : true;

  const isFormValid = isPlayerValid && isGuardianValid && isSportValid && isPaymentValid
    && (!duplicateMatch || confirmedDuplicate);

  // Detección de posible duplicado al completar nombre + fecha de nacimiento
  useEffect(() => {
    if (!organization?.id || !formData.playerName.trim() || !formData.playerBirthDate) {
      setDuplicateMatch(null);
      setConfirmedDuplicate(false);
      return;
    }
    const handle = setTimeout(async () => {
      const normalized = normalizeName(formData.playerName);
      const { data } = await supabase
        .from('players')
        .select('id, full_name, category:categories(name)')
        .eq('organization_id', organization.id)
        .eq('date_of_birth', formData.playerBirthDate)
        .eq('lifecycle_status', 'active');
      const match = (data || []).find((p: any) => {
        const dist = normalizeName(p.full_name) === normalized ? 0 : 99;
        return dist <= 3;
      });
      if (match) {
        setDuplicateMatch({ id: match.id, name: (match as any).full_name, categoryName: (match as any).category?.name });
        setConfirmedDuplicate(false);
      } else {
        setDuplicateMatch(null);
        setConfirmedDuplicate(false);
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [formData.playerName, formData.playerBirthDate, organization?.id]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const togglePlan = (planId: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedPlanIds.includes(planId);
      return {
        ...prev,
        selectedPlanIds: isSelected
          ? prev.selectedPlanIds.filter(id => id !== planId)
          : [...prev.selectedPlanIds, planId],
      };
    });
  };

  const handleSubmit = async () => {
    if (!isFormValid || !settings) return;

    // Calculate registration and monthly fees from breakdown for retrocompatibility
    const registrationFee = ticketBreakdown.lines
      .filter(l => l.periodicity === 'Anual')
      .reduce((sum, l) => sum + l.finalPrice, 0);
    const monthlyFee = ticketBreakdown.lines
      .filter(l => l.periodicity === 'Mensual')
      .reduce((sum, l) => sum + l.finalPrice, 0);

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
        planIds: formData.selectedPlanIds,
        paymentMethod: formData.paymentMethod,
        registrationFee,
        monthlyFee,
        totalAmount: ticketBreakdown.total,
        promoApplied: ticketBreakdown.hasPromo,
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
            {ticketBreakdown.hasPromo && (
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
                {duplicateMatch && (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      <div className="text-xs text-foreground">
                        Ya existe un jugador con nombre y fecha de nacimiento similares:
                        <strong className="block mt-1">{duplicateMatch.name}</strong>
                        {duplicateMatch.categoryName && (
                          <span className="text-muted-foreground">{duplicateMatch.categoryName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <Checkbox
                        id="confirm-dup"
                        checked={confirmedDuplicate}
                        onCheckedChange={(v) => setConfirmedDuplicate(v === true)}
                      />
                      <label htmlFor="confirm-dup" className="text-xs text-foreground cursor-pointer">
                        Confirmo que es un jugador diferente y deseo continuar
                      </label>
                    </div>
                  </div>
                )}
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

        {/* Section 3: Sport, Venue, Category & Plans */}
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
                    <CardTitle className="text-base">{venuesEnabled ? 'Deporte, Sede y Mensualidad' : 'Deporte y Mensualidad'}</CardTitle>
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
                      selectedPlanIds: [],
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
                        Aplica promo en mensualidad: ${settings.promo_fee || 300}
                      </p>
                    </div>
                    <Switch
                      checked={formData.isPitchSigning}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPitchSigning: checked }))}
                    />
                  </div>
                )}

                {/* Venue */}
                {venuesEnabled && formData.sportId && filteredVenues.length > 0 && (
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

                {/* Multi-Plan Selection */}
                {formData.sportId && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5" />
                      Mensualidades * <span className="text-xs text-muted-foreground font-normal">(mínimo 1)</span>
                    </Label>
                    
                    {filteredPlans.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                        No hay mensualidades activas configuradas para este deporte.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredPlans.map(plan => {
                          const isSelected = formData.selectedPlanIds.includes(plan.id);
                          const periodicityLabel = plan.periodicity === 'annual' ? 'Anual' 
                            : plan.periodicity === 'monthly' ? 'Mensual' 
                            : plan.periodicity === 'quarterly' ? 'Trimestral'
                            : plan.periodicity === 'semester' ? 'Semestral'
                            : plan.periodicity;

                          // Show promo price if applicable
                          let displayPrice = plan.price;
                          let showPromo = false;
                          if (
                            formData.isPitchSigning &&
                            settings?.promo_active &&
                            isSoccer &&
                            plan.periodicity === 'monthly' &&
                            isSelected
                          ) {
                            displayPrice = settings.promo_fee || plan.price;
                            showPromo = true;
                          }

                          // La promo es un combinado: si además hay una mensualidad
                          // con promo seleccionada, la línea de Inscripción (annual)
                          // se muestra en $0, incluida en el combinado.
                          const hasSelectedMonthlyPromo =
                            formData.isPitchSigning &&
                            settings?.promo_active &&
                            isSoccer &&
                            formData.selectedPlanIds.some(id => {
                              const p = plans.find(pl => pl.id === id);
                              return p?.periodicity === 'monthly';
                            });
                          if (plan.periodicity === 'annual' && isSelected && hasSelectedMonthlyPromo) {
                            displayPrice = 0;
                            showPromo = true;
                          }

                          return (
                            <div
                              key={plan.id}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                                isSelected 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border bg-muted/20 hover:bg-muted/40'
                              )}
                              onClick={() => togglePlan(plan.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => togglePlan(plan.id)}
                                className="pointer-events-none"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm font-medium', isSelected && 'text-primary')}>
                                  {plan.name}
                                </p>
                                <p className="text-xs text-muted-foreground">{periodicityLabel}</p>
                              </div>
                              <div className="text-right shrink-0">
                                {showPromo ? (
                                  <div>
                                    <span className="text-xs line-through text-muted-foreground">${plan.price}</span>
                                    <span className="text-sm font-semibold text-success ml-1">${displayPrice}</span>
                                    <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">PROMO</Badge>
                                  </div>
                                ) : (
                                  <span className={cn('text-sm font-semibold', isSelected ? 'text-primary' : 'text-foreground')}>
                                    ${plan.price}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {formData.selectedPlanIds.length === 0 && formData.sportId && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Selecciona al menos 1 mensualidad para continuar
                      </p>
                    )}
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
                {/* Ticket Breakdown */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  {ticketBreakdown.lines.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Selecciona al menos un plan arriba
                    </p>
                  ) : (
                    <>
                      {ticketBreakdown.lines.map((line) => (
                        <div key={line.planId} className="flex justify-between text-sm">
                          <span className="text-muted-foreground truncate mr-2">
                            {line.name}
                            <span className="text-xs ml-1">({line.periodicity})</span>
                          </span>
                          <span className="shrink-0 flex items-center gap-1">
                            {line.isPromo && (
                              <>
                                <span className="line-through text-xs text-muted-foreground">${line.originalPrice}</span>
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">PROMO 🔥</Badge>
                              </>
                            )}
                            <span className={line.isPromo ? 'text-success font-medium' : ''}>
                              ${line.finalPrice}
                            </span>
                          </span>
                        </div>
                      ))}
                      <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                        <span>Total</span>
                        <span className="text-primary">${ticketBreakdown.total}</span>
                      </div>
                    </>
                  )}
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
              Registrar Fichaje — ${ticketBreakdown.total}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
