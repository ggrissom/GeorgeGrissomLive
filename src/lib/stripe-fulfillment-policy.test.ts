import test from "node:test";
import assert from "node:assert/strict";
import { isFulfillmentEventType, isPaidCheckoutSession } from "./stripe-fulfillment-policy";

test("webhook fulfillment accepts completed and asynchronous payment success events", () => {
  assert.equal(isFulfillmentEventType("checkout.session.completed"), true);
  assert.equal(isFulfillmentEventType("checkout.session.async_payment_succeeded"), true);
  assert.equal(isFulfillmentEventType("checkout.session.async_payment_failed"), false);
});

test("entitlements are granted only for sessions Stripe reports as paid", () => {
  assert.equal(isPaidCheckoutSession({ payment_status: "paid" }), true);
  assert.equal(isPaidCheckoutSession({ payment_status: "unpaid" }), false);
  assert.equal(isPaidCheckoutSession({ payment_status: "no_payment_required" }), false);
  assert.equal(isPaidCheckoutSession({}), false);
});
