import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RulesetEconomy, RulesetCaps, RulesetMultipliers, OvrWeights } from '@/types/stryk-way';

interface RulesetEditorProps {
  rulesetId: string;
  packId: string;
  economy: RulesetEconomy;
  caps: RulesetCaps;
  multipliers: RulesetMultipliers;
  ovrWeights: OvrWeights;
  onSaved?: () => void;
}

const DEFAULT_ECONOMY: RulesetEconomy = {
  xp_per_attendance: 10,
  xp_per_goal: 25,
  xp_per_assist: 15,
  xp_per_match_present: 20,
  xp_per_level: 100,
};

const DEFAULT_CAPS: RulesetCaps = {
  daily_xp_cap: 100,
  weekly_xp_cap: 500,
  daily_attendance_cap: 2,
};

const DEFAULT_MULTIPLIERS: RulesetMultipliers = {
  amistoso: 1.0,
  liga: 1.5,
  eliminacion: 2.0,
  campeonato: 2.5,
};

const DEFAULT_WEIGHTS: OvrWeights = {
  tecnica: 0.20,
  tactica: 0.20,
  fisica: 0.20,
  mental: 0.15,
  social: 0.15,
  disciplina: 0.10,
};

export function RulesetEditor({
  rulesetId,
  packId,
  economy: initialEconomy,
  caps: initialCaps,
  multipliers: initialMultipliers,
  ovrWeights: initialWeights,
  onSaved,
}: RulesetEditorProps) {
  const { organization } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('economy');

  // Form state
  const [economy, setEconomy] = useState<RulesetEconomy>({
    ...DEFAULT_ECONOMY,
    ...initialEconomy,
  });
  const [caps, setCaps] = useState<RulesetCaps>({
    ...DEFAULT_CAPS,
    ...initialCaps,
  });
  const [multipliers, setMultipliers] = useState<RulesetMultipliers>({
    ...DEFAULT_MULTIPLIERS,
    ...initialMultipliers,
  });
  const [ovrWeights, setOvrWeights] = useState<OvrWeights>({
    ...DEFAULT_WEIGHTS,
    ...initialWeights,
  });

  const handleSave = async () => {
    if (!organization) return;

    setIsSaving(true);
    try {
      // Cast to any to satisfy Supabase's Json type
      const { error } = await supabase
        .from('stryk_rulesets')
        .update({
          economy: JSON.parse(JSON.stringify(economy)),
          caps: JSON.parse(JSON.stringify(caps)),
          multipliers: JSON.parse(JSON.stringify(multipliers)),
          ovr_weights: JSON.parse(JSON.stringify(ovrWeights)),
        })
        .eq('id', rulesetId);

      if (error) throw error;

      toast.success('Configuración guardada');
      onSaved?.();
    } catch (error) {
      console.error('Error saving ruleset:', error);
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEconomy(DEFAULT_ECONOMY);
    setCaps(DEFAULT_CAPS);
    setMultipliers(DEFAULT_MULTIPLIERS);
    setOvrWeights(DEFAULT_WEIGHTS);
    toast.info('Valores restaurados a predeterminados');
  };

  // Validate OVR weights sum to ~1
  const weightsSum = Object.values(ovrWeights).reduce((a, b) => a + b, 0);
  const weightsValid = weightsSum >= 0.99 && weightsSum <= 1.01;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="economy">Economía XP</TabsTrigger>
          <TabsTrigger value="caps">Límites</TabsTrigger>
          <TabsTrigger value="multipliers">Multiplicadores</TabsTrigger>
          <TabsTrigger value="weights">Pesos OVR</TabsTrigger>
        </TabsList>

        {/* Economy Tab */}
        <TabsContent value="economy" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Economía de XP</CardTitle>
              <CardDescription>
                Define cuánto XP ganan los jugadores por cada actividad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="xp_per_attendance">XP por Asistencia</Label>
                  <Input
                    id="xp_per_attendance"
                    type="number"
                    min={0}
                    max={100}
                    value={economy.xp_per_attendance}
                    onChange={(e) => setEconomy(prev => ({
                      ...prev,
                      xp_per_attendance: parseInt(e.target.value) || 0,
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xp_per_goal">XP por Gol</Label>
                  <Input
                    id="xp_per_goal"
                    type="number"
                    min={0}
                    max={200}
                    value={economy.xp_per_goal}
                    onChange={(e) => setEconomy(prev => ({
                      ...prev,
                      xp_per_goal: parseInt(e.target.value) || 0,
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xp_per_assist">XP por Asistencia (pase)</Label>
                  <Input
                    id="xp_per_assist"
                    type="number"
                    min={0}
                    max={100}
                    value={economy.xp_per_assist}
                    onChange={(e) => setEconomy(prev => ({
                      ...prev,
                      xp_per_assist: parseInt(e.target.value) || 0,
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xp_per_match">XP por Partido Jugado</Label>
                  <Input
                    id="xp_per_match"
                    type="number"
                    min={0}
                    max={100}
                    value={economy.xp_per_match_present}
                    onChange={(e) => setEconomy(prev => ({
                      ...prev,
                      xp_per_match_present: parseInt(e.target.value) || 0,
                    }))}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="xp_per_level">XP por Nivel</Label>
                  <Input
                    id="xp_per_level"
                    type="number"
                    min={50}
                    max={1000}
                    value={economy.xp_per_level}
                    onChange={(e) => setEconomy(prev => ({
                      ...prev,
                      xp_per_level: parseInt(e.target.value) || 100,
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cantidad de XP necesaria para subir cada nivel
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Caps Tab */}
        <TabsContent value="caps" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Límites Anti-Abuso</CardTitle>
              <CardDescription>
                Configura los caps para evitar acumulación excesiva
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily_xp_cap">Cap Diario de XP</Label>
                  <Input
                    id="daily_xp_cap"
                    type="number"
                    min={10}
                    max={1000}
                    value={caps.daily_xp_cap}
                    onChange={(e) => setCaps(prev => ({
                      ...prev,
                      daily_xp_cap: parseInt(e.target.value) || 100,
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekly_xp_cap">Cap Semanal de XP</Label>
                  <Input
                    id="weekly_xp_cap"
                    type="number"
                    min={50}
                    max={5000}
                    value={caps.weekly_xp_cap}
                    onChange={(e) => setCaps(prev => ({
                      ...prev,
                      weekly_xp_cap: parseInt(e.target.value) || 500,
                    }))}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="daily_attendance_cap">Asistencias por Día</Label>
                  <Input
                    id="daily_attendance_cap"
                    type="number"
                    min={1}
                    max={5}
                    value={caps.daily_attendance_cap}
                    onChange={(e) => setCaps(prev => ({
                      ...prev,
                      daily_attendance_cap: parseInt(e.target.value) || 2,
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Máximo de asistencias que cuentan XP por día
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Multipliers Tab */}
        <TabsContent value="multipliers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Multiplicadores de Partido</CardTitle>
              <CardDescription>
                Bonus de XP según el tipo de partido
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mult_amistoso">Amistoso</Label>
                  <Input
                    id="mult_amistoso"
                    type="number"
                    step="0.1"
                    min={0.5}
                    max={5}
                    value={multipliers.amistoso}
                    onChange={(e) => setMultipliers(prev => ({
                      ...prev,
                      amistoso: parseFloat(e.target.value) || 1,
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mult_liga">Liga</Label>
                  <Input
                    id="mult_liga"
                    type="number"
                    step="0.1"
                    min={0.5}
                    max={5}
                    value={multipliers.liga}
                    onChange={(e) => setMultipliers(prev => ({
                      ...prev,
                      liga: parseFloat(e.target.value) || 1.5,
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mult_eliminacion">Eliminación</Label>
                  <Input
                    id="mult_eliminacion"
                    type="number"
                    step="0.1"
                    min={0.5}
                    max={5}
                    value={multipliers.eliminacion}
                    onChange={(e) => setMultipliers(prev => ({
                      ...prev,
                      eliminacion: parseFloat(e.target.value) || 2,
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mult_campeonato">Campeonato</Label>
                  <Input
                    id="mult_campeonato"
                    type="number"
                    step="0.1"
                    min={0.5}
                    max={5}
                    value={multipliers.campeonato}
                    onChange={(e) => setMultipliers(prev => ({
                      ...prev,
                      campeonato: parseFloat(e.target.value) || 2.5,
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weights Tab */}
        <TabsContent value="weights" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pesos del OVR</CardTitle>
              <CardDescription>
                Cómo se calcula el Overall (deben sumar 1.0)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(ovrWeights).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`weight_${key}`} className="capitalize">{key}</Label>
                    <Input
                      id={`weight_${key}`}
                      type="number"
                      step="0.05"
                      min={0}
                      max={1}
                      value={value}
                      onChange={(e) => setOvrWeights(prev => ({
                        ...prev,
                        [key]: parseFloat(e.target.value) || 0,
                      }))}
                    />
                  </div>
                ))}
              </div>
              <div className={`p-3 rounded-lg ${weightsValid ? 'bg-green-50 text-green-700' : 'bg-destructive/10 text-destructive'}`}>
                <p className="text-sm font-medium">
                  Suma actual: {weightsSum.toFixed(2)}
                  {!weightsValid && ' (debe ser 1.0)'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <Button onClick={handleSave} disabled={isSaving || !weightsValid}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Restaurar Predeterminados
        </Button>
      </div>
    </div>
  );
}
