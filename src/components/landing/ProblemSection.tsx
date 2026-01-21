import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

const problems = [
  "Asistencia en papel o WhatsApp",
  "Pagos desordenados o sin seguimiento",
  "No saber cuántos jugadores están realmente activos",
  "Decisiones basadas en \"sensación\", no en datos",
  "El fundador haciendo todo"
];

export function ProblemSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-md bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Hoy muchas academias operan así:
            </h2>
          </div>

          <ul className="space-y-3 mb-8">
            {problems.map((problem, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-start gap-3 text-muted-foreground"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2.5 flex-shrink-0" />
                <span className="text-lg">{problem}</span>
              </motion.li>
            ))}
          </ul>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="border-l-4 border-primary pl-6 py-2"
          >
            <p className="text-muted-foreground text-lg mb-1">
              El problema no es la falta de esfuerzo.
            </p>
            <p className="text-foreground text-xl font-semibold">
              Es la falta de control real.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
