import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

function publicLogoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from('org-logos').getPublicUrl(path);
  return data?.publicUrl || null;
}

export function AcademyConfigPanel() {
  const { organization, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(organization?.name || '');
  const [primarySport, setPrimarySport] = useState(organization?.primary_sport || '');
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);

  const logoUrl = publicLogoUrl((organization as any)?.logo_url);

  if (!organization) return null;

  const handleSaveBasics = async () => {
    setSavingName(true);
    const { error } = await supabase
      .from('organizations')
      .update({ name: name.trim(), primary_sport: primarySport.trim() })
      .eq('id', organization.id);
    setSavingName(false);
    if (error) {
      toast.error('No se pudo guardar');
      return;
    }
    toast.success('Datos actualizados');
    refreshProfile();
  };

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Solo PNG, JPG o SVG');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('El archivo no puede pasar de 2 MB');
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `${organization.id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('org-logos')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast.error('No se pudo subir el logo');
      return;
    }
    const { error: orgErr } = await supabase
      .from('organizations')
      .update({ logo_url: path } as any)
      .eq('id', organization.id);
    setUploading(false);
    if (orgErr) {
      toast.error('Logo subido pero no se guardó');
      return;
    }
    toast.success('Logo actualizado');
    refreshProfile();
  };

  const handleRemoveLogo = async () => {
    const currentPath = (organization as any)?.logo_url;
    if (currentPath) {
      await supabase.storage.from('org-logos').remove([currentPath]);
    }
    await supabase
      .from('organizations')
      .update({ logo_url: null } as any)
      .eq('id', organization.id);
    toast.success('Logo eliminado');
    refreshProfile();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Configuración de la academia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo */}
        <div className="space-y-2">
          <Label>Logo de la academia</Label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {logoUrl ? 'Cambiar logo' : 'Subir logo'}
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Quitar logo
                </Button>
              )}
              <p className="text-xs text-muted-foreground">PNG, JPG o SVG. Máx 2 MB.</p>
            </div>
          </div>
        </div>

        {/* Nombre */}
        <div className="space-y-2">
          <Label htmlFor="org-name">Nombre de la academia</Label>
          <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Deporte principal */}
        <div className="space-y-2">
          <Label htmlFor="org-sport">Deporte principal</Label>
          <Input
            id="org-sport"
            value={primarySport}
            onChange={(e) => setPrimarySport(e.target.value)}
          />
        </div>

        {/* Prefijo de folio */}
        <div className="space-y-2">
          <Label>Prefijo de folio de recibos</Label>
          <Input value="WL-STRYK-###" readOnly className="bg-muted" />
          <p className="text-xs text-muted-foreground">
            El prefijo y secuencia se generan automáticamente al registrar pagos.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveBasics} disabled={savingName}>
            {savingName ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
