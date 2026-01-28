// STRYK Camera Capture Component
import React, { useRef, useState } from 'react';
import { Camera, X, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClear: () => void;
  capturedFile: File | null;
  required?: boolean;
  className?: string;
}

export function CameraCapture({ 
  onCapture, 
  onClear, 
  capturedFile,
  required,
  className 
}: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('La imagen no debe superar 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    onCapture(file);
  };

  const handleClear = () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
    onClear();
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />

      {capturedFile && preview ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-primary bg-primary/5">
          <img 
            src={preview} 
            alt="Captura" 
            className="w-full h-32 object-cover"
          />
        <div className="absolute top-2 right-2 flex gap-1">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/90 hover:bg-background"
              onClick={() => inputRef.current?.click()}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Foto capturada
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "w-full h-32 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2",
            required 
              ? "border-accent bg-accent/10 hover:bg-accent/20" 
              : "border-muted-foreground/30 bg-muted/30 hover:bg-muted/50"
          )}
        >
          <Camera className={cn(
            "h-8 w-8",
            required ? "text-accent-foreground" : "text-muted-foreground"
          )} />
          <span className={cn(
            "text-sm font-medium",
            required ? "text-accent-foreground" : "text-muted-foreground"
          )}>
            {required ? '📸 Tomar Foto (Obligatorio)' : '📸 Tomar Foto (Opcional)'}
          </span>
        </button>
      )}
    </div>
  );
}
