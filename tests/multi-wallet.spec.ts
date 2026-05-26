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

test("register persists PasskeyRecord to localStorage", async ({ page }) => {
  await attachVirtualAuthenticator(page);

  await page.goto("/register");
  await page.getByTestId("register-button").click();
  await expect(page.getByTestId("register-result")).toBeVisible({
    timeout: 10_000,
  });

  // Inspect localStorage for the registry entry
  const registryJson = await page.evaluate(() =>
    localStorage.getItem("wallet_wasp_passkeys_v1"),
  );
  expect(registryJson).not.toBeNull();

  const registry = JSON.parse(registryJson!) as Record<
    string,
    { credentialId: string; signerAddress: string; safeAddress: string }
  >;
  const records = Object.values(registry);
  expect(records).toHaveLength(1);

  const r = records[0];
  expect(r.credentialId).toMatch(/.+/);
  expect(r.signerAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
  expect(r.safeAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);

  // Active key should match
  const active = await page.evaluate(() =>
    localStorage.getItem("wallet_wasp_active"),
  );
  expect(active).toBe(r.credentialId);
});
