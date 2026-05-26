import type { BrandConfig } from "./types.js";
import { brand as defaultBrand } from "./default.js";

// Sample tenant: sports-club wallet. SofaScore-style deep blue primary
// + white accent. Validates that brand-as-data yields a visually
// distinct app from the default DOMOVINA build.

export const brand: BrandConfig = {
  ...defaultBrand,
  id: "sportklub",
  name: "SK Wallet",
  shortName: "SportKlub",
  productSubtitle: "EURe za navijače i sponzore",
  domain: "sportklub.domovina.ai",
  pageTitle: "SK Wallet · EURe za navijače",
  tagline: "Self-custody EURe za navijače i sponzore",

  primaryColor: "#1A4B8A",
  accentColor: "#FFFFFF",
};
