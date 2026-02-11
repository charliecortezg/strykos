import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { EventsList } from '@/components/assessment/EventsList';
import { CreateEventModal } from '@/components/assessment/CreateEventModal';
import { EventDetailView } from '@/components/assessment/EventDetailView';
import { useAuth } from '@/contexts/AuthContext';
import type { EvaluationEvent } from '@/types/assessment';
import { FlaskConical } from 'lucide-react';

export default function AssessmentLabDashboard() {
  const { activeRole } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EvaluationEvent | null>(null);

  const canManage = activeRole === 'director_deportivo' || activeRole === 'org_owner';
  const canEvaluate = activeRole === 'entrenador' || activeRole === 'director_deportivo' || activeRole === 'org_owner';

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container px-4 py-6 max-w-3xl mx-auto">
        {/* Lab Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Assessment Lab</h1>
            <p className="text-sm text-muted-foreground">Evaluaciones externas</p>
          </div>
        </div>

        {selectedEvent ? (
          <EventDetailView
            event={selectedEvent}
            onBack={() => setSelectedEvent(null)}
            canManage={canManage}
            canEvaluate={canEvaluate}
          />
        ) : (
          <EventsList
            onCreateEvent={() => setShowCreateModal(true)}
            onSelectEvent={setSelectedEvent}
            canCreate={canManage}
          />
        )}

        <CreateEventModal open={showCreateModal} onOpenChange={setShowCreateModal} />
      </main>
    </div>
  );
}
