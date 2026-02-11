import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function OrgSwitcher() {
  const { organization, allOrganizations, activeRole, switchOrganization, isSwitchingOrg } = useAuth();
  const navigate = useNavigate();

  // Only show for entrenador or director_deportivo with 2+ orgs
  const isAuthorizedRole = activeRole === 'entrenador' || activeRole === 'director_deportivo';
  if (!isAuthorizedRole || allOrganizations.length < 2) return null;

  const handleSwitch = async (orgId: string) => {
    if (orgId === organization?.id || isSwitchingOrg) return;
    await switchOrganization(orgId);
    
    // Find the target org to determine dashboard
    const targetOrg = allOrganizations.find(o => o.organization.id === orgId);
    if (targetOrg?.organization.organization_mode === 'evaluation_only') {
      navigate('/dashboard/assessment-lab');
    } else if (activeRole) {
      navigate(`/dashboard/${activeRole.replace('_', '-')}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-card max-w-[200px]">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium truncate text-xs">
            {isSwitchingOrg ? 'Cambiando...' : organization?.name}
          </span>
          {isSwitchingOrg ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-popover border border-border z-50">
        {allOrganizations.map(({ organization: org }) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitch(org.id)}
            className="flex items-center justify-between cursor-pointer"
            disabled={isSwitchingOrg}
          >
            <div className="flex flex-col">
              <span className="text-sm">{org.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {org.organization_mode === 'evaluation_only' ? 'Assessment Lab' : 'Academia'}
              </span>
            </div>
            {organization?.id === org.id && <Check className="h-4 w-4 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
