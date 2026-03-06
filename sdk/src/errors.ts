export class SabiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SabiError";
  }
}

export class ApiError extends SabiError {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(`HTTP ${status}: ${message}`);
    this.name = "ApiError";
  }
}

export class PaymentRequiredError extends SabiError {
  public readonly paymentInfo?: Record<string, unknown>;

  constructor(
    message = "Payment required. Obtain an x402 access token and pass it via accessToken param.",
    paymentInfo?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PaymentRequiredError";
    this.paymentInfo = paymentInfo;
  }
}

export class PaymentFailedError extends SabiError {
  constructor(message: string) {
    super(`Payment failed: ${message}`);
    this.name = "PaymentFailedError";
  }
}
