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
  constructor(message = "Payment required. Set your Nevermined Agent ID via: sabi config nvmAgentId <id>") {
    super(message);
    this.name = "PaymentRequiredError";
  }
}

export class PaymentFailedError extends SabiError {
  constructor(message: string) {
    super(`Payment failed: ${message}`);
    this.name = "PaymentFailedError";
  }
}
