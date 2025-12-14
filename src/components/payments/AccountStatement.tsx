import { useState, useEffect } from 'react';
import { usePlayers } from '@/hooks/usePlayers';
import { usePayments } from '@/hooks/usePayments';
import { Input } from '@/components/ui/input';
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
import { Search, FileDown, User, CreditCard, TrendingUp, Receipt } from 'lucide-react';
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

export function AccountStatement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const { players } = usePlayers({ isActive: true });
  const { getPlayerAccountStatement, refetch } = usePayments();

  const filteredPlayers = players.filter((player) =>
    player.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadAccountStatement = async (player: Player) => {
    setSelectedPlayer(player);
    setIsLoadingAccount(true);

    const data = await getPlayerAccountStatement(player.id);
    if (data) {
      setAccountData({
        player: data.player as unknown as Player,
        payments: data.payments,
        totalPaid: data.totalPaid,
        paymentCount: data.paymentCount,
      });
    }

    setIsLoadingAccount(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const handleDownloadPDF = () => {
    // Basic PDF generation using browser print
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

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Player list */}
      <div className="lg:col-span-1 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar jugador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="stryk-card divide-y max-h-[500px] overflow-y-auto">
          {filteredPlayers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No se encontraron jugadores
            </div>
          ) : (
            filteredPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => loadAccountStatement(player)}
                className={`w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between ${
                  selectedPlayer?.id === player.id ? 'bg-primary/5' : ''
                }`}
              >
                <div>
                  <p className="font-medium">{player.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {player.category?.name || 'Sin categoría'}
                  </p>
                </div>
                {getStatusBadge(player.payment_status)}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Account statement */}
      <div className="lg:col-span-2">
        {!selectedPlayer ? (
          <div className="stryk-card p-8 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Selecciona un jugador para ver su estado de cuenta
            </p>
          </div>
        ) : isLoadingAccount ? (
          <div className="stryk-card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        ) : accountData ? (
          <div className="space-y-4">
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
                      <Receipt className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pagos</p>
                      <p className="font-semibold">{accountData.paymentCount}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
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
                      + Pago
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
          </div>
        ) : null}
      </div>

      {selectedPlayer && (
        <CreatePaymentModal
          open={isPaymentOpen}
          onOpenChange={setIsPaymentOpen}
          defaultPlayerId={selectedPlayer.id}
          onSuccess={() => {
            setIsPaymentOpen(false);
            loadAccountStatement(selectedPlayer);
            refetch();
          }}
        />
      )}
    </div>
  );
}
