import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardList, ArrowUpDown, Power, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Check; color: string }> = {
  change_plan: { label: 'Cambio de Plan', icon: ArrowUpDown, color: 'bg-purple-500/20 text-purple-400' },
  toggle_organization: { label: 'Cambio de Estado', icon: Power, color: 'bg-blue-500/20 text-blue-400' },
  resolve_upgrade_request: { label: 'Resolución Upgrade', icon: Check, color: 'bg-green-500/20 text-green-400' },
};

export default function AuditLogPage() {
  const { entries, isLoading } = usePlatformAuditLog();

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

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Registro de Auditoría</h1>
          <p className="text-slate-400 mt-1">Historial de acciones administrativas</p>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Últimas {entries.length} acciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Fecha</TableHead>
                  <TableHead className="text-slate-400">Acción</TableHead>
                  <TableHead className="text-slate-400">Organización</TableHead>
                  <TableHead className="text-slate-400">Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                      No hay acciones registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map(entry => {
                    const config = ACTION_CONFIG[entry.action] || { 
                      label: entry.action, 
                      icon: ClipboardList, 
                      color: 'bg-slate-500/20 text-slate-400' 
                    };
                    const ActionIcon = config.icon;

                    return (
                      <TableRow key={entry.id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="text-slate-400 text-sm">
                          {format(new Date(entry.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge className={config.color}>
                            <ActionIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white">
                          {entry.details?.organization_name || entry.target_organization_id?.slice(0, 8) || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-400 max-w-md">
                            {entry.action === 'change_plan' && (
                              <span>
                                {entry.details?.previous_plan} → <span className="text-white">{entry.details?.new_plan}</span>
                              </span>
                            )}
                            {entry.action === 'toggle_organization' && (
                              <span>
                                Estado: {entry.details?.new_status ? (
                                  <span className="text-green-400">Activada</span>
                                ) : (
                                  <span className="text-red-400">Desactivada</span>
                                )}
                              </span>
                            )}
                            {entry.action === 'resolve_upgrade_request' && (
                              <span>
                                {entry.details?.current_plan} → {entry.details?.requested_plan}: {' '}
                                {entry.details?.resolution === 'approved' ? (
                                  <span className="text-green-400">Aprobada</span>
                                ) : (
                                  <span className="text-red-400">Rechazada</span>
                                )}
                                {entry.details?.admin_notes && (
                                  <span className="block text-xs text-slate-500 mt-1">
                                    Nota: {entry.details.admin_notes}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
