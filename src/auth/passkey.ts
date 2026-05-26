import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";

import { RP_ID, RP_NAME, RP_ORIGIN } from "./rp.js";
import { deriveSafeAddressFromCose } from "./safeAddress.js";
import { signSession } from "./session.js";

import type {
  PasskeyRegisterStart,
  PasskeyRegisterFinish,
  PasskeyAuthStart,
  PasskeyAuthFinish,
} from "wasp/server/operations";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// WASP's Payload = void | SuperJSONValue; SuperJSONObject has index
// signature [key: string]: SuperJSONValue. `unknown` doesn't satisfy
// that, so we use `any` for the dynamic JSON portions (the WebAuthn
// options object) which the WebAuthn ceremony just opaquely passes
// through. Runtime serialization works fine via SuperJSON.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSONLike = { [key: string]: any };

type StartResult = {
  challenge: string;
  options: JSONLike;
};

type FinishResult = {
  userId: string;
  safeAddr: string;
  sessionToken: string;
};

type StartArgs = JSONLike;
type FinishArgs = { credential: JSONLike };

async function newChallenge(
  context: { entities: { WebAuthnChallenge: { create: Function } } },
  challenge: string,
  purpose: "register" | "auth",
) {
  await context.entities.WebAuthnChallenge.create({
    data: {
      challenge,
      purpose,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
}

async function consumeChallenge(
  context: {
    entities: {
      WebAuthnChallenge: {
        findUnique: Function;
        delete: Function;
        deleteMany: Function;
      };
    };
  },
  challenge: string,
  purpose: "register" | "auth",
) {
  // Best-effort cleanup of expired challenges
  await context.entities.WebAuthnChallenge.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  const row = await context.entities.WebAuthnChallenge.findUnique({
    where: { challenge },
  });
  if (!row || row.purpose !== purpose) {
    throw new Error("Challenge not found, wrong purpose, or expired");
  }
  await context.entities.WebAuthnChallenge.delete({ where: { id: row.id } });
}

// --- Register ---------------------------------------------------------

export const passkeyRegisterStart: PasskeyRegisterStart<
  StartArgs,
  StartResult
> = async (_args, context) => {
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: `user-${Date.now()}`,
    userDisplayName: "wallet-wasp user",
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    supportedAlgorithmIDs: [-7], // ES256 (P-256) — Safe passkey signer
  });

  await newChallenge(
    context as never,
    options.challenge,
    "register",
  );

  return {
    challenge: options.challenge,
    options: options as unknown as Record<string, unknown>,
  };
};

export const passkeyRegisterFinish: PasskeyRegisterFinish<
  FinishArgs,
  FinishResult
> = async (args, context) => {
  const credential = args.credential as unknown as RegistrationResponseJSON;
  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge: credential.response.clientDataJSON
      ? JSON.parse(
          Buffer.from(credential.response.clientDataJSON, "base64url").toString(
            "utf-8",
          ),
        ).challenge
      : "",
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed");
  }

  const { credential: credInfo } = verification.registrationInfo;
  const credentialId = credInfo.id;
  const pubkeyBytes = credInfo.publicKey;

  // Validate the challenge was one we issued
  const clientData = JSON.parse(
    Buffer.from(credential.response.clientDataJSON, "base64url").toString(
      "utf-8",
    ),
  );
  await consumeChallenge(context as never, clientData.challenge, "register");

  // Real Safe v1.4.1 CREATE2 derivation: COSE pubkey → factory.getSigner →
  // Safe predicted address. Two RPC calls to Gnosis Chain.
  const { safeAddress } = await deriveSafeAddressFromCose(pubkeyBytes);
  const safeAddr: string = safeAddress;
  const pubkeyB64 = Buffer.from(pubkeyBytes).toString("base64url");

  const user = await context.entities.User.create({
    data: {},
  });

  await context.entities.Passkey.create({
    data: {
      credentialId,
      pubkey: pubkeyB64,
      safeAddr,
      signCount: credInfo.counter,
      userId: user.id,
    },
  });

  return {
    userId: user.id,
    safeAddr,
    sessionToken: signSession({ userId: user.id }),
  };
};

// --- Authenticate -----------------------------------------------------

export const passkeyAuthStart: PasskeyAuthStart<
  StartArgs,
  StartResult
> = async (_args, context) => {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
  });

  await newChallenge(context as never, options.challenge, "auth");

  return {
    challenge: options.challenge,
    options: options as unknown as Record<string, unknown>,
  };
};

export const passkeyAuthFinish: PasskeyAuthFinish<
  FinishArgs,
  FinishResult
> = async (args, context) => {
  const credential = args.credential as unknown as AuthenticationResponseJSON;
  const passkey = await context.entities.Passkey.findUnique({
    where: { credentialId: credential.id },
  });
  if (!passkey) throw new Error("Unknown credential");

  const clientData = JSON.parse(
    Buffer.from(credential.response.clientDataJSON, "base64url").toString(
      "utf-8",
    ),
  );

  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge: clientData.challenge,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(Buffer.from(passkey.pubkey, "base64url")),
      counter: passkey.signCount,
    },
    requireUserVerification: false,
  });

  if (!verification.verified) {
    throw new Error("Authentication failed");
  }

  await consumeChallenge(context as never, clientData.challenge, "auth");

  // Update signCount for replay protection
  await context.entities.Passkey.update({
    where: { id: passkey.id },
    data: { signCount: verification.authenticationInfo.newCounter },
  });

  return {
    userId: passkey.userId,
    safeAddr: passkey.safeAddr,
    sessionToken: signSession({ userId: passkey.userId }),
  };
};
