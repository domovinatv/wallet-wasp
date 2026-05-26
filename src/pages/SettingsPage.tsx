import { useNavigate } from "react-router";
import { getSession, clearSession } from "../lib/session.js";
import { useTheme, type ThemeMode } from "../lib/theme.js";
import { brand } from "../brand.config.js";
import { Layout } from "../ui/Layout.js";
import { Card } from "../ui/Card.js";
import { Button } from "../ui/Button.js";
import { Address as AddressChip } from "../ui/Address.js";

const ADR_URL = brand.parentRepoUrl + brand.adrPath;

export function SettingsPage() {
  const session = getSession();
  const navigate = useNavigate();
  const { mode, setMode } = useTheme();

  if (!session) {
    navigate("/login");
    return null;
  }

  return (
    <Layout back={{ to: "/wallet", label: "Wallet" }} title="Postavke">
      <div className="space-y-4 pt-1">
        <Section title="Račun">
          <Card>
            <Row label="Safe address">
              <AddressChip value={session.safeAddr} />
            </Row>
            <Row label="Network">
              <span className="text-sm">{brand.chain.name}</span>
            </Row>
            <Row label="Token">
              <span className="text-sm">
                {brand.token.symbol} ({brand.token.name})
              </span>
            </Row>
            <Row label="User ID">
              <code className="mono text-xs text-ink-muted">
                {session.userId.slice(0, 8)}…
              </code>
            </Row>
          </Card>
        </Section>

        <Section title="Sigurnost">
          <Card>
            <Action
              onClick={() => navigate("/settings/expand-access")}
              label="Dodaj passkey"
              hint="Drugi uređaj kao co-owner istog Safe-a"
            />
          </Card>
        </Section>

        <Section title="Tema">
          <Card>
            <div className="flex gap-2">
              {(["system", "light", "dark"] as ThemeMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={
                    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition " +
                    (mode === m
                      ? "border-brand bg-brand-50 text-brand"
                      : "border-border bg-white text-ink-muted hover:bg-ink/[0.02]")
                  }
                >
                  {m === "system" ? "Sustav" : m === "light" ? "Svijetlo" : "Tamno"}
                </button>
              ))}
            </div>
          </Card>
        </Section>

        <Section title="O aplikaciji">
          <Card>
            <p className="text-sm text-ink-muted">
              wallet-wasp · WASP rewrite eksperiment.{" "}
              <a
                href={brand.sourceRepoUrl}
                target="_blank"
                rel="noreferrer"
                className="link-inline"
              >
                Source
              </a>
              ·{" "}
              <a
                href={ADR_URL}
                target="_blank"
                rel="noreferrer"
                className="link-inline"
              >
                ADR 0010 vision
              </a>
            </p>
          </Card>
        </Section>

        <Button
          data-testid="signout-button"
          variant="ghost"
          onClick={() => {
            clearSession();
            navigate("/");
          }}
          fullWidth
        >
          Odjavi se
        </Button>
      </div>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-ink-soft">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 first:pt-0 last:pb-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

function Action({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="-mx-5 -my-3 flex w-[calc(100%+2.5rem)] items-center justify-between gap-3 px-5 py-3 text-left transition hover:bg-ink/[0.02]"
    >
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-ink-soft">{hint}</div>}
      </div>
      <ChevronRight />
    </button>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 text-ink-soft" fill="none">
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
