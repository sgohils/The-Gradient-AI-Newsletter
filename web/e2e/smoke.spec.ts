import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

const latestDate = fs
  .readdirSync(path.resolve(__dirname, "../../posts"))
  .filter((file) => file.endsWith(".md"))
  .sort()
  .reverse()[0]
  .replace(".md", "");
const routes = [
  "/",
  "/archive",
  `/archive/${latestDate}`,
  "/subscribe",
  "/about",
];

for (const theme of ["light", "dark"] as const) {
  test.describe(theme, () => {
    test.use({ colorScheme: theme });
    for (const route of routes) {
      test(`${route} renders without overflow or browser errors`, async ({
        page,
      }, testInfo) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const response = await page.goto(route);
        expect(response?.status()).toBe(200);
        await expect(page.locator("main h1")).toBeVisible();
        await expect(page.locator("html")).toHaveClass(
          theme === "dark" ? /dark/ : /light/,
        );
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath("page.png"),
          fullPage: true,
          animations: "disabled",
        });
        expect(errors).toEqual([]);
      });
    }
  });
}

test("homepage links to actual stories and excludes the latest from recent cards", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".edition-stories li")).toHaveCount(3);
  const recent = page.locator(".issue-card");
  await expect(recent).toHaveCount(6);
  for (const href of await recent.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href")),
  )) {
    expect(href).not.toBe(`/archive/${latestDate}`);
  }
  const storyLink = page.locator(".edition-stories a").first();
  const href = await storyLink.getAttribute("href");
  await storyLink.click();
  const anchor = href!.split("#")[1];
  await expect(page.locator("#" + anchor)).toBeInViewport();
});

test("archive pagination and reading preserve search and return navigation", async ({
  page,
}) => {
  await page.goto("/archive");
  await page.getByLabel("Search stories").fill("OpenAI");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=OpenAI/);
  await page.getByRole("link", { name: "Next page", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  const archiveUrl = page.url();
  await page.locator(".issue-card").first().click();
  await page
    .getByRole("link", { name: "Back to archive", exact: true })
    .click();
  await expect(page).toHaveURL(archiveUrl);
  await expect(page.getByLabel("Search stories")).toHaveValue("OpenAI");
});

test("archive date filtering and empty search states", async ({ page }) => {
  await page.goto("/archive");
  await page.getByLabel("Issue date").fill(latestDate);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".issue-card")).toHaveCount(1);
  await page
    .getByLabel("Search stories")
    .fill("a-topic-that-does-not-exist-937");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No issues found" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page.locator(".issue-card")).toHaveCount(9);
});

test("invalid issue dates show a recoverable 404", async ({ page }) => {
  await page.goto("/archive/not-a-date");
  await expect(
    page.getByRole("heading", { name: "Issue Not Found" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Browse Archive" }).click();
  await expect(page).toHaveURL(/\/archive$/);
});

test("theme button uses native keyboard activation and persists", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Switch to dark mode" });
  await button.focus();
  await button.press("Enter");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  const lightButton = page.getByRole("button", {
    name: "Switch to light mode",
  });
  await lightButton.focus();
  await lightButton.press("Space");
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.keyboard.press("Tab");
});

test("mobile navigation closes after routing and Escape restores focus", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "About" })
    .click();
  await expect(page).toHaveURL(/\/about$/);
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
});

test("reduced motion disables smooth scrolling and hover translation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  const cta = page.getByRole("link", { name: "Read latest issue" });
  await cta.hover();
  expect(
    await cta.evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");
});

test("unconfigured subscription is honest in the UI and API", async ({
  page,
  request,
}) => {
  await page.goto("/subscribe");
  await expect(
    page.getByText("Email signup is currently unavailable.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Get the briefing" }),
  ).toHaveCount(0);
  const response = await request.post("/api/subscribe", {
    data: { email: "reader@example.com" },
  });
  expect(response.status()).toBe(503);
  expect((await response.json()).error).toContain("archive");
});

test("publication assets and social metadata render", async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.goto("/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /\/opengraph-image/,
  );
  const icon = await request.get("/icon.svg");
  expect(icon.status()).toBe(200);
  expect(await icon.text()).toContain("<svg");
  const card = await request.get("/opengraph-image");
  expect(card.status()).toBe(200);
  expect(card.headers()["content-type"]).toContain("image/png");
  const bytes = await card.body();
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  await fs.promises.writeFile(testInfo.outputPath("social-preview.png"), bytes);
});
