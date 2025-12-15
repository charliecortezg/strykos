import { useState, useEffect } from 'react';
import { usePayments } from '@/hooks/usePayments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, FileDown, CreditCard, TrendingUp, Receipt, Plus } from 'lucide-react';
import { PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS, type Player, type Payment } from '@/types/categories';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CreatePaymentModal } from './CreatePaymentModal';
import { toast } from 'sonner';

interface AccountData {
  player: Player;
  payments: Payment[];
  totalPaid: number;
  paymentCount: number;
}

interface PlayerAccountStatementProps {
  player: Player;
  onBack: () => void;
  backLabel?: string;
}

export function PlayerAccountStatement({ player, onBack, backLabel = 'Volver a Pagos' }: PlayerAccountStatementProps) {
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const { getPlayerAccountStatement, refetch } = usePayments();

  const loadAccountStatement = async () => {
    setIsLoading(true);
    const data = await getPlayerAccountStatement(player.id);
    if (data) {
      setAccountData({
        player: data.player as unknown as Player,
        payments: data.payments,
        totalPaid: data.totalPaid,
        paymentCount: data.paymentCount,
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAccountStatement();
  }, [player.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const handleDownloadPDF = () => {
    if (!accountData) return;

    const printContent = `
      <html>
        <head>
          <title>Estado de Cuenta - ${accountData.player.full_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            .info { margin-bottom: 20px; }
            .info p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .total { font-weight: bold; margin-top: 20px; font-size: 18px; }
          </style>
        </head>
        <body>
          <h1>Estado de Cuenta</h1>
          <div class="info">
            <p><strong>Jugador:</strong> ${accountData.player.full_name}</p>
            <p><strong>Categoría:</strong> ${accountData.player.category?.name || 'Sin categoría'}</p>
            <p><strong>Cuota mensual:</strong> ${formatCurrency(accountData.player.monthly_fee || 0)}</p>
            <p><strong>Estado:</strong> ${PAYMENT_STATUS_LABELS[accountData.player.payment_status]}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Mes</th>
                <th>Concepto</th>
                <th>Método</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              ${accountData.payments.map(p => `
                <tr>
                  <td>${format(new Date(p.created_at), 'dd/MM/yyyy')}</td>
                  <td>${format(new Date(p.payment_month), 'MMMM yyyy', { locale: es })}</td>
                  <td>${p.concept}</td>
                  <td>${PAYMENT_METHOD_LABELS[p.payment_method]}</td>
                  <td>${formatCurrency(p.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p class="total">Total pagado: ${formatCurrency(accountData.totalPaid)}</p>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }

    toast.success('PDF generado');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'al_dia':
        return <Badge className="bg-success/10 text-success border-success/20">Al día</Badge>;
      case 'pendiente':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Pendiente</Badge>;
      case 'atrasado':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Atrasado</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="stryk-card p-8 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando estado de cuenta...</p>
      </div>
    );
  }

  if (!accountData) {
    return (
      <div className="stryk-card p-8 text-center">
        <p className="text-muted-foreground">No se pudo cargar el estado de cuenta</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {backLabel}
      </Button>

      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="font-display text-xl">
                {accountData.player.full_name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {accountData.player.category?.name || 'Sin categoría'}
              </p>
            </div>
            {getStatusBadge(accountData.player.payment_status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cuota</p>
                <p className="font-semibold">
                  {formatCurrency(accountData.player.monthly_fee || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total pagado</p>
                <p className="font-semibold">{formatCurrency(accountData.totalPaid)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pagos</p>
                <p className="font-semibold">{accountData.paymentCount}</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadPDF}
              >
                <FileDown className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button
                size="sm"
                onClick={() => setIsPaymentOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Pago
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Mes</TableHead>
                <TableHead className="hidden sm:table-cell">Concepto</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountData.payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay pagos registrados
                  </TableCell>
                </TableRow>
              ) : (
                accountData.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm">
                      {format(new Date(payment.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(payment.payment_month), 'MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {payment.concept}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {PAYMENT_METHOD_LABELS[payment.payment_method]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreatePaymentModal
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        defaultPlayerId={player.id}
        onSuccess={() => {
          setIsPaymentOpen(false);
          loadAccountStatement();
          refetch();
        }}
      />
    </div>
  );
}
