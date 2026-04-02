import { useState } from 'react';
import { useVenues } from '@/hooks/useVenues';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Power, MapPin } from 'lucide-react';
import { CreateVenueModal } from './CreateVenueModal';
import { EditVenueModal } from './EditVenueModal';
import type { Venue } from '@/types/categories';
import { toast } from 'sonner';

export function VenuesTable() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const { venues, isLoading, refetch, toggleVenueActive } = useVenues();

  const handleToggleActive = async (venue: Venue) => {
    const success = await toggleVenueActive(venue.id, !venue.is_active);
    if (success) {
      toast.success(venue.is_active ? 'Sede desactivada' : 'Sede activada');
    } else {
      toast.error('Error al cambiar estado');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Sede
        </Button>
      </div>

      <div className="stryk-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden sm:table-cell">Dirección</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Cargando...
                  </div>
                </TableCell>
              </TableRow>
            ) : venues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <MapPin className="w-8 h-8" />
                    <p>No hay sedes registradas</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              venues.map((venue) => (
                <TableRow key={venue.id} className={!venue.is_active ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{venue.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {venue.address || '—'}
                  </TableCell>
                  <TableCell>
                    {venue.is_active ? (
                      <Badge className="bg-success/10 text-success border-success/20">
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactiva</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingVenue(venue)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(venue)}>
                          <Power className="w-4 h-4 mr-2" />
                          {venue.is_active ? 'Desactivar' : 'Activar'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateVenueModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          refetch();
          setIsCreateOpen(false);
        }}
      />

      <EditVenueModal
        venue={editingVenue}
        open={!!editingVenue}
        onOpenChange={(open) => !open && setEditingVenue(null)}
        onSuccess={() => {
          refetch();
          setEditingVenue(null);
        }}
      />
    </div>
  );
}
