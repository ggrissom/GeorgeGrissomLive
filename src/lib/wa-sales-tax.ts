export type WashingtonTaxAddress = {
  address1: string;
  city: string;
  state: string;
  postalCode: string;
};

export type WashingtonTaxLookupResult = {
  locationCode: string;
  rate: number;
  percentage: number;
  resultCode: number;
  safeForAutomaticCheckout: boolean;
  requiresAddressConfirmation: boolean;
  source: "wa-dor-address-rates";
};

const WA_DOR_ADDRESS_RATE_URL =
  "https://webgis.dor.wa.gov/webapi/AddressRates.aspx";

export function parseWashingtonTaxRateText(text: string): WashingtonTaxLookupResult {
  const match = text
    .trim()
    .match(/LocationCode=\s*([0-9]{4})\s+Rate=\s*([0-9.]+)\s+ResultCode=\s*([0-9]+)/i);

  if (!match) {
    throw new Error("WA DOR returned an unrecognized tax-rate response");
  }

  const [, locationCode, rawRate, rawResultCode] = match;
  const rate = Number(rawRate);
  const resultCode = Number(rawResultCode);

  if (!Number.isFinite(rate) || rate < 0 || rate >= 1) {
    throw new Error("WA DOR returned an invalid tax rate");
  }

  if (resultCode === 6 || resultCode === 9) {
    throw new Error(
      resultCode === 6
        ? "WA DOR could not locate the address, ZIP+4, or ZIP"
        : "WA DOR reported an internal lookup error"
    );
  }

  if (resultCode < 0 || resultCode > 9 || resultCode === 7 || resultCode === 8) {
    throw new Error(`WA DOR returned unsupported result code ${resultCode}`);
  }

  const requiresAddressConfirmation = [2, 3, 4, 5].includes(resultCode);

  return {
    locationCode,
    rate,
    percentage: Number((rate * 100).toFixed(4)),
    resultCode,
    safeForAutomaticCheckout: resultCode === 0 || resultCode === 1,
    requiresAddressConfirmation,
    source: "wa-dor-address-rates"
  };
}

export async function lookupWashingtonSalesTaxRate(
  address: WashingtonTaxAddress,
  fetchImpl: typeof fetch = fetch
): Promise<WashingtonTaxLookupResult> {
  if (address.state.trim().toUpperCase() !== "WA") {
    throw new Error("Washington tax lookup only accepts WA addresses");
  }

  const address1 = address.address1.trim();
  const city = address.city.trim();
  const postalCode = address.postalCode.trim();

  if (!address1 || !postalCode) {
    throw new Error("Street address and ZIP code are required for WA tax lookup");
  }

  if (!/^\d{5}(?:-?\d{4})?$/.test(postalCode)) {
    throw new Error("WA tax lookup requires a 5-digit or ZIP+4 postal code");
  }

  const url = new URL(WA_DOR_ADDRESS_RATE_URL);
  url.searchParams.set("output", "text");
  url.searchParams.set("addr", address1);
  url.searchParams.set("city", city);
  url.searchParams.set("zip", postalCode);

  const response = await fetchImpl(url, {
    method: "GET",
    headers: { Accept: "text/plain" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`WA DOR tax lookup failed with HTTP ${response.status}`);
  }

  return parseWashingtonTaxRateText(await response.text());
}

export function estimateInclusiveTaxCents(totalCents: number, rate: number) {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error("Total amount must be a non-negative integer number of cents");
  }
  if (!Number.isFinite(rate) || rate < 0 || rate >= 1) {
    throw new Error("Tax rate must be a decimal between 0 and 1");
  }

  const taxableBaseCents = Math.round(totalCents / (1 + rate));
  return {
    totalCents,
    taxableBaseCents,
    includedTaxCents: totalCents - taxableBaseCents
  };
}
