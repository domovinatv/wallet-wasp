// COSE_Key (EC2) → P-256 (x, y) bigint pair.
//
// WebAuthn attestation responses encode the public key as a COSE_Key
// CBOR map. For EC2 (P-256, alg = -7), the relevant fields are:
//   1 = kty (= 2 for EC2)
//   3 = alg (= -7 for ES256)
//   -1 = crv (= 1 for P-256)
//   -2 = x (32 bytes)
//   -3 = y (32 bytes)
//
// @simplewebauthn/server returns the publicKey as the raw COSE_Key bytes
// inside verification.registrationInfo.credential.publicKey. We parse
// minimally — just enough to find -2 and -3 byte strings — without
// pulling a full CBOR library.

function bytesToBigInt(b: Uint8Array): bigint {
  let n = 0n;
  for (const byte of b) n = (n << 8n) | BigInt(byte);
  return n;
}

interface CborView {
  view: DataView;
  offset: number;
}

function readUint(c: CborView, additionalInfo: number): number {
  if (additionalInfo < 24) return additionalInfo;
  if (additionalInfo === 24) {
    const v = c.view.getUint8(c.offset);
    c.offset += 1;
    return v;
  }
  if (additionalInfo === 25) {
    const v = c.view.getUint16(c.offset, false);
    c.offset += 2;
    return v;
  }
  if (additionalInfo === 26) {
    const v = c.view.getUint32(c.offset, false);
    c.offset += 4;
    return v;
  }
  throw new Error(
    "COSE: unsupported additional info " + additionalInfo + " (uint64 not handled)",
  );
}

function readKey(c: CborView): number {
  const initial = c.view.getUint8(c.offset);
  c.offset += 1;
  const majorType = initial >> 5;
  const additionalInfo = initial & 0x1f;
  if (majorType === 0) {
    return readUint(c, additionalInfo);
  }
  if (majorType === 1) {
    const v = readUint(c, additionalInfo);
    return -1 - v;
  }
  throw new Error("COSE: expected integer key, got major type " + majorType);
}

function readValueBytes(c: CborView): Uint8Array | null {
  const initial = c.view.getUint8(c.offset);
  c.offset += 1;
  const majorType = initial >> 5;
  const additionalInfo = initial & 0x1f;

  if (majorType === 0) {
    readUint(c, additionalInfo);
    return null;
  }
  if (majorType === 1) {
    readUint(c, additionalInfo);
    return null;
  }
  if (majorType === 2) {
    const len = readUint(c, additionalInfo);
    const bytes = new Uint8Array(c.view.buffer, c.view.byteOffset + c.offset, len);
    c.offset += len;
    return new Uint8Array(bytes);
  }
  throw new Error("COSE: unsupported value major type " + majorType);
}

/**
 * Decode a COSE_Key (EC2 / P-256) into the (x, y) bigint pair Safe expects.
 * Throws if the key is not an EC2 P-256 key.
 */
export function coseToP256(coseBytes: Uint8Array): { x: bigint; y: bigint } {
  const view = new DataView(
    coseBytes.buffer,
    coseBytes.byteOffset,
    coseBytes.byteLength,
  );
  const c: CborView = { view, offset: 0 };

  const initial = view.getUint8(c.offset);
  c.offset += 1;
  const majorType = initial >> 5;
  const additionalInfo = initial & 0x1f;
  if (majorType !== 5) throw new Error("COSE: not a map");
  const numEntries = readUint(c, additionalInfo);

  let x: Uint8Array | null = null;
  let y: Uint8Array | null = null;

  for (let i = 0; i < numEntries; i++) {
    const key = readKey(c);
    const value = readValueBytes(c);
    if (key === -2) x = value;
    else if (key === -3) y = value;
  }

  if (!x || !y) {
    throw new Error("COSE: missing -2 (x) or -3 (y) — not an EC2 P-256 key");
  }
  return { x: bytesToBigInt(x), y: bytesToBigInt(y) };
}
