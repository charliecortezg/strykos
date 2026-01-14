import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BillingConfiguration {
  billing_admin_user_id: string | null;
  billing_receipts_email: string | null;
  billing_due_day: number | null;
  billing_period_type: string;
  billing_grace_days: number;
  billing_auto_overdue: boolean;
}

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
}

export function useBillingConfiguration() {
  const { organization, roles } = useAuth();
  const [config, setConfig] = useState<BillingConfiguration | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [founderEmail, setFounderEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = roles.includes('org_owner') || roles.includes('administrativo');

  const fetchConfiguration = useCallback(async () => {
    if (!organization?.id) return;

    try {
      setIsLoading(true);

      // Fetch organization billing config
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('billing_admin_user_id, billing_receipts_email, billing_due_day, billing_period_type, billing_grace_days, billing_auto_overdue')
        .eq('id', organization.id)
        .single();

      if (orgError) throw orgError;

      setConfig({
        billing_admin_user_id: orgData.billing_admin_user_id,
        billing_receipts_email: orgData.billing_receipts_email,
        billing_due_day: orgData.billing_due_day,
        billing_period_type: orgData.billing_period_type || 'monthly_calendar',
        billing_grace_days: orgData.billing_grace_days ?? 0,
        billing_auto_overdue: orgData.billing_auto_overdue ?? true,
      });

      // Fetch users with administrativo role
      const { data: roleData, error: roleError } = await supabase
        .from('user_org_roles')
        .select('user_id')
        .eq('organization_id', organization.id)
        .eq('role', 'administrativo');

      if (roleError) throw roleError;

      const adminUserIds = roleData.map(r => r.user_id);

      if (adminUserIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', adminUserIds)
          .eq('is_active', true);

        if (profileError) throw profileError;

        setAdminUsers(profileData || []);
      } else {
        setAdminUsers([]);
      }

      // Fetch founder email
      const { data: founderRoleData, error: founderRoleError } = await supabase
        .from('user_org_roles')
        .select('user_id')
        .eq('organization_id', organization.id)
        .eq('role', 'org_owner')
        .limit(1);

      if (!founderRoleError && founderRoleData && founderRoleData.length > 0) {
        const { data: founderProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', founderRoleData[0].user_id)
          .single();

        if (founderProfile) {
          setFounderEmail(founderProfile.email);
        }
      }
    } catch (error) {
      console.error('Error fetching billing configuration:', error);
      toast.error('Error al cargar la configuración de cobranza');
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchConfiguration();
  }, [fetchConfiguration]);

  const saveConfiguration = async (newConfig: Partial<BillingConfiguration>): Promise<boolean> => {
    if (!organization?.id || !canEdit) {
      toast.error('No tienes permisos para editar la configuración');
      return false;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('organizations')
        .update({
          billing_admin_user_id: newConfig.billing_admin_user_id,
          billing_receipts_email: newConfig.billing_receipts_email || null,
          billing_due_day: newConfig.billing_due_day,
          billing_period_type: newConfig.billing_period_type || 'monthly_calendar',
          billing_grace_days: newConfig.billing_grace_days ?? 0,
          billing_auto_overdue: newConfig.billing_auto_overdue ?? true,
        })
        .eq('id', organization.id);

      if (error) throw error;

      setConfig(prev => prev ? { ...prev, ...newConfig } : null);
      toast.success('Configuración de cobranza guardada');
      return true;
    } catch (error) {
      console.error('Error saving billing configuration:', error);
      toast.error('Error al guardar la configuración');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const calculateNextPaymentDate = (fromDate: Date = new Date()): Date => {
    const billingDay = config?.billing_due_day || 5;
    const currentDay = fromDate.getDate();
    
    let nextDate: Date;
    if (currentDay <= billingDay) {
      // Same month
      nextDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), billingDay);
    } else {
      // Next month
      nextDate = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, billingDay);
    }
    
    return nextDate;
  };

  return {
    config,
    adminUsers,
    founderEmail,
    isLoading,
    isSaving,
    canEdit,
    saveConfiguration,
    calculateNextPaymentDate,
    refetch: fetchConfiguration,
  };
}
