import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import QRCode from "qrcode";
import { parseUnits } from "viem";
import { getSession } from "../lib/session.js";
import { brand } from "../brand.config.js";

// EIP-681 payment URI for ERC-20 transfer
// `ethereum:<token>@<chainId>/transfer?address=<safe>&uint256=<amountWei>`
// Wallets that understand EIP-681 (Trust, Rainbow, MetaMask mobile, Status,
// etc.) will pre-fill recipient + amount on scan.
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
    <div className="mx-auto max-w-md p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/wallet"
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          ← Wallet
        </Link>
        <h1 className="text-2xl font-semibold">Receive {brand.token.symbol}</h1>
      </div>

      <div className="mb-4 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex justify-center">
          <canvas
            data-testid="receive-qr"
            ref={canvasRef}
            className="rounded-lg"
          />
        </div>
        <div className="mt-4 text-center">
          <code
            data-testid="safe-addr"
            className="break-all font-mono text-xs text-neutral-600"
          >
            {session.safeAddr}
          </code>
        </div>
      </div>

      <label className="mb-4 block">
        <span className="text-sm text-neutral-500">
          Amount (optional — embeds into QR)
        </span>
        <input
          data-testid="amount-input"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 tabular-nums focus:border-neutral-900 focus:outline-none"
        />
      </label>

      <p className="text-sm text-neutral-500">
        Scan the QR in any EIP-681-aware wallet to pre-fill recipient
        {amount ? " and amount" : ""}. On {brand.chain.name}.
      </p>
    </div>
  );
}
