import { ClipboardList, CheckSquare, Trophy, Users, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NAV_ITEMS = [
  { value: 'sesion', label: 'Sesión', icon: ClipboardList },
  { value: 'asistencia', label: 'Asistencia', icon: CheckSquare },
  { value: 'partidos', label: 'Partidos', icon: Trophy },
  { value: 'jugadores', label: 'Jugadores', icon: Users },
  { value: 'eval', label: 'Eval', icon: BarChart2 },
];

export function BottomNavBar({ activeTab, onTabChange }: BottomNavBarProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F1117] border-t border-white/10 h-16 pb-2">
      <div className="flex items-stretch h-full">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.value ||
            (item.value === 'eval' && activeTab === 'evaluaciones');
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
