import { test, type Page } from "@playwright/test";

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

test("capture screenshots of each route", async ({ page }) => {
  await attachVirtualAuthenticator(page);
  await page.setViewportSize({ width: 480, height: 900 });

  // Home
  await page.goto("/");
  await page.screenshot({ path: "screenshots/home.png", fullPage: true });

  // Register
  await page.goto("/register");
  await page.screenshot({ path: "screenshots/register-before.png", fullPage: true });
  await page.getByTestId("register-button").click();
  await page.waitForURL("**/wallet", { timeout: 5_000 });

  // Wallet (post-register)
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "screenshots/wallet.png", fullPage: true });

  // Send
  await page.goto("/send");
  await page.getByTestId("to-input").fill("0x1234567890123456789012345678901234567890");
  await page.getByTestId("amount-input").fill("1,50");
  await page.screenshot({ path: "screenshots/send-filled.png", fullPage: true });

  // Receive
  await page.goto("/receive");
  await page.getByTestId("amount-input").fill("5,00");
  await page.waitForTimeout(300); // QR regen
  await page.screenshot({ path: "screenshots/receive.png", fullPage: true });

  // Login (logged out flow)
  await page.evaluate(() => localStorage.clear());
  await page.goto("/login");
  await page.screenshot({ path: "screenshots/login.png", fullPage: true });
});
