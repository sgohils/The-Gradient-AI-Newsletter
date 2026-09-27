import { describe, expect, it } from "vitest";
import { articleAnchor, safeArchiveReturn, safeArticleUrl } from "./article-links";

describe("article navigation", () => {
  it("creates deterministic anchors with distinct sources", () => {
    expect(articleAnchor("AI & research", "https://example.com/1")).toMatch(/^ai-research-[a-z0-9]+$/);
    expect(articleAnchor("AI & research", "https://example.com/1")).toBe(articleAnchor("AI & research", "https://example.com/1"));
    expect(articleAnchor("AI & research", "https://example.com/1")).not.toBe(articleAnchor("AI & research", "https://example.com/2"));
  });
  it("retains only archive filters in return links", () => {
    expect(safeArchiveReturn("/archive?q=AI&page=2")).toBe("/archive?q=AI&page=2");
    for (const value of ["https://evil.test", "//evil.test", "/archive/other", "/archive-evil"]) expect(safeArchiveReturn(value)).toBe("/archive");
  });
  it("allows only web article destinations", () => {
    expect(safeArticleUrl("https://example.com/story")).toBe("https://example.com/story");
    expect(safeArticleUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeArticleUrl("")).toBeUndefined();
  });
});
