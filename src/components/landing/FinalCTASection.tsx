import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function FinalCTASection() {
  return (
    <section id="solicitar" className="py-20 md:py-32 bg-stryk-black relative overflow-hidden">
      {/* Subtle accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -bottom-1/2 -left-1/4 w-full h-full bg-primary/5 transform -rotate-12" />
      </div>

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto"
        >
          <Logo variant="light" size="lg" className="justify-center mb-8" />
          
          <p className="text-lg text-stryk-grey mb-4">
            STRYK no es para todos.
          </p>
          
          <h2 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground mb-8">
            Es para academias que quieren operar con orden y control real.
          </h2>

          <Button variant="hero" size="lg" asChild>
            <a 
              href="https://wa.me/5218112345678?text=Hola%2C%20me%20interesa%20la%20implementaci%C3%B3n%20de%20STRYK%20para%20mi%20academia" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Solicitar implementación STRYK
              <ArrowRight className="w-5 h-5" />
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
