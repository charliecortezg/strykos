import { motion } from "framer-motion";
import { Check } from "lucide-react";

const included = [
  "Implementación incluida",
  "Soporte directo por WhatsApp",
  "Sin contrato forzoso",
  "Cancelable en cualquier momento"
];

export function PricingSection() {
  return (
    <section className="py-12 md:py-20 bg-gradient-to-b from-stryk-navy to-stryk-navyDeep">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-md mx-auto"
        >
          <div className="stryk-glow-pricing rounded-2xl bg-stryk-navyDeep/90 backdrop-blur-sm p-6 md:p-8">
            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 rounded-full bg-stryk-gold/20 text-stryk-gold text-xs font-medium mb-4">
                Precio Early Adopter
              </span>
              
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="font-display text-4xl md:text-5xl font-bold text-stryk-gold">$500</span>
                <span className="text-stryk-silver/70 text-sm">MXN/mes</span>
              </div>
              
              <p className="text-sm text-stryk-silver/60">
                Menos que una mensualidad de un jugador
              </p>
            </div>

            <ul className="space-y-3 mb-6">
              {included.map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-sm text-stryk-silver/90">
                  <Check className="w-4 h-4 text-stryk-gold flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-xs text-stryk-silver/50 text-center">
              El precio subirá conforme STRYK evolucione.
              <br />
              Los early adopters mantienen su precio.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
