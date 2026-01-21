import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const forYou = [
  "Diriges una academia deportiva formativa privada",
  "Tienes entre 30 y 300 jugadores",
  "Operas varias veces por semana",
  "Hoy usas Excel, WhatsApp o papel",
  "Estás involucrado en la operación"
];

const notForYou = [
  "Buscas marketing o más clientes",
  "No quieres cambiar procesos",
  "Operas de forma ocasional",
  "Eres un club profesional o escuela pública"
];

export function ForWhoSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-12 text-center">
            Para quién es STRYK
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* For You */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-background rounded-lg border border-border p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-md bg-success/10 flex items-center justify-center">
                  <Check className="w-5 h-5 text-success" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  STRYK es para ti si:
                </h3>
              </div>
              <ul className="space-y-3">
                {forYou.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-foreground">
                    <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Not For You */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-background rounded-lg border border-border p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-md bg-destructive/10 flex items-center justify-center">
                  <X className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  STRYK no es para ti si:
                </h3>
              </div>
              <ul className="space-y-3">
                {notForYou.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-muted-foreground">
                    <X className="w-5 h-5 text-destructive/70 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
