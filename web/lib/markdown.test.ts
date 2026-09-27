import { describe, expect, it } from "vitest";
import { markdownBlocksToHtml, markdownToText } from "./markdown";

describe("Markdown rendering", () => {
  it("preserves paragraphs and adjacent labeled lines", () => {
    const html = markdownBlocksToHtml("**What happened:** News.\r\n**Why it matters:** Impact.\r\n\r\nMore details.");
    expect(html).toContain("<strong>What happened:</strong>");
    expect(html).toContain("<br>");
    expect(html).toContain("<p>More details.</p>");
  });
  it("renders links, lists, inline code and fenced code", () => {
    const html = markdownBlocksToHtml('[Source](https://example.com)\n\n1. First\n2. Second\n   - Nested\n\nUse `x < y`\n\n```js\nconst x = "<script>";\n```');
    expect(html).toContain('<a href="https://example.com">Source</a>');
    expect(html).toContain("<ol>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<code>x &lt; y</code>");
    expect(html).toContain('<pre><code class="language-js">');
    expect(html).not.toContain("<script>");
  });
  it("escapes HTML and rejects dangerous links", () => {
    for (const input of ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '[click](javascript:alert(1))', '[click](data:text/html,test)', '[click](jav&#x61;script:alert(1))']) {
      const html = markdownBlocksToHtml(input);
      expect(html).not.toMatch(/<script|<img|href="(?:javascript|data):/i);
    }
  });
  it("uses the same parser for plain-text previews without nested links", () => {
    expect(markdownToText('**News** [source](https://example.com) and `code`')).toBe("News source and code");
    expect(markdownToText('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>');
    expect(markdownToText("")).toBe("");
  });
});
