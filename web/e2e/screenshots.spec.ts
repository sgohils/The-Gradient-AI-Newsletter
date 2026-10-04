import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

test("capture portfolio screenshots", async ({ page }, testInfo) => {
  const dir = path.resolve(__dirname, "../../docs/screenshots");
  fs.mkdirSync(dir, { recursive: true });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.evaluate(() => document.fonts.ready);
  if (testInfo.project.name === "mobile") {
    await page.screenshot({
      path: path.join(dir, "home-mobile.png"),
      animations: "disabled",
    });
    return;
  }
  await page.screenshot({
    path: path.join(dir, "home-light.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: path.join(dir, "home-dark.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.goto("/about");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: path.join(dir, "about.png"),
    fullPage: true,
    animations: "disabled",
  });
});
