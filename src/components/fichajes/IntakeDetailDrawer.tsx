import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { IntakeRequest, useRetryReceipt, useIntakeEvidence } from '@/hooks/useIntake';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  User, Phone, Mail, Calendar, CreditCard, Trophy, 
  Check, X, AlertCircle, RefreshCcw, Image as ImageIcon,
  Loader2, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface IntakeDetailDrawerProps {
  intake: IntakeRequest | null;
  onClose: () => void;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pendiente', icon: AlertCircle, color: 'text-warning' },
  processing: { label: 'Procesando', icon: RefreshCcw, color: 'text-primary' },
  completed: { label: 'Completado', icon: Check, color: 'text-success' },
  failed: { label: 'Fallido', icon: X, color: 'text-destructive' },
};

const receiptStatusLabels: Record<string, string> = {
  sent: 'Enviado',
  sent_admin_only: 'Enviado (solo admin)',
  pending: 'Pendiente',
  failed: 'Fallido',
  no_email: 'Sin email',
};

export function IntakeDetailDrawer({ intake, onClose }: IntakeDetailDrawerProps) {
  const { retryReceipt, isRetrying } = useRetryReceipt();
  const { documents, getSignedUrl } = useIntakeEvidence(intake?.id || '');
  const [viewingEvidence, setViewingEvidence] = useState<string | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  if (!intake) return null;

  const status = statusConfig[intake.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const handleViewEvidence = async (objectPath: string) => {
    setLoadingEvidence(true);
    try {
      const url = await getSignedUrl(objectPath);
      setViewingEvidence(url);
    } catch (err) {
      toast.error('No se pudo cargar la evidencia');
    } finally {
      setLoadingEvidence(false);
    }
  };

  const handleRetryReceipt = async () => {
    try {
      await retryReceipt(intake.id);
    } catch (err) {
      // Error handled in hook
    }
  };

  const canRetryReceipt = intake.receipt_status === 'failed' || 
    intake.receipt_status === 'pending' || 
    !intake.receipt_status;

  return (
    <>
      <Drawer open={!!intake} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg">{intake.player_name}</DrawerTitle>
              <Badge 
                variant="outline"
                className={cn('gap-1', status.color)}
              >
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(intake.created_at), "EEEE d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
            </p>
          </DrawerHeader>

          <ScrollArea className="flex-1 px-4 pb-4 overflow-x-hidden">
            <div className="space-y-4">
              {/* Error Message */}
              {intake.status === 'failed' && intake.processing_error && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-xs text-destructive flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {intake.processing_error}
                  </p>
                </div>
              )}

              {/* Player Info */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Jugador
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{intake.player_name}</span>
                  </div>
                  {intake.player_birth_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(intake.player_birth_date), "d 'de' MMMM, yyyy", { locale: es })}
                        {intake.player_age && ` (${intake.player_age} años)`}
                      </span>
                    </div>
                  )}
                  {intake.sports && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Trophy className="w-4 h-4" />
                      <span>{intake.sports.name}</span>
                      {intake.categories && (
                        <Badge variant="secondary" className="text-xs">
                          {intake.categories.name}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Guardian Info */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tutor
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{intake.guardian_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${intake.guardian_phone}`} className="hover:underline">
                      {intake.guardian_phone}
                    </a>
                  </div>
                  {intake.guardian_email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${intake.guardian_email}`} className="hover:underline truncate">
                        {intake.guardian_email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Payment Info */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pago
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="capitalize">{intake.payment_method}</span>
                    {intake.promo_applied && (
                      <Badge className="text-xs bg-success/10 text-success border-success/20">
                        PROMO
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Inscripción:</span>
                      <span className="ml-2">{formatCurrency(intake.registration_fee)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Mensualidad:</span>
                      <span className="ml-2">{formatCurrency(intake.monthly_fee)}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t flex justify-between items-center">
                    <span className="font-medium">Total</span>
                    <span className="text-lg font-semibold text-primary">
                      {formatCurrency(intake.total_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence */}
              {documents.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Evidencia
                    </h4>
                    <div className="flex gap-2 flex-wrap">
                      {documents.map((doc) => (
                        <Button
                          key={doc.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewEvidence(doc.object_path)}
                          disabled={loadingEvidence}
                          className="gap-2"
                        >
                          <ImageIcon className="w-4 h-4" />
                          {doc.file_name || 'Ver imagen'}
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Receipt Status */}
              <Separator />
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Recibo
                </h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline"
                      className={cn(
                        intake.receipt_status === 'sent' && 'bg-success/10 text-success',
                        intake.receipt_status === 'failed' && 'bg-destructive/10 text-destructive',
                        intake.receipt_status === 'no_email' && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {receiptStatusLabels[intake.receipt_status || 'pending'] || 'Pendiente'}
                    </Badge>
                    {intake.receipt_sent_at && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(intake.receipt_sent_at), "d MMM HH:mm", { locale: es })}
                      </span>
                    )}
                  </div>
                  {canRetryReceipt && intake.guardian_email && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetryReceipt}
                      disabled={isRetrying}
                    >
                      {isRetrying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCcw className="w-4 h-4 mr-1" />
                          Reenviar
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {intake.receipt_error && (
                  <p className="text-xs text-destructive">
                    Error: {intake.receipt_error}
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Evidence Viewer Modal */}
      {viewingEvidence && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewingEvidence(null)}
        >
          <img 
            src={viewingEvidence} 
            alt="Evidencia de pago" 
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
