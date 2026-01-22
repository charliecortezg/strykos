import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const WHATSAPP_LINK = "https://wa.me/528115551000?text=Hola%2C%20quiero%20ver%20si%20STRYK%20funciona%20para%20mi%20academia";
const CALENDLY_LINK = "https://calendly.com/carloscortez-roarid/set-up-academia-stryk";

export function HeroSection() {
  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] bg-background flex flex-col">
      {/* Header - Minimal */}
      <header className="container py-4 md:py-6">
        <nav className="flex items-center justify-between">
          <Logo variant="dark" size="sm" />
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-xs md:text-sm">
              Iniciar sesión
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Content - Mobile First */}
      <div className="flex-1 flex items-center">
        <div className="container py-8 md:py-12">
          <div className="max-w-2xl">
            {/* Main Headline - Outcome focused */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-[1.15] mb-4"
            >
              Sabe quién paga, quién debe y quién entrena.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-base md:text-lg text-muted-foreground mb-3 leading-relaxed"
            >
              Control total de tu academia deportiva desde el celular.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-sm md:text-base font-medium text-foreground/80 mb-8"
            >
              Sin Excel. Sin WhatsApp. Sin caos.
            </motion.p>

            {/* Primary CTA - Thumb friendly */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3"
            >
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
            </motion.div>

            {/* Trust signal */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="text-xs text-muted-foreground mt-4"
            >
              Sin compromiso. Solo hablamos si tiene sentido.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}
