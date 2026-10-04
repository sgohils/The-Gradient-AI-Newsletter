export const GITHUB_URL =
  "https://github.com/sgohils/The-Gradient-AI-Newsletter";
export const SITE_DESCRIPTION =
  "A daily AI briefing: research, industry shifts, and technical context, gathered and summarized by an automated publishing pipeline.";
export function siteUrl(): URL {
  return new URL(process.env.NEWSLETTER_BASE_URL || "http://localhost:3000");
}
