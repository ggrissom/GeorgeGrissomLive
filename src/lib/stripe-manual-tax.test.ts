import test from "node:test";
import assert from "node:assert/strict";
import { findOrCreateInclusiveWashingtonTaxRate } from "./stripe-manual-tax";

function fakeStripe(existing: any[] = []) {
  const created: any[] = [];
  return {
    taxRates: {
      async list() {
        return { data: existing };
      },
      async create(input: any) {
        const rate = { id: "txr_created", active: true, ...input };
        created.push(rate);
        return rate;
      }
    },
    created
  };
}

test("reuses an existing matching inclusive Washington rate", async () => {
  const stripe = fakeStripe([
    {
      id: "txr_existing",
      active: true,
      inclusive: true,
      country: "US",
      state: "WA",
      percentage: 10.55
    }
  ]);

  const result = await findOrCreateInclusiveWashingtonTaxRate(stripe as any, 10.55);
  assert.equal(result.id, "txr_existing");
  assert.equal(stripe.created.length, 0);
});

test("does not reuse an exclusive or out-of-state rate", async () => {
  const stripe = fakeStripe([
    {
      id: "txr_wrong",
      active: true,
      inclusive: false,
      country: "US",
      state: "WA",
      percentage: 10.55
    },
    {
      id: "txr_other_state",
      active: true,
      inclusive: true,
      country: "US",
      state: "CA",
      percentage: 10.55
    }
  ]);

  const result = await findOrCreateInclusiveWashingtonTaxRate(stripe as any, 10.55);
  assert.equal(result.id, "txr_created");
  assert.equal(stripe.created.length, 1);
  assert.deepEqual(stripe.created[0], {
    id: "txr_created",
    active: true,
    display_name: "Sales Tax",
    description: "Washington combined sales tax rate sourced from WA DOR",
    inclusive: true,
    percentage: 10.55,
    country: "US",
    state: "WA",
    jurisdiction: "Washington"
  });
});

test("rejects invalid percentages", async () => {
  const stripe = fakeStripe();
  await assert.rejects(
    () => findOrCreateInclusiveWashingtonTaxRate(stripe as any, -1),
    /between 0 and 100/
  );
  await assert.rejects(
    () => findOrCreateInclusiveWashingtonTaxRate(stripe as any, 100),
    /between 0 and 100/
  );
});
