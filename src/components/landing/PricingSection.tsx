import { motion } from "framer-motion";
import { Check } from "lucide-react";

const benefits = [
  "Sin contrato forzoso",
  "Cancelable en cualquier momento",
  "El precio subirá conforme STRYK evolucione"
];

export function PricingSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-xl mx-auto text-center"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            Early Adopters
          </span>

          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8">
            Precio especial para academias en etapa MVP
          </h2>

          <div className="bg-background rounded-xl border border-border p-8 mb-8">
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="font-display text-5xl md:text-6xl font-bold text-foreground">$500</span>
              <span className="text-muted-foreground text-lg">MXN/mes</span>
            </div>
            <p className="text-muted-foreground">
              Implementación incluida
            </p>
          </div>

          <ul className="space-y-3 text-left max-w-sm mx-auto">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
