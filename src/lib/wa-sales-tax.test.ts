import test from "node:test";
import assert from "node:assert/strict";
import {
  estimateInclusiveTaxCents,
  lookupWashingtonSalesTaxRate,
  parseWashingtonTaxRateText
} from "./wa-sales-tax";

test("parses an exact WA DOR text response", () => {
  const result = parseWashingtonTaxRateText(
    "LocationCode=3406  Rate=0.084  ResultCode=0"
  );

  assert.deepEqual(result, {
    locationCode: "3406",
    rate: 0.084,
    percentage: 8.4,
    resultCode: 0,
    safeForAutomaticCheckout: true,
    requiresAddressConfirmation: false,
    source: "wa-dor-address-rates"
  });
});

test("requires confirmation when WA DOR corrected or fell back from the supplied address", () => {
  const corrected = parseWashingtonTaxRateText(
    "LocationCode=1726  Rate=0.1055  ResultCode=4"
  );
  assert.equal(corrected.safeForAutomaticCheckout, false);
  assert.equal(corrected.requiresAddressConfirmation, true);

  const zipOnly = parseWashingtonTaxRateText(
    "LocationCode=1726  Rate=0.1055  ResultCode=5"
  );
  assert.equal(zipOnly.safeForAutomaticCheckout, false);
  assert.equal(zipOnly.requiresAddressConfirmation, true);
});

test("rejects WA DOR not-found and internal-error results", () => {
  assert.throws(
    () => parseWashingtonTaxRateText("LocationCode=0000 Rate=0 ResultCode=6"),
    /could not locate/
  );
  assert.throws(
    () => parseWashingtonTaxRateText("LocationCode=0000 Rate=0 ResultCode=9"),
    /internal lookup error/
  );
});

test("builds the official WA DOR address lookup request without logging address data", async () => {
  let requestedUrl = "";
  const fakeFetch = (async (input: RequestInfo | URL) => {
    requestedUrl = String(input);
    return new Response("LocationCode=1726 Rate=0.1055 ResultCode=0", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }) as typeof fetch;

  const result = await lookupWashingtonSalesTaxRate(
    {
      address1: "700 5th Ave",
      city: "Seattle",
      state: "WA",
      postalCode: "98104"
    },
    fakeFetch
  );

  const url = new URL(requestedUrl);
  assert.equal(url.origin, "https://webgis.dor.wa.gov");
  assert.equal(url.pathname, "/webapi/AddressRates.aspx");
  assert.equal(url.searchParams.get("output"), "text");
  assert.equal(url.searchParams.get("addr"), "700 5th Ave");
  assert.equal(url.searchParams.get("city"), "Seattle");
  assert.equal(url.searchParams.get("zip"), "98104");
  assert.equal(result.percentage, 10.55);
});

test("rejects non-Washington addresses instead of assuming zero tax", async () => {
  await assert.rejects(
    () =>
      lookupWashingtonSalesTaxRate({
        address1: "1 Main St",
        city: "Portland",
        state: "OR",
        postalCode: "97201"
      }),
    /only accepts WA/
  );
});

test("inclusive-tax estimate preserves the advertised total", () => {
  assert.deepEqual(estimateInclusiveTaxCents(11000, 0.1055), {
    totalCents: 11000,
    taxableBaseCents: 9950,
    includedTaxCents: 1050
  });
});
