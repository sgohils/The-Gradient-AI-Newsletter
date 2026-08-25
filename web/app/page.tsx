import HeroSection from "@/components/hero-section";
import StatsBar from "@/components/stats-bar";
import FeaturedCard from "@/components/featured-card";
import HomeGrid from "@/components/home-grid";
import DataLoader from "@/components/data-loader";

export default async function Home() {
  return (
    <DataLoader>
      {({ issues }) => {
        const latestIssue = issues[0] ?? {
          id: "",
          title: "The Gradient",
          date: "",
          intro: "Your daily AI newsletter.",
          tags: [],
          featuredImageUrl: undefined,
          articles: [],
        };

        return (
          <>
            <HeroSection />
            <StatsBar issues={issues} />
            <FeaturedCard issue={latestIssue} />
            <HomeGrid issues={issues} />
          </>
        );
      }}
    </DataLoader>
  );
}
