import { LucideIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ORG_ROLE_DESCRIPTIONS, type OrgRole } from '@/types/auth';

interface RoleCardProps {
  title: string;
  role: OrgRole;
  icon: LucideIcon;
  onCreateClick: () => void;
}

export function RoleCard({ title, role, icon: Icon, onCreateClick }: RoleCardProps) {
  const descriptions = ORG_ROLE_DESCRIPTIONS[role];

  return (
    <div className="stryk-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-lg text-foreground">
            {title}
          </h3>
        </div>
        <Button size="sm" onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-1" />
          Crear
        </Button>
      </div>

      <ul className="space-y-2">
        {descriptions.map((desc, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            {desc}
          </li>
        ))}
      </ul>
    </div>
  );
}
