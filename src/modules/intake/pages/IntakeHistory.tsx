// STRYK Intake History Page
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Filter, Search, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useIntakeHistory } from '../hooks/useIntakeHistory';
import { useIntakeSports } from '../hooks/useIntakeCatalogs';
import { formatCurrency, formatDateDisplay, getStatusLabel, getPaymentMethodLabel } from '../lib/intake-utils';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  pending: { icon: Clock, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  processing: { icon: Loader2, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { icon: CheckCircle2, className: 'bg-primary/10 text-primary' },
  failed: { icon: XCircle, className: 'bg-destructive/10 text-destructive' },
  cancelled: { icon: XCircle, className: 'bg-muted text-muted-foreground' },
};

export default function IntakeHistory() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: intakeRequests, isLoading } = useIntakeHistory({
    organizationId: organization?.id,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    sportId: sportFilter !== 'all' ? sportFilter : undefined,
  });

  const { data: sports } = useIntakeSports(organization?.id);

  // Filter by search query
  const filteredRequests = intakeRequests?.filter((request) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      request.player_name.toLowerCase().includes(query) ||
      request.guardian_name.toLowerCase().includes(query) ||
      request.guardian_phone.includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">Historial de Fichajes</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredRequests?.length ?? 0} registros
                </p>
              </div>
            </div>
            <Button onClick={() => navigate('/intake')}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 pb-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="failed">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sportFilter} onValueChange={setSportFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Deporte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los deportes</SelectItem>
                {sports?.map((sport) => (
                  <SelectItem key={sport.id} value={sport.id}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRequests?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No hay fichajes registrados</p>
            <Button onClick={() => navigate('/intake')}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primer fichaje
            </Button>
          </div>
        ) : (
          filteredRequests?.map((request) => {
            const statusConfig = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={request.id}
                className="bg-card rounded-xl border border-border p-4 space-y-3"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {request.player_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {request.player_age} años • {request.sports?.name || 'Sin deporte'}
                    </p>
                  </div>
                  <Badge className={cn('flex items-center gap-1', statusConfig.className)}>
                    <StatusIcon className={cn('h-3 w-3', request.status === 'processing' && 'animate-spin')} />
                    {getStatusLabel(request.status)}
                  </Badge>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tutor: </span>
                    <span className="font-medium">{request.guardian_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tel: </span>
                    <span className="font-mono">{request.guardian_phone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pago: </span>
                    <span>{getPaymentMethodLabel(request.payment_method)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(request.total_amount)}
                    </span>
                  </div>
                </div>

                {/* Category & Venue */}
                {(request.categories || request.venues) && (
                  <div className="flex flex-wrap gap-2">
                    {request.categories && (
                      <Badge variant="outline">{request.categories.name}</Badge>
                    )}
                    {request.venues && (
                      <Badge variant="outline">{request.venues.name}</Badge>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                  <span>
                    {formatDateDisplay(request.created_at)}
                  </span>
                  {request.promo_applied && (
                    <Badge variant="secondary" className="text-xs">
                      🎁 Promo aplicada
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
