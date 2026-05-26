import { test, expect, type Page } from "@playwright/test";

async function attachVirtualAuthenticator(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send("WebAuthn.enable");
  await client.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

test("full MVP flow: register → wallet → send → receive", async ({ page }) => {
  await attachVirtualAuthenticator(page);

  // --- 1. Register ---
  await page.goto("/register");
  await page.getByTestId("register-button").click();
  await expect(page.getByTestId("register-result")).toBeVisible({
    timeout: 10_000,
  });

  // Auto-navigates to /wallet after 600ms
  await page.waitForURL("**/wallet", { timeout: 5_000 });

  // --- 2. Wallet view ---
  await expect(page.getByTestId("balance-card")).toBeVisible();
  // Either balance loads (with a number, likely 0) or shows error if Gnosis RPC
  // is unreachable from the test env. We don't strictly require success, just
  // that the page renders the card.

  await expect(page.getByTestId("safe-addr-full")).toBeVisible();
  const safeAddr = await page.getByTestId("safe-addr-full").textContent();
  expect(safeAddr).toMatch(/^0x[0-9a-fA-F]{40}$/);

  // --- 3. Send page ---
  await page.getByTestId("send-cta").click();
  await page.waitForURL("**/send");

  await page.getByTestId("to-input").fill(
    "0x0000000000000000000000000000000000000001",
  );
  await page.getByTestId("amount-input").fill("1,50");

  await page.getByTestId("send-button").click();
  await expect(page.getByTestId("send-success")).toBeVisible({
    timeout: 5_000,
  });

  // --- 4. Receive page ---
  await page.goto("/receive");
  await expect(page.getByTestId("receive-qr")).toBeVisible();
  await expect(page.getByTestId("safe-addr")).toContainText(safeAddr!);

  // Set an amount; the canvas should re-render (we don't decode QR, just
  // confirm it's still attached)
  await page.getByTestId("amount-input").fill("2,00");
  await expect(page.getByTestId("receive-qr")).toBeVisible();
});
