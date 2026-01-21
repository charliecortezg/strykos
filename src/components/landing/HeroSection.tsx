import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] bg-background flex flex-col">
      {/* Header */}
      <header className="container py-6">
        <nav className="flex items-center justify-between">
          <Logo variant="dark" size="md" />
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Iniciar sesión
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Content */}
      <div className="flex-1 flex items-center">
        <div className="container py-12 md:py-20">
          <div className="max-w-3xl">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-6"
            >
              Control real de tu academia deportiva.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-4 leading-relaxed"
            >
              Sabe exactamente quién entrena, quién paga y cuánto dinero estás generando.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-lg md:text-xl font-medium text-foreground mb-8"
            >
              Sin Excel. Sin WhatsApp. Sin caos administrativo.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Button variant="hero" size="lg" asChild>
                <a 
                  href="https://calendly.com/carloscortez-roarid/set-up-academia-stryk" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Solicitar implementación STRYK
                  <ArrowRight className="w-5 h-5" />
                </a>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
