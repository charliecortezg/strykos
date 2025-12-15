import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Expense {
  id: string;
  organization_id: string;
  amount: number;
  category: string;
  description: string | null;
  expense_date: string;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseFilters {
  category?: string;
  startDate?: string;
  endDate?: string;
}

export const EXPENSE_CATEGORIES = [
  'Equipamiento',
  'Instalaciones',
  'Transporte',
  'Alimentación',
  'Uniformes',
  'Material deportivo',
  'Servicios',
  'Mantenimiento',
  'Marketing',
  'Otros'
];

export function useExpenses() {
  const { organization } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalMonth: 0,
    totalFiltered: 0,
    expenseCount: 0
  });

  const fetchExpenses = useCallback(async (filters?: ExpenseFilters) => {
    if (!organization?.id) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', organization.id)
        .order('expense_date', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.startDate) {
        query = query.gte('expense_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('expense_date', filters.endDate);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      setExpenses(data || []);

      // Calculate stats
      const totalFiltered = (data || []).reduce((sum, e) => sum + Number(e.amount), 0);
      
      // Get current month total
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const { data: monthData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('organization_id', organization.id)
        .gte('expense_date', firstDayOfMonth)
        .lte('expense_date', lastDayOfMonth);

      const totalMonth = (monthData || []).reduce((sum, e) => sum + Number(e.amount), 0);

      setStats({
        totalMonth,
        totalFiltered,
        expenseCount: (data || []).length
      });

    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Error al cargar gastos');
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const createExpense = useCallback(async (expenseData: {
    amount: number;
    category: string;
    description?: string;
    expense_date: string;
  }) => {
    if (!organization?.id) return { success: false, error: 'No organization' };

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from('expenses')
        .insert({
          organization_id: organization.id,
          amount: expenseData.amount,
          category: expenseData.category,
          description: expenseData.description || null,
          expense_date: expenseData.expense_date,
          recorded_by: userData.user?.id || null
        });

      if (insertError) throw insertError;

      return { success: true };
    } catch (err) {
      console.error('Error creating expense:', err);
      return { success: false, error: 'Error al registrar gasto' };
    }
  }, [organization?.id]);

  const deleteExpense = useCallback(async (expenseId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (deleteError) throw deleteError;

      return { success: true };
    } catch (err) {
      console.error('Error deleting expense:', err);
      return { success: false, error: 'Error al eliminar gasto' };
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return {
    expenses,
    stats,
    loading,
    error,
    fetchExpenses,
    createExpense,
    deleteExpense
  };
}
