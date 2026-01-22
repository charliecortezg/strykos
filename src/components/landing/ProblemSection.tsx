import { motion } from "framer-motion";
import { X } from "lucide-react";

const problems = [
  "No sabes quién pagó este mes sin revisar el Excel",
  "Los entrenadores te mandan lista por WhatsApp (a veces)",
  "El dinero entra... pero no sabes cuánto ni cuándo",
  "Cobrar se siente incómodo porque no tienes datos claros"
];

export function ProblemSection() {
  return (
    <section className="py-12 md:py-20 bg-stryk-silver">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="font-display text-xl md:text-2xl font-bold text-stryk-navy mb-6 text-center">
            ¿Te suena familiar?
          </h2>

          <ul className="space-y-3">
            {problems.map((problem, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-start gap-3 text-sm md:text-base text-stryk-navy/80"
              >
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center">
                  <X className="w-3 h-3 text-destructive" />
                </span>
                <span>{problem}</span>
              </motion.li>
            ))}
          </ul>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="text-center text-sm text-stryk-navy/60 mt-8 font-medium"
          >
            No es falta de esfuerzo. Es falta de sistema.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
