import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useCompleteComponent } from '@/hooks/useTraining';
import { toast } from 'sonner';

interface LecturaViewProps {
  componentId: string;
  moduleId: string;
  title: string;
  content: string | null;
  documentUrl: string | null;
  documentSections: string | null;
  readingGuide: string | null;
  alreadyCompleted: boolean;
}

export function LecturaView({
  componentId,
  moduleId,
  title,
  content,
  documentUrl,
  documentSections,
  readingGuide,
  alreadyCompleted,
}: LecturaViewProps) {
  const navigate = useNavigate();
  const completeComponent = useCompleteComponent();
  const [scrollProgress, setScrollProgress] = useState(alreadyCompleted ? 100 : 0);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const hasPdf = !!documentUrl;

  useEffect(() => {
    if (alreadyCompleted) {
      setScrollProgress(100);
      return;
    }
    if (!hasPdf && contentRef.current) {
      const el = contentRef.current;
      if (el.scrollHeight - el.clientHeight <= 20) {
        setScrollProgress(100);
      }
    }
  }, [alreadyCompleted, hasPdf, content]);

  const handleTextScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 20) {
      setScrollProgress(100);
      return;
    }
    setScrollProgress(Math.min(100, (el.scrollTop / max) * 100));
  };

  const handleComplete = async () => {
    if (alreadyCompleted) {
      navigate(`/training/modules/${moduleId}`);
      return;
    }
    try {
      await completeComponent.mutateAsync({ componentId, moduleId });
      toast.success('Lectura completada');
      navigate(`/training/modules/${moduleId}`);
    } catch {
      toast.error('Error al completar la lectura');
    }
  };

  const isUnlocked = scrollProgress >= 80 || alreadyCompleted;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/training/modules/${moduleId}`)}
          className="mb-3 -ml-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al módulo
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      </div>

      {/* BLOQUE 1: Guía de lectura */}
      {(documentSections || readingGuide) && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-base font-bold text-foreground">📖 Guía de estudio</h2>
          {documentSections && (
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Qué leer en el documento
              </p>
              <p className="mt-1 text-sm text-foreground">{documentSections}</p>
            </div>
          )}
          {readingGuide && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Mientras lees, enfócate en
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{readingGuide}</p>
            </div>
          )}
        </div>
      )}

      {/* BLOQUE 2: PDF o Texto */}
      {hasPdf ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              Documento institucional White Lions
            </p>
            <a
              href={documentUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Abrir en nueva pestaña <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="relative" style={{ height: '70vh' }}>
            {!pdfLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <p className="text-sm text-muted-foreground">Cargando documento...</p>
              </div>
            )}
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl!)}&embedded=true`}
              className="h-full w-full border-0"
              title={title}
              allow="autoplay"
              onLoad={() => {
                setPdfLoaded(true);
                if (!alreadyCompleted) {
                  setTimeout(() => setScrollProgress(100), 30000);
                }
              }}
            />
          </div>

          {!alreadyCompleted && scrollProgress < 100 && (
            <div className="border-t border-border bg-muted px-4 py-3">
              <p className="text-sm text-muted-foreground">
                ⏱ El botón se habilitará después de 30 segundos con el documento abierto.
                Tómate el tiempo para leer las secciones indicadas.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div
            ref={contentRef}
            className="overflow-y-auto border-l-4 border-primary p-6 leading-relaxed text-foreground"
            style={{ maxHeight: '60vh' }}
            onScroll={handleTextScroll}
          >
            <div className="whitespace-pre-wrap text-sm">{content}</div>
          </div>

          <div className="border-t border-border bg-muted px-6 py-3">
            <div className="mb-2 h-1.5 w-full rounded-full bg-border">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isUnlocked ? 'bg-primary' : 'bg-primary/60'
                }`}
                style={{ width: `${scrollProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isUnlocked
                ? '✓ Has leído el material completo'
                : 'Desplázate hasta el final para continuar'}
            </p>
          </div>
        </div>
      )}

      {/* BLOQUE 3: Puntos clave */}
      {content && hasPdf && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
            🎯 Puntos clave para el examen
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {content}
          </p>
        </div>
      )}

      {/* Botón de completado */}
      <div className="pb-8">
        <button
          onClick={handleComplete}
          disabled={(!isUnlocked && !hasPdf) || completeComponent.isPending}
          className={`w-full rounded-xl py-4 text-base font-semibold transition-all ${
            alreadyCompleted
              ? 'cursor-pointer bg-primary text-primary-foreground hover:opacity-90'
              : isUnlocked || hasPdf
              ? 'cursor-pointer bg-primary text-primary-foreground hover:opacity-90'
              : 'cursor-not-allowed bg-muted text-muted-foreground'
          }`}
        >
          {completeComponent.isPending
            ? 'Guardando...'
            : alreadyCompleted
            ? 'Lectura ya completada ✓'
            : 'He leído este material'}
        </button>

        {!isUnlocked && !hasPdf && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Desplázate hasta el final del texto para habilitar
          </p>
        )}
      </div>
    </div>
  );
}
