import { PlatformOrganization, PlanLimits } from '@/hooks/usePlatformOrganizations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Building2, Users, FolderOpen, User, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrganizationDetailModalProps {
  organization: PlatformOrganization;
  limits?: PlanLimits;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLAN_COLORS: Record<string, string> = {
  freemium: 'bg-slate-500',
  starter: 'bg-blue-500',
  professional: 'bg-purple-500',
  enterprise: 'bg-amber-500',
};

export function OrganizationDetailModal({
  organization,
  limits,
  open,
  onOpenChange,
}: OrganizationDetailModalProps) {
  const getUsagePercent = (current: number, max: number) => {
    if (max === 0) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-amber-500" />
            {organization.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status and Plan */}
          <div className="flex items-center gap-3">
            <Badge className={`${PLAN_COLORS[organization.plan]} text-white`}>
              {organization.plan}
            </Badge>
            {organization.is_active ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Activa</Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Inactiva</Badge>
            )}
            {organization.onboarding_completed ? (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Onboarding completo</Badge>
            ) : (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Onboarding pendiente</Badge>
            )}
          </div>

          <Separator className="bg-slate-800" />

          {/* General Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-400">
                <Building2 className="h-4 w-4" />
                <span className="text-sm">Código: <span className="text-white font-mono">{organization.org_code}</span></span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{organization.city}, {organization.country}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="h-4 w-4" />
                <span className="text-sm">{organization.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Creada: {format(new Date(organization.created_at), 'dd MMM yyyy', { locale: es })}</span>
              </div>
            </div>
            
            {organization.founder && (
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Fundador</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-amber-500" />
                    <span className="text-white">{organization.founder.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-400">{organization.founder.email}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-slate-800" />

          {/* Usage vs Limits */}
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-4">Uso vs Límites del Plan</h4>
            <div className="space-y-4">
              {/* Players */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-300">Jugadores</span>
                  </div>
                  <span className="text-white font-medium">
                    {organization.players_count} / {limits?.max_players || '∞'}
                  </span>
                </div>
                {limits && (
                  <Progress 
                    value={getUsagePercent(organization.players_count, limits.max_players)} 
                    className="h-2 bg-slate-800"
                    indicatorClassName={getUsageColor(getUsagePercent(organization.players_count, limits.max_players))}
                  />
                )}
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-300">Categorías</span>
                  </div>
                  <span className="text-white font-medium">
                    {organization.categories_count} / {limits?.max_categories || '∞'}
                  </span>
                </div>
                {limits && (
                  <Progress 
                    value={getUsagePercent(organization.categories_count, limits.max_categories)} 
                    className="h-2 bg-slate-800"
                    indicatorClassName={getUsageColor(getUsagePercent(organization.categories_count, limits.max_categories))}
                  />
                )}
              </div>

              {/* Users */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-300">Usuarios</span>
                  </div>
                  <span className="text-white font-medium">
                    {organization.users_count} / {limits?.max_users || '∞'}
                  </span>
                </div>
                {limits && (
                  <Progress 
                    value={getUsagePercent(organization.users_count, limits.max_users)} 
                    className="h-2 bg-slate-800"
                    indicatorClassName={getUsageColor(getUsagePercent(organization.users_count, limits.max_users))}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Extra Info */}
          <div className="bg-slate-800/30 rounded-lg p-4 text-sm text-slate-400">
            <p>Tipo: <span className="text-white capitalize">{organization.organization_type}</span></p>
            <p>Estudiantes aproximados: <span className="text-white">{organization.approximate_students}</span></p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
