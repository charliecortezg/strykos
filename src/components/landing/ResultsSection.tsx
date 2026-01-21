import { motion } from "framer-motion";
import { Check, TrendingUp, Users, ClipboardCheck, Database, BarChart3 } from "lucide-react";

const results = [
  {
    icon: TrendingUp,
    text: "Visibilidad real de ingresos mensuales"
  },
  {
    icon: Users,
    text: "Identificación clara de impagos"
  },
  {
    icon: ClipboardCheck,
    text: "Control de asistencia a entrenamientos y partidos"
  },
  {
    icon: Database,
    text: "Información centralizada de jugadores y entrenadores"
  },
  {
    icon: BarChart3,
    text: "Decisiones basadas en datos reales, no suposiciones"
  }
];

export function ResultsSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8">
            Con STRYK obtienes:
          </h2>

          <div className="space-y-4 mb-10">
            {results.map((result, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-lg bg-background border border-border"
              >
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <result.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-foreground text-lg">{result.text}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center text-center"
          >
            <p className="text-xl font-semibold text-foreground">Más control.</p>
            <p className="text-xl font-semibold text-foreground">Menos fricción.</p>
            <p className="text-xl font-semibold text-primary">Mejor gestión.</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
