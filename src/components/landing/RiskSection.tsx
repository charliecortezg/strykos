import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export function RiskSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>

          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
            Reducción de riesgo
          </h2>

          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            Si STRYK no queda implementado y en uso real durante el primer mes, no seguimos adelante.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center text-foreground font-medium">
            <span>Sin promesas vacías.</span>
            <span className="hidden sm:inline text-muted-foreground">|</span>
            <span>Solo adopción real.</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
