import { useState } from 'react';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { usePlatformOrganizations, PlatformOrganization } from '@/hooks/usePlatformOrganizations';
import { usePlatformActions } from '@/hooks/usePlatformActions';
import { OrganizationDetailModal } from '@/components/platform/OrganizationDetailModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Eye, Power, PowerOff } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const PLAN_COLORS: Record<string, string> = {
  freemium: 'bg-slate-500',
  starter: 'bg-blue-500',
  professional: 'bg-purple-500',
  enterprise: 'bg-amber-500',
};

const PLANS = ['freemium', 'starter', 'professional', 'enterprise'] as const;

export default function OrganizationsPage() {
  const { organizations, isLoading, refetch, getLimitsForPlan } = usePlatformOrganizations();
  const { changePlan, toggleOrganization, isLoading: actionLoading } = usePlatformActions();
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState<PlatformOrganization | null>(null);

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.org_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'all' || org.plan === planFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' ? org.is_active : !org.is_active);
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const handleChangePlan = async (orgId: string, newPlan: typeof PLANS[number]) => {
    const result = await changePlan(orgId, newPlan);
    if (result.success) {
      refetch();
    }
  };

  const handleToggleStatus = async (org: PlatformOrganization) => {
    const result = await toggleOrganization(org.id, !org.is_active);
    if (result.success) {
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

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Organizaciones</h1>
          <p className="text-slate-400 mt-1">Gestión de todas las academias del sistema</p>
        </div>

        {/* Filters */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Filtrar por plan" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">Todos los planes</SelectItem>
                  {PLANS.map(plan => (
                    <SelectItem key={plan} value={plan} className="capitalize">{plan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="inactive">Inactivas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">
              {filteredOrgs.length} organizaciones encontradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Academia</TableHead>
                  <TableHead className="text-slate-400">Plan</TableHead>
                  <TableHead className="text-slate-400">Estado</TableHead>
                  <TableHead className="text-slate-400 text-center">Jugadores</TableHead>
                  <TableHead className="text-slate-400 text-center">Categorías</TableHead>
                  <TableHead className="text-slate-400 text-center">Usuarios</TableHead>
                  <TableHead className="text-slate-400">Creada</TableHead>
                  <TableHead className="text-slate-400 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.map(org => {
                  const limits = getLimitsForPlan(org.plan);
                  return (
                    <TableRow key={org.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell>
                        <div>
                          <p className="text-white font-medium">{org.name}</p>
                          <p className="text-xs text-slate-500">{org.org_code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={org.plan} 
                          onValueChange={(value) => handleChangePlan(org.id, value as typeof PLANS[number])}
                          disabled={actionLoading}
                        >
                          <SelectTrigger className="w-[130px] bg-slate-800 border-slate-700">
                            <Badge className={`${PLAN_COLORS[org.plan]} text-white`}>
                              {org.plan}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {PLANS.map(plan => (
                              <SelectItem key={plan} value={plan} className="capitalize">
                                <Badge className={`${PLAN_COLORS[plan]} text-white`}>{plan}</Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {org.is_active ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Activa</Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Inactiva</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={org.players_count >= (limits?.max_players || 0) ? 'text-amber-400' : 'text-white'}>
                          {org.players_count}
                        </span>
                        <span className="text-slate-500">/{limits?.max_players || '∞'}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={org.categories_count >= (limits?.max_categories || 0) ? 'text-amber-400' : 'text-white'}>
                          {org.categories_count}
                        </span>
                        <span className="text-slate-500">/{limits?.max_categories || '∞'}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={org.users_count >= (limits?.max_users || 0) ? 'text-amber-400' : 'text-white'}>
                          {org.users_count}
                        </span>
                        <span className="text-slate-500">/{limits?.max_users || '∞'}</span>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {format(new Date(org.created_at), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                            <DropdownMenuItem 
                              onClick={() => setSelectedOrg(org)}
                              className="text-slate-200 focus:bg-slate-700 cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-700" />
                            <DropdownMenuItem 
                              onClick={() => handleToggleStatus(org)}
                              className={`cursor-pointer ${org.is_active ? 'text-red-400 focus:bg-red-500/20' : 'text-green-400 focus:bg-green-500/20'}`}
                            >
                              {org.is_active ? (
                                <>
                                  <PowerOff className="h-4 w-4 mr-2" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <Power className="h-4 w-4 mr-2" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detail Modal */}
        {selectedOrg && (
          <OrganizationDetailModal
            organization={selectedOrg}
            limits={getLimitsForPlan(selectedOrg.plan)}
            open={!!selectedOrg}
            onOpenChange={(open) => !open && setSelectedOrg(null)}
          />
        )}
      </div>
    </PlatformLayout>
  );
}
