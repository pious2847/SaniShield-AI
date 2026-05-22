import { PublicNav } from "@/components/layout/PublicNav";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { CrisisTicker } from "@/components/landing/CrisisTicker";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ServiceChainSection } from "@/components/landing/ServiceChainSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { AudienceSection } from "@/components/landing/AudienceSection";
import { UniCEFAlignmentSection } from "@/components/landing/UniCEFAlignmentSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";

export default function LandingPage() {
  return (
    <>
      <PublicNav />
      <main>
        <HeroSection />
        <CrisisTicker />
        <ProblemSection />
        <StatsSection />
        <HowItWorksSection />
        <ServiceChainSection />
        <FeaturesSection />
        <AudienceSection />
        <UniCEFAlignmentSection />
        <FinalCtaSection />
      </main>
      <Footer />
    </>
  );
}
