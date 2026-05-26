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

test("inspect computed colors on suspect elements", async ({ page }) => {
  // Home page CTAs
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const ctaRegister = await page
    .getByTestId("cta-register")
    .evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color };
    });
  console.log("CTA register:", JSON.stringify(ctaRegister));

  const ctaLogin = await page
    .getByTestId("cta-login")
    .evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color };
    });
  console.log("CTA login:", JSON.stringify(ctaLogin));

  const heroH1 = await page
    .getByRole("heading", { level: 1 })
    .evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color };
    });
  console.log("Hero H1:", JSON.stringify(heroH1));

  // Register button
  await page.goto("/register");
  await page.waitForLoadState("networkidle");
  const registerBtn = await page
    .getByTestId("register-button")
    .evaluate((el) => {
      const cs = window.getComputedStyle(el);
      const text = el.querySelector("span");
      const spanCs = text ? window.getComputedStyle(text) : null;
      return {
        bg: cs.backgroundColor,
        color: cs.color,
        spanColor: spanCs?.color,
      };
    });
  console.log("Register button:", JSON.stringify(registerBtn));

  // Wallet page balance card
  await attachVirtualAuthenticator(page);
  await page.getByTestId("register-button").click();
  await page.waitForURL("**/wallet");
  await page.waitForTimeout(500);

  const balanceCard = await page
    .getByTestId("balance-card")
    .evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color };
    });
  console.log("Balance card:", JSON.stringify(balanceCard));

  const balanceAmount = await page
    .getByTestId("balance-amount")
    .evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color };
    })
    .catch(() => ({ bg: "n/a", color: "n/a (balance error)" }));
  console.log("Balance amount:", JSON.stringify(balanceAmount));

  const signOutBtn = await page
    .getByTestId("signout-button")
    .evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color };
    });
  console.log("Sign out:", JSON.stringify(signOutBtn));

  const sendCta = await page
    .getByTestId("send-cta")
    .evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color };
    });
  console.log("Send CTA:", JSON.stringify(sendCta));
});
