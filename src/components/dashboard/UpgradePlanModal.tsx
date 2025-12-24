import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Crown, Zap, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlanFeature {
  name: string;
  freemium: string | boolean;
  starter: string | boolean;
  professional: string | boolean;
  enterprise: string | boolean;
}

const PLAN_FEATURES: PlanFeature[] = [
  { name: 'Categorías', freemium: '1', starter: '5', professional: '15', enterprise: 'Ilimitadas' },
  { name: 'Jugadores', freemium: '15', starter: '75', professional: '250', enterprise: 'Ilimitados' },
  { name: 'Usuarios', freemium: '1', starter: '3', professional: '10', enterprise: 'Ilimitados' },
  { name: 'Importar Excel', freemium: false, starter: true, professional: true, enterprise: true },
  { name: 'Exportar datos', freemium: false, starter: false, professional: true, enterprise: true },
  { name: 'Marca personalizada', freemium: false, starter: false, professional: false, enterprise: true },
  { name: 'Soporte prioritario', freemium: false, starter: false, professional: true, enterprise: true },
];

const PLAN_PRICES: Record<string, { monthly: number; name: string; icon: React.ElementType }> = {
  starter: { monthly: 299, name: 'Starter', icon: Zap },
  professional: { monthly: 599, name: 'Professional', icon: Crown },
  enterprise: { monthly: 999, name: 'Enterprise', icon: Building2 },
};

export function UpgradePlanModal({ open, onOpenChange }: UpgradePlanModalProps) {
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  const currentPlan = organization?.plan || 'freemium';

  useEffect(() => {
    if (open && organization) {
      checkPendingRequest();
    }
  }, [open, organization]);

  const checkPendingRequest = async () => {
    if (!organization) return;
    
    const { data } = await supabase
      .from('upgrade_requests')
      .select('id')
      .eq('organization_id', organization.id)
      .eq('status', 'pending')
      .maybeSingle();
    
    setHasPendingRequest(!!data);
  };

  const handleSubmitRequest = async () => {
    if (!selectedPlan || !organization || !user) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('upgrade_requests')
        .insert({
          organization_id: organization.id,
          requested_by: user.id,
          current_plan: currentPlan,
          requested_plan: selectedPlan,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: 'Solicitud enviada',
        description: 'Nos pondremos en contacto contigo pronto para procesar tu upgrade.',
      });

      onOpenChange(false);
      setSelectedPlan(null);
    } catch (error) {
      console.error('Error submitting upgrade request:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar la solicitud. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlanOrder = (plan: string) => {
    const order = { freemium: 0, starter: 1, professional: 2, enterprise: 3 };
    return order[plan as keyof typeof order] ?? 0;
  };

  const availablePlans = Object.entries(PLAN_PRICES).filter(
    ([plan]) => getPlanOrder(plan) > getPlanOrder(currentPlan)
  );

  const renderFeatureValue = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-4 h-4 text-success mx-auto" />
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    }
    return <span className="text-sm">{value}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Mejorar tu plan</DialogTitle>
          <DialogDescription>
            Selecciona el plan que mejor se adapte a las necesidades de tu academia
          </DialogDescription>
        </DialogHeader>

        {hasPendingRequest ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-warning animate-spin" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Solicitud en proceso</h3>
            <p className="text-muted-foreground">
              Ya tienes una solicitud de upgrade pendiente. Nos pondremos en contacto contigo pronto.
            </p>
          </div>
        ) : (
          <>
            {/* Plan Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {availablePlans.map(([planKey, planInfo]) => {
                const Icon = planInfo.icon;
                const isSelected = selectedPlan === planKey;
                
                return (
                  <div
                    key={planKey}
                    onClick={() => setSelectedPlan(planKey)}
                    className={`relative rounded-xl border-2 p-6 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5 shadow-lg' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {planKey === 'professional' && (
                      <Badge className="absolute -top-2 right-4 bg-primary">
                        Recomendado
                      </Badge>
                    )}
                    
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold">{planInfo.name}</h3>
                      </div>
                    </div>

                    <div className="mb-4">
                      <span className="text-3xl font-bold">${planInfo.monthly}</span>
                      <span className="text-muted-foreground"> /mes</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      {PLAN_FEATURES.slice(0, 4).map((feature) => {
                        const value = feature[planKey as keyof PlanFeature];
                        if (!value) return null;
                        return (
                          <div key={feature.name} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-success" />
                            <span>
                              {typeof value === 'boolean' 
                                ? feature.name 
                                : `${value} ${feature.name.toLowerCase()}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {isSelected && (
                      <div className="absolute inset-0 rounded-xl ring-2 ring-primary ring-offset-2 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Feature Comparison Table */}
            <div className="border rounded-lg overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Característica</th>
                    <th className="px-4 py-3 text-center font-medium">
                      <Badge variant="outline">Actual: {currentPlan}</Badge>
                    </th>
                    {availablePlans.map(([planKey, planInfo]) => (
                      <th key={planKey} className="px-4 py-3 text-center font-medium">
                        {planInfo.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {PLAN_FEATURES.map((feature) => (
                    <tr key={feature.name}>
                      <td className="px-4 py-3 font-medium">{feature.name}</td>
                      <td className="px-4 py-3 text-center">
                        {renderFeatureValue(feature[currentPlan as keyof PlanFeature])}
                      </td>
                      {availablePlans.map(([planKey]) => (
                        <td key={planKey} className="px-4 py-3 text-center">
                          {renderFeatureValue(feature[planKey as keyof PlanFeature])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {selectedPlan 
                  ? `Plan seleccionado: ${PLAN_PRICES[selectedPlan].name} - $${PLAN_PRICES[selectedPlan].monthly}/mes`
                  : 'Selecciona un plan para continuar'}
              </p>
              <Button 
                onClick={handleSubmitRequest}
                disabled={!selectedPlan || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Solicitar upgrade'
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Al enviar la solicitud, nuestro equipo se pondrá en contacto contigo 
              para procesar el pago y activar tu nuevo plan.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
