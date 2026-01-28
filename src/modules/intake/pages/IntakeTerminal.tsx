// STRYK Intake Terminal Page
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { DateInput } from '../components/DateInput';
import { CameraCapture } from '../components/CameraCapture';
import { IntakeSuccess } from '../components/IntakeSuccess';
import { useIntakeSettings } from '../hooks/useIntakeSettings';
import { useIntakeSports, useIntakeCategories, useIntakePlans, useIntakeVenues } from '../hooks/useIntakeCatalogs';
import { useCreateIntakeRequest } from '../hooks/useCreateIntakeRequest';
import { intakeFormSchema, type IntakeFormValues } from '../lib/intake-validations';
import { calculateAge, formatCurrency } from '../lib/intake-utils';
import { toast } from 'sonner';

export default function IntakeTerminal() {
  const navigate = useNavigate();
  const { user, organization } = useAuth();
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    playerName: string;
    guardianPhone: string;
    totalAmount: number;
  } | null>(null);

  // Hooks for data
  const { data: settings, isLoading: settingsLoading } = useIntakeSettings(organization?.id);
  const { data: sports, isLoading: sportsLoading } = useIntakeSports(organization?.id);
  const { data: venues } = useIntakeVenues(organization?.id);
  const createIntake = useCreateIntakeRequest();

  // Form setup
  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      sport_id: '',
      category_id: '',
      venue_id: '',
      plan_id: '',
      player_name: '',
      guardian_name: '',
      guardian_email: '',
      guardian_phone: '',
      guardian_occupation: '',
      payment_method: 'efectivo',
      promo_applied: false,
      promo_code: '',
    },
  });

  const watchSportId = form.watch('sport_id');
  const watchBirthDate = form.watch('player_birth_date');
  const watchPromoApplied = form.watch('promo_applied');

  // Fetch categories and plans based on selected sport
  const { data: categories } = useIntakeCategories(organization?.id, watchSportId);
  const { data: plans } = useIntakePlans(organization?.id, watchSportId);

  // Calculate totals
  const registrationFee = settings?.default_registration_fee ?? 400;
  const monthlyFee = watchPromoApplied 
    ? (settings?.promo_fee ?? 300) 
    : (settings?.default_monthly_fee ?? 450);
  const totalAmount = registrationFee + monthlyFee;

  // Calculate age from birth date
  const playerAge = watchBirthDate ? calculateAge(watchBirthDate) : null;

  const handleSubmit = async (data: IntakeFormValues) => {
    if (!organization?.id || !user?.id) {
      toast.error('Error de sesión. Intenta iniciar sesión nuevamente.');
      return;
    }

    if (!settings) {
      toast.error('Error cargando configuración');
      return;
    }

    try {
      await createIntake.mutateAsync({
        organizationId: organization.id,
        profileId: user.id,
        formData: data,
        settings,
      });

      setSuccessData({
        playerName: data.player_name,
        guardianPhone: data.guardian_phone,
        totalAmount,
      });
      setShowSuccess(true);
      toast.success('¡Fichaje registrado exitosamente!');
    } catch (error: any) {
      console.error('Error creating intake:', error);
      toast.error(error.message || 'Error al crear el fichaje');
    }
  };

  const handleNewIntake = () => {
    form.reset();
    setCapturedFile(null);
    setShowSuccess(false);
    setSuccessData(null);
  };

  // Loading state
  if (settingsLoading || sportsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Success state
  if (showSuccess && successData) {
    return (
      <IntakeSuccess
        playerName={successData.playerName}
        guardianPhone={successData.guardianPhone}
        totalAmount={successData.totalAmount}
        whatsappGroupUrl={settings?.whatsapp_group_url}
        onNewIntake={handleNewIntake}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Terminal de Fichaje</h1>
            <p className="text-sm text-muted-foreground">{organization?.name}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="p-4 space-y-6 pb-32">
          {/* Deporte */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Asignación Deportiva
            </p>
            
            <FormField
              control={form.control}
              name="sport_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deporte *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona deporte" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sports?.map((sport) => (
                        <SelectItem key={sport.id} value={sport.id}>
                          {sport.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin categoría asignada" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Sin categoría</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="venue_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sede (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin sede asignada" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Sin sede</SelectItem>
                      {venues?.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {venue.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Datos del Jugador */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Datos del Jugador
            </p>

            <FormField
              control={form.control}
              name="player_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del jugador" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="player_birth_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de nacimiento *</FormLabel>
                  <FormControl>
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      format="slash"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {playerAge !== null && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent text-accent-foreground">
                {playerAge} años
              </div>
            )}
          </div>

          {/* Datos del Tutor */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Datos del Tutor
            </p>

            <FormField
              control={form.control}
              name="guardian_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del tutor *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guardian_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono (10 dígitos) *</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      placeholder="5512345678"
                      maxLength={10}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guardian_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email {settings?.require_guardian_email ? '*' : '(opcional)'}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guardian_occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ocupación (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Ingeniero, Maestro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Pago */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Información de Pago
            </p>

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de pago *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                      <SelectItem value="transferencia">📱 Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {settings?.allow_promo_codes && settings?.promo_active && (
              <FormField
                control={form.control}
                name="promo_applied"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">🎁 Aplicar promoción</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Mensualidad: {formatCurrency(settings.promo_fee)}
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {/* Totals */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Inscripción</span>
                <span>{formatCurrency(registrationFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Mensualidad {watchPromoApplied && '(Promo)'}
                </span>
                <span>{formatCurrency(monthlyFee)}</span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="text-3xl font-bold text-primary text-center">
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Photo */}
          {settings?.require_evidence && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Evidencia de Pago
              </p>
              <CameraCapture
                onCapture={setCapturedFile}
                onClear={() => setCapturedFile(null)}
                capturedFile={capturedFile}
                required={settings.require_evidence}
              />
            </div>
          )}
        </form>
      </Form>

      {/* Fixed Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Button
          type="submit"
          size="lg"
          className="w-full h-14 text-lg font-semibold"
          disabled={createIntake.isPending}
          onClick={form.handleSubmit(handleSubmit)}
        >
          {createIntake.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-5 w-5" />
              Registrar Fichaje — {formatCurrency(totalAmount)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
