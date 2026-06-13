import { ClipboardList, CheckSquare, Trophy, Users, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';
import { useFeatureFlags } from '@/hooks/useStrykWay';

interface BottomNavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ALL_ITEMS = [
  { value: 'sesion', label: 'Sesión', icon: ClipboardList, requires: 'session_planner' as const },
  { value: 'asistencia', label: 'Asistencia', icon: CheckSquare, requires: null },
  { value: 'partidos', label: 'Partidos', icon: Trophy, requires: 'matches' as const },
  { value: 'jugadores', label: 'Jugadores', icon: Users, requires: null },
  { value: 'eval', label: 'Eval', icon: BarChart2, requires: 'evaluations' as const },
];

export function BottomNavBar({ activeTab, onTabChange }: BottomNavBarProps) {
  const { isEnabled } = useOrgFeatures();
  const { feature_evaluations_enabled } = useFeatureFlags();

  const items = ALL_ITEMS.filter((it) => {
    if (it.requires === null) return true;
    if (it.requires === 'evaluations') return feature_evaluations_enabled;
    return isEnabled(it.requires);
  });

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F1117] border-t border-white/10 h-16 pb-2">
      <div className="flex items-stretch h-full">
        {items.map((item) => {
          const isActive =
            activeTab === item.value || (item.value === 'eval' && activeTab === 'evaluaciones');
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              onClick={() => onTabChange(item.value === 'eval' ? 'evaluaciones' : item.value)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 transition-colors',
                isActive ? 'text-[#C9A227]' : 'text-white/40'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
