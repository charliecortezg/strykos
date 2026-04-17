import { useAllTrainersProgress, useIssueCertification } from '@/hooks/useTraining';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export function CertificationDashboard() {
  const { data: trainersData = [], isLoading } = useAllTrainersProgress();
  const issueCert = useIssueCertification();

  const handleIssue = async (trainerId: string) => {
    try {
      await issueCert.mutateAsync({
        trainerId,
        level: 'WL-C1',
        notes: 'Certificación emitida tras completar todos los módulos WL-C1',
      });
      toast.success('Certificación emitida');
    } catch (e) {
      toast.error('Error al emitir la certificación');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Certificaciones WL</h1>
        <p className="mt-1 text-muted-foreground">
          Gestión de capacitación y certificación de entrenadores
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entrenador</TableHead>
                <TableHead>WL-C1 Progreso</TableHead>
                <TableHead className="text-center">Módulos</TableHead>
                <TableHead>Certificación</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainersData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No hay entrenadores registrados.
                  </TableCell>
                </TableRow>
              )}
              {trainersData.map((t) => {
                const completedModules = t.modules.filter((m) => m.status === 'completed').length;
                const allComplete = completedModules >= 4;
                const hasCert = t.certifications.some((c) => c.certification_level === 'WL-C1' && !c.revoked_at);
                const percent = (completedModules / 4) * 100;

                return (
                  <TableRow key={t.trainer.id}>
                    <TableCell>
                      <p className="font-semibold">{t.trainer.full_name}</p>
                      <p className="text-xs text-muted-foreground">{t.trainer.email}</p>
                    </TableCell>
                    <TableCell>
                      <div className="w-40">
                        <Progress value={percent} className="h-2" />
                        <p className="mt-1 text-xs text-muted-foreground">{Math.round(percent)}%</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={allComplete ? 'default' : 'secondary'}>{completedModules}/4</Badge>
                    </TableCell>
                    <TableCell>
                      {hasCert ? (
                        <Badge className="bg-success text-success-foreground">✓ WL-C1</Badge>
                      ) : allComplete ? (
                        <Badge variant="outline">Apto para certificar</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">En progreso</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {allComplete && !hasCert && (
                        <Button size="sm" onClick={() => handleIssue(t.trainer.id)} disabled={issueCert.isPending}>
                          {issueCert.isPending ? 'Emitiendo...' : 'Certificar'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5">
          <h3 className="font-bold">Cómo funciona la certificación</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>El entrenador completa los 4 módulos de WL-C1.</li>
            <li>Cuando todos están completos aparece el botón "Certificar".</li>
            <li>El DD emite la certificación con un clic.</li>
            <li>El entrenador recibe la certificación WL-C1 en su perfil.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
