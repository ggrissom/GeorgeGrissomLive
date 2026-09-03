# BIM launch status — September 3, 2026

## Current outcome

Implemented a BIM storefront, one-time Stripe checkout, durable PostgreSQL licensing, private downloads, two-computer activation checks, and a private 11-tool installer package. **Live sales are not enabled. The real Stripe sandbox end-to-end acceptance test is not yet complete.**

Repository: `ggrissom/GeorgeGrissomLive`. Base: `main` at `c798ae355619b4020d6e66283c7d6974c73fea3e`. Work branch: `feature/bim-storefront-license-launch`. The current attached brief and the committed launch brief both name this repository; the older bim-bygeorge-essentials checkout was only fetched/inspected.

Local preview: `http://127.0.0.1:3100/bim`. Branch deployment URL: pending push and Vercel result.

The existing `https://bim.georgegrissom.com` returned HTTP 200 with the original PyBIM title during preflight. No domain binding or production promotion has been changed. A hostname-specific rewrite is ready to serve `/bim` at that domain's root once this project is intentionally connected. The music root remains its original route for other hosts.

## Implemented and verified locally

- Catalog and detail routes for all 15 named utilities, with explicit deferred statuses and a provisional $129 suite containing 11 candidates.
- Installation, compatibility, license/refund/support, receipt, and key-based download pages.
- Separate BIM API routes; existing music checkout and webhook routes remain separate.
- Checkout validates an allowed product, an uploaded matching release, the Stripe price, amount, currency, payment mode and accepted terms. Eligible payment methods remain dynamic.
- Signed webhooks plus server-side paid-session retrieval. Delayed successful payments are handled. Duplicate/concurrent fulfillment retains one license/key. Refunds or disputes revoke access, including refund-before-fulfillment delivery order.
- Unique high-entropy keys, hashed lookup, AES-GCM encryption at rest. Receipt access requires the original checkout browser's HTTP-only cookie; an order or session URL alone is insufficient.
- PostgreSQL function locks the license row for atomic two-machine enforcement. Requests are rate limited in the database. Test licenses cannot activate in live mode.
- Private release bytes in PostgreSQL, capped at 4 MB. No public ZIP/source download route. No new storage or billing subscription required.
- Shared IronPython license gate before every packaged tool payload. Windows-protected local key storage, hashed Windows machine identity, 10-second network timeout, and a clear failure message before any model operation.
- Installer backs up the old extension outside pyRevit's scan path, requires Revit to be closed, and does not change execution policy or require administrator privileges.

## Verification results

| Check | Result |
|---|---|
| Production build | Passed complete final Next.js production build and BIM strict TypeScript gate |
| BIM strict TypeScript check | Passed; included in the build command |
| Repository lint | Passed, with one pre-existing music image optimization warning |
| Database/checkout/license tests | 8 passed using real PostgreSQL semantics through PGlite and a fake Stripe adapter |
| Python license gate tests | 7 passed with mocked pyRevit/transport, including separate individual keys and replacement-key entry |
| Archive generation | Passed; 11 wrappers and original tool payloads, no live-source edits |
| Local homepage HTTP | 200; BIM title and 11-tool suite present |
| Browser checks | Desktop layout inspected; catalog filter works; suite page lists 11 tools and keeps checkout disabled while unconfigured |
| Product/help pages | Suite, CennerIt, deferred Copy Scope, installation, download and terms pages all HTTP 200 |
| Windows installer parser | Zero PowerShell syntax errors; live installation not performed |
| Real Stripe-hosted test checkout | **Not run** — application sandbox credentials and backend environment are not connected |
| Real webhook delivery | **Not run** — requires reachable deployment plus sandbox webhook authorization |
| Revit / IronPython / DPAPI runtime | **Not run** — no actual tool execution in Revit has been performed |
| Production sales / domain switch | **Not performed** |

The original app suppresses global type errors during Next builds. A full repository type check found 22 existing music/Prisma/Jukebox errors; these are not claimed fixed. The new BIM code has its own strict build gate. Two admin navigation anchors were converted to Next Link to clear the existing lint errors. The old automatic `prisma db push --accept-data-loss` build step was removed; building now performs no database mutation.

Dependency audit reports seven advisories in the existing dependency families (five moderate, two high), including Next/PostCSS, Google API dependencies and XLSX. No blanket dependency upgrade or unrelated music importer rewrite is included. These remain tracked production-maintenance findings.

## Source and deferred work

See [BIM_SOURCE_AUDIT.md](BIM_SOURCE_AUDIT.md) for per-tool purpose, dependencies, source version ranges, hashes and risks. Four tools are excluded: both Copy Scope buttons (missing imported functions), Import Sheets (Excel COM dependency), and Ghostly Transmission (batch file/purge validation). Shortcut Matrix was found in an older disabled-panel Drive backup; conflicting slot counts, assignment locations and schemas keep it deferred.

All 11 packaged tools remain release candidates until real Revit checks pass. The local extension README explicitly requires that validation. Category packs and future major-version upgrades are deferred. Customer accounts and automated license email delivery are deferred; the current receipt presents the key and download in the checkout browser, with manual verified-email support for recovery. Do not launch without configuring a support contact and confirming that recovery workflow.

The pricing workbook contains consulting/service pricing rather than an approved 15-utility catalog. These utility prices follow the attached launch bands and remain provisional until sandbox and compatibility validation.

## Products and prices

No new Stripe product or price has been created. The connected Stripe plugin exposes live ByGeorge Consulting LLC only. The browser shows a separate ByGeorge sandbox. No existing unrelated product or price was edited.

| Product key | Proposed USD | Included / status | Stripe product ID | Stripe price ID |
|---|---:|---|---|---|
| launch-suite | 129 | 11 candidate tools | Not created | Not created |
| datalink | 49 | Candidate | Not created | Not created |
| element-explorer | 19 | Candidate | Not created | Not created |
| import-elements | 29 | Candidate | Not created | Not created |
| import-titleblock | 29 | Candidate | Not created | Not created |
| pushparams | 39 | Candidate | Not created | Not created |
| linked-view-mapper | 39 | Candidate | Not created | Not created |
| copy-scope-from | 19 | Deferred | Not created | Not created |
| copy-scope-to | 19 | Deferred | Not created | Not created |
| enlarged-views | 49 | Candidate | Not created | Not created |
| ghostly-transmission | 59 | Deferred | Not created | Not created |
| link-worksets | 19 | Candidate | Not created | Not created |
| import-sheets | 29 | Deferred | Not created | Not created |
| place-views | 39 | Candidate | Not created | Not created |
| cennerit | 9 | Candidate | Not created | Not created |
| view-template-manager | 29 | Candidate | Not created | Not created |

## Environment variables required — names only

- `BIM_DATABASE_URL` (or the existing `DATABASE_URL`)
- `BIM_PAYMENT_MODE`
- `BIM_STRIPE_SECRET_KEY`
- `BIM_STRIPE_WEBHOOK_SECRET`
- `BIM_STRIPE_ACCOUNT_ID`
- `BIM_STRIPE_PRICE_MAP`
- `BIM_LICENSE_ENCRYPTION_KEY`
- `BIM_SITE_URL`
- `BIM_RELEASE_VERSION`
- `BIM_SUPPORT_EMAIL`
- `BIM_LIVE_APPROVED`

No values or credentials are recorded here. Never rotate the encryption key without first migrating/re-encrypting stored licenses and preserving a secure backup. Separate test and production databases are recommended. No public Stripe key is needed for hosted checkout.

## Remaining authorization and acceptance steps

1. Restore access to the existing Vercel project. The connector returned no projects and a direct project read returned 404. The browser is now signed in and shows the existing george-grissom-live project; CLI access is being checked.
2. Securely configure the sandbox secret, test database connection, and license-encryption key in the application environment. The browser's sandbox login does not itself give the application credentials.
3. Run the additive `db/bim.sql` migration explicitly. Upload the private release, then run the sandbox-only catalog bootstrap. These scripts take credentials from their process environment and never log secret values. Copy the resulting nonsecret product/price IDs into this document.
4. Configure the deployed sandbox webhook for checkout completion, delayed payment success, refunds, and disputes. Its signing secret belongs in the deployment environment, not in source.
5. Complete one suite and one CennerIt checkout using Stripe test payment details. Verify actual event delivery, durable records, key retrieval, authorized ZIP, first/repeat/second activation, third-device rejection, wrong-tool rejection and refund revocation. Automated fake-adapter tests do not satisfy this step.
6. Run packaged CennerIt in actual Revit through the shared license module, then validate every other candidate on each advertised version using disposable model copies. Only a matching verified release can pass the live checkout gate.
7. After the required sandbox acceptance passes, prepare new live product/price IDs, configure support, enable only verified products, and confirm the requested domain is under the authorized Vercel account before rebinding. Do not reuse sandbox prices or overwrite unrelated live products.

## Private artifact

Local archive: `.bim-private/ByGeorge-0.1.0-preview.zip`. It is deliberately ignored by Git and must be uploaded only to the private release database. It points at the eventual BIM domain in test mode and must be rebuilt for an actual preview host before testing there. Its manifest is not runtime approval.

Archive SHA-256: `f701f12d092b085f811bc6abe83cd9137e69b6e8f3aee937f9fe8cd7a0f5fefc`.
