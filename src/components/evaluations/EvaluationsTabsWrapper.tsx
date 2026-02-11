import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCoachNotifications } from '@/hooks/useCoachNotifications';
import { ClipboardCheck, FlaskConical } from 'lucide-react';

interface EvaluationsTabsWrapperProps {
  /** Component for "Internas (WLA)" sub-tab */
  internalView: React.ReactNode;
  /** Component for "Externas" sub-tab */
  externalView: React.ReactNode;
  /** Whether to show unread badge on Externas tab */
  showBadge?: boolean;
}

export function EvaluationsTabsWrapper({ internalView, externalView, showBadge }: EvaluationsTabsWrapperProps) {
  const { allOrganizations } = useAuth();

  const assessmentLabOrg = allOrganizations.find(
    o => o.organization.organization_mode === 'evaluation_only'
  );
  const assessmentLabOrgId = assessmentLabOrg?.organization.id || null;
  const { unreadCount } = useCoachNotifications(assessmentLabOrgId);

  const displayBadge = showBadge && unreadCount > 0;

  return (
    <Tabs defaultValue="internas" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="internas" className="gap-1.5">
          <ClipboardCheck className="w-4 h-4" />
          Internas (WLA)
        </TabsTrigger>
        <TabsTrigger value="externas" className="gap-1.5 relative">
          <FlaskConical className="w-4 h-4" />
          Externas
          {displayBadge && (
            <Badge className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px] bg-destructive text-destructive-foreground">
              {unreadCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="internas">
        {internalView}
      </TabsContent>

      <TabsContent value="externas">
        {externalView}
      </TabsContent>
    </Tabs>
  );
}
