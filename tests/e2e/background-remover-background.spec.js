import { expect, test } from "@playwright/test";

test("loads background remover directly with background mode selected", async ({ page }) => {
  await page.goto("/background-remover/");
  await expect(page).toHaveTitle(/Background Remover/i);
  await expect(page.getByRole("tab", { name: "Remove background" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /Choose Image/i })).toBeVisible();
});

test("switches to the authorized object workflow", async ({ page }) => {
  await page.goto("/background-remover/");
  await page.getByRole("tab", { name: "Erase owned logo/object" }).click();
  await expect(page.getByText(/Use this tool only on images you may edit/i)).toBeVisible();
  await expect(page.getByText(/92.6 MB AI model/i)).toBeAttached();
});
