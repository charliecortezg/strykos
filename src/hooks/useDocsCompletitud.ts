import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';
import type { Vigencia } from '@/lib/documents';

export interface DocsCompletitudRow {
  player_id: string;
  obligatorios_aprobados: number;
  por_revisar: number;
  datos_completos: boolean;
  completo: boolean;
  constancia: Vigencia;
}

/** Single source for document completeness: list column, filters and the home indicator. */
export function useDocsCompletitud() {
  const { organization } = useAuth();
  const { isEnabled } = useOrgFeatures();
  const enabled = isEnabled('documentos') && !!organization?.id;
  const q = useQuery({
    queryKey: ['docs-completitud', organization?.id],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('docs_completitud_org');
      if (error) throw error;
      const map = new Map<string, DocsCompletitudRow>();
      (data as DocsCompletitudRow[]).forEach((r) => map.set(r.player_id, r));
      return map;
    },
  });
  return { enabled, map: q.data ?? new Map<string, DocsCompletitudRow>(), isLoading: q.isLoading, refetch: q.refetch };
}
