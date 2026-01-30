import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, QrCode, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TransferQRDisplayProps {
  qrUrl?: string | null;
  bankInfo?: string | null;
  className?: string;
}

export function TransferQRDisplay({
  qrUrl,
  bankInfo,
  className,
}: TransferQRDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!bankInfo) return;
    
    try {
      await navigator.clipboard.writeText(bankInfo);
      setCopied(true);
      toast.success('Datos copiados al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const hasQR = qrUrl && qrUrl.trim() !== '';
  const hasBank = bankInfo && bankInfo.trim() !== '';

  if (!hasQR && !hasBank) {
    return (
      <Card className={cn('bg-muted/50', className)}>
        <CardContent className="p-4 text-center">
          <QrCode className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Datos de transferencia no configurados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4 space-y-4">
        {/* QR Code */}
        {hasQR && (
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <img
                src={qrUrl}
                alt="QR para transferencia"
                className="w-40 h-40 object-contain"
              />
            </div>
          </div>
        )}

        {/* Bank Info */}
        {hasBank && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CreditCard className="w-4 h-4" />
              Datos bancarios
            </div>
            <div className="bg-muted rounded-lg p-3">
              <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
                {bankInfo}
              </pre>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-success" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar datos
                </>
              )}
            </Button>
          </div>
        )}

        {/* Instructions */}
        <p className="text-xs text-muted-foreground text-center">
          Realiza la transferencia y muestra el comprobante para continuar
        </p>
      </CardContent>
    </Card>
  );
}
