import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (file: File | null) => void;
  maxSizeMB?: number;
  label?: string;
  required?: boolean;
  className?: string;
}

async function compressImage(file: File, maxSizeMB: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    
    // If already under limit, return as-is
    if (file.size <= maxBytes) {
      resolve(file);
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Calculate new dimensions (max 1920px on any side)
      let { width, height } = img;
      const maxDimension = 1920;
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      // Try different quality levels
      const tryQuality = (quality: number): void => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            if (blob.size <= maxBytes || quality <= 0.1) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              tryQuality(quality - 0.1);
            }
          },
          'image/jpeg',
          quality
        );
      };

      tryQuality(0.8);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function CameraCapture({
  onCapture,
  maxSizeMB = 5,
  label = 'Evidencia de Pago',
  required = false,
  className,
}: CameraCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Solo se permiten imágenes');
      }

      // Compress if needed
      let processedFile = file;
      if (file.size > maxSizeMB * 1024 * 1024) {
        processedFile = await compressImage(file, maxSizeMB);
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(processedFile);

      setFileName(file.name);
      onCapture(processedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar imagen');
      onCapture(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setFileName(null);
    setError(null);
    onCapture(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="w-3 h-3 mr-1" />
            Quitar
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-40 object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
            <p className="text-xs text-white truncate">{fileName}</p>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
          disabled={isProcessing}
          className={cn(
            'w-full h-32 flex flex-col items-center justify-center gap-2 border-dashed',
            error && 'border-destructive'
          )}
        >
          {isProcessing ? (
            <>
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Procesando...</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Camera className="w-6 h-6 text-muted-foreground" />
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">
                Tomar foto o seleccionar imagen
              </span>
              <span className="text-xs text-muted-foreground/70">
                Máx. {maxSizeMB}MB
              </span>
            </>
          )}
        </Button>
      )}

      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );
}
