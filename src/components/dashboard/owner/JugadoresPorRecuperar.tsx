import { useQuery } from '@tanstack/react-query';
import { MessageCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { OWNER_COPY, buildWhatsAppReminder, waLink } from '@/lib/owner-language';

interface OverduePlayer {
  id: string;
  full_name: string;
  tutor_name: string | null;
  phone: string | null;
  monthly_fee: number | null;
  billing_status: string;
  last_paid_month: string | null;
}

const BILLING_LABEL: Record<string, string> = {
  overdue_1: OWNER_COPY.deben_1,
  overdue_2: OWNER_COPY.deben_2_plus,
};

export function JugadoresPorRecuperar() {
  const { organization } = useAuth();

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['jugadores-por-recuperar', organization?.id],
    queryFn: async (): Promise<OverduePlayer[]> => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, tutor_name, phone, monthly_fee, billing_status, last_paid_month')
        .eq('organization_id', organization.id)
        .in('billing_status', ['overdue_1', 'overdue_2'])
        .order('billing_status', { ascending: false });
      if (error) throw error;
      return (data || []) as OverduePlayer[];
    },
    enabled: !!organization?.id,
  });

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          {OWNER_COPY.jugadores_por_recuperar}
          {players.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {players.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-4">
            {OWNER_COPY.sin_jugadores_por_recuperar}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {players.map((p) => {
              const message = buildWhatsAppReminder({
                tutorName: p.tutor_name,
                playerName: p.full_name,
                amount: p.monthly_fee,
              });
              const link = waLink(p.phone, message);
              return (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.full_name}</p>
                    <div className="flex items-center flex-wrap gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          p.billing_status === 'overdue_2'
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : 'bg-warning/10 text-warning border-warning/20'
                        }`}
                      >
                        {BILLING_LABEL[p.billing_status] || p.billing_status}
                      </Badge>
                      {p.monthly_fee ? (
                        <span className="text-xs text-muted-foreground">
                          ${Number(p.monthly_fee).toLocaleString('es-MX')}
                        </span>
                      ) : null}
                      {p.tutor_name ? (
                        <span className="text-xs text-muted-foreground truncate">
                          Tutor: {p.tutor_name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {link ? (
                    <a href={link} target="_blank" rel="noreferrer noopener">
                      <Button size="sm" variant="outline" className="gap-2 w-full sm:w-auto">
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </Button>
                    </a>
                  ) : (
                    <Button size="sm" variant="outline" disabled className="w-full sm:w-auto">
                      Sin teléfono
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
