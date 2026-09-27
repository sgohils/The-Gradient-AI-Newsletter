import { archiveHref, parseArchiveQuery } from "./archive";

export function articleAnchor(title: string, url: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "story";
  let hash = 2166136261;
  for (const char of url || title) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `${slug}-${(hash >>> 0).toString(36)}`;
}

export function safeArchiveReturn(value?: string): string {
  if (!value || !/^\/archive(?:\?|$)/.test(value)) return "/archive";
  return archiveHref(parseArchiveQuery(new URL(value, "https://local.invalid").searchParams));
}

export function safeArticleUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
