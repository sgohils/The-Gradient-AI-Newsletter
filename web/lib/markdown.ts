import MarkdownIt from "markdown-it";

// Raw HTML stays text; the parser rejects unsafe link schemes.
const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true });

export function markdownBlocksToHtml(text: string): string {
  return markdown.render(text);
}

// Previews appear inside card links: render text without nested anchors or images.
export function markdownToText(text: string): string {
  const tokens = markdown.parse(text, {});
  return tokens.map((token) => {
    if (token.type === "inline") return (token.children || []).map((child) => {
      if (["text", "code_inline", "html_inline", "image"].includes(child.type)) return child.content;
      return ["softbreak", "hardbreak"].includes(child.type) ? " " : "";
    }).join("");
    return ["fence", "code_block"].includes(token.type) ? token.content : "";
  }).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
