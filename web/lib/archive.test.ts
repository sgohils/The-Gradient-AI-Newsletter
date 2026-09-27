import { describe, expect, it } from "vitest";
import { archiveHref, parseArchiveQuery, queryArchive } from "./archive";
import type { NewsletterIssue } from "@/types";

const issues: NewsletterIssue[] = Array.from({ length: 20 }, (_, i) => ({
  id: String(i), title: "Daily issue", date: "2026-09-" + String(i + 1).padStart(2, "0"),
  intro: "Daily briefing", tags: ["Research"], publishedAt: new Date(),
  articles: [{ id: String(i), title: i === 0 ? "Robotics advances" : "Other news", description: i === 1 ? "Quantum computing" : "Summary", sourceName: i === 2 ? "example.org" : "Journal", sourceId: "source", url: "https://example.com", publishedAt: new Date() }],
}));
const base = { q: "", date: "", page: 1 };
describe("archive search and pagination", () => {
  it("finds headlines, descriptions, sources, tags and intros", () => {
    for (const q of ["ROBOTICS", "quantum", "example.org"]) expect(queryArchive(issues, { ...base, q }).total).toBe(1);
    expect(queryArchive(issues, { ...base, q: "research briefing" }).total).toBe(20);
    expect(queryArchive(issues, { ...base, q: "no matching story" }).total).toBe(0);
  });
  it("combines date and search", () => {
    expect(queryArchive(issues, { ...base, q: "robotics", date: "2026-09-01" }).total).toBe(1);
    expect(queryArchive(issues, { ...base, q: "robotics", date: "2026-09-02" }).total).toBe(0);
  });
  it("returns bounded summaries without article bodies and without overlapping pages", () => {
    const first = queryArchive(issues, base);
    const second = queryArchive(issues, { ...base, page: 2 });
    expect(first.issues).toHaveLength(9);
    expect(first.issues[0].date).toBe("2026-09-20");
    expect(first.issues[0]).not.toHaveProperty("articles");
    expect(first.issues[0].articleCount).toBe(1);
    expect(second.issues.some(issue => first.issues.some(other => other.id === issue.id))).toBe(false);
    expect(queryArchive(issues, { ...base, page: 999 }).issues).toHaveLength(2);
    expect(queryArchive([], base).page).toBe(1);
  });
  it("round-trips filters and normalizes malformed page input", () => {
    const query = { q: "AI & research", date: "2026-09-02", page: 2 };
    expect(parseArchiveQuery(new URL(archiveHref(query), "https://example.com").searchParams)).toEqual(query);
    for (const page of ["-1", "Infinity", "2.5", "nope"]) expect(parseArchiveQuery(new URLSearchParams({ page })).page).toBe(1);
  });
});
