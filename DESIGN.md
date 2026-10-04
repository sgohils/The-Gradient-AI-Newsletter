# The Gradient design system

## Direction

The publication uses paper and ink, an evergreen accent, serif editorial headlines, and compact sans-serif metadata. Content establishes the identity: the homepage pairs the publication introduction with actual headlines from the latest edition.

The signature mark is three descending evergreen rules. It appears in the masthead, favicon, and default social preview. There is no continuous background animation.

## Color

| Role | Light | Dark |
| --- | --- | --- |
| Background | `#f6f5f1` | `#202522` |
| Surface | `#fbfaf7` | `#282e2a` |
| Secondary surface | `#eeede7` | `#303733` |
| Text | `#202421` | `#ecece5` |
| Secondary text | `#555c57` | `#c0c5be` |
| Muted text | `#626c65` | `#9ba39c` |
| Border | `#d9dcd5` | `#414943` |
| Accent | `#176b5b` | `#87c4ae` |

Tokens and prose defaults live in the global stylesheet. The editorial stylesheet supplies the shared layouts, typography scale, controls, and responsive rules. Components use semantic variables so both themes express the same hierarchy.

## Type and layout

- **Display:** Georgia/Times, 54–86px on the homepage; italic evergreen emphasis.
- **Page headline:** Georgia/Times, responsive 38–62px.
- **Section headline:** Georgia/Times, 28–46px.
- **Story headline:** Georgia/Times, 23–25px; compact latest-edition headlines use Inter.
- **Body:** Inter, 14–16px; long-form prose uses a 68-character measure.
- **Metadata:** Inter, 10–12px, muted; tracked uppercase reserved for short labels.
- **Container:** 1200px maximum, including 32px desktop or 20px mobile gutters.
- **Reading page:** 840px maximum, with comfortable text measures.
- **Spacing:** 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64, 72, 80, and 96px.
- **Controls:** 48px primary actions; 44px navigation/theme controls, with a 40px theme button on the narrowest layouts.
- **Surfaces:** thin rules, 3px control radii, and a subtle shadow only on the latest-edition panel.

## Page conventions

1. The homepage presents the latest edition once, followed by data-derived statistics, six earlier editions, and subscription information.
2. Edition panels and issue cards display dates, leading stories, and source labels. Missing featured images leave a complete text layout.
3. Archive cards retain URL-based search, date, pagination, and return navigation. Their story headlines are derived server-side without changing the issue API response.
4. The reading page keeps source links, story anchors, contents navigation, reading time, and adjacent editions.
5. The About page uses an ordered six-stage pipeline, project facts, and explicit engineering tradeoffs.
6. The shared subscription form reports actual outcomes. Without email configuration, it presents an archive link instead of a simulated signup.

## Responsive behavior

- **Desktop:** introduction beside latest edition; three archive/card columns; three pipeline columns.
- **Tablet:** two archive/card columns; two pipeline columns; signup controls can stack.
- **Mobile:** introduction followed by edition; two-by-two statistics; collapsible navigation; stacked project/story sections.
- **Below 540px:** single-column cards and pipeline; stacked signup controls.

Mobile navigation exposes its expanded state, closes after navigation, and returns focus to the menu button on Escape.

## Accessibility and states

Every page shares a skip-to-content link, semantic navigation, and visible focus outlines. Themes persist through next-themes. Native button keyboard behavior handles theme changes without a duplicate key handler.

Route loading uses a labeled skeleton. Empty archives and missing issues use explanatory content. Unexpected load failures reach a retryable route error boundary; layout components have a dedicated client error boundary. Signup status uses a live region and keeps provider details out of user-facing errors.

Motion is limited to brief control transitions and loading feedback. Reduced-motion preferences disable nonessential animation, smooth scrolling, and hover translation.

## Visual verification

Playwright checks the five primary pages at desktop, tablet, and mobile widths in both themes. Browser checks also exercise overflow, archive filters and return navigation, unavailable signup, keyboard controls, invalid dates, story anchors, and reduced motion.

Final homepage screenshots in both themes, a mobile preview, and the About page are stored in `docs/screenshots/` and embedded in the README.
