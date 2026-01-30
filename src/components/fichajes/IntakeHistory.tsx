import { useState } from 'react';
import { useIntakeRequests, IntakeRequest } from '@/hooks/useIntake';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Search, Filter, ChevronRight, User, Phone, Calendar, CreditCard, Loader2, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { IntakeDetailDrawer } from './IntakeDetailDrawer';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  processing: { label: 'Procesando', variant: 'secondary' },
  completed: { label: 'Completado', variant: 'default' },
  failed: { label: 'Fallido', variant: 'destructive' },
};

const paymentMethodLabels: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  otro: 'Otro',
};

export function IntakeHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIntake, setSelectedIntake] = useState<IntakeRequest | null>(null);

  const { requests, isLoading, refetch } = useIntakeRequests({
    search: searchTerm,
    status: statusFilter,
    paymentMethod: paymentFilter,
  });

  const activeFiltersCount = [statusFilter, paymentFilter].filter(f => f !== 'all').length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative shrink-0">
              <Filter className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[50vh]">
            <div className="space-y-4 py-4">
              <h3 className="font-semibold">Filtros</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Estado</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="completed">Completados</SelectItem>
                      <SelectItem value="pending">Pendientes</SelectItem>
                      <SelectItem value="failed">Fallidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Método de Pago</label>
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setStatusFilter('all');
                    setPaymentFilter('all');
                  }}
                >
                  Limpiar
                </Button>
                <Button className="flex-1" onClick={() => setShowFilters(false)}>
                  Aplicar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Button variant="outline" size="icon" onClick={() => refetch()} className="shrink-0">
          <RefreshCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Estado: {statusLabels[statusFilter]?.label}
              <button 
                onClick={() => setStatusFilter('all')}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          )}
          {paymentFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Pago: {paymentMethodLabels[paymentFilter]}
              <button 
                onClick={() => setPaymentFilter('all')}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-foreground">No hay fichajes</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm || activeFiltersCount > 0
                ? 'No se encontraron resultados con los filtros actuales'
                : 'Aún no se han registrado fichajes'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map((intake) => (
            <Card 
              key={intake.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedIntake(intake)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{intake.player_name}</h4>
                      <Badge 
                        variant={statusLabels[intake.status]?.variant || 'secondary'}
                        className="text-xs shrink-0"
                      >
                        {statusLabels[intake.status]?.label || intake.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {intake.guardian_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {intake.guardian_phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(intake.created_at), "d MMM, HH:mm", { locale: es })}
                      </span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        {paymentMethodLabels[intake.payment_method] || intake.payment_method}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-semibold text-sm text-primary">
                      {formatCurrency(intake.total_amount)}
                    </span>
                    {intake.promo_applied && (
                      <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                        PROMO
                      </Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      <IntakeDetailDrawer
        intake={selectedIntake}
        onClose={() => setSelectedIntake(null)}
      />
    </div>
  );
}
