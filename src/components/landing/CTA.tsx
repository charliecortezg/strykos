import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function CTA() {
  return (
    <section className="py-20 md:py-32 bg-stryk-black relative overflow-hidden">
      {/* Diagonal accent */}
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
          
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Un club ordenado crece
          </h2>
          <p className="text-lg text-stryk-grey mb-8">
            STRYK crea ese orden desde el primer día. Profesionaliza tu academia con un sistema que entiende tu operación.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg">
              Solicitar demo
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-stryk-graphite text-stryk-grey hover:bg-stryk-graphite hover:text-primary-foreground"
            >
              Conocer más
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
