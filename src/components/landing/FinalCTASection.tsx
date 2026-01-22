import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const CALENDLY_LINK = "https://calendly.com/carloscortez-roarid/set-up-academia-stryk";

export function FinalCTASection() {
  return (
    <section className="py-16 md:py-24 bg-stryk-black">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-xl mx-auto"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            ¿Listo para tener control real?
          </h2>
          
          <p className="text-stryk-grey mb-8 text-sm md:text-base">
            Hablemos 15 minutos. Si STRYK no es para ti, te lo decimos directo.
          </p>

          <Button 
            variant="hero" 
            size="xl" 
            className="w-full sm:w-auto text-base min-h-[56px]" 
            asChild
          >
            <a 
              href={CALENDLY_LINK}
              target="_blank" 
              rel="noopener noreferrer"
            >
              <MessageCircle className="w-5 h-5" />
              Agendar llamada de 15 min
            </a>
          </Button>

          <p className="text-xs text-stryk-grey/60 mt-4">
            Sin compromiso. Sin presión de venta.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
