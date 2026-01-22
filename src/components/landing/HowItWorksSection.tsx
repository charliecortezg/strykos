import { motion } from "framer-motion";

const steps = [
  {
    number: "1",
    title: "Agendamos llamada",
    description: "15 minutos para entender tu academia"
  },
  {
    number: "2",
    title: "Configuramos STRYK",
    description: "Subimos tus datos y configuramos todo"
  },
  {
    number: "3",
    title: "Empiezas a operar",
    description: "Tu equipo usa STRYK desde el día 1"
  }
];

export function HowItWorksSection() {
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
          <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-8 text-center">
            Cómo funciona
          </h2>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex gap-4 items-center bg-background rounded-xl p-4 border border-border"
              >
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-lg flex-shrink-0">
                  {step.number}
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
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
