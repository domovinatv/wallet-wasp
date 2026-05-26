# wallet-wasp — WASP rewrite eksperiment

**Powered by [domovina.ai](https://domovina.ai)** · Standalone WASP-language
rewrite of the production [wallet.domovina.ai](https://wallet.domovina.ai)
(passkey-owned Safe self-custody wallet on Gnosis).

> **North Star — open-wallet**
>
> Ovaj repo je **incubation seed** za potencijalni `open-wallet` template
> po uzoru na [wasp-lang/open-saas](https://github.com/wasp-lang/open-saas):
> oficijelni WASP-blessed open-source šablon, ali za self-custody Web3
> wallet umjesto za SaaS. Po uspješnoj incubation fazi rename → release
> pod `domovinatv/open-wallet` (i potencijalno pod `wasp-lang/open-wallet`
> uz WASP team blessing).
>
> Strategijska odluka i kriteriji za rename dokumentirani u
> [ADR 0010](https://github.com/domovinatv/pay.domovina.ai/blob/main/docs/decisions/0010-open-wallet-vision.md).
> Praktične posljedice za code: **bez `domovina`/`DOMOVINA` hard-codeova u
> src/, sve preko brand config-a; generic naming komponenti; pluggable
> attestation providers; configurable chain.**

## What this repo is

A side-by-side experiment: take a production-validated React+CF-Workers
passkey-Safe wallet and rewrite it in [WASP](https://wasp.sh) (full-stack
React + Node.js + Prisma DSL framework). Goal: showcase WASP's "40% less
tokens for the same app" claim on a real-world dApp use case, and contribute
findings back to the WASP community (founders: Matija & Martin Šošić).

The production wallet at [wallet.domovina.ai](https://wallet.domovina.ai)
stays untouched — this is parallel R&D, not a migration. Ako se rewrite
incubation pokaže uspješnim (vidi ADR 0010), genericizacija + rename u
open-wallet je sljedeća iteracija.

## Layout

- `main.wasp`, `schema.prisma`, `src/` — the WASP rewrite (in-progress)
- `reference/` — **frozen specification**: pinned snapshot of the production
  monorepo [`domovinatv/pay.domovina.ai`](https://github.com/domovinatv/pay.domovina.ai)
  at commit [`7e2c6e0`](https://github.com/domovinatv/pay.domovina.ai/tree/7e2c6e0)
  (state right before this experiment started). The actual production wallet
  source we're rewriting lives at [`reference/wallet/`](./reference/wallet).
  This is a nested git submodule.

To pull the reference snapshot when cloning:

```bash
git clone --recurse-submodules git@github.com:domovinatv/wallet-wasp.git
# or, after a regular clone:
git submodule update --init
```

## Plan + status

Full plan, MVP scope, phased breakdown, and known risks are documented
in the parent monorepo at
[`docs/plans/wallet-wasp-experiment.md`](https://github.com/domovinatv/pay.domovina.ai/blob/main/docs/plans/wallet-wasp-experiment.md).

---

# Original `wasp new -t basic` README

Basic starter is a well-rounded template that showcases the most important bits of working with Wasp.

## Prerequisites

- **Node.js** (newest LTS version recommended): We recommend install Node through a Node version manager, e.g. `nvm`.
- **Wasp** (latest version): Install via
  ```sh
  npm i -g @wasp.sh/wasp-cli@latest
  ```

## Using the template

You can use this template through the Wasp CLI:

```bash
wasp new <project-name>
# or
wasp new <project-name> -t basic
```

## Development

To start the application locally for development or preview purposes:

1. Run `wasp db migrate-dev` to migrate the database to the latest migration
2. Run `wasp start` to start the Wasp application. If running for the first time, this will also install the client and the server dependencies for you.
3. The application should be running on `localhost:3000`. Open in it your browser to access the client.

To improve your Wasp development experience, we recommend installing the [Wasp extension for VSCode](https://marketplace.visualstudio.com/items?itemName=wasp-lang.wasp).

## Learn more

To find out more about Wasp, visit out [docs](https://wasp.sh/docs).
