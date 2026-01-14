import { useState, useEffect } from 'react';
import { Users, ClipboardList, Briefcase, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { RoleCard } from '@/components/dashboard/RoleCard';
import { CreateUserModal } from '@/components/dashboard/CreateUserModal';
import { EditUserModal } from '@/components/dashboard/EditUserModal';
import { ChangeRoleModal } from '@/components/dashboard/ChangeRoleModal';
import { ConfirmDeactivateDialog } from '@/components/dashboard/ConfirmDeactivateDialog';
import { UserActionsMenu } from '@/components/dashboard/UserActionsMenu';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { FounderKPISection } from '@/components/dashboard/FounderKPISection';
import { PlanLimitBanner } from '@/components/dashboard/PlanLimitBanner';
import { BillingConfigurationPanel } from '@/components/billing/BillingConfigurationPanel';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ORG_ROLE_LABELS, type OrgRole } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';

interface OrgUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  role: OrgRole;
}

export default function OrgOwnerDashboard() {
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [categoriesCount, setCategoriesCount] = useState<number>(0);
  const [playersCount, setPlayersCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Exclude<OrgRole, 'org_owner'>>('director_deportivo');

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<OrgUser | null>(null);

  // Change role modal state
  const [changeRoleModalOpen, setChangeRoleModalOpen] = useState(false);
  const [changingRoleUser, setChangingRoleUser] = useState<OrgUser | null>(null);

  // Deactivate dialog state
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState<OrgUser | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchUsers = async () => {
    if (!organization) return;

    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, is_active')
        .eq('organization_id', organization.id);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_org_roles')
        .select('user_id, role')
        .eq('organization_id', organization.id);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return;
      }

      const usersWithRoles: OrgUser[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: (userRole?.role as OrgRole) || 'entrenador',
        };
      });

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCounts = async () => {
    if (!organization) return;

    try {
      const [categoriesResult, playersResult] = await Promise.all([
        supabase
          .from('categories')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('is_active', true),
        supabase
          .from('players')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('is_active', true),
      ]);

      setCategoriesCount(categoriesResult.count || 0);
      setPlayersCount(playersResult.count || 0);
    } catch (err) {
      console.error('Error fetching counts:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCounts();
  }, [organization]);

  const handleCreateUser = (role: Exclude<OrgRole, 'org_owner'>) => {
    setSelectedRole(role);
    setCreateModalOpen(true);
  };

  const handleEditUser = (u: OrgUser) => {
    setEditingUser(u);
    setEditModalOpen(true);
  };

  const handleChangeRole = (u: OrgUser) => {
    setChangingRoleUser(u);
    setChangeRoleModalOpen(true);
  };

  const handleToggleActive = (u: OrgUser) => {
    setDeactivatingUser(u);
    setDeactivateDialogOpen(true);
  };

  const confirmToggleActive = async () => {
    if (!deactivatingUser) return;

    setIsDeactivating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Error',
          description: 'Sesión expirada. Inicia sesión de nuevo.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('manage-org-user', {
        body: {
          action: 'toggle_active',
          userId: deactivatingUser.id,
          data: { isActive: !deactivatingUser.is_active },
        },
      });

      if (error || data.error) {
        toast({
          title: 'Error',
          description: error?.message || data.error || 'Error al cambiar estado',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: deactivatingUser.is_active ? 'Usuario desactivado' : 'Usuario activado',
        description: `${deactivatingUser.full_name} ha sido ${deactivatingUser.is_active ? 'desactivado' : 'activado'}.`,
      });

      setDeactivateDialogOpen(false);
      fetchUsers();

    } catch (err) {
      console.error('Error:', err);
      toast({
        title: 'Error',
        description: 'Error inesperado. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  const getRoleBadgeVariant = (role: OrgRole) => {
    switch (role) {
      case 'org_owner': return 'default';
      case 'director_deportivo': return 'secondary';
      case 'entrenador': return 'outline';
      case 'administrativo': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-semibold text-foreground mb-2">
            Panel del Fundador
          </h1>
          <p className="text-muted-foreground">
            Gestiona tu academia y equipo de trabajo.
          </p>
        </div>

        {/* Onboarding Checklist */}
        <OnboardingChecklist />

        {/* Plan Limit Warnings */}
        <PlanLimitBanner type="players" className="mb-4" />
        <PlanLimitBanner type="categories" className="mb-4" />
        <PlanLimitBanner type="users" className="mb-4" />

        {/* Founder KPIs Section */}
        <FounderKPISection />

        {/* Role Cards */}
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">
          Crear usuarios
        </h2>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <RoleCard
            title="Director Deportivo"
            role="director_deportivo"
            icon={Briefcase}
            onCreateClick={() => handleCreateUser('director_deportivo')}
          />
          <RoleCard
            title="Entrenador"
            role="entrenador"
            icon={ClipboardList}
            onCreateClick={() => handleCreateUser('entrenador')}
          />
          <RoleCard
            title="Administrativo"
            role="administrativo"
            icon={Users}
            onCreateClick={() => handleCreateUser('administrativo')}
          />
        </div>

        {/* Users List */}
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">
          Equipo de la academia
        </h2>
        <div className="stryk-card overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay usuarios registrados aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nombre</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">Correo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rol</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className={u.id === user?.id ? 'bg-primary/5' : ''}>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-sm font-medium text-foreground">
                            {u.full_name}
                          </span>
                          {u.id === user?.id && (
                            <span className="ml-2 text-xs text-muted-foreground">(Tú)</span>
                          )}
                          <p className="text-xs text-muted-foreground md:hidden">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getRoleBadgeVariant(u.role)}>
                          {ORG_ROLE_LABELS[u.role]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.is_active ? 'default' : 'secondary'} className={u.is_active ? 'bg-success text-success-foreground' : ''}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UserActionsMenu
                          userId={u.id}
                          userRole={u.role}
                          isActive={u.is_active}
                          isCurrentUser={u.id === user?.id}
                          onEdit={() => handleEditUser(u)}
                          onChangeRole={() => handleChangeRole(u)}
                          onToggleActive={() => handleToggleActive(u)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Billing Configuration Section */}
        <div className="mt-8">
          <h2 className="text-xl font-display font-semibold text-foreground mb-4">
            Configuración de Cobranza
          </h2>
          <BillingConfigurationPanel />
        </div>
      </main>

      <CreateUserModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        role={selectedRole}
        onUserCreated={fetchUsers}
      />

      <EditUserModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={editingUser}
        onUserUpdated={fetchUsers}
      />

      <ChangeRoleModal
        open={changeRoleModalOpen}
        onOpenChange={setChangeRoleModalOpen}
        user={changingRoleUser}
        onRoleChanged={fetchUsers}
      />

      <ConfirmDeactivateDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        user={deactivatingUser}
        isLoading={isDeactivating}
        onConfirm={confirmToggleActive}
      />
    </div>
  );
}
