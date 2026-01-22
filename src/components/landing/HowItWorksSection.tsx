import { motion } from "framer-motion";

const steps = [
  {
    number: "1",
    title: "Llamada de 15 min",
    description: "Vemos si STRYK funciona para tu academia"
  },
  {
    number: "2",
    title: "Implementación guiada",
    description: "Configuramos todo. Tú solo validas."
  },
  {
    number: "3",
    title: "Operación real",
    description: "Tu equipo registra. Tú controlas."
  }
];

export function HowItWorksSection() {
  return (
    <section className="py-12 md:py-20 bg-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="font-display text-xl md:text-2xl font-bold text-stryk-navy mb-8 text-center">
            ¿Cómo empezar?
          </h2>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-lg bg-stryk-silver/50 border border-stryk-navy/10"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-stryk-gold flex items-center justify-center">
                  <span className="font-display font-bold text-stryk-navy text-lg">
                    {step.number}
                  </span>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-stryk-navy text-sm md:text-base">
                    {step.title}
                  </h3>
                  <p className="text-stryk-navy/60 text-sm">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
