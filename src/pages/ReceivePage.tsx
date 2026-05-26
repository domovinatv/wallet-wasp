import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import QRCode from "qrcode";
import { parseUnits } from "viem";
import { getSession } from "../lib/session.js";
import { brand } from "../brand.config.js";
import { Layout } from "../ui/Layout.js";
import { Card } from "../ui/Card.js";
import { Input } from "../ui/Input.js";
import { Address } from "../ui/Address.js";

function buildEip681(safeAddr: string, amountStr: string): string {
  const base = `${brand.payment.eip681Scheme}:${brand.token.address}@${brand.chain.id}/transfer?address=${safeAddr}`;
  const trimmed = amountStr.trim().replace(",", ".");
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) return base;
  const wei = parseUnits(trimmed, brand.token.decimals);
  return `${base}&uint256=${wei.toString()}`;
}

export function ReceivePage() {
  const session = getSession();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!session) {
      navigate("/login");
    }
  }, [session, navigate]);

  useEffect(() => {
    if (!session || !canvasRef.current) return;
    const uri = buildEip681(session.safeAddr, amount);
    void QRCode.toCanvas(canvasRef.current, uri, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: brand.primaryColor,
        light: "#ffffff",
      },
    });
  }, [session, amount]);

  if (!session) return null;

  return (
    <Layout back={{ to: "/wallet", label: "Wallet" }} title="Receive">
      <div className="pt-1 space-y-4">
        <Card>
          <div className="flex flex-col items-center">
            <div className="rounded-2xl bg-white p-3 ring-1 ring-border">
              <canvas
                data-testid="receive-qr"
                ref={canvasRef}
                className="block"
              />
            </div>
            <div className="mt-4 flex flex-col items-center gap-1">
              <span className="text-xs uppercase tracking-wider text-ink-soft">
                Your {brand.token.symbol} address
              </span>
              <Address value={session.safeAddr} />
              <span
                data-testid="safe-addr"
                className="mono mt-2 block max-w-full break-all px-4 text-center text-xs text-ink-muted"
              >
                {session.safeAddr}
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <Input
            data-testid="amount-input"
            label="Request a specific amount (optional)"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            hint={
              amount
                ? `QR will pre-fill ${amount.replace(",", ".")} ${brand.token.symbol}`
                : "Leave empty to let the sender choose."
            }
            className="nums"
          />
        </Card>

        <p className="px-1 text-xs text-ink-soft">
          Scan this QR in any EIP-681-aware wallet on {brand.chain.name}.
        </p>
      </div>
    </Layout>
  );
}
