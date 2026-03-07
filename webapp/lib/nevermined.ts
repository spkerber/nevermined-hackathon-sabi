"use client";

const NVM_APPS: Record<string, string> = {
  sandbox: "https://sandbox.nevermined.app",
  live: "https://nevermined.app",
};

export function getNvmAppUrl(environment: string): string {
  return NVM_APPS[environment] ?? NVM_APPS.sandbox;
}
