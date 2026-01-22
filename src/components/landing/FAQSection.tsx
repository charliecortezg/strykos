import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "No tengo tiempo para aprender un sistema nuevo",
    answer: "STRYK está diseñado para fundadores ocupados. La implementación la hacemos nosotros. Tu equipo aprende en una sesión de 30 minutos. Si no lo usan en la primera semana, no seguimos adelante."
  },
  {
    question: "Ya uso Excel y WhatsApp, ¿para qué cambiar?",
    answer: "Excel no te dice en tiempo real quién pagó hoy. WhatsApp no te muestra cuánto dinero entra al mes. STRYK te da control real sin depender de tu memoria o de estar persiguiendo información."
  },
  {
    question: "¿Qué pasa si cancelo?",
    answer: "Cancelas cuando quieras, sin penalización. Exportas tus datos y listo. Sin contratos forzosos, sin letra chica."
  },
  {
    question: "¿Y si no funciona para mi academia?",
    answer: "Si después del primer mes STRYK no está en uso real, no seguimos. No cobramos por software que no se usa. Simple."
  }
];

export function FAQSection() {
  return (
    <section className="py-12 md:py-20 bg-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="font-display text-xl md:text-2xl font-bold text-stryk-navy mb-6 text-center">
            Preguntas frecuentes
          </h2>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-stryk-navy/10">
                <AccordionTrigger className="text-left text-sm md:text-base font-medium text-stryk-navy hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-stryk-navy/60 leading-relaxed pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
