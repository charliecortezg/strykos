import { useState, useEffect } from 'react';
import { PlatformOrganization, PlanLimits } from '@/hooks/usePlatformOrganizations';
import { usePlatformActions } from '@/hooks/usePlatformActions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Users, FolderOpen, User, Mail, Phone, MapPin, Calendar, Save } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  PROFILE_DEFAULTS,
  type FeatureKey,
  type FeatureProfile,
} from '@/lib/feature-profiles';

interface OrganizationDetailModalProps {
  organization: PlatformOrganization;
  limits?: PlanLimits;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const PLAN_COLORS: Record<string, string> = {
  freemium: 'bg-slate-500',
  starter: 'bg-blue-500',
  professional: 'bg-purple-500',
  enterprise: 'bg-amber-500',
};

type OverrideState = 'inherited' | 'on' | 'off';

function readOverride(features: Record<string, boolean> | null | undefined, key: FeatureKey): OverrideState {
  if (!features || !Object.prototype.hasOwnProperty.call(features, key)) return 'inherited';
  return features[key] ? 'on' : 'off';
}

export function OrganizationDetailModal({
  organization,
  limits,
  open,
  onOpenChange,
  onSaved,
}: OrganizationDetailModalProps) {
  const { updateOrgFeatures, isLoading: saving } = usePlatformActions();
  const initialProfile: FeatureProfile =
    organization.feature_profile === 'full' ? 'full' : 'basic';

  const [profile, setProfile] = useState<FeatureProfile>(initialProfile);
  const [overrides, setOverrides] = useState<Record<FeatureKey, OverrideState>>(() => {
    const next: Record<string, OverrideState> = {};
    for (const k of FEATURE_KEYS) next[k] = readOverride(organization.features, k);
    return next as Record<FeatureKey, OverrideState>;
  });

  // Reset state when org changes
  useEffect(() => {
    setProfile(organization.feature_profile === 'full' ? 'full' : 'basic');
    const next: Record<string, OverrideState> = {};
    for (const k of FEATURE_KEYS) next[k] = readOverride(organization.features, k);
    setOverrides(next as Record<FeatureKey, OverrideState>);
  }, [organization.id, organization.feature_profile, organization.features]);

  const getUsagePercent = (current: number, max: number) => {
    if (max === 0) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const isDirty =
    profile !== initialProfile ||
    FEATURE_KEYS.some(
      (k) => overrides[k] !== readOverride(organization.features, k)
    );

  const handleSave = async () => {
    // Build features jsonb from overrides (only non-inherited keys)
    const features: Record<string, boolean> = {};
    for (const k of FEATURE_KEYS) {
      if (overrides[k] === 'on') features[k] = true;
      else if (overrides[k] === 'off') features[k] = false;
    }
    const result = await updateOrgFeatures(organization.id, {
      feature_profile: profile,
      features,
    });
    if (result.success) {
      onSaved?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-amber-500" />
            {organization.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status and Plan */}
          <div className="flex items-center gap-3 flex-wrap">
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
            <Badge
              className={
                initialProfile === 'full'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
              }
            >
              Perfil: {initialProfile}
            </Badge>
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

          <Separator className="bg-slate-800" />

          {/* Feature Profile + Overrides */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-medium text-white">Perfil de funcionalidades</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  El perfil define los flags por defecto; cada override fuerza ON u OFF.
                </p>
              </div>
              <Select value={profile} onValueChange={(v) => setProfile(v as FeatureProfile)}>
                <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="basic">basic</SelectItem>
                  <SelectItem value="full">full</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {FEATURE_KEYS.map((key) => {
                const defaultVal = PROFILE_DEFAULTS[profile][key];
                const state = overrides[key];
                const effective = state === 'on' ? true : state === 'off' ? false : defaultVal;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-slate-800/40 border border-slate-800"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{FEATURE_LABELS[key]}</p>
                      <p className="text-[11px] text-slate-500">
                        Default ({profile}):{' '}
                        <span className={defaultVal ? 'text-emerald-400' : 'text-slate-400'}>
                          {defaultVal ? 'ON' : 'OFF'}
                        </span>
                        {' · '}Efectivo:{' '}
                        <span className={effective ? 'text-emerald-400' : 'text-slate-400'}>
                          {effective ? 'ON' : 'OFF'}
                        </span>
                      </p>
                    </div>
                    <Select
                      value={state}
                      onValueChange={(v) =>
                        setOverrides((prev) => ({ ...prev, [key]: v as OverrideState }))
                      }
                    >
                      <SelectTrigger className="w-[140px] bg-slate-900 border-slate-700 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="inherited">Heredado</SelectItem>
                        <SelectItem value="on">Forzar ON</SelectItem>
                        <SelectItem value="off">Forzar OFF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end mt-4">
              <Button
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Guardando…' : 'Guardar funcionalidades'}
              </Button>
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
