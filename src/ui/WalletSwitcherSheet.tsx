import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Address } from "viem";
import {
  archivePasskey,
  listKnownPasskeys,
  setActivePasskey,
  type PasskeyRecord,
} from "../lib/passkey-client.js";
import { fetchEureBalances, formatEureShort } from "../lib/balances.js";
import { brand } from "../brand.config.js";
import { setSession } from "../lib/session.js";
import { cn } from "./cn.js";

interface WalletSwitcherSheetProps {
  open: boolean;
  onClose: () => void;
  activeCredentialId: string | null;
}

export function WalletSwitcherSheet({
  open,
  onClose,
  activeCredentialId,
}: WalletSwitcherSheetProps) {
  const navigate = useNavigate();
  const [wallets, setWallets] = useState<PasskeyRecord[]>([]);
  const [balances, setBalances] = useState<Map<string, bigint>>(new Map());
  const [confirmArchive, setConfirmArchive] = useState<PasskeyRecord | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    const known = listKnownPasskeys();
    setWallets(known);
    setConfirmArchive(null);

    if (known.length > 0) {
      void (async () => {
        try {
          const addrs = known.map((w) => w.safeAddress as Address);
          const map = await fetchEureBalances(addrs);
          setBalances(map);
        } catch {
          /* silent — show "—" instead */
        }
      })();
    }
  }, [open]);

  if (!open) return null;

  function onSwitch(rec: PasskeyRecord) {
    setActivePasskey(rec.credentialId);
    setSession({
      userId: "(switched)", // server session re-issue on next action
      safeAddr: rec.safeAddress,
      signerAddr: rec.signerAddress,
      pubKeyX: rec.pubKeyX,
      pubKeyY: rec.pubKeyY,
    });
    onClose();
    navigate("/wallet");
  }

  function onArchive(rec: PasskeyRecord) {
    archivePasskey(rec.credentialId);
    setWallets(listKnownPasskeys());
    setConfirmArchive(null);
  }

  return (
    <div
      data-testid="wallet-switcher-sheet"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-surface p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Switch wallet</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-soft hover:bg-ink/5"
          >
            ✕
          </button>
        </div>

        {wallets.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-muted">
            Još nema spremljenih wallet-a.
          </p>
        )}

        <ul className="space-y-1.5">
          {wallets.map((w) => {
            const isActive = w.credentialId === activeCredentialId;
            const balance = balances.get(w.safeAddress.toLowerCase());
            return (
              <li key={w.credentialId}>
                <div
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border p-3",
                    isActive
                      ? "border-brand bg-brand-50"
                      : "border-border bg-white",
                  )}
                >
                  <button
                    onClick={() => onSwitch(w)}
                    className="flex-1 text-left"
                  >
                    <div className="text-sm font-medium">{w.keychainName}</div>
                    <div className="mono mt-0.5 text-xs text-ink-soft">
                      {w.safeAddress.slice(0, 8)}…{w.safeAddress.slice(-4)}
                    </div>
                  </button>
                  <div className="text-right">
                    <div className="nums text-sm font-semibold">
                      {balance !== undefined
                        ? formatEureShort(balance)
                        : "—"}{" "}
                      <span className="text-xs font-medium text-ink-soft">
                        {brand.token.symbol}
                      </span>
                    </div>
                    {!isActive && (
                      <button
                        onClick={() => setConfirmArchive(w)}
                        className="mt-1 text-xs text-ink-soft hover:text-accent"
                      >
                        Arhiviraj
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <button
          onClick={() => {
            onClose();
            navigate("/register");
          }}
          data-testid="add-wallet-button"
          className="mt-4 w-full rounded-xl border border-brand bg-white px-4 py-3 text-sm font-medium text-brand hover:bg-brand-50"
        >
          + Stvori novi wallet
        </button>

        {confirmArchive && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-ink/40 p-4"
            onClick={() => setConfirmArchive(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-surface p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold">Arhivirati wallet?</h3>
              <p className="mt-2 text-sm text-ink-muted">
                Skida se s liste; Safe + sredstva ostaju on-chain. Passkey
                ostaje u OS Keychain-u. Možeš ga vratiti preko Sign in.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfirmArchive(null)}
                  className="rounded-xl border border-border bg-white py-2 text-sm"
                >
                  Odustani
                </button>
                <button
                  onClick={() => onArchive(confirmArchive)}
                  className="rounded-xl bg-accent py-2 text-sm text-white"
                >
                  Arhiviraj
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
