import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { ArrowRight, Shield, Users, ClipboardCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export function Hero() {
  return (
    <section className="relative min-h-screen bg-background overflow-hidden">
      {/* Subtle diagonal accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-full h-full bg-primary/[0.02] transform rotate-12" />
      </div>

      {/* Header */}
      <header className="relative z-10 container py-6">
        <nav className="flex items-center justify-between">
          <Logo variant="dark" size="md" />
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Iniciar sesión
              </Button>
            </Link>
            <Link to="/registro-academia">
              <Button variant="default" size="sm">
                Comenzar ahora
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Content */}
      <div className="relative z-10 container pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Sistema Operativo para Academias
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-6"
          >
            El corazón operativo de tu academia
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 leading-relaxed"
          >
            Controla cada categoría. Cada sesión. Cada decisión. 
            STRYK integra asistencia, pagos y operación diaria en un sistema moderno y confiable.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link to="/registro-academia">
              <Button variant="hero" size="lg">
                Comenzar ahora
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">2seg</p>
              <p className="text-sm text-muted-foreground">Registro de asistencia</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">100%</p>
              <p className="text-sm text-muted-foreground">Control operativo</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">Multi-tenant</p>
              <p className="text-sm text-muted-foreground">Datos aislados</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Dashboard Preview */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6 }}
        className="relative z-10 container pb-16"
      >
        <div className="relative rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-10 bg-muted flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
          </div>
          <div className="pt-10 p-6 min-h-[300px] md:min-h-[400px] bg-gradient-to-br from-muted/50 to-background flex items-center justify-center">
            <div className="text-center">
              <Logo variant="blue" size="xl" showText={false} />
              <p className="mt-4 text-muted-foreground font-medium">
                Panel de control STRYK
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
