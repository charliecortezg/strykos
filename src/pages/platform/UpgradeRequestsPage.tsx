import { useState } from 'react';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { useUpgradeRequests, UpgradeRequest } from '@/hooks/useUpgradeRequests';
import { usePlatformActions } from '@/hooks/usePlatformActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Clock, ArrowRight, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const PLAN_COLORS: Record<string, string> = {
  freemium: 'bg-slate-500',
  starter: 'bg-blue-500',
  professional: 'bg-purple-500',
  enterprise: 'bg-amber-500',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Check }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  approved: { label: 'Aprobada', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Check },
  rejected: { label: 'Rechazada', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: X },
  contacted: { label: 'Contactada', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: MessageSquare },
};

export default function UpgradeRequestsPage() {
  const { requests, isLoading, refetch } = useUpgradeRequests();
  const { resolveUpgradeRequest, isLoading: actionLoading } = usePlatformActions();
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const resolvedRequests = requests.filter(r => r.status !== 'pending');

  const handleAction = async (request: UpgradeRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminNotes('');
  };

  const confirmAction = async () => {
    if (!selectedRequest || !actionType) return;

    const result = await resolveUpgradeRequest(
      selectedRequest.id,
      actionType === 'approve' ? 'approved' : 'rejected',
      adminNotes || undefined
    );

    if (result.success) {
      setSelectedRequest(null);
      setActionType(null);
      setAdminNotes('');
      refetch();
    }
  };

  if (isLoading) {
    return (
      <PlatformLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64 bg-slate-800" />
          <Skeleton className="h-96 bg-slate-800" />
        </div>
      </PlatformLayout>
    );
  }

  const renderRequestsTable = (requestsList: UpgradeRequest[], showActions: boolean) => (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-800 hover:bg-transparent">
          <TableHead className="text-slate-400">Academia</TableHead>
          <TableHead className="text-slate-400">Solicitante</TableHead>
          <TableHead className="text-slate-400">Plan Actual → Solicitado</TableHead>
          <TableHead className="text-slate-400">Fecha</TableHead>
          <TableHead className="text-slate-400">Estado</TableHead>
          {showActions && <TableHead className="text-slate-400 text-right">Acciones</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requestsList.length === 0 ? (
          <TableRow className="border-slate-800">
            <TableCell colSpan={showActions ? 6 : 5} className="text-center text-slate-500 py-8">
              No hay solicitudes {showActions ? 'pendientes' : 'resueltas'}
            </TableCell>
          </TableRow>
        ) : (
          requestsList.map(request => {
            const StatusIcon = STATUS_CONFIG[request.status]?.icon || Clock;
            return (
              <TableRow key={request.id} className="border-slate-800 hover:bg-slate-800/50">
                <TableCell>
                  <div>
                    <p className="text-white font-medium">{request.organization?.name || 'N/A'}</p>
                    <p className="text-xs text-slate-500">{request.organization?.org_code}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-white">{request.requester?.full_name || 'N/A'}</p>
                    <p className="text-xs text-slate-500">{request.requester?.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge className={`${PLAN_COLORS[request.current_plan]} text-white`}>
                      {request.current_plan}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                    <Badge className={`${PLAN_COLORS[request.requested_plan]} text-white`}>
                      {request.requested_plan}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-slate-400 text-sm">
                  {format(new Date(request.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_CONFIG[request.status]?.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {STATUS_CONFIG[request.status]?.label || request.status}
                  </Badge>
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(request, 'approve')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={actionLoading}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(request, 'reject')}
                        className="border-red-500 text-red-500 hover:bg-red-500/20"
                        disabled={actionLoading}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Solicitudes de Upgrade</h1>
          <p className="text-slate-400 mt-1">Gestión de solicitudes de cambio de plan</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger 
              value="pending" 
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
            >
              Pendientes ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger 
              value="resolved"
              className="data-[state=active]:bg-slate-600 data-[state=active]:text-white"
            >
              Resueltas ({resolvedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Solicitudes Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                {renderRequestsTable(pendingRequests, true)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resolved">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Historial de Solicitudes</CardTitle>
              </CardHeader>
              <CardContent>
                {renderRequestsTable(resolvedRequests, false)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
          setSelectedRequest(null);
          setActionType(null);
        }}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? '¿Aprobar solicitud?' : '¿Rechazar solicitud?'}
              </DialogTitle>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-sm text-slate-400">Academia</p>
                  <p className="text-white font-medium">{selectedRequest.organization?.name}</p>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <Badge className={`${PLAN_COLORS[selectedRequest.current_plan]} text-white`}>
                      {selectedRequest.current_plan}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                    <Badge className={`${PLAN_COLORS[selectedRequest.requested_plan]} text-white`}>
                      {selectedRequest.requested_plan}
                    </Badge>
                  </div>
                </div>

                {actionType === 'approve' && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-300">
                    Al aprobar, el plan de la organización se actualizará automáticamente a <strong>{selectedRequest.requested_plan}</strong>.
                  </div>
                )}

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Notas (opcional)</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Agregar notas sobre esta decisión..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                }}
                className="text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmAction}
                disabled={actionLoading}
                className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {actionType === 'approve' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlatformLayout>
  );
}
