import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MembershipBlock {
  id: string;
  org_id: string | null;
  code: string;
  name: string;
  sequence_order: number;
  duration_months: number;
  min_evaluations: number;
  min_attendance_pct: number;
  min_xp: number | null;
  is_active: boolean;
}

export interface PlayerBlockProgress {
  player_id: string;
  full_name: string;
  membership_stage: string;
  block_id: string | null;
  block_start_date: string | null;
  block_end_date: string | null;
  eligible_for_progression: boolean;
  block_name?: string;
  block_code?: string;
  eval_count: number;
  min_evaluations: number;
  attendance_pct: number;
  min_attendance_pct: number;
  days_remaining: number;
}

export function useMembershipBlocks() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const blocksQuery = useQuery({
    queryKey: ['membership-blocks', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membership_blocks')
        .select('*')
        .or(`org_id.is.null,org_id.eq.${orgId}`)
        .eq('is_active', true)
        .order('sequence_order');
      if (error) throw error;
      return data as MembershipBlock[];
    },
    enabled: !!orgId,
  });

  // Get effective blocks (org override > global)
  const effectiveBlocks = (() => {
    const blocks = blocksQuery.data || [];
    const byCode = new Map<string, MembershipBlock>();
    // Global first, then org overrides replace
    blocks.filter(b => b.org_id === null).forEach(b => byCode.set(b.code, b));
    blocks.filter(b => b.org_id !== null).forEach(b => byCode.set(b.code, b));
    return Array.from(byCode.values()).sort((a, b) => a.sequence_order - b.sequence_order);
  })();

  return {
    blocks: effectiveBlocks,
    allBlocks: blocksQuery.data || [],
    isLoading: blocksQuery.isLoading,
  };
}

export function usePlayersWithBlocks() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ['players-with-blocks', orgId],
    queryFn: async () => {
      const { data: players, error } = await supabase
        .from('players')
        .select('id, full_name, membership_stage, block_id, block_start_date, block_end_date, eligible_for_progression, category_id, is_active, lifecycle_status')
        .eq('organization_id', orgId!)
        .eq('is_active', true);
      if (error) throw error;

      // For each player with a block, get eval count
      const results: PlayerBlockProgress[] = [];
      for (const p of players || []) {
        let eval_count = 0;
        let min_evaluations = 0;
        let attendance_pct = 0;
        let min_attendance_pct = 0;
        let block_name = '';
        let block_code = '';

        if (p.block_id) {
          // Get block info
          const { data: block } = await supabase
            .from('membership_blocks')
            .select('name, code, min_evaluations, min_attendance_pct')
            .eq('id', p.block_id)
            .single();

          if (block) {
            block_name = block.name;
            block_code = block.code;
            min_evaluations = block.min_evaluations;
            min_attendance_pct = block.min_attendance_pct;
          }

          // Count evaluations for this block
          const { count } = await supabase
            .from('evaluations')
            .select('id', { count: 'exact', head: true })
            .eq('player_id', p.id)
            .eq('block_id', p.block_id)
            .eq('status', 'closed');
          eval_count = count || 0;

          // Calculate attendance in block range
          if (p.block_start_date && p.block_end_date) {
            const { count: total } = await supabase
              .from('attendance')
              .select('id', { count: 'exact', head: true })
              .eq('player_id', p.id)
              .eq('organization_id', orgId!)
              .gte('date', p.block_start_date)
              .lte('date', p.block_end_date);

            const { count: present } = await supabase
              .from('attendance')
              .select('id', { count: 'exact', head: true })
              .eq('player_id', p.id)
              .eq('organization_id', orgId!)
              .gte('date', p.block_start_date)
              .lte('date', p.block_end_date)
              .eq('status', 'presente');

            attendance_pct = (total || 0) > 0 ? Math.round(((present || 0) / (total || 1)) * 100) : 0;
          }
        }

        const days_remaining = p.block_end_date
          ? Math.max(0, Math.ceil((new Date(p.block_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0;

        results.push({
          player_id: p.id,
          full_name: p.full_name,
          membership_stage: p.membership_stage || 'none',
          block_id: p.block_id,
          block_start_date: p.block_start_date,
          block_end_date: p.block_end_date,
          eligible_for_progression: p.eligible_for_progression || false,
          block_name,
          block_code,
          eval_count,
          min_evaluations,
          attendance_pct,
          min_attendance_pct,
          days_remaining,
        });
      }

      return results;
    },
    enabled: !!orgId,
  });
}

export function usePlayerMembershipProgress(playerId: string | null) {
  const { data: blocks } = useQuery({
    queryKey: ['membership-blocks-for-player', playerId],
    queryFn: async () => {
      if (!playerId) return null;
      
      const { data: player } = await supabase
        .from('players')
        .select('organization_id, membership_stage, block_id, block_start_date, block_end_date, eligible_for_progression')
        .eq('id', playerId)
        .single();

      if (!player) return null;

      const { data: allBlocks } = await supabase
        .from('membership_blocks')
        .select('*')
        .or(`org_id.is.null,org_id.eq.${player.organization_id}`)
        .eq('is_active', true)
        .order('sequence_order');

      // Effective blocks
      const byCode = new Map<string, MembershipBlock>();
      (allBlocks || []).filter(b => b.org_id === null).forEach(b => byCode.set(b.code, b as MembershipBlock));
      (allBlocks || []).filter(b => b.org_id !== null).forEach(b => byCode.set(b.code, b as MembershipBlock));
      const effective = Array.from(byCode.values()).sort((a, b) => a.sequence_order - b.sequence_order);

      let eval_count = 0;
      let attendance_pct = 0;
      let currentBlock: MembershipBlock | null = null;

      if (player.block_id) {
        currentBlock = effective.find(b => b.id === player.block_id) || null;

        const { count } = await supabase
          .from('evaluations')
          .select('id', { count: 'exact', head: true })
          .eq('player_id', playerId)
          .eq('block_id', player.block_id)
          .eq('status', 'closed');
        eval_count = count || 0;

        if (player.block_start_date && player.block_end_date) {
          const { count: total } = await supabase
            .from('attendance')
            .select('id', { count: 'exact', head: true })
            .eq('player_id', playerId)
            .gte('date', player.block_start_date)
            .lte('date', player.block_end_date);

          const { count: present } = await supabase
            .from('attendance')
            .select('id', { count: 'exact', head: true })
            .eq('player_id', playerId)
            .gte('date', player.block_start_date)
            .lte('date', player.block_end_date)
            .eq('status', 'presente');

          attendance_pct = (total || 0) > 0 ? Math.round(((present || 0) / (total || 1)) * 100) : 0;
        }
      }

      const days_remaining = player.block_end_date
        ? Math.max(0, Math.ceil((new Date(player.block_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

      return {
        blocks: effective,
        currentBlock,
        currentStage: player.membership_stage || 'none',
        blockStartDate: player.block_start_date,
        blockEndDate: player.block_end_date,
        eligibleForProgression: player.eligible_for_progression || false,
        eval_count,
        attendance_pct,
        days_remaining,
      };
    },
    enabled: !!playerId,
  });

  return {
    blocks: blocks?.blocks || [],
    currentBlock: blocks?.currentBlock || null,
    currentStage: blocks?.currentStage || 'none',
    blockStartDate: blocks?.blockStartDate || null,
    blockEndDate: blocks?.blockEndDate || null,
    eligibleForProgression: blocks?.eligibleForProgression || false,
    eval_count: blocks?.eval_count || 0,
    attendance_pct: blocks?.attendance_pct || 0,
    days_remaining: blocks?.days_remaining || 0,
    isLoading: !blocks && !!playerId,
  };
}
