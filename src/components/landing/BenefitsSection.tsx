import { motion } from "framer-motion";
import { DollarSign, Users, ClipboardCheck } from "lucide-react";

const benefits = [
  {
    icon: DollarSign,
    title: "Sabes quién pagó. Hoy.",
    description: "Sin Excel. Sin preguntar. Dashboard en tiempo real."
  },
  {
    icon: Users,
    title: "Sabes quién entrena.",
    description: "Asistencia real, registrada por tus entrenadores."
  },
  {
    icon: ClipboardCheck,
    title: "Cobras con datos.",
    description: "\"Llevas 3 semanas sin pagar\" — con evidencia."
  }
];

export function BenefitsSection() {
  return (
    <section className="py-12 md:py-20 bg-stryk-navy">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          {/* Gold accent line */}
          <div className="w-12 h-1 bg-stryk-gold mx-auto mb-6" />
          
          <h2 className="font-display text-xl md:text-2xl font-bold text-white mb-8 text-center">
            Con STRYK tienes control real
          </h2>

          <div className="space-y-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="stryk-glow-card flex items-start gap-4 p-4 rounded-lg bg-stryk-navy border border-stryk-gold/30"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-stryk-gold/20 flex items-center justify-center">
                  <benefit.icon className="w-5 h-5 text-stryk-gold" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-white text-sm md:text-base mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-stryk-silver/70 text-sm">
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
