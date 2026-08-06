# Frontend Cleanup Prompt

Use this prompt to guide a systematic cleanup of the frontend codebase in `web/`.

---

## Goal

Refactor the Next.js 14 App Router frontend to be cleaner, more maintainable, and more consistent — without changing visual behavior or breaking existing functionality.

---

## 1. Reduce Component Complexity

**Problem:** Several components are too large and do too much.

- `navbar.tsx` (174 lines) mixes navigation logic, scroll tracking, mobile menu state, theme toggle, and animation orchestration.
- `hero-section.tsx` (213 lines) combines scroll-driven animations, particle effects, gradient mesh, and content layout in one component.

**Action:**

- Extract sub-components from `navbar.tsx`:
  - `NavLinks` — the desktop navigation link list with active-state indicator
  - `MobileMenu` — the collapsible mobile menu with animated transitions
  - `NavbarTop` — the top bar containing the logo, desktop links, and theme toggle
- Extract sub-components from `hero-section.tsx`:
  - `HeroBackground` — the gradient mesh, glow orbs, and particle canvas
  - `HeroContent` — the title, subtitle, CTA buttons, subscribe box, and tags
  - `ScrollIndicator` — the animated chevron at the bottom
- Each extracted component should be under 80 lines.

---

## 2. Deduplicate Animation Patterns

**Problem:** The `prefersReducedMotion` check, `motion` component usage, and animation variant objects are repeated identically across `navbar.tsx`, `hero-section.tsx`, `article-card.tsx`, `theme-toggle.tsx`, and others.

**Action:**

- Create a `useAnimationPreferences` hook in `web/hooks/` that returns `{ prefersReducedMotion, shouldAnimate }` where `shouldAnimate` is a boolean gate that can be spread into framer-motion props.
- Create a `motion/` subdirectory under `web/components/` with reusable motion primitives:
  - `AnimatedContainer` — wrapper that conditionally applies entrance animations
  - `AnimatedIcon` — wrapper for icon SVGs with mount/unmount animations
  - `ScrollReveal` — scroll-driven opacity/translate animation (replaces the `scroll-reveal.tsx` component if it duplicates this)
- Replace inline `prefersReducedMotion` branches in every component with the new hook and primitives.

---

## 3. Eliminate the `mounted` State Pattern

**Problem:** `hero-section.tsx` and `theme-toggle.tsx` both use `useState(false)` + `useEffect(() => setMounted(true), [])` to prevent hydration mismatches. This is a code smell that indicates the component is rendering different content on server vs. client.

**Action:**

- For `hero-section.tsx`: The particle `Array.from({ length: 35 })` loop can be rendered unconditionally on the server. Use CSS `opacity: 0` as a fallback for non-JS environments instead of conditional rendering.
- For `theme-toggle.tsx`: Use `suppressHydrationWarning` on the wrapper element, or render a static placeholder on the server and swap on client via a single `useEffect` with no state variable.
- Create a `useIsClient` hook in `web/hooks/` that returns `true` only after mount, to replace ad-hoc `mounted` state in any remaining components.

---

## 4. Clean Up `globals.css`

**Problem:** `globals.css` (344 lines) mixes CSS custom properties, Tailwind `@layer` directives, keyframe animations, and prose styles in a single file.

**Action:**

- Move CSS custom properties to `web/app/layout.tsx` via a `<style jsx global>` tag or keep them in a dedicated `web/styles/tokens.css` file imported by `layout.tsx`.
- Move `@layer utilities` and `@layer components` rules into `web/styles/components.css` and `web/styles/utilities.css` respectively.
- Move keyframe definitions to `web/styles/animations.css`.
- Move prose styles to a `Prose` component in `web/components/` instead of having them in CSS.
- Ensure `globals.css` only contains `@tailwind` directives and `@layer base` for minimal root-level styles.

---

## 5. Replace `dangerouslySetInnerHTML`

**Problem:** `article-card.tsx` uses `dangerouslySetInnerHTML={{ __html: mdToHtml(issue.intro) }}` which is a security and maintainability concern.

**Action:**

- Replace with a sanitized Markdown renderer. Use `react-markdown` or a similar library that renders Markdown to React elements natively, eliminating the need for `dangerouslySetInnerHTML`.
- If `mdToHtml` is still needed for other purposes, keep it in `web/lib/markdown.ts` but do not use it for inline rendering in components.

---

## 6. Normalize TypeScript Types

**Problem:** The `NewsletterIssue` type (in `web/types/index.ts`) is used across many components, but prop interfaces are inconsistently defined — some use inline types, some use interfaces, and `DataLoaderProps` uses `Awaited<ReturnType<...>>` which is fragile.

**Action:**

- Ensure all component props use explicit `interface` declarations in a `__types.ts` file co-located with the component (e.g., `navbar.tsx` + `navbar-types.ts` or a shared `types/` directory).
- Replace `Awaited<ReturnType<typeof readIssuesFromMarkdown>>` in `DataLoaderProps` with a direct reference to the resolved type (e.g., `Issue[]`), imported from `web/lib/posts.ts`.
- Add a `web/types/components.ts` file that re-exports all component prop types for easy importing.

---

## 7. Simplify Tailwind Class Strings

**Problem:** Many components have extremely long, hard-to-read Tailwind `className` strings (e.g., navbar's conditional class string, article-card's hover classes).

**Action:**

- Use `clsx` or `tailwind-merge` (add to dependencies if not present) to compose conditional classes cleanly.
- Extract repeated class groups into constants or utility functions:
  - `cardClasses` — the shared card border, background, hover, and shadow classes
  - `btnClasses` — button base styles
  - `textMuted` — the repeated `text-gray-400 dark:text-gray-300` pattern
- In `hero-section.tsx`, extract the gradient mesh background into a separate `BackgroundMesh` component so the main section's className stays short.

---

## 8. Remove Unused Code and Dependencies

**Action:**

- Audit `web/components/scroll-reveal.tsx` — if its functionality is now covered by the new `ScrollReveal` motion primitive, remove the old file.
- Audit `web/components/featured-card.tsx`, `web/components/stats-bar.tsx`, `web/components/home-grid.tsx`, `web/components/subscribe-box.tsx`, `web/components/footer.tsx` — ensure they follow the same patterns established in the cleanup (no inline `prefersReducedMotion` branches, no `mounted` state, reasonable line count).
- Remove any unused CSS keyframes or utility classes from `globals.css`.
- Remove any unused dependencies from `web/package.json`.

---

## 9. Establish Consistent File Conventions

**Action:**

- All client components must start with `"use client"`.
- All server components (default in App Router) must NOT have `"use client"`.
- Component file names must be kebab-case (already followed).
- Each component must have a corresponding TypeScript interface for its props.
- Hooks must be in `web/hooks/` and named `use-*`.
- Utility functions must be in `web/lib/`.
- UI primitives must be in `web/components/ui/`.
- Feature components must be in `web/components/`.

---

## 10. Validation Checklist

After all cleanup passes, verify:

- [ ] `npm run build` in `web/` succeeds with no errors
- [ ] `npm run lint` in `web/` passes
- [ ] No component exceeds 100 lines
- [ ] No `dangerouslySetInnerHTML` remains in components
- [ ] No ad-hoc `mounted` state variables remain
- [ ] `prefersReducedMotion` is only referenced inside `web/hooks/useAnimationPreferences`
- [ ] All CSS is in `web/styles/` or `web/app/globals.css` (minimal)
- [ ] All prop types are explicitly declared as interfaces
- [ ] The visual output is identical before and after cleanup (manual or visual regression test)

---

## How to Use This Prompt

1. Read the full prompt before starting any work.
2. Work through the sections in order (1 → 10).
3. After completing each section, run `npm run build` and `npm run lint` in the `web/` directory to verify nothing is broken.
4. Do not change visual behavior — only refactor structure, extract components, deduplicate, and improve type safety.
5. Commit after each section is complete for easy rollback.