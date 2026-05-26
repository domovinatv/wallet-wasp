import { Link } from "react-router";

export function HomePage() {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "48px 24px",
        lineHeight: 1.55,
      }}
    >
      <h1 style={{ fontSize: 28, margin: "0 0 16px" }}>wallet-wasp v0</h1>

      <p style={{ margin: "0 0 12px" }}>
        Incubation seed for{" "}
        <strong>open-wallet</strong> — an open-source WASP wallet template,
        analog of{" "}
        <a
          href="https://github.com/wasp-lang/open-saas"
          target="_blank"
          rel="noreferrer noopener"
        >
          wasp-lang/open-saas
        </a>
        .
      </p>

      <p style={{ margin: "0 0 12px" }}>
        Faza 1 (passkey auth) is wired. Faza 2 (wallet UI) next. Strategic
        North Star + rename criteria documented in{" "}
        <a
          href="https://github.com/domovinatv/pay.domovina.ai/blob/main/docs/decisions/0010-open-wallet-vision.md"
          target="_blank"
          rel="noreferrer noopener"
        >
          ADR 0010
        </a>
        .
      </p>

      <div
        data-testid="nav-cta"
        style={{
          marginTop: 32,
          display: "flex",
          gap: 12,
        }}
      >
        <Link
          data-testid="cta-register"
          to="/register"
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            background: "#1f1f1f",
            color: "white",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          Create wallet
        </Link>
        <Link
          data-testid="cta-login"
          to="/login"
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #1f1f1f",
            color: "#1f1f1f",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          Sign in
        </Link>
      </div>

      <p style={{ marginTop: 32, fontSize: 14, color: "#666" }}>
        Powered by{" "}
        <a href="https://domovina.ai" target="_blank" rel="noreferrer noopener">
          domovina.ai
        </a>
        . Source:{" "}
        <a
          href="https://github.com/domovinatv/wallet-wasp"
          target="_blank"
          rel="noreferrer noopener"
        >
          github.com/domovinatv/wallet-wasp
        </a>
        .
      </p>
    </div>
  );
}
