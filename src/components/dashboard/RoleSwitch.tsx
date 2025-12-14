import { ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ORG_ROLE_LABELS, type OrgRole } from '@/types/auth';

export function RoleSwitch() {
  const { roles, activeRole, setActiveRole } = useAuth();
  const navigate = useNavigate();

  // Only show for org_owner OR users with multiple roles
  const isOrgOwner = roles.includes('org_owner');
  const hasMultipleRoles = roles.length > 1;
  
  if (!isOrgOwner && !hasMultipleRoles) {
    return null;
  }

  const handleRoleChange = (role: OrgRole) => {
    setActiveRole(role);
    const dashboardPath = `/dashboard/${role.replace('_', '-')}`;
    navigate(dashboardPath);
  };

  // Show only actually assigned roles (not simulated)
  const switchableRoles: OrgRole[] = roles;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-card">
          <span className="text-xs text-muted-foreground">Operando como:</span>
          <span className="font-medium">{activeRole ? ORG_ROLE_LABELS[activeRole] : 'Seleccionar'}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border border-border z-50">
        {switchableRoles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => handleRoleChange(role)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{ORG_ROLE_LABELS[role]}</span>
            {activeRole === role && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
