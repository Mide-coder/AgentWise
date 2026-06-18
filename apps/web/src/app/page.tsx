import { HeroSection } from "@/components/home/HeroSection";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { HowItWorks } from "@/components/home/HowItWorks";

export default function HomePage() {
  return (
    <div className="space-y-20">
      <HeroSection />
      <FeatureGrid />
      <HowItWorks />
    </div>
  );
}
