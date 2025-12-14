import { useOperationalReports } from '@/hooks/useOperationalReports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, Users, DollarSign, Calendar, Percent, AlertCircle } from 'lucide-react';

const chartConfig = {
  presente: { label: 'Presente', color: 'hsl(142 76% 36%)' },
  ausente: { label: 'Ausente', color: 'hsl(0 72% 51%)' },
  justificado: { label: 'Justificado', color: 'hsl(45 93% 47%)' },
  total: { label: 'Total', color: 'hsl(214 100% 56%)' },
};

const COLORS = ['hsl(142 76% 36%)', 'hsl(0 72% 51%)', 'hsl(45 93% 47%)'];

export function OperationalReports() {
  const { data, isLoading } = useOperationalReports();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Cargando reportes...
        </div>
      </div>
    );
  }

  const pieData = [
    { name: 'Presente', value: data.dailyAttendance.reduce((sum, d) => sum + d.presente, 0) },
    { name: 'Ausente', value: data.dailyAttendance.reduce((sum, d) => sum + d.ausente, 0) },
    { name: 'Justificado', value: data.dailyAttendance.reduce((sum, d) => sum + d.justificado, 0) },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Percent className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">{data.overallAttendanceRate}%</p>
                <p className="text-sm text-muted-foreground">Asistencia Global</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">${data.monthlyRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Recaudado (mes)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">{data.pendingPayments}</p>
                <p className="text-sm text-muted-foreground">Pagos Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">{data.totalPlayers}</p>
                <p className="text-sm text-muted-foreground">Jugadores Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Attendance Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Tendencia de Asistencia (14 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.dailyAttendance.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <LineChart data={data.dailyAttendance} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="presente" 
                    stroke="hsl(142 76% 36%)" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Presente"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ausente" 
                    stroke="hsl(0 72% 51%)" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Ausente"
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <Calendar className="w-8 h-8 mr-2" />
                Sin datos de asistencia
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Distribución de Asistencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <Calendar className="w-8 h-8 mr-2" />
                Sin datos de asistencia
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Performance & Payments */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Attendance by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Asistencia por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.attendanceByCategory.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart 
                  data={data.attendanceByCategory} 
                  layout="vertical" 
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="categoryName" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false} 
                    axisLine={false}
                    width={80}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="presente" stackId="a" fill="hsl(142 76% 36%)" name="Presente" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="ausente" stackId="a" fill="hsl(0 72% 51%)" name="Ausente" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="justificado" stackId="a" fill="hsl(45 93% 47%)" name="Justificado" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                <Calendar className="w-8 h-8 mr-2" />
                Sin categorías con datos
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments by Month */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Pagos por Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.paymentsByMonth.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={data.paymentsByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total']}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="hsl(214 100% 56%)" 
                    radius={[4, 4, 0, 0]}
                    name="Total"
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                <DollarSign className="w-8 h-8 mr-2" />
                Sin datos de pagos
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
