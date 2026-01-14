import { useState } from 'react';
import { usePayments } from '@/hooks/usePayments';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Receipt, ExternalLink, RefreshCw, Check, AlertCircle, Clock, Mail } from 'lucide-react';
import { CreatePaymentModal } from './CreatePaymentModal';
import { PAYMENT_METHOD_LABELS } from '@/types/categories';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type ReceiptStatus = 'queued' | 'pending' | 'sent_both' | 'sent_player' | 'sent_admin' | 'failed' | 'no_email' | null;

function getReceiptStatusInfo(status: ReceiptStatus): {
  icon: React.ReactNode;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  canResend: boolean;
} {
  switch (status) {
    case 'sent_both':
      return {
        icon: <Check className="w-4 h-4 text-emerald-500" />,
        label: 'Enviado a jugador y responsable',
        variant: 'default',
        canResend: false,
      };
    case 'sent_player':
      return {
        icon: <Check className="w-4 h-4 text-emerald-500" />,
        label: 'Enviado a jugador',
        variant: 'default',
        canResend: false,
      };
    case 'sent_admin':
      return {
        icon: <Mail className="w-4 h-4 text-amber-500" />,
        label: 'Enviado solo a responsable (jugador sin correo)',
        variant: 'secondary',
        canResend: false,
      };
    case 'failed':
      return {
        icon: <AlertCircle className="w-4 h-4 text-destructive" />,
        label: 'Falló el envío. Puedes reintentar.',
        variant: 'destructive',
        canResend: true,
      };
    case 'no_email':
      return {
        icon: <Mail className="w-4 h-4 text-muted-foreground" />,
        label: 'Sin correo configurado',
        variant: 'outline',
        canResend: false,
      };
    case 'queued':
    case 'pending':
      return {
        icon: <Clock className="w-4 h-4 text-muted-foreground" />,
        label: 'En cola de envío',
        variant: 'outline',
        canResend: true,
      };
    default:
      return {
        icon: <Clock className="w-4 h-4 text-muted-foreground" />,
        label: 'Pendiente',
        variant: 'outline',
        canResend: true,
      };
  }
}

export function PaymentsTable() {
  const { roles } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  
  const { payments, isLoading, refetch } = usePayments({
    month: selectedMonth || undefined,
  });

  const canManageReceipts = roles.includes('org_owner') || roles.includes('administrativo');

  // Generate last 12 months for filter
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: format(date, 'MMMM yyyy', { locale: es }),
    };
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const handleResendReceipt = async (paymentId: string) => {
    if (resendingId) return;
    
    setResendingId(paymentId);
    toast.info('Reenviando recibo...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sesión expirada. Inicia sesión de nuevo.');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-payment-receipt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ paymentId }),
        }
      );

      const result = await response.json();
      
      if (result.sent) {
        toast.success('Recibo reenviado correctamente');
        await refetch();
      } else {
        toast.error(result.error || 'No se pudo reenviar el recibo');
      }
    } catch (error) {
      console.error('Error resending receipt:', error);
      toast.error('Error al reenviar el recibo');
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los meses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los meses</SelectItem>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Registrar Pago
        </Button>
      </div>

      {/* Table */}
      <div className="stryk-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jugador</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead className="hidden md:table-cell">Método</TableHead>
              <TableHead className="hidden md:table-cell">Mes</TableHead>
              <TableHead className="hidden sm:table-cell">Concepto</TableHead>
              <TableHead className="hidden lg:table-cell">Fecha</TableHead>
              {canManageReceipts && (
                <TableHead className="text-center">Recibo</TableHead>
              )}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={canManageReceipts ? 8 : 7} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Cargando...
                  </div>
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManageReceipts ? 8 : 7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Receipt className="w-8 h-8" />
                    <p>No hay pagos registrados</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => {
                const receiptStatus = (payment as any).receipt_status as ReceiptStatus;
                const statusInfo = getReceiptStatusInfo(receiptStatus);
                const isResending = resendingId === payment.id;

                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.player?.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.player?.category?.name || 'Sin categoría'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-success">
                        {formatCurrency(payment.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">
                        {PAYMENT_METHOD_LABELS[payment.payment_method]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(payment.payment_month), 'MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {payment.concept}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    {canManageReceipts && (
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center gap-1">
                                {statusInfo.icon}
                                {statusInfo.canResend && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleResendReceipt(payment.id)}
                                    disabled={isResending}
                                  >
                                    <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                                  </Button>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{statusInfo.label}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    <TableCell>
                      {payment.evidence_url && (
                        <a
                          href={payment.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreatePaymentModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          refetch();
          setIsCreateOpen(false);
        }}
      />
    </div>
  );
}
