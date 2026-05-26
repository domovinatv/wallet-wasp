import type { SendEure } from "wasp/server/operations";

// Faza 1/2 placeholder relayer: validates input, returns a fake txHash.
// Real implementation (Faza 3) will:
//   1. Construct ERC-20 transfer calldata
//   2. Build a Safe MultiSend bundle (deploy-if-needed + transfer)
//   3. Sign the userOp with the passkey assertion attached
//   4. Broadcast via the relayer EOA (RELAYER_PRIVATE_KEY env var)
//
// For now we exercise the request/response wire so the UI flow works
// end-to-end and Playwright can assert success states. The relayer
// EOA + funded Gnosis xDAI / EURe balance for sponsorship is a real-
// world deployment prereq, not an autonomous-build prereq.

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSONLike = { [key: string]: any };

type SendArgs = JSONLike & {
  from: string;
  to: string;
  amount: string; // wei, decimal string
};

type SendResult = JSONLike & {
  txHash: string;
  mocked: boolean;
};

export const sendEure: SendEure<SendArgs, SendResult> = async (args) => {
  // Basic input validation
  if (!/^0x[0-9a-fA-F]{40}$/.test(args.from)) {
    throw new Error("Invalid 'from' address");
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(args.to)) {
    throw new Error("Invalid 'to' address");
  }
  if (!/^\d+$/.test(args.amount)) {
    throw new Error("Amount must be a non-negative integer in wei");
  }

  // Stub: produce a deterministic-looking tx hash based on args so
  // the E2E test can assert it's well-formed without depending on
  // actual chain state.
  const fakeHash =
    "0x" +
    args.from.slice(2) +
    args.to.slice(2, 22) +
    args.amount.slice(0, 4).padStart(4, "0");
  const padded = (fakeHash + ZERO_HASH).slice(0, 66);

  return {
    txHash: padded.toLowerCase(),
    mocked: true,
  };
};
