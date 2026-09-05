import { expect, test } from "@playwright/test";
import path from "node:path";

test("runs authorized object removal locally with the pinned model", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/background-remover/");
  await page.locator("#backgroundFileInput").setInputFiles(path.resolve("public/creatornew-icon.png"));
  await expect(page.locator("#backgroundWorkspace")).toBeVisible();
  await page.getByRole("tab", { name: "Erase owned logo/object" }).click();
  await page.locator("#ownershipConfirm").check();

  const canvas = page.locator("#maskCanvas");
  await canvas.focus();
  await canvas.press("Enter");
  await expect(page.locator("#maskA11yStatus")).toContainText(/1 strokes/i);
  await page.locator("#removeObjectBtn").click();

  await expect(page.locator("#backgroundStatus")).toContainText(/ready to download|Review the result/i, { timeout: 120_000 });
  await expect(page.locator("#resultPreview")).toHaveAttribute("src", /blob:/);
});
