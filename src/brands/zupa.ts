import type { BrandConfig } from "./types.js";
import { brand as defaultBrand } from "./default.js";

// Sample tenant: parish (mjesna župa) wallet. Vatican palette — white
// surface + gold primary for CTAs. Validates brand-as-data on
// high-contrast non-blue palettes.

export const brand: BrandConfig = {
  ...defaultBrand,
  id: "zupa",
  name: "Župa",
  shortName: "Župa",
  productSubtitle: "Digitalna lepta",
  domain: "zupa.domovina.ai",
  pageTitle: "Župa Wallet · Digitalna lepta",
  tagline: "Digitalna lepta i milodari za župnu zajednicu",

  primaryColor: "#B8860B",
  accentColor: "#FFFFFF",
};
