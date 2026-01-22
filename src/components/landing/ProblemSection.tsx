import { motion } from "framer-motion";

const problems = [
  "No sabes exactamente cuánto dinero entra cada mes",
  "Persigues pagos por WhatsApp sin control real",
  "Cobras tarde porque no tienes visibilidad clara",
  "Tus entrenadores no reportan asistencia de forma confiable"
];

export function ProblemSection() {
  return (
    <section className="py-12 md:py-20 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-6 text-center">
            ¿Te suena familiar?
          </h2>

          <ul className="space-y-3 mb-8">
            {problems.map((problem, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className="flex items-start gap-3 text-foreground/90"
              >
                <span className="text-destructive font-bold text-lg leading-none mt-0.5">×</span>
                <span className="text-sm md:text-base leading-relaxed">{problem}</span>
              </motion.li>
            ))}
          </ul>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg"
          >
            <p className="text-sm md:text-base text-foreground font-medium">
              El problema no es falta de esfuerzo.
              <br />
              <span className="text-primary">Es falta de un sistema que funcione.</span>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
