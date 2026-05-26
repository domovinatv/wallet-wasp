import { Link } from "react-router";
import { brand } from "../brand.config.js";

const ADR_URL = brand.parentRepoUrl + brand.adrPath;

export function HomePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 leading-relaxed">
      <h1 className="mb-4 text-3xl font-semibold">wallet-wasp v0</h1>

      <p className="mb-3">
        Incubation seed for <strong>open-wallet</strong> — an open-source
        WASP wallet template, analog of{" "}
        <a
          href="https://github.com/wasp-lang/open-saas"
          target="_blank"
          rel="noreferrer noopener"
        >
          wasp-lang/open-saas
        </a>
        .
      </p>

      <p className="mb-3">
        Faza 2 (wallet UI) shipped. Strategic North Star + rename criteria
        documented in{" "}
        <a href={ADR_URL} target="_blank" rel="noreferrer noopener">
          ADR 0010
        </a>
        .
      </p>

      <div
        data-testid="nav-cta"
        className="mt-8 flex gap-3"
      >
        <Link
          data-testid="cta-register"
          to="/register"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          Create wallet
        </Link>
        <Link
          data-testid="cta-login"
          to="/login"
          className="rounded-lg border border-neutral-900 px-4 py-2 text-sm"
        >
          Sign in
        </Link>
      </div>

      <p className="mt-8 text-sm text-neutral-600">
        Powered by{" "}
        <a
          href={brand.homepageUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          {brand.name.toLowerCase()}.ai
        </a>
        . Source:{" "}
        <a href={brand.sourceRepoUrl} target="_blank" rel="noreferrer noopener">
          {brand.sourceRepoUrl.replace("https://", "")}
        </a>
        .
      </p>
    </div>
  );
}
