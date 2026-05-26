import { test, expect } from "@playwright/test";
import type { CDPSession, Page } from "@playwright/test";

// Programmatically registers a virtual WebAuthn authenticator on the
// page's Chrome DevTools session, so navigator.credentials.create() /
// .get() ceremonies on this page are answered by Chrome itself —
// no Touch ID / Face ID interaction required. Mirrors the real flow
// closely; the only thing we don't exercise is the attestation
// signing path of a real authenticator.

async function attachVirtualAuthenticator(page: Page): Promise<{
  client: CDPSession;
  authenticatorId: string;
}> {
  const client = await page.context().newCDPSession(page);
  await client.send("WebAuthn.enable");
  const { authenticatorId } = await client.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    },
  );
  return { client, authenticatorId };
}

test("passkey register creates User + Passkey + returns Safe addr", async ({
  page,
}) => {
  await attachVirtualAuthenticator(page);

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: /create wallet/i })).toBeVisible();

  await page.getByTestId("register-button").click();

  // Wait for register-result to appear
  const result = page.getByTestId("register-result");
  await expect(result).toBeVisible({ timeout: 10_000 });

  const userId = await page.getByTestId("user-id").textContent();
  const safeAddr = await page.getByTestId("safe-addr").textContent();

  expect(userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  expect(safeAddr).toMatch(/^0x[0-9a-f]{40}$/);
});

test("passkey register then login uses the same Safe address", async ({
  page,
}) => {
  await attachVirtualAuthenticator(page);

  // 1. Register
  await page.goto("/register");
  await page.getByTestId("register-button").click();
  await expect(page.getByTestId("register-result")).toBeVisible({
    timeout: 10_000,
  });

  const registeredSafeAddr = await page
    .getByTestId("safe-addr")
    .textContent();
  expect(registeredSafeAddr).toMatch(/^0x[0-9a-f]{40}$/);

  // 2. Now navigate to /login and sign in with same passkey
  await page.goto("/login");
  await page.getByTestId("login-button").click();
  await expect(page.getByTestId("login-result")).toBeVisible({
    timeout: 10_000,
  });

  const loginSafeAddr = await page.getByTestId("safe-addr").textContent();
  expect(loginSafeAddr).toBe(registeredSafeAddr);
});
