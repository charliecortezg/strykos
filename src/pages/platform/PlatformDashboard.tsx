import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { usePlatformOrganizations } from '@/hooks/usePlatformOrganizations';
import { useUpgradeRequests } from '@/hooks/useUpgradeRequests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, FolderOpen, ArrowUpCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const PLAN_COLORS: Record<string, string> = {
  freemium: 'bg-slate-500',
  starter: 'bg-blue-500',
  professional: 'bg-purple-500',
  enterprise: 'bg-amber-500',
};

export default function PlatformDashboard() {
  const { organizations, isLoading: orgsLoading } = usePlatformOrganizations();
  const { requests, isLoading: reqsLoading } = useUpgradeRequests();

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const totalPlayers = organizations.reduce((sum, org) => sum + org.players_count, 0);
  const totalCategories = organizations.reduce((sum, org) => sum + org.categories_count, 0);
  const activeOrgs = organizations.filter(org => org.is_active).length;

  const planBreakdown = organizations.reduce((acc, org) => {
    acc[org.plan] = (acc[org.plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (orgsLoading || reqsLoading) {
    return (
      <PlatformLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64 bg-slate-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 bg-slate-800" />
            ))}
          </div>
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard de Plataforma</h1>
          <p className="text-slate-400 mt-1">Vista global del SaaS STRYK</p>
        </div>

        {/* Pending Requests Alert */}
        {pendingRequests.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <span className="text-amber-200">
                Tienes <strong>{pendingRequests.length}</strong> solicitudes de upgrade pendientes
              </span>
            </div>
            <Link to="/platform-admin/upgrade-requests">
              <Button size="sm" variant="outline" className="border-amber-500 text-amber-500 hover:bg-amber-500/20">
                Ver solicitudes
              </Button>
            </Link>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Organizaciones</CardTitle>
              <Building2 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{organizations.length}</div>
              <p className="text-xs text-slate-500 mt-1">
                {activeOrgs} activas · {organizations.length - activeOrgs} inactivas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Jugadores Totales</CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalPlayers}</div>
              <p className="text-xs text-slate-500 mt-1">
                En todas las academias
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Categorías Totales</CardTitle>
              <FolderOpen className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalCategories}</div>
              <p className="text-xs text-slate-500 mt-1">
                Distribuidas en {organizations.length} orgs
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Solicitudes Pendientes</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{pendingRequests.length}</div>
              <p className="text-xs text-slate-500 mt-1">
                Upgrades por resolver
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Plan Distribution */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Distribución por Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {['freemium', 'starter', 'professional', 'enterprise'].map(plan => (
                <div key={plan} className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-3">
                  <div className={`w-3 h-3 rounded-full ${PLAN_COLORS[plan]}`} />
                  <div>
                    <p className="text-white font-medium capitalize">{plan}</p>
                    <p className="text-2xl font-bold text-white">{planBreakdown[plan] || 0}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Organizations */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Organizaciones Recientes</CardTitle>
            <Link to="/platform-admin/organizations">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Ver todas
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {organizations.slice(0, 5).map(org => (
                <div key={org.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-white font-medium">{org.name}</p>
                      <p className="text-xs text-slate-500">{org.org_code} · {org.city}, {org.country}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${PLAN_COLORS[org.plan]} text-white`}>
                      {org.plan}
                    </Badge>
                    {!org.is_active && (
                      <Badge variant="outline" className="border-red-500 text-red-500">
                        Inactiva
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
