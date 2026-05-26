import { test, expect, type Page } from "@playwright/test";

async function attachVA(page: Page) {
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

test("/activity does not infinite-loop RPC requests", async ({ page }) => {
  await attachVA(page);

  let rpcCount = 0;
  page.on("request", (req) => {
    if (req.url().includes("rpc.gnosischain.com")) rpcCount++;
  });

  await page.goto("/register");
  await page.getByTestId("register-button").click();
  await page.waitForURL("**/wallet", { timeout: 15_000 });

  const baseline = rpcCount;
  await page.goto("/activity");
  await page.waitForTimeout(4000); // long enough for loop to manifest

  const total = rpcCount - baseline;
  // Healthy: ~3-15 RPC calls (block number + logs + a few block timestamps).
  // Loop: would be hundreds in 4s.
  expect(total).toBeLessThan(50);
});
