import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Roles } from "@/components/landing/Roles";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <Roles />
      <CTA />
      <Footer />
    </main>
  );
};

export default Index;
