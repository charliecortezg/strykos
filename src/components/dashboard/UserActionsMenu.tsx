import { MoreHorizontal, Pencil, UserCog, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type OrgRole } from '@/types/auth';

interface UserActionsMenuProps {
  userId: string;
  userRole: OrgRole;
  isActive: boolean;
  isCurrentUser: boolean;
  onEdit: () => void;
  onChangeRole: () => void;
  onToggleActive: () => void;
}

export function UserActionsMenu({
  userRole,
  isActive,
  isCurrentUser,
  onEdit,
  onChangeRole,
  onToggleActive,
}: UserActionsMenuProps) {
  const isOrgOwner = userRole === 'org_owner';
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover border border-border z-50">
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
          <Pencil className="mr-2 h-4 w-4" />
          Editar datos
        </DropdownMenuItem>
        
        {!isOrgOwner && (
          <DropdownMenuItem onClick={onChangeRole} className="cursor-pointer">
            <UserCog className="mr-2 h-4 w-4" />
            Cambiar rol
          </DropdownMenuItem>
        )}
        
        {!isCurrentUser && !isOrgOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onToggleActive} 
              className={`cursor-pointer ${isActive ? 'text-destructive focus:text-destructive' : 'text-success focus:text-success'}`}
            >
              {isActive ? (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Desactivar
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Activar
                </>
              )}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
