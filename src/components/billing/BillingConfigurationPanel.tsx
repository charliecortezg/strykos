import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useBillingConfiguration, BillingConfiguration } from '@/hooks/useBillingConfiguration';
import { Settings, User, Mail, Calendar, Clock, RefreshCw, Receipt } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export function BillingConfigurationPanel() {
  const {
    config,
    adminUsers,
    founderEmail,
    isLoading,
    isSaving,
    canEdit,
    saveConfiguration,
    calculateNextPaymentDate,
  } = useBillingConfiguration();

  const [formData, setFormData] = useState<Partial<BillingConfiguration>>({
    billing_admin_user_id: null,
    billing_receipts_email: null,
    billing_due_day: 5,
    billing_period_type: 'monthly_calendar',
    billing_grace_days: 0,
    billing_auto_overdue: true,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        billing_admin_user_id: config.billing_admin_user_id,
        billing_receipts_email: config.billing_receipts_email,
        billing_due_day: config.billing_due_day ?? 5,
        billing_period_type: config.billing_period_type || 'monthly_calendar',
        billing_grace_days: config.billing_grace_days ?? 0,
        billing_auto_overdue: config.billing_auto_overdue ?? true,
      });
    }
  }, [config]);

  const handleSave = async () => {
    await saveConfiguration(formData);
  };

  const nextPaymentDate = calculateNextPaymentDate(new Date());
  const formattedNextDate = format(nextPaymentDate, "d 'de' MMMM yyyy", { locale: es });

  // Calculate example for preview
  const today = new Date();
  const exampleNextDate = format(
    new Date(
      today.getDate() <= (formData.billing_due_day || 5)
        ? new Date(today.getFullYear(), today.getMonth(), formData.billing_due_day || 5)
        : new Date(today.getFullYear(), today.getMonth() + 1, formData.billing_due_day || 5)
    ),
    "d 'de' MMMM yyyy",
    { locale: es }
  );

  // Determine effective recipient email for preview
  const selectedAdmin = adminUsers.find(u => u.id === formData.billing_admin_user_id);
  const effectiveEmail = formData.billing_receipts_email || selectedAdmin?.email || founderEmail || 'No configurado';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configuración de Cobranza y Recibos
          </CardTitle>
          <CardDescription>
            Define quién recibe los recibos y cuándo vencen los pagos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Responsable de recibos */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Responsable de recibos y cobranza
            </Label>
            <Select
              value={formData.billing_admin_user_id || 'founder'}
              onValueChange={(value) =>
                setFormData(prev => ({
                  ...prev,
                  billing_admin_user_id: value === 'founder' ? null : value,
                }))
              }
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar responsable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="founder">
                  Fundador (por defecto)
                </SelectItem>
                {adminUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Esta persona recibirá copias de todos los recibos y gestionará reenvíos.
            </p>
          </div>

          {/* Correo operativo */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Correo operativo para recibos (opcional)
            </Label>
            <Input
              type="email"
              placeholder="contabilidad@academia.com"
              value={formData.billing_receipts_email || ''}
              onChange={(e) =>
                setFormData(prev => ({
                  ...prev,
                  billing_receipts_email: e.target.value || null,
                }))
              }
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">
              Si está vacío, usaremos el correo del responsable seleccionado.
            </p>
          </div>

          {/* Día de vencimiento */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              ¿Cuándo vence el pago cada mes?
            </Label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Día del mes:</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      billing_due_day: Math.max(1, (prev.billing_due_day || 5) - 1),
                    }))
                  }
                  disabled={!canEdit || (formData.billing_due_day || 5) <= 1}
                >
                  -
                </Button>
                <span className="w-10 text-center font-medium text-lg">
                  {formData.billing_due_day || 5}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      billing_due_day: Math.min(28, (prev.billing_due_day || 5) + 1),
                    }))
                  }
                  disabled={!canEdit || (formData.billing_due_day || 5) >= 28}
                >
                  +
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Recomendado 1–28 para evitar problemas en meses cortos.
            </p>
            <div className="bg-muted/50 rounded-md p-3 mt-2">
              <p className="text-sm">
                <span className="font-medium">Próximo vencimiento:</span>{' '}
                <span className="text-primary">{exampleNextDate}</span>
              </p>
            </div>
          </div>

          {/* Días de gracia */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Días de gracia después del vencimiento
            </Label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      billing_grace_days: Math.max(0, (prev.billing_grace_days || 0) - 1),
                    }))
                  }
                  disabled={!canEdit || (formData.billing_grace_days || 0) <= 0}
                >
                  -
                </Button>
                <span className="w-10 text-center font-medium text-lg">
                  {formData.billing_grace_days || 0}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      billing_grace_days: Math.min(15, (prev.billing_grace_days || 0) + 1),
                    }))
                  }
                  disabled={!canEdit || (formData.billing_grace_days || 0) >= 15}
                >
                  +
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">días</span>
            </div>
            <p className="text-xs text-muted-foreground">
              El jugador no se marcará como atrasado hasta después de estos días.
            </p>
          </div>

          {/* Auto vencimiento */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                Marcar vencido automáticamente
              </Label>
              <p className="text-xs text-muted-foreground">
                Al activar, el sistema marcará los pagos como atrasados automáticamente
              </p>
            </div>
            <Switch
              checked={formData.billing_auto_overdue ?? true}
              onCheckedChange={(checked) =>
                setFormData(prev => ({
                  ...prev,
                  billing_auto_overdue: checked,
                }))
              }
              disabled={!canEdit}
            />
          </div>

          {/* Botón guardar */}
          {canEdit && (
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Preview card */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Vista previa del recibo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Correo de destino:</span>{' '}
              <span className="font-medium">{effectiveEmail}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Siguiente fecha de pago:</span>{' '}
              <span className="font-medium text-primary">{exampleNextDate}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Esta fecha se mostrará en todos los recibos enviados.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
