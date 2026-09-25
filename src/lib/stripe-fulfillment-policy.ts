export function isFulfillmentEventType(type: string) {
  return type === "checkout.session.completed" ||
    type === "checkout.session.async_payment_succeeded";
}

export function isPaidCheckoutSession(session: { payment_status?: string | null }) {
  return session.payment_status === "paid";
}
