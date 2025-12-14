import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const roles = [
  {
    title: "Entrenador",
    description: "Uso en cancha. Acciones rápidas. Solo ve sus categorías asignadas.",
    permissions: [
      "Registro de asistencia",
      "Ver jugadores asignados",
      "Consultar horarios"
    ],
    accent: "bg-success/10 text-success"
  },
  {
    title: "Director Deportivo",
    description: "Control total de la academia. Gestión completa y reportes.",
    permissions: [
      "Gestión de jugadores",
      "Gestión de categorías",
      "Reportes operativos",
      "Asignación de entrenadores"
    ],
    accent: "bg-primary/10 text-primary"
  },
  {
    title: "Administrativo",
    description: "Control financiero. Gestión de pagos y estados de cuenta.",
    permissions: [
      "Control de pagos",
      "Estados de cuenta",
      "Gestión financiera"
    ],
    accent: "bg-warning/10 text-warning"
  }
];

export function Roles() {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Un sistema, múltiples roles
          </h2>
          <p className="text-lg text-muted-foreground">
            Cada usuario ve exactamente lo que necesita. Sin ruido. Sin confusión.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {roles.map((role, index) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="stryk-card p-6"
            >
              <span className={cn(
                "inline-block px-3 py-1 rounded-md text-sm font-medium mb-4",
                role.accent
              )}>
                {role.title}
              </span>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {role.description}
              </p>
              <ul className="space-y-2">
                {role.permissions.map((permission) => (
                  <li key={permission} className="flex items-center gap-2 text-sm text-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {permission}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
