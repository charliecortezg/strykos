import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const CALENDLY_LINK = "https://calendly.com/carloscortez-roarid/set-up-academia-stryk";

export function FinalCTASection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-stryk-navy via-stryk-navyDeep to-stryk-navy">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-xl mx-auto"
        >
          {/* Gold accent line */}
          <div className="w-16 h-1 bg-stryk-gold mx-auto mb-8" />
          
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-4">
            ¿Listo para tener control real?
          </h2>
          
          <p className="text-stryk-silver/70 mb-8 text-sm md:text-base">
            Hablemos 15 minutos. Si STRYK no es para ti, te lo decimos directo.
          </p>

          <Button 
            variant="gold" 
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

          <p className="text-xs text-stryk-silver/50 mt-4">
            Sin compromiso. Sin presión de venta.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
