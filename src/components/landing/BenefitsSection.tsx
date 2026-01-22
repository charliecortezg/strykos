import { motion } from "framer-motion";
import { DollarSign, Users, ClipboardCheck } from "lucide-react";

const benefits = [
  {
    icon: DollarSign,
    title: "Control financiero real",
    description: "Sabes exactamente cuánto dinero entra, quién paga y quién debe."
  },
  {
    icon: Users,
    title: "Asistencia sin fricción",
    description: "Tus entrenadores marcan asistencia en segundos desde el celular."
  },
  {
    icon: ClipboardCheck,
    title: "Operación ordenada",
    description: "Categorías, jugadores y pagos en un solo lugar. Sin Excel."
  }
];

export function BenefitsSection() {
  return (
    <section className="py-12 md:py-20 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-8 text-center">
            Con STRYK obtienes
          </h2>

          <div className="space-y-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex gap-4 items-start"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {benefit.description}
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
