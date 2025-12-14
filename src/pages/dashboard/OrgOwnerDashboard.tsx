import { useState, useEffect } from 'react';
import { Users, ClipboardList, Briefcase, GraduationCap, Shield } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { RoleCard } from '@/components/dashboard/RoleCard';
import { CreateUserModal } from '@/components/dashboard/CreateUserModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ORG_ROLE_LABELS, type OrgRole } from '@/types/auth';

interface OrgUser {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  role: OrgRole;
}

export default function OrgOwnerDashboard() {
  const { organization, user } = useAuth();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Exclude<OrgRole, 'org_owner'>>('director_deportivo');

  const fetchUsers = async () => {
    if (!organization) return;

    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_active')
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

  useEffect(() => {
    fetchUsers();
  }, [organization]);

  const handleCreateUser = (role: Exclude<OrgRole, 'org_owner'>) => {
    setSelectedRole(role);
    setCreateModalOpen(true);
  };

  const usersByRole = {
    org_owner: users.filter(u => u.role === 'org_owner'),
    director_deportivo: users.filter(u => u.role === 'director_deportivo'),
    entrenador: users.filter(u => u.role === 'entrenador'),
    administrativo: users.filter(u => u.role === 'administrativo'),
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Usuarios</p>
              </div>
            </div>
          </div>
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">—</p>
                <p className="text-sm text-muted-foreground">Alumnos</p>
              </div>
            </div>
          </div>
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">0</p>
                <p className="text-sm text-muted-foreground">Categorías</p>
              </div>
            </div>
          </div>
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold capitalize">{organization?.plan}</p>
                <p className="text-sm text-muted-foreground">Plan</p>
              </div>
            </div>
          </div>
        </div>

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
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Correo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rol</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className={u.id === user?.id ? 'bg-primary/5' : ''}>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {u.full_name}
                        {u.id === user?.id && (
                          <span className="ml-2 text-xs text-muted-foreground">(Tú)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <CreateUserModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        role={selectedRole}
        onUserCreated={fetchUsers}
      />
    </div>
  );
}
