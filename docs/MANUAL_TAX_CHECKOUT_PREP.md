# Manual tax checkout preparation

Status: **PREP ONLY — NOT LIVE**

This branch prepares a no-subscription sales-tax path without changing the current live purchase behavior.

## Guardrails

Do not merge or activate this checkout path until George explicitly approves the live implementation.

This branch does **not**:

- enable Stripe Tax automatic calculation;
- add any Stripe tax registration;
- create or alter live Stripe Tax Rate objects;
- create a new public Checkout route;
- activate digital sales;
- change existing Payment Links;
- change Products or Prices;
- change banking, payouts, identity, or legal-entity settings.

## Verified architecture

For Washington destinations, the Washington Department of Revenue provides an address-based Sales Tax Rate Lookup URL interface intended for shopping-cart/accounting integrations.

The future flow is:

1. Customer selects a product.
2. ByGeorge collects the destination address before creating Stripe Checkout.
3. Server asks Washington DOR for the current combined rate and DOR location code.
4. The server accepts only sufficiently resolved results for automatic checkout. Corrected/fallback results require address confirmation rather than silently guessing.
5. After live authorization, the server selects or creates the matching **inclusive** manual Stripe Tax Rate.
6. The server creates one Stripe-hosted Checkout Session for that purchase using the product Price and the selected fixed manual Tax Rate.
7. Customer still pays the advertised tax-inclusive total.

This is one checkout flow, not a separate checkout page per state.

## Important Stripe limitation

The live Checkout Session create schema currently available to the connected ByGeorge account exposes fixed line-item `tax_rates`; it does not expose a generally available dynamic manual-tax selector.

Therefore the website must know the applicable rate **before** the Checkout Session is created. Stripe-hosted Checkout can still be used, but the destination address must be collected or resolved first.

## Current Washington implementation

`src/lib/wa-sales-tax.ts` provides:

- validation for Washington destination addresses;
- the official DOR address-rate request;
- parsing of DOR's documented text response:
  `LocationCode=3406 Rate=0.084 ResultCode=0`;
- conservative handling of DOR result codes;
- conversion of the decimal rate to a percentage;
- inclusive-tax estimate math for verification.

No customer address is intentionally logged by this helper.

## Result-code policy

Automatic progression is currently limited to:

- `0`: address found;
- `1`: address not found, but ZIP+4 located.

These require address confirmation before automatic progression:

- `2`: address updated and found;
- `3`: address updated and ZIP+4 located;
- `4`: address corrected and found;
- `5`: only 5-digit ZIP located.

These stop checkout:

- `6`: address/ZIP could not be found;
- `9`: DOR internal error.

This policy can be relaxed later only after deliberate review.

## Unresolved before live activation

1. Verify ByGeorge's Washington Department of Revenue tax-registration status for UBI **606 260 328**. The Secretary of State formation/UBI alone does not prove a Washington DOR sales-tax registration.
2. Decide whether physical-item shipping is included in price or charged separately.
3. Build the pre-Checkout destination-address UI.
4. Implement the Stripe manual Tax Rate lookup/create layer.
5. Implement the Checkout Session creator using fixed inclusive manual Tax Rates.
6. Test in Stripe sandbox/test mode.
7. Verify fulfillment/webhooks.
8. Present the exact live changes to George for approval.
9. Only after approval: merge/deploy/activate the new live purchase path.

## Sources

- Washington DOR: WA Sales Tax Rate Lookup URL Interface
- Washington DOR: Determine the location of my sale
- Stripe: Manual Tax Rates / Checkout documentation
