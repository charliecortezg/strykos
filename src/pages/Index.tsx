import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { WhatIsSection } from "@/components/landing/WhatIsSection";
import { ResultsSection } from "@/components/landing/ResultsSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ForWhoSection } from "@/components/landing/ForWhoSection";
import { IncludesSection } from "@/components/landing/IncludesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { RiskSection } from "@/components/landing/RiskSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { FooterMinimal } from "@/components/landing/FooterMinimal";

const Index = () => {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <ProblemSection />
      <WhatIsSection />
      <ResultsSection />
      <HowItWorksSection />
      <ForWhoSection />
      <IncludesSection />
      <PricingSection />
      <RiskSection />
      <FinalCTASection />
      <FooterMinimal />
    </main>
  );
};

export default Index;
