import { motion } from "framer-motion";
import { Logo } from "@/components/brand/Logo";

export function WhatIsSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <Logo variant="blue" size="lg" className="justify-center mb-8" />
          
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
            El sistema operativo para academias deportivas formativas.
          </h2>

          <div className="space-y-4 text-lg text-muted-foreground mb-8">
            <p>No es un software genérico.</p>
            <p>No es una app más.</p>
          </div>

          <p className="text-xl text-foreground font-medium leading-relaxed">
            Es una herramienta diseñada para ordenar la operación diaria de academias de fútbol, básquet y multisport.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
