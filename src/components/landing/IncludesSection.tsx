import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const includes = [
  "Configuración completa de la academia",
  "Usuarios, roles y categorías",
  "Registro de jugadores",
  "Control de pagos e impagos",
  "Asistencia a entrenamientos",
  "Registro de partidos y estadísticas básicas",
  "Onboarding founder-led"
];

const notIncludes = [
  "App móvil nativa",
  "Pagos en línea",
  "Facturación fiscal",
  "Comunicación con padres",
  "Automatizaciones avanzadas",
  "Marketing o captación"
];

export function IncludesSection() {
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
            Qué incluye la implementación
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Includes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                Incluye
              </h3>
              <ul className="space-y-3">
                {includes.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Not Includes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h3 className="font-display text-lg font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <X className="w-5 h-5 text-muted-foreground" />
                No incluye
              </h3>
              <ul className="space-y-3">
                {notIncludes.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-2.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-muted-foreground italic">
                STRYK ordena la operación, no vende por ti.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
