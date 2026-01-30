import { useState, useEffect } from 'react';
import { useIntakeSettingsEditor } from '@/hooks/useIntakeSettingsEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { SettingsPanelSkeleton } from '@/components/ui/loading-spinner';
import { 
  Save, 
  Loader2, 
  DollarSign, 
  Tag, 
  Settings2, 
  CreditCard,
  Lock,
  AlertCircle,
  Check
} from 'lucide-react';

interface FormState {
  enabled: boolean;
  default_registration_fee: number;
  soccer_fee: number;
  basketball_fee: number;
  promo_active: boolean;
  promo_fee: number;
  require_evidence: boolean;
  require_guardian_email: boolean;
  transfer_qr_url: string;
  transfer_bank_info: string;
}

export function IntakeSettingsPanel() {
  const { settings, isLoading, isSaving, canEdit, saveSettings, error } = useIntakeSettingsEditor();
  const [showSuccess, setShowSuccess] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    enabled: true,
    default_registration_fee: 500,
    soccer_fee: 450,
    basketball_fee: 400,
    promo_active: false,
    promo_fee: 400,
    require_evidence: true,
    require_guardian_email: false,
    transfer_qr_url: '',
    transfer_bank_info: '',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [qrError, setQrError] = useState(false);

  // Sync form state when settings load
  useEffect(() => {
    if (settings) {
      setFormState({
        enabled: settings.enabled,
        default_registration_fee: settings.default_registration_fee,
        soccer_fee: settings.soccer_fee,
        basketball_fee: settings.basketball_fee,
        promo_active: settings.promo_active,
        promo_fee: settings.promo_fee,
        require_evidence: settings.require_evidence,
        require_guardian_email: settings.require_guardian_email,
        transfer_qr_url: settings.transfer_qr_url || '',
        transfer_bank_info: settings.transfer_bank_info || '',
      });
      setHasChanges(false);
    }
  }, [settings]);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveSettings({
        enabled: formState.enabled,
        default_registration_fee: formState.default_registration_fee,
        soccer_fee: formState.soccer_fee,
        basketball_fee: formState.basketball_fee,
        promo_active: formState.promo_active,
        promo_fee: formState.promo_fee,
        require_evidence: formState.require_evidence,
        require_guardian_email: formState.require_guardian_email,
        transfer_qr_url: formState.transfer_qr_url || null,
        transfer_bank_info: formState.transfer_bank_info || null,
      });
      setHasChanges(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      // Error is handled by the hook
    }
  };

  if (isLoading) {
    return (
      <div className="stryk-card p-6">
        <SettingsPanelSkeleton />
      </div>
    );
  }

  return (
    <div className="stryk-card">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Configuración de Fichajes
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Define tarifas y métodos de pago para inscripciones
            </p>
          </div>
          {!canEdit && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="w-3 h-3" />
              Solo lectura
            </Badge>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Module Enable/Disable */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Módulo de fichajes activo</Label>
            <p className="text-sm text-muted-foreground">
              Habilita o deshabilita el terminal de fichajes
            </p>
          </div>
          <Switch
            checked={formState.enabled}
            onCheckedChange={(checked) => updateField('enabled', checked)}
            disabled={!canEdit}
          />
        </div>

        <Separator />

        {/* Fees Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-success" />
            <h4 className="font-medium">Tarifas</h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="registration_fee">Inscripción</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="registration_fee"
                  type="number"
                  min="0"
                  value={formState.default_registration_fee}
                  onChange={(e) => updateField('default_registration_fee', Number(e.target.value))}
                  disabled={!canEdit}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="soccer_fee">Mensualidad Fútbol</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="soccer_fee"
                  type="number"
                  min="0"
                  value={formState.soccer_fee}
                  onChange={(e) => updateField('soccer_fee', Number(e.target.value))}
                  disabled={!canEdit}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="basketball_fee">Mensualidad Basketball</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="basketball_fee"
                  type="number"
                  min="0"
                  value={formState.basketball_fee}
                  onChange={(e) => updateField('basketball_fee', Number(e.target.value))}
                  disabled={!canEdit}
                  className="pl-7"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Promotions Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-warning" />
            <h4 className="font-medium">Promociones</h4>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base">Activar promoción en cancha</Label>
              <p className="text-sm text-muted-foreground">
                Aplica tarifa especial cuando el fichaje se hace en cancha
              </p>
            </div>
            <Switch
              checked={formState.promo_active}
              onCheckedChange={(checked) => updateField('promo_active', checked)}
              disabled={!canEdit}
            />
          </div>

          {formState.promo_active && (
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="promo_fee">Tarifa promocional (fútbol)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="promo_fee"
                  type="number"
                  min="0"
                  value={formState.promo_fee}
                  onChange={(e) => updateField('promo_fee', Number(e.target.value))}
                  disabled={!canEdit}
                  className="pl-7"
                />
              </div>
              {formState.promo_fee >= formState.soccer_fee && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  La tarifa promo debería ser menor que la regular
                </p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Options Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <h4 className="font-medium">Opciones</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Requerir foto de evidencia para efectivo</Label>
                <p className="text-sm text-muted-foreground">
                  Los pagos en efectivo requieren foto del comprobante
                </p>
              </div>
              <Switch
                checked={formState.require_evidence}
                onCheckedChange={(checked) => updateField('require_evidence', checked)}
                disabled={!canEdit}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Requerir email del tutor</Label>
                <p className="text-sm text-muted-foreground">
                  El email del tutor será obligatorio en el formulario
                </p>
              </div>
              <Switch
                checked={formState.require_guardian_email}
                onCheckedChange={(checked) => updateField('require_guardian_email', checked)}
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Transfer Payment Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <h4 className="font-medium">Datos para Transferencia</h4>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transfer_qr_url">URL del código QR</Label>
              <Input
                id="transfer_qr_url"
                type="url"
                placeholder="https://ejemplo.com/qr-bancario.png"
                value={formState.transfer_qr_url}
                onChange={(e) => {
                  updateField('transfer_qr_url', e.target.value);
                  setQrError(false);
                }}
                disabled={!canEdit}
              />
              {formState.transfer_qr_url && !qrError && (
                <div className="mt-2 p-3 bg-muted/30 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-2">Vista previa:</p>
                  <img
                    src={formState.transfer_qr_url}
                    alt="QR de transferencia"
                    className="w-32 h-32 object-contain mx-auto"
                    onError={() => setQrError(true)}
                  />
                </div>
              )}
              {qrError && formState.transfer_qr_url && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  No se pudo cargar la imagen
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer_bank_info">Datos bancarios</Label>
              <Textarea
                id="transfer_bank_info"
                placeholder="Banco: BBVA&#10;CLABE: 012345678901234567&#10;Titular: Academia FC"
                value={formState.transfer_bank_info}
                onChange={(e) => updateField('transfer_bank_info', e.target.value)}
                disabled={!canEdit}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Información visible para el tutor al pagar por transferencia
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        {canEdit && (
          <>
            <Separator />
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={`gap-2 transition-all ${showSuccess ? 'bg-success hover:bg-success/90' : ''}`}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : showSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? 'Guardando...' : showSuccess ? '¡Guardado!' : 'Guardar configuración'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
