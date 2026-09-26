# The Gradient design system

## Product audit

The app is a Next.js App Router publication backed by Markdown files in `posts/`. The homepage renders the latest issue, publication counts, a daily briefing signup, and recent issues. `/archive` fetches the issue API and supports search, date filtering, and pagination. `/archive/[date]` reads an issue server-side and provides article summaries, source links, reading time, and previous/next navigation. `/subscribe` and the subscribe/unsubscribe API handle newsletter enrollment. Theme selection uses `next-themes` with system preference support. The issue model and editorial copy remain in Markdown; subscriber behavior remains in the existing API and mailer.

The former visual language used a dark hero, animated cursor mesh, multiple cyan/blue/purple gradients, floating translucent cards, several independent font families, and oversized rounded controls. The new system treats the publication itself as the visual identity: paper and ink, a restrained evergreen signal, serif editorial headlines, compact metadata, and thin rules. Real issue counts stay data-derived. Navigation now links only to implemented routes.

## Principles

- Editorial content leads. Interfaces should read like a technical publication, not a dashboard or conversion template.
- Use asymmetry, type, alignment, and rules to structure the page; add a filled surface only when it groups an interaction.
- Motion is brief and informative. Avoid continuous effects and honor `prefers-reduced-motion`.
- Preserve issue content, metadata, article links, archive behavior, signup behavior, and themes.

## Tokens

| Role | Light | Dark |
| --- | --- | --- |
| Background | `#f6f5f1` | `#202522` |
| Surface | `#fbfaf7` | `#282e2a` |
| Secondary surface | `#eeede7` | `#303733` |
| Text | `#202421` | `#ecece5` |
| Secondary text | `#555c57` | `#c0c5be` |
| Muted text | `#777e78` | `#9ba39c` |
| Border | `#d9dcd5` | `#414943` |
| Accent | `#176b5b` | `#87c4ae` |

Semantic CSS variables live in `web/app/globals.css`. Components should use `--background`, `--surface`, `--foreground`, `--text-secondary`, `--text-muted`, `--border`, `--accent`, `--accent-hover`, `--success`, `--warning`, `--error`, and `--focus` rather than local color literals.

## Type

- Display: Georgia / Times, `clamp(2.4rem, 5vw, 3.25rem)`, 1.08 line height, balanced measure.
- Headline: Georgia / Times, 2–3rem, medium weight, tight tracking.
- Title: Georgia / Times, 1.25–1.75rem, 1.2 line height.
- Subtitle: Inter, 1.125rem, 1.6 line height.
- Body: Inter, 1rem, 1.65 line height; long-form text capped near 68 characters.
- Small: Inter, .875rem, 1.5 line height.
- Metadata/caption: Inter, .75rem, compact, muted; uppercase tracking used sparingly.
- Button: Inter, .875rem, semibold.

Inter is the interface/body face. Georgia supplies the editorial contrast for headlines. Metadata uses the body face with a restrained tracking treatment.

## Layout and interaction

- Spacing follows 4, 8, 12, 16, 24, 32, 48, 64, and 96px increments.
- Radii: 3px small, 7px medium, 12px large. Editorial content usually uses square edges.
- Borders are one-pixel semantic rules. Shadows are limited to subtle control separation; no glow.
- Motion uses 140ms fast and 220ms base transitions with `cubic-bezier(.2,.7,.2,1)`. Reduced motion disables nonessential motion.
- Main reading width: 68ch. Desktop content width: 1120px. Mobile gutters: 20px; desktop gutters: 32px.
- Breakpoints follow the existing Tailwind defaults: 640px, 768px, 1024px, 1280px.
- Keyboard focus uses a 2px semantic focus outline with 3px offset. Controls retain visible text labels and live signup status.

## Signature conventions

1. A compact masthead marked by one vertical evergreen rule.
2. Thin horizontal rules separating edition sections and article entries.
3. Tight issue metadata in muted uppercase text.
4. Evergreen link and action color, used only for navigation and action affordance.
