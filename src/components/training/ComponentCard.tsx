import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Lock, BookOpen, Play, HelpCircle, Clipboard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { COMPONENT_TYPE_LABELS, type TrainingComponent, type TrainingComponentType } from '@/types/training';

const TYPE_ICONS: Record<TrainingComponentType, typeof BookOpen> = {
  lectura: BookOpen,
  video: Play,
  examen: HelpCircle,
  tarea_campo: Clipboard,
};

interface ComponentCardProps {
  component: TrainingComponent;
  completed: boolean;
  isAccessible: boolean;
  componentIndex: number;
  totalComponents: number;
}


export function ComponentCard({ component, completed, isAccessible, componentIndex, totalComponents }: ComponentCardProps) {
  const navigate = useNavigate();
  const { moduleId } = useParams();
  const TypeIcon = TYPE_ICONS[component.component_type] ?? Circle;

  const handleClick = () => {
    if (!isAccessible) return;
    navigate(`/training/modules/${moduleId}/components/${component.id}`);
  };

  return (
    <Card
      className={`transition-all ${
        isAccessible ? 'cursor-pointer hover:border-primary/50 hover:shadow-md' : 'opacity-60'
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            {completed ? (
              <CheckCircle2 className="h-6 w-6 text-success" />
            ) : !isAccessible ? (
              <Lock className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {componentIndex} / {totalComponents}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <TypeIcon className="h-3 w-3" />
                {COMPONENT_TYPE_LABELS[component.component_type]}
              </span>
            </div>
            <h5 className="mt-1 font-medium leading-tight">{component.title}</h5>
          </div>
          <Badge variant="outline" className="shrink-0">
            {component.estimated_minutes} min
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
