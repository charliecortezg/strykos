// STRYK Intake Success Component
import React from 'react';
import { CheckCircle2, Copy, MessageCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '../lib/intake-utils';
import { toast } from 'sonner';

interface IntakeSuccessProps {
  playerName: string;
  guardianPhone: string;
  totalAmount: number;
  whatsappGroupUrl?: string | null;
  onNewIntake: () => void;
}

export function IntakeSuccess({
  playerName,
  guardianPhone,
  totalAmount,
  whatsappGroupUrl,
  onNewIntake,
}: IntakeSuccessProps) {
  const handleCopyPhone = () => {
    navigator.clipboard.writeText(guardianPhone);
    toast.success('Teléfono copiado');
  };

  const handleWhatsAppGroup = () => {
    if (whatsappGroupUrl) {
      window.open(whatsappGroupUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      {/* Success Icon */}
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-in zoom-in-50 duration-300">
        <CheckCircle2 className="w-14 h-14 text-primary" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground mb-2">
        ¡Fichaje Exitoso!
      </h1>

      {/* Player Name */}
      <p className="text-lg text-muted-foreground mb-6">
        <span className="font-semibold text-foreground">{playerName}</span> ha sido registrado
      </p>

      {/* Amount Paid */}
      <div className="bg-secondary rounded-xl p-4 mb-6 w-full max-w-xs">
        <p className="text-sm text-muted-foreground mb-1">Total pagado</p>
        <p className="text-3xl font-bold text-primary">
          {formatCurrency(totalAmount)}
        </p>
      </div>

      {/* Guardian Phone */}
      <div className="bg-muted rounded-lg p-3 mb-6 w-full max-w-xs">
        <p className="text-sm text-muted-foreground mb-1">Teléfono del tutor</p>
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono text-lg">{guardianPhone}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopyPhone}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* WhatsApp Group Button */}
      {whatsappGroupUrl && (
        <Button
          variant="outline"
          className="mb-4 w-full max-w-xs"
          onClick={handleWhatsAppGroup}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Enviar al grupo de WhatsApp
        </Button>
      )}

      {/* New Intake Button */}
      <Button
        size="lg"
        className="w-full max-w-xs h-14 text-lg font-semibold"
        onClick={onNewIntake}
      >
        <UserPlus className="mr-2 h-5 w-5" />
        Nuevo Fichaje
      </Button>
    </div>
  );
}
