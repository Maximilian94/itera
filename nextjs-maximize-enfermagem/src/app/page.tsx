import { HeroSection } from "@/components/home/HeroSection";
import { EvidenceBasedSection } from "@/components/home/EvidenceBasedSection";
import { ProblemSolutionSection } from "@/components/home/ProblemSolutionSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { PlansCtaSection } from "@/components/home/PlansCtaSection";
import { CompetitorsComparisonSection } from "@/components/home/CompetitorsComparisonSection";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";

export default function HomePage() {
  return (
    <main>
        <Hero></Hero>
      {/*<HeroSection />*/}

        <Features></Features>
      <CompetitorsComparisonSection />
      {/* <EvidenceBasedSection /> */}
      {/* <ProblemSolutionSection /> */}
      {/* <FeaturesSection /> */}
      {/* <HowItWorksSection /> */}
      {/* <PlansCtaSection /> */}
    </main>
  );
}
