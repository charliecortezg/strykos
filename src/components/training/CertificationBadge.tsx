import { Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CERTIFICATION_LEVEL_LABELS, type CertificationLevel } from '@/types/training';

interface CertificationBadgeProps {
  level: CertificationLevel | null;
}

export function CertificationBadge({ level }: CertificationBadgeProps) {
  if (!level) {
    return (
      <Badge variant="outline" className="mt-1 text-sm">
        Sin certificación
      </Badge>
    );
  }
  return (
    <div className="mt-1 inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-primary">
      <Award className="h-4 w-4" />
      <span className="text-sm font-semibold">{CERTIFICATION_LEVEL_LABELS[level]}</span>
    </div>
  );
}
