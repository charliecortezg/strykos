import { Link, useLocation } from 'react-router-dom';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  ArrowUpCircle, 
  ClipboardList, 
  LogOut,
  LayoutDashboard,
  Shield,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlatformLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/platform-admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/platform-admin/organizations', label: 'Organizaciones', icon: Building2 },
  { path: '/platform-admin/upgrade-requests', label: 'Solicitudes', icon: ArrowUpCircle },
  { path: '/platform-admin/duplicates', label: 'Duplicados', icon: Copy },
  { path: '/platform-admin/audit-log', label: 'Auditoría', icon: ClipboardList },
];

export function PlatformLayout({ children }: PlatformLayoutProps) {
  const { signOut, user } = usePlatformAuth();
  const location = useLocation();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-amber-500" />
              <div>
                <h1 className="text-lg font-bold text-white">STRYK Platform</h1>
                <p className="text-xs text-slate-400">Admin Console</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">{user?.email}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                  isActive(item.path, item.exact)
                    ? "text-amber-500 border-amber-500"
                    : "text-slate-400 border-transparent hover:text-white hover:border-slate-600"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
