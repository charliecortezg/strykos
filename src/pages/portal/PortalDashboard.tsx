import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePortalAuth } from '@/contexts/PortalAuthContext';

export default function PortalDashboard() {
  const navigate = useNavigate();
  const { guardian, organizationName, linkedPlayers, logout } = usePortalAuth();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Auto-select if only one player
  useEffect(() => {
    if (linkedPlayers.length === 1 && !selectedPlayerId) {
      navigate(`/portal/jugador/${linkedPlayers[0].id}`);
    }
  }, [linkedPlayers, selectedPlayerId, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Portal Familiar</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container px-4 py-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold">
            Hola, {guardian?.full_name?.split(' ')[0] || 'Tutor'}
          </h1>
          <p className="text-muted-foreground">
            {organizationName}
          </p>
        </div>

        {/* Players List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Tus jugadores</h2>
          
          {linkedPlayers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No tienes jugadores vinculados.</p>
                <p className="text-sm mt-1">Contacta a la academia para registrar a tus hijos.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {linkedPlayers.map(player => (
                <Card 
                  key={player.id}
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                  onClick={() => navigate(`/portal/jugador/${player.id}`)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold">{player.full_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {player.category_name || 'Sin categoría'}
                        {player.sport_name && ` • ${player.sport_name}`}
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="text-muted-foreground">
                      →
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
