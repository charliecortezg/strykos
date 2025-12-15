import { useState, useCallback } from 'react';
import { useExpenses, EXPENSE_CATEGORIES, type ExpenseFilters } from '@/hooks/useExpenses';
import { CreateExpenseModal } from './CreateExpenseModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, FileDown, Trash2, Calendar, DollarSign, Receipt, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ExpensesModule() {
  const { expenses, stats, loading, fetchExpenses, createExpense, deleteExpense } = useExpenses();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleFilterChange = useCallback((newFilters: Partial<ExpenseFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    fetchExpenses(updated);
  }, [filters, fetchExpenses]);

  const clearFilters = () => {
    setFilters({});
    fetchExpenses({});
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    const result = await deleteExpense(deleteId);
    setDeleting(false);
    
    if (result.success) {
      toast.success('Gasto eliminado');
      fetchExpenses(filters);
    } else {
      toast.error(result.error || 'Error al eliminar');
    }
    setDeleteId(null);
  };

  const exportToPDF = () => {
    // Create a printable HTML document
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte de Gastos</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; }
          .summary-card { background: #f5f5f5; padding: 15px; border-radius: 8px; }
          .summary-card h3 { margin: 0 0 5px 0; font-size: 14px; color: #666; }
          .summary-card p { margin: 0; font-size: 24px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #333; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .date { color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>Reporte de Gastos</h1>
        <div class="summary">
          <div class="summary-card">
            <h3>Total del Mes</h3>
            <p>$${stats.totalMonth.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>
          <div class="summary-card">
            <h3>Total Filtrado</h3>
            <p>$${stats.totalFiltered.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>
          <div class="summary-card">
            <h3>Registros</h3>
            <p>${stats.expenseCount}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map(expense => `
              <tr>
                <td>${format(new Date(expense.expense_date), 'dd/MM/yyyy')}</td>
                <td>${expense.category}</td>
                <td>${expense.description || '-'}</td>
                <td>$${Number(expense.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p class="date">Generado el ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}</p>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalMonth)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Filtrado</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalFiltered)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expenseCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <Select
            value={filters.category || 'all'}
            onValueChange={(val) => handleFilterChange({ category: val === 'all' ? undefined : val })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {EXPENSE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder="Desde"
            className="w-[150px]"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange({ startDate: e.target.value || undefined })}
          />

          <Input
            type="date"
            placeholder="Hasta"
            className="w-[150px]"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange({ endDate: e.target.value || undefined })}
          />

          {(filters.category || filters.startDate || filters.endDate) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToPDF} disabled={expenses.length === 0}>
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Gasto
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay gastos registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {format(new Date(expense.expense_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{expense.category}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {expense.description || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(expense.amount))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <CreateExpenseModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={createExpense}
        onSuccess={() => fetchExpenses(filters)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
