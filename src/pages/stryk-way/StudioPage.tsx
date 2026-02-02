import { useState } from 'react';
import { ArrowLeft, Trophy, Target, Sparkles, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { usePacks, useFeatureFlags } from '@/hooks/useStrykWay';
import { PackActivator } from '@/components/stryk-way/PackActivator';
import { BadgesList } from '@/components/stryk-way/BadgesList';
import { ChallengesList } from '@/components/stryk-way/ChallengesList';

export default function StudioPage() {
  const { organization, activeRole } = useAuth();
  const { feature_stryk_way_enabled } = useFeatureFlags();
  const { publishedPack, ruleset, isLoading } = usePacks();
  const [activeTab, setActiveTab] = useState('badges');

  const dashboardPath = activeRole === 'org_owner' 
    ? '/dashboard/org-owner' 
    : '/dashboard/director-deportivo';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Link to={dashboardPath}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">STRYK Way Studio</h1>
          </div>
          <span className="text-sm text-muted-foreground hidden sm:block">
            {organization?.name}
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="container px-4 py-6 space-y-6">
        {/* Pack Activator */}
        <PackActivator 
          isEnabled={feature_stryk_way_enabled} 
          packId={publishedPack?.id ?? null}
          onActivated={() => {}}
        />

        {/* Only show tabs if STRYK Way is enabled */}
        {feature_stryk_way_enabled && publishedPack && (
          <>
            {/* Stats Summary */}
            {ruleset && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground">XP por Asistencia</p>
                  <p className="text-2xl font-bold">{(ruleset.economy as any).xp_per_attendance ?? 10}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground">Cap Diario</p>
                  <p className="text-2xl font-bold">{(ruleset.caps as any).daily_xp_cap ?? 100} XP</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground">XP por Nivel</p>
                  <p className="text-2xl font-bold">{(ruleset.economy as any).xp_per_level ?? 100}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground">Pack</p>
                  <p className="text-2xl font-bold">v{publishedPack.version}</p>
                </div>
              </div>
            )}

            {/* Tabs for Badges and Challenges */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="badges" className="gap-2">
                  <Trophy className="w-4 h-4" />
                  Badges
                </TabsTrigger>
                <TabsTrigger value="challenges" className="gap-2">
                  <Target className="w-4 h-4" />
                  Retos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="badges" className="mt-6">
                <BadgesList packId={publishedPack.id} />
              </TabsContent>

              <TabsContent value="challenges" className="mt-6">
                <ChallengesList packId={publishedPack.id} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
