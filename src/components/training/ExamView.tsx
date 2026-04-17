import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { useExamQuestions, useSubmitExam } from '@/hooks/useTraining';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface ExamViewProps {
  componentId: string;
  moduleId: string;
  examTitle: string;
}

interface ExamResult {
  passed: boolean;
  percentage: number;
  score: number;
  total: number;
}

export function ExamView({ componentId, moduleId, examTitle }: ExamViewProps) {
  const navigate = useNavigate();
  const { data: questions = [], isLoading } = useExamQuestions(componentId);
  const submitExam = useSubmitExam();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ExamResult | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-muted-foreground">No hay preguntas disponibles.</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card className={`border-t-4 ${result.passed ? 'border-t-success' : 'border-t-destructive'}`}>
          <CardContent className="space-y-4 p-8 text-center">
            {result.passed ? (
              <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
            ) : (
              <XCircle className="mx-auto h-16 w-16 text-destructive" />
            )}
            <h2 className="text-2xl font-bold">{result.passed ? '¡Aprobado!' : 'No aprobado'}</h2>
            <p className="text-5xl font-bold">{Math.round(result.percentage)}%</p>
            <p className="text-muted-foreground">
              {result.score} de {result.total} respuestas correctas
            </p>
            {!result.passed && (
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="p-4 text-left">
                  <p className="text-sm font-semibold">Umbral de aprobación: 70%</p>
                  <p className="mt-1 text-sm text-muted-foreground">Puedes reintentar este examen.</p>
                </CardContent>
              </Card>
            )}
            <Button onClick={() => navigate(`/training/modules/${moduleId}`)} className="w-full" size="lg">
              Volver al módulo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const hasAnswered = answers[currentQuestion.id] !== undefined;

  const handleSubmit = async () => {
    try {
      const res = await submitExam.mutateAsync({ componentId, moduleId, answers });
      setResult({ passed: res.passed, percentage: res.percentage, score: res.score, total: res.total });
      if (res.passed) toast.success('¡Examen aprobado!');
      else toast.error('No aprobado. Puedes reintentarlo.');
    } catch (e) {
      toast.error('Error al enviar el examen');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/training/modules/${moduleId}`)} className="-ml-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver
      </Button>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{examTitle}</h1>
        <p className="text-sm text-muted-foreground">Umbral de aprobación: 70%</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">
              Pregunta {currentIndex + 1} de {questions.length}
            </span>
            <span className="text-muted-foreground">
              {Math.round(((currentIndex + 1) / questions.length) * 100)}%
            </span>
          </div>
          <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">{currentQuestion.question_text}</h2>
          <div className="space-y-2">
            {currentQuestion.options.map((opt) => {
              const selected = answers[currentQuestion.id] === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setAnswers({ ...answers, [currentQuestion.id]: opt.key })}
                  className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                    selected
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold">
                    {opt.key.toUpperCase()}
                  </span>
                  <span className="font-medium">{opt.text}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          ← Anterior
        </Button>
        {!isLast ? (
          <Button onClick={() => setCurrentIndex(currentIndex + 1)} disabled={!hasAnswered} className="flex-1">
            Siguiente →
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!hasAnswered || submitExam.isPending || Object.keys(answers).length < questions.length}
            className="flex-1"
          >
            {submitExam.isPending ? 'Enviando...' : 'Enviar examen'}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-semibold">Preguntas:</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-9 w-9 rounded-md text-sm font-semibold transition-all ${
                  answers[q.id] !== undefined
                    ? 'bg-success text-success-foreground'
                    : 'bg-muted text-muted-foreground'
                } ${idx === currentIndex ? 'ring-2 ring-primary' : ''}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
