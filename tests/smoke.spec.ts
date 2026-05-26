import { test, expect } from "@playwright/test";

test("home page loads with open-wallet North Star", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /self-custody/i,
  );
  await expect(page.getByText(/open-wallet/i).first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: /open-saas/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /ADR 0010/i })).toBeVisible();
  await expect(page.getByTestId("cta-register")).toBeVisible();
  await expect(page.getByTestId("cta-login")).toBeVisible();
});
