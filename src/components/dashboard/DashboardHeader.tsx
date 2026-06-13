import { Copy, Check, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { RoleSwitch } from '@/components/dashboard/RoleSwitch';
import { OrgSwitcher } from '@/components/dashboard/OrgSwitcher';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

export function DashboardHeader() {
  const { organization, signOut, user } = useAuth();
  const { isEnabled } = useOrgFeatures();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const unified = isEnabled('unified_owner_panel');
  const logoPath = (organization as any)?.logo_url as string | undefined;
  const logoUrl = logoPath
    ? supabase.storage.from('org-logos').getPublicUrl(logoPath).data?.publicUrl
    : null;

  const orgId = organization 
    ? `${organization.org_code} / ${organization.org_access_key}`
    : '';

  const copyToClipboard = async () => {
    if (orgId) {
      await navigator.clipboard.writeText(orgId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const planLabel = organization?.plan === 'freemium' ? 'Freemium' : organization?.plan;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <div className="py-4">
                <Logo />
                <div className="mt-8 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Academia</p>
                    <p className="font-semibold">{organization?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Organization ID</p>
                    <code className="text-sm font-mono">{orgId}</code>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Usuario</p>
                    <p className="font-medium">{user?.full_name}</p>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {logoUrl ? (
            <img src={logoUrl} alt={organization?.name || ''} className="h-8 w-auto object-contain" />
          ) : (
            <Logo />
          )}

          <div className="hidden lg:flex items-center gap-4 ml-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {organization?.name}
              </span>
              {!unified && (
                <Badge variant="secondary" className="font-normal">
                  {planLabel}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <OrgSwitcher />
          <RoleSwitch />
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <span className="text-xs text-muted-foreground">ID:</span>
            <code className="text-sm font-mono text-foreground">{orgId}</code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={copyToClipboard}
            >
              {copied ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
