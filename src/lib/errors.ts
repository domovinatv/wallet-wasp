// User-facing error strings — Croatian. Maps DOMException.name first, then
// substring-matches .message for non-DOMException errors.

type Context = "camera" | "passkey" | "clipboard" | "share" | "generic";

export function humanizeError(
  err: unknown,
  ctx: Context = "generic",
): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
        return notAllowed(ctx);
      case "NotFoundError":
        return notFound(ctx);
      case "NotReadableError":
        return "Resurs je trenutno zauzet (možda ga druga aplikacija drži). Pokušaj ponovno.";
      case "NotSupportedError":
        return "Ovaj preglednik ne podržava tu radnju.";
      case "AbortError":
        return ctx === "passkey"
          ? "Otkazao si Face ID prompt."
          : "Radnja je prekinuta.";
      case "SecurityError":
        return "Sigurnosno ograničenje preglednika spriječilo je radnju.";
      case "InvalidStateError":
        return "Krivo stanje sustava. Pokušaj ponovno.";
      case "TimeoutError":
        return "Isteklo je vrijeme.";
      case "TypeError":
        return "Neispravan format podatka.";
      case "ConstraintError":
        return "Sustav ne može ispuniti zahtjev s tim parametrima.";
      default:
        break;
    }
  }

  const raw = err instanceof Error ? err.message : String(err);
  const lc = raw.toLowerCase();

  if (lc.includes("not allowed") || lc.includes("permission")) {
    return notAllowed(ctx);
  }
  if (lc.includes("user denied") || lc.includes("user cancelled")) {
    return ctx === "passkey"
      ? "Otkazao si Face ID prompt."
      : "Korisnik je odbio dozvolu.";
  }
  if (lc.includes("aborted") || lc.includes("cancel")) {
    return "Radnja je prekinuta.";
  }
  if (lc.includes("no camera") || lc.includes("camera not found")) {
    return "Nije pronađena dostupna kamera.";
  }
  if (lc.includes("clipboard")) {
    return "Pristup clipboard-u nije dopušten.";
  }
  if (lc.includes("https") || lc.includes("secure context")) {
    return "Ova radnja zahtijeva HTTPS.";
  }
  if (lc.includes("rate limit") || lc.includes("too many")) {
    return "Dosegnut je dnevni limit. Pokušaj kasnije.";
  }

  return raw || "Dogodila se nepoznata greška.";
}

function notAllowed(ctx: Context): string {
  switch (ctx) {
    case "camera":
      return "Pristup kameri nije dopušten. Dozvoli kameru u postavkama preglednika.";
    case "passkey":
      return "Face ID / passkey nije odobren. Pokušaj ponovno.";
    case "clipboard":
      return "Pristup clipboard-u nije dopušten.";
    case "share":
      return "Dijeljenje nije dopušteno u ovom kontekstu.";
    default:
      return "Zatraženo dopuštenje sustav nije odobrio.";
  }
}

function notFound(ctx: Context): string {
  switch (ctx) {
    case "camera":
      return "Nije pronađena dostupna kamera.";
    case "passkey":
      return "Passkey nije pronađen. Otvori na izvornom uređaju ili kreiraj novi wallet.";
    default:
      return "Traženi resurs nije pronađen.";
  }
}
