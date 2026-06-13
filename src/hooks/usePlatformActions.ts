import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ActionType = 'change_plan' | 'toggle_organization' | 'resolve_upgrade_request' | 'update_features';

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export function usePlatformActions() {
  const [isLoading, setIsLoading] = useState(false);

  const executeAction = async (
    action: ActionType,
    payload: Record<string, any>
  ): Promise<ActionResult> => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('platform-admin-actions', {
        body: { action, ...payload },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(data?.message || 'Acción ejecutada correctamente');
      return { success: true, message: data?.message };
    } catch (err: any) {
      console.error('Platform action error:', err);
      toast.error(err.message || 'Error al ejecutar la acción');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const changePlan = async (
    organizationId: string,
    newPlan: 'freemium' | 'starter' | 'professional' | 'enterprise'
  ) => {
    return executeAction('change_plan', {
      organization_id: organizationId,
      new_plan: newPlan,
    });
  };

  const toggleOrganization = async (organizationId: string, isActive: boolean) => {
    return executeAction('toggle_organization', {
      organization_id: organizationId,
      is_active: isActive,
    });
  };

  const resolveUpgradeRequest = async (
    requestId: string,
    status: 'approved' | 'rejected',
    adminNotes?: string
  ) => {
    return executeAction('resolve_upgrade_request', {
      request_id: requestId,
      status,
      admin_notes: adminNotes,
    });
  };

  return {
    isLoading,
    changePlan,
    toggleOrganization,
    resolveUpgradeRequest,
  };
}
