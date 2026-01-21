import { motion } from "framer-motion";

const steps = [
  {
    number: "1",
    title: "Diagnóstico Operativo",
    description: "Entendemos cómo opera hoy tu academia."
  },
  {
    number: "2",
    title: "Implementación STRYK",
    description: "Configuramos el sistema con tus datos reales."
  },
  {
    number: "3",
    title: "Adopción Controlada",
    description: "Acompañamos los primeros usos para asegurar que se utilice de verdad."
  }
];

export function HowItWorksSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-12 text-center">
            Cómo funciona
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative"
              >
                {/* Connector line for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full h-px bg-border" />
                )}
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display text-2xl font-bold mb-4 relative z-10">
                    {step.number}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
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
