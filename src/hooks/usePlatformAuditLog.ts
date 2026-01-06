import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  action: string;
  target_organization_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

export function usePlatformAuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuditLog = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEntries((data as AuditLogEntry[]) || []);
    } catch (error) {
      console.error('Error fetching audit log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLog();
  }, []);

  return {
    entries,
    isLoading,
    refetch: fetchAuditLog,
  };
}
