import HeroSection from "@/components/hero-section";
import StatsBar from "@/components/stats-bar";
import HomeGrid from "@/components/home-grid";
import DataLoader from "@/components/data-loader";
import SubscriptionSection from "@/components/subscription-section";

export const dynamic = "force-dynamic";
export default function Home() {
  return (
    <DataLoader>
      {({ issues }) => (
        <>
          <HeroSection issue={issues[0]} />
          {issues.length > 0 && (
            <>
              <StatsBar issues={issues} />
              <HomeGrid issues={issues} />
            </>
          )}
          <SubscriptionSection />
        </>
      )}
    </DataLoader>
  );
}
