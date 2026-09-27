import fs from "fs";
import path from "path";
import { describe, it, expect, vi } from "vitest";
import { readIssuesFromMarkdown, getIssueByDate, getAllIssueDates } from "./posts";

describe("readIssuesFromMarkdown", () => {
  it("reads all issues and sorts them newest first", () => {
    const issues = readIssuesFromMarkdown();

    expect(issues.length).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < issues.length - 1; i++) {
      expect(issues[i].date >= issues[i + 1].date).toBe(true);
    }
  });

  it("maps frontmatter fields to the issue object", () => {
    const issues = readIssuesFromMarkdown();
    const issue = issues[0];

    expect(issue).toBeDefined();
    expect(issue.id).toBe(issue.date);
    expect(issue.title).toBeTruthy();
    expect(issue.tags).toBeInstanceOf(Array);
    expect(Array.isArray(issue.articles)).toBe(true);
    expect(issue.publishedAt).toBeInstanceOf(Date);
  });

  it("includes publishedAt derived from the date slug", () => {
    const issues = readIssuesFromMarkdown();
    issues.forEach((issue) => {
      expect(issue.publishedAt).toBeInstanceOf(Date);
      expect(issue.publishedAt.getFullYear()).toBeGreaterThanOrEqual(2021);
    });
  });

  it("parses article descriptions and URLs from the body", () => {
    const issues = readIssuesFromMarkdown();
    const issue = issues[0];

    expect(issue.articles.length).toBeGreaterThan(0);
    issue.articles.forEach((article) => {
      expect(article.title).toBeTruthy();
      expect(article.url).toBeTruthy();
      expect(article.sourceId).toBeTruthy();
      expect(article.sourceName).toBeTruthy();
      expect(article.publishedAt).toBeInstanceOf(Date);
    });
  });

  it("sets intro as the text before the first article heading", () => {
    const issues = readIssuesFromMarkdown();
    const issue = issues[0];

    expect(issue.intro).toBeTruthy();
    expect(issue.intro).not.toContain("## ");
  });

  it("works correctly when the posts directory is missing", () => {
    const issue = getIssueByDate("2099-01-01");
    expect(issue).toBeNull();
  });
});

describe("getIssueByDate", () => {
  it("returns the issue for a valid date", () => {
    const dates = getAllIssueDates();
    if (dates.length === 0) return;

    const issue = getIssueByDate(dates[0]);

    expect(issue).not.toBeNull();
    expect(issue!.date).toBe(dates[0]);
    expect(issue!.title).toBeTruthy();
  });

  it("returns null for an entirely malformed file", () => {
    const tmpDir = path.join("..", "tmp-test-posts-bad");
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "garbage.md"), "NOT VALID {{{");

    const issue = getIssueByDate("garbage");

    fs.rmSync(tmpDir, { recursive: true, force: true });

    expect(issue).toBeNull();
  });
});

describe("getAllIssueDates", () => {
  it("returns dates sorted newest first", () => {
    const dates = getAllIssueDates();

    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i].localeCompare(dates[i + 1]) >= 0).toBe(true);
    }
  });
});

describe("articles parsing", () => {
  it("does not include issue separators in article descriptions", () => {
    for (const issue of readIssuesFromMarkdown()) {
      for (const article of issue.articles) expect(article.description).not.toMatch(/---\s*$/);
    }
  });

  it("reuses parsed issues when files are unchanged", () => {
    const first = readIssuesFromMarkdown();
    const read = vi.spyOn(fs, "readFileSync");
    try {
      expect(readIssuesFromMarkdown()).toEqual(first);
      expect(read).not.toHaveBeenCalled();
    } finally {
      read.mockRestore();
    }
  });

  it("generates stable deterministic ids", () => {
    const issues = readIssuesFromMarkdown();
    issues.forEach((issue) => {
      issue.articles.forEach((article, idx) => {
        expect(article.id).toBe(`${issue.date}-${idx}`);
      });
    });
  });
});
