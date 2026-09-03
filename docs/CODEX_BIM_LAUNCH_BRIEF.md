# Codex execution brief — launch bim.georgegrissom.com

## Goal
Get a temporary but real ByGeorge BIM storefront live as fast as possible so the existing pyRevit tools can be sold as downloadable digital products with activation keys. Do the implementation, not another planning pass.

## Canonical sources
- Website repo: `ggrissom/GeorgeGrissomLive` (`main`) — Next.js app with Vercel config.
- Active BIM source on George laptop: `C:\Dev\ByGeorge\ByGeorge.tab`.
- Google Drive contains backed-up `ByGeorge.tab` trees and individual button folders. Search exact folder names if local laptop access is unavailable. Example Drive `ByGeorge.tab`: https://drive.google.com/drive/folders/15uQYKSSigGxmOaR6uT0xesJyucAd7cLe
- Current BIM offerings/pricing workbook: https://docs.google.com/spreadsheets/d/1FhYxS3L8K51zcaGpC145bn1I5cEKw1Ki4Ot9ySzxU4o/edit
- Stripe live account: **ByGeorge Consulting LLC**. Existing live products `Fffunf` and `Ff` are junk/test entries; do not treat them as the BIM catalog.

## Live tool inventory
Treat these 15 active buttons as the canonical launch inventory unless inspection of current source proves a newer state:
1. DataLink
2. Element Explorer
3. Import Elements From Model
4. Import Titleblock From Model
5. PushParams
6. Linked View Mapper
7. Copy Scope From
8. Copy Scope To
9. Enl Views AUTO
10. Ghostly Transmission
11. Turn Off Link Levels Grids Scope Worksets
12. Import Sheets
13. Place Views On Sheets
14. CennerIt
15. ViewTemplateManager

There is also a disabled `Shortcut Matrix.panel.off`; inspect it and include it only if it is genuinely launch-ready.

## Required implementation
1. Audit the actual current source for all listed tools. Record purpose, dependencies, supported Revit versions, pyRevit requirements, obvious failures, and whether each is safe to sell tonight.
2. Choose a ruthless launch scope. Prefer one shared installer/download with entitlements rather than 15 separate installers. Individual prices may still map to feature entitlements.
3. Build/update the BIM storefront for `bim.georgegrissom.com` in the existing Next.js/Vercel stack. It must be clearly a BIM/Revit tools storefront, not George's music site.
4. Implement product catalog, product detail cards/pages, pricing, bundle pricing, compatibility notes, install instructions, license terms/refund/support copy, and calls to action.
5. Implement Stripe one-time checkout using Checkout Sessions or Payment Links. Do not invent a complex billing architecture. Keep dynamic payment methods.
6. Implement post-purchase fulfillment:
   - successful payment creates entitlement/license record
   - generate unique activation key
   - provide buyer with download access and key
   - activation endpoint validates key + product entitlement
   - reasonable machine activation limit (default 2 unless source/product constraints suggest otherwise)
   - never commit secrets
7. Store license data in the simplest durable backend already compatible with the stack. If Supabase already exists and is suitable, use it. Otherwise use the least-complex persistent option that works on Vercel.
8. Add license-check integration to the pyRevit tools with a shared licensing module so each tool can check the entitlement it requires. Degrade cleanly with a clear activation message.
9. Package the downloadable ByGeorge extension so a non-developer can install it. Prefer a one-click Windows installer if practical; otherwise provide a clean ZIP plus an installer script and explicit UI instructions as the temporary launch version.
10. Test the complete path in Stripe sandbox first: storefront -> checkout -> webhook -> entitlement -> license key -> download -> activation -> tool entitlement.
11. Only after sandbox end-to-end passes, prepare live Stripe products/prices/payment links or Checkout price IDs. Do not overwrite unrelated Stripe data.
12. Deploy to Vercel and bind/verify `bim.georgegrissom.com` if the domain is already under the connected project/account.
13. Produce `docs/BIM_LAUNCH_STATUS.md` with exactly what is live, what is intentionally deferred, all product/price IDs, environment variables required (names only, never values), deployment URL, and smoke-test results.

## Pricing directive
Price from customer value/time saved, not from script line count. Use launch-night impulse pricing for individual utilities and a compelling full-suite bundle. You may adjust after inspecting each tool, but default bands are:
- small utility: $9–$19
- standard productivity tool: $19–$39
- strong workflow automation: $39–$79
- category packs: $49–$99
- full 15-tool introductory bundle: target roughly $99–$149 unless the audit clearly supports higher

The site does not need 15 separate primary CTAs. Highlight the strongest tools and the full suite; still support individual entitlements/prices.

## Non-negotiable acceptance criteria
- A buyer can pay for at least the full suite and one individual tool in Stripe sandbox.
- Successful checkout creates a real entitlement and unique activation key.
- Download is gated to a valid purchase/license path.
- At least one tool validates an entitlement end-to-end using the shared licensing module; roll the same pattern across launch-ready tools.
- No secret keys are committed.
- Build/tests pass.
- The site visibly identifies Revit/pyRevit compatibility and installation prerequisites.
- The temporary implementation is simple enough to support tonight.
- Do not stop to ask George technical implementation questions that can be resolved by inspecting the repo/source. Make the best engineering choice and document it.

## Human-approval boundary
Proceed autonomously through source edits, tests, sandbox Stripe setup, packaging, and deployment previews. Pause only when an external service explicitly requires a human approval/credential authorization or immediately before an irreversible live-money configuration that cannot be safely validated in sandbox first.
