import type { NewsletterIssue } from "@/types";
import { markdownToText } from "./markdown";

export function formatIssueDate(date: string, short = false): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: short ? "short" : "long",
    day: "numeric",
    year: "numeric",
  });
}
export function issueReadMinutes(issue: NewsletterIssue): number {
  const text = markdownToText(
    [
      issue.intro,
      ...issue.articles.map(
        (article) => `${article.title} ${article.description || ""}`,
      ),
    ].join(" "),
  );
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
}
