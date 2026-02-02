import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { History, Upload, RotateCcw, Check, Archive, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { StrykPack, PackStatus } from '@/types/stryk-way';

interface VersionHistoryProps {
  packs: StrykPack[];
  currentPackId: string | null;
  onPublish: (packId: string) => Promise<void>;
  onRollback: (packId: string) => Promise<void>;
  onRefresh: () => void;
}

const STATUS_BADGES: Record<PackStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  published: { label: 'Activo', variant: 'default' },
  archived: { label: 'Archivado', variant: 'outline' },
};

export function VersionHistory({
  packs,
  currentPackId,
  onPublish,
  onRollback,
  onRefresh,
}: VersionHistoryProps) {
  const { user } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const sortedPacks = [...packs].sort((a, b) => b.version - a.version);
  const publishedPack = packs.find(p => p.status === 'published');
  const draftPacks = packs.filter(p => p.status === 'draft');

  const handlePublish = async (packId: string) => {
    setIsPublishing(true);
    try {
      await onPublish(packId);
      toast.success('Pack publicado correctamente');
      onRefresh();
    } catch (error) {
      console.error('Error publishing:', error);
      toast.error('Error al publicar');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRollback = async (packId: string) => {
    setIsRollingBack(true);
    try {
      await onRollback(packId);
      toast.success('Versión restaurada');
      onRefresh();
    } catch (error) {
      console.error('Error rolling back:', error);
      toast.error('Error al restaurar');
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historial de Versiones
            </CardTitle>
            <CardDescription>
              Gestiona las versiones de tu configuración STRYK Way
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {packs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No hay versiones aún</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedPacks.map((pack) => {
              const statusBadge = STATUS_BADGES[pack.status as PackStatus];
              const isCurrent = pack.id === currentPackId;
              const canPublish = pack.status === 'draft';
              const canRollback = pack.status === 'archived' && publishedPack;

              return (
                <div
                  key={pack.id}
                  className={`p-4 rounded-lg border transition-all ${
                    pack.status === 'published' 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">
                          {pack.name} v{pack.version}
                        </span>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                        {isCurrent && (
                          <Badge variant="outline" className="text-xs">
                            Actual
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <p className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Creado: {format(new Date(pack.created_at), 'PPp', { locale: es })}
                        </p>
                        {pack.published_at && (
                          <p className="flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Publicado: {format(new Date(pack.published_at), 'PPp', { locale: es })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canPublish && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" disabled={isPublishing}>
                              <Upload className="w-4 h-4 mr-1" />
                              Publicar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Publicar esta versión?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esto activará la versión {pack.version} y archivará la versión actual.
                                Los cambios afectarán cómo se calcula el XP de los jugadores.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handlePublish(pack.id)}>
                                Publicar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {canRollback && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isRollingBack}>
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Restaurar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Restaurar esta versión?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esto reactivará la versión {pack.version} y archivará la versión actual.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRollback(pack.id)}>
                                Restaurar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
