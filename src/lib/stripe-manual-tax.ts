import type Stripe from "stripe";

const RATE_TOLERANCE = 0.00005;

export async function findOrCreateInclusiveWashingtonTaxRate(
  stripe: Stripe,
  percentage: number
) {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage >= 100) {
    throw new Error("Washington tax percentage must be between 0 and 100");
  }

  const existing = await stripe.taxRates.list({
    active: true,
    limit: 100
  });

  const match = existing.data.find(rate =>
    rate.inclusive === true &&
    rate.country === "US" &&
    rate.state === "WA" &&
    Math.abs(Number(rate.percentage) - percentage) < RATE_TOLERANCE
  );

  if (match) return match;

  return stripe.taxRates.create({
    display_name: "Sales Tax",
    description: "Washington combined sales tax rate sourced from WA DOR",
    inclusive: true,
    percentage,
    country: "US",
    state: "WA",
    jurisdiction: "Washington"
  });
}
