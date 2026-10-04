import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DataLoader from "../components/data-loader";
import HeroSection from "../components/hero-section";
import FeaturedCard from "../components/featured-card";
import { readIssuesFromMarkdown } from "./posts";
import type { NewsletterIssue } from "../types";

vi.mock("./posts", () => ({ readIssuesFromMarkdown: vi.fn() }));

describe("publication availability", () => {
  beforeEach(() => {
    vi.mocked(readIssuesFromMarkdown).mockReset();
  });

  it("renders an informative empty publication instead of an endless loader", async () => {
    vi.mocked(readIssuesFromMarkdown).mockReturnValue([]);
    const result = await DataLoader({
      children: ({ issues }) =>
        createElement(HeroSection, { issue: issues[0] }),
    });
    const html = renderToStaticMarkup(result);
    expect(html).toContain("No issues have been published yet");
    expect(html).not.toContain("skeleton");
    expect(html).not.toContain("/archive/undefined");
  });

  it("lets unexpected read errors reach the route boundary", async () => {
    vi.mocked(readIssuesFromMarkdown).mockImplementation(() => {
      throw new Error("Archive unavailable");
    });
    await expect(DataLoader({ children: () => null })).rejects.toThrow(
      "Archive unavailable",
    );
  });

  it("keeps story navigation complete when a featured image is absent", () => {
    const issue: NewsletterIssue = {
      id: "2026-01-01",
      date: "2026-01-01",
      title: "Daily edition",
      intro: "An AI research briefing.",
      tags: [],
      publishedAt: new Date("2026-01-01"),
      articles: [
        {
          id: "story",
          title: "Research update",
          url: "https://example.com/research",
          sourceName: "example.com",
          sourceId: "example",
          publishedAt: new Date("2026-01-01"),
        },
      ],
    };
    const html = renderToStaticMarkup(createElement(FeaturedCard, { issue }));
    expect(html).not.toContain("<img");
    expect(html).toContain("Research update");
    expect(html).toContain("example.com");
    expect(html).toContain('href="/archive/2026-01-01#research-update-');
    expect(html).toContain("Full edition");
  });
});
