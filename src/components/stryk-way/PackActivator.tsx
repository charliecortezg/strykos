import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Power, Loader2, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface PackActivatorProps {
  isEnabled: boolean;
  packId: string | null;
  onActivated: () => void;
}

export function PackActivator({ isEnabled, packId, onActivated }: PackActivatorProps) {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !user?.id) throw new Error('No organization or user');

      // Check if pack already exists
      const { data: existingPack } = await supabase
        .from('stryk_packs')
        .select('id')
        .eq('organization_id', orgId)
        .eq('name', 'Core Pack')
        .maybeSingle();

      let packIdToUse = existingPack?.id;

      if (!existingPack) {
        // Create Core Pack
        const { data: newPack, error: packError } = await supabase
          .from('stryk_packs')
          .insert({
            organization_id: orgId,
            name: 'Core Pack',
            version: 1,
            status: 'published',
            created_by: user.id,
            published_at: new Date().toISOString(),
            published_by: user.id,
          })
          .select()
          .single();

        if (packError) throw packError;
        packIdToUse = newPack.id;

        // Create default ruleset
        await supabase.from('stryk_rulesets').insert({
          organization_id: orgId,
          pack_id: packIdToUse,
          created_by: user.id,
        });

        // Create default badges
        const defaultBadges = [
          { key: 'first_training', name: 'Primer Entrenamiento', description: 'Asististe a tu primer entrenamiento', icon: 'star', rarity: 'common', criteria: { type: 'attendance_count', threshold: 1 } },
          { key: 'dedicated_10', name: 'Dedicado', description: 'Has asistido a 10 entrenamientos', icon: 'medal', rarity: 'common', criteria: { type: 'attendance_count', threshold: 10 } },
          { key: 'dedicated_25', name: 'Comprometido', description: 'Has asistido a 25 entrenamientos', icon: 'trophy', rarity: 'rare', criteria: { type: 'attendance_count', threshold: 25 } },
          { key: 'first_goal', name: 'Primer Gol', description: 'Anotaste tu primer gol', icon: 'flame', rarity: 'common', criteria: { type: 'goals_total', threshold: 1 } },
          { key: 'streak_5', name: 'Racha de 5', description: 'Asististe 5 días consecutivos', icon: 'zap', rarity: 'rare', criteria: { type: 'streak', threshold: 5 } },
        ];

        for (const badge of defaultBadges) {
          await supabase.from('stryk_badges').insert({
            organization_id: orgId,
            pack_id: packIdToUse,
            ...badge,
            created_by: user.id,
          });
        }

        // Create default challenges
        const defaultChallenges = [
          { key: 'weekly_3', name: 'Asiste 3 veces esta semana', description: 'Completa 3 asistencias en una semana', xp_reward: 30, criteria: { type: 'weekly_attendance', threshold: 3 } },
          { key: 'monthly_10', name: 'Asiste 10 veces este mes', description: 'Completa 10 asistencias en un mes', xp_reward: 100, criteria: { type: 'monthly_attendance', threshold: 10 } },
          { key: 'score_3', name: 'Anota 3 goles', description: 'Marca 3 goles en partidos', xp_reward: 75, criteria: { type: 'goals_total', threshold: 3 } },
        ];

        for (const challenge of defaultChallenges) {
          await supabase.from('stryk_challenges').insert({
            organization_id: orgId,
            pack_id: packIdToUse,
            ...challenge,
            created_by: user.id,
          });
        }

        // Log audit
        await supabase.from('stryk_audit_logs').insert({
          organization_id: orgId,
          actor_user_id: user.id,
          action: 'stryk_way_activated',
          entity_type: 'stryk_pack',
          entity_id: packIdToUse,
          meta: { name: 'Core Pack', version: 1 },
        });
      }

      // Enable all STRYK Way related feature flags
      await supabase
        .from('organizations')
        .update({ 
          feature_stryk_way_enabled: true,
          feature_portal_familiar_enabled: true,
          feature_analytics_enabled: true,
          feature_studio_pro_enabled: true,
        })
        .eq('id', orgId);

      return packIdToUse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stryk-packs'] });
      queryClient.invalidateQueries({ queryKey: ['stryk-pack-published'] });
      toast.success('¡STRYK Way activado! Core Pack creado con badges y retos iniciales.');
      onActivated();
    },
    onError: (error) => {
      toast.error('Error al activar STRYK Way: ' + error.message);
    },
  });

  if (isEnabled && packId) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg">STRYK Way Activo</CardTitle>
              <CardDescription>
                El sistema de progreso está funcionando para tu academia
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle>Activar STRYK Way</CardTitle>
            <CardDescription>
              Sistema de progreso para jugadores con XP, niveles, badges y retos
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Los jugadores ganan XP por asistencia y partidos
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Badges desbloqueables por logros
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Retos semanales y mensuales
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Portal para que padres vean el progreso
            </li>
          </ul>
          <Button 
            onClick={() => activateMutation.mutate()} 
            disabled={activateMutation.isPending}
            className="w-full"
          >
            {activateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Activando...
              </>
            ) : (
              <>
                <Power className="w-4 h-4 mr-2" />
                Activar STRYK Way
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
