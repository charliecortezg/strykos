import { useState } from 'react';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileBarChart, TrendingUp, TrendingDown, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useMonthlyReports } from '@/hooks/useMonthlyReports';
import { cn } from '@/lib/utils';

function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    options.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy', { locale: es }),
    });
  }
  return options;
}

export function MonthlyReportSection() {
  const { reports, isLoading, generateReport } = useMonthlyReports();
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || '');

  const currentReport = reports.find(
    r => r.report_month.startsWith(selectedMonth)
  );

  const snapshot = currentReport?.snapshot as any;
  const categoryBreakdown = snapshot?.category_breakdown || [];

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileBarChart className="w-5 h-5 text-primary" />
            Reporte Mensual
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => generateReport.mutate(selectedMonth)}
              disabled={generateReport.isPending}
              className="gap-1.5"
            >
              {generateReport.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileBarChart className="w-4 h-4" />
              )}
              {currentReport ? 'Regenerar' : 'Generar'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !currentReport ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileBarChart className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No hay reporte para este mes.</p>
            <p className="text-sm">Haz clic en "Generar" para crear uno.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-4 text-center">
                <TrendingUp className="w-5 h-5 text-success mx-auto mb-1" />
                <p className="text-2xl font-bold text-success">{currentReport.new_players_count}</p>
                <p className="text-xs text-muted-foreground">Nuevos</p>
              </Card>
              <Card className="p-4 text-center">
                <TrendingDown className="w-5 h-5 text-destructive mx-auto mb-1" />
                <p className="text-2xl font-bold text-destructive">{currentReport.churned_count}</p>
                <p className="text-xs text-muted-foreground">Bajas</p>
              </Card>
              <Card className="p-4 text-center">
                <div className="mx-auto mb-1 w-5 h-5 flex items-center justify-center">
                  {(currentReport.new_players_count - currentReport.churned_count) >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-success" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-destructive" />
                  )}
                </div>
                <p className={cn(
                  "text-2xl font-bold",
                  (currentReport.new_players_count - currentReport.churned_count) >= 0 ? "text-success" : "text-destructive"
                )}>
                  {currentReport.new_players_count - currentReport.churned_count >= 0 ? '+' : ''}
                  {currentReport.new_players_count - currentReport.churned_count}
                </p>
                <p className="text-xs text-muted-foreground">Neto</p>
              </Card>
              <Card className="p-4 text-center">
                <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{snapshot?.total_active || '—'}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </Card>
            </div>

            {/* Category breakdown */}
            {categoryBreakdown.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Desglose por categoría</h4>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Categoría</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">Nuevos</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">Bajas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {categoryBreakdown.map((cat: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">{cat.name}</td>
                          <td className="px-3 py-2 text-center">
                            {cat.new > 0 && <Badge variant="outline" className="bg-success/10 text-success border-success/20">+{cat.new}</Badge>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {cat.churned > 0 && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">-{cat.churned}</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-right">
              Generado: {format(new Date(currentReport.created_at), "dd MMM yyyy HH:mm", { locale: es })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
