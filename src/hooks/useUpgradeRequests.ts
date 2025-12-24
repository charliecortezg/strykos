import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UpgradeRequest {
  id: string;
  organization_id: string;
  requested_by: string;
  current_plan: string;
  requested_plan: string;
  status: 'pending' | 'approved' | 'rejected' | 'contacted';
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  organization?: {
    name: string;
    org_code: string;
    phone: string;
  };
  requester?: {
    full_name: string;
    email: string;
  };
}

export function useUpgradeRequests() {
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('upgrade_requests')
        .select(`
          *,
          organization:organizations(name, org_code, phone),
          requester:profiles!upgrade_requests_requested_by_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as unknown as UpgradeRequest[]) || []);
    } catch (error) {
      console.error('Error fetching upgrade requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRequestStatus = async (
    id: string, 
    status: UpgradeRequest['status'],
    adminNotes?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('upgrade_requests')
        .update({
          status,
          admin_notes: adminNotes || null,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      
      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error updating request:', error);
      return false;
    }
  };

  const approveAndUpgrade = async (
    requestId: string, 
    organizationId: string,
    newPlan: 'freemium' | 'starter' | 'professional' | 'enterprise'
  ) => {
    try {
      // Update organization plan
      const { error: orgError } = await supabase
        .from('organizations')
        .update({ plan: newPlan, updated_at: new Date().toISOString() })
        .eq('id', organizationId);

      if (orgError) throw orgError;

      // Mark request as approved
      const success = await updateRequestStatus(requestId, 'approved', `Upgrade to ${newPlan} completed`);
      
      return success;
    } catch (error) {
      console.error('Error approving upgrade:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return {
    requests,
    isLoading,
    refetch: fetchRequests,
    updateRequestStatus,
    approveAndUpgrade,
  };
}
