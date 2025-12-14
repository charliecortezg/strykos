import { motion } from "framer-motion";
import { 
  ClipboardCheck, 
  Users, 
  CreditCard, 
  BarChart3, 
  Shield, 
  Smartphone 
} from "lucide-react";

const features = [
  {
    icon: ClipboardCheck,
    title: "Asistencia en segundos",
    description: "Registro rápido desde cancha. Un tap por jugador. Sin complicaciones."
  },
  {
    icon: Users,
    title: "Gestión de jugadores",
    description: "Alta, edición y control completo de cada jugador de tu academia."
  },
  {
    icon: CreditCard,
    title: "Control de pagos",
    description: "Visualiza estados de cuenta, mensualidades y gestión financiera clara."
  },
  {
    icon: BarChart3,
    title: "Reportes operativos",
    description: "Métricas claras para toma de decisiones informadas."
  },
  {
    icon: Shield,
    title: "Multi-tenant seguro",
    description: "Cada academia con datos completamente aislados y protegidos."
  },
  {
    icon: Smartphone,
    title: "Mobile-first",
    description: "Diseñado para uso real en cancha desde cualquier dispositivo."
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

export function Features() {
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Control total. Ejecución total.
          </h2>
          <p className="text-lg text-muted-foreground">
            Todo lo que necesitas para profesionalizar la operación de tu academia deportiva.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="stryk-card p-6 group"
            >
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
