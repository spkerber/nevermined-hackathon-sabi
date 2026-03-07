const NVM_BACKENDS: Record<string, string> = {
  sandbox: "https://api.sandbox.nevermined.app",
  live: "https://api.nevermined.app",
};

export function getNvmBackendUrl(environment: string): string {
  return NVM_BACKENDS[environment] ?? NVM_BACKENDS.sandbox;
}
