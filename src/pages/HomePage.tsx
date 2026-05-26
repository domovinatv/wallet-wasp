import { Link } from "react-router";
import { brand } from "../brand.config.js";
import { Layout } from "../ui/Layout.js";

const ADR_URL = brand.parentRepoUrl + brand.adrPath;
const OPEN_SAAS_URL = "https://github.com/wasp-lang/open-saas";

export function HomePage() {
  return (
    <Layout>
      <section className="pt-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand">
          <Sparkle /> Powered by passkeys · {brand.chain.name}
        </span>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          Self-custody {brand.token.symbol} wallet —{" "}
          <span className="text-brand">no seed phrases.</span>
        </h1>

        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          {brand.tagline}. One Face ID, one Safe smart account, brought to you
          by{" "}
          <a
            className="link-inline"
            href={brand.homepageUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            {brand.name.toLowerCase()}.ai
          </a>
          .
        </p>

        <div data-testid="nav-cta" className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            data-testid="cta-register"
            to="/register"
            className="rounded-xl bg-brand px-4 py-3.5 text-center text-sm font-medium text-white shadow-sm hover:bg-brand-600"
          >
            Create wallet
          </Link>
          <Link
            data-testid="cta-login"
            to="/login"
            className="rounded-xl border border-brand bg-white px-4 py-3.5 text-center text-sm font-medium text-brand hover:bg-brand-50"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Feature
            title="Passkey-owned"
            body="Your Face ID or device passkey signs every transaction. No private keys to lose."
          />
          <Feature
            title="On Gnosis Chain"
            body={`${brand.token.name} settled on Gnosis Chain — fast, cheap, and stable in EUR.`}
          />
          <Feature
            title="Open-source seed"
            body={
              <>
                Incubating <span className="font-medium text-ink">open-wallet</span>,{" "}
                analog of{" "}
                <a
                  href={OPEN_SAAS_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-inline"
                >
                  open-saas
                </a>{" "}
                for Web3.
              </>
            }
          />
        </div>

        <p className="mt-12 border-t border-border pt-6 text-xs text-ink-soft">
          Strategic plan in{" "}
          <a
            href={ADR_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="link-inline"
          >
            ADR 0010
          </a>
          . Source:{" "}
          <a
            href={brand.sourceRepoUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="link-inline"
          >
            {brand.sourceRepoUrl.replace("https://", "")}
          </a>
          .
        </p>
      </section>
    </Layout>
  );
}

function Feature({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}

function Sparkle() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
      <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13 6.5 8.5 2 7l4.5-1.5L8 1z" />
    </svg>
  );
}
