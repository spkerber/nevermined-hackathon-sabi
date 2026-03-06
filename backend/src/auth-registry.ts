import { DurableObject } from "cloudflare:workers";
import type { Env } from "./types";
import type { AuthUser } from "./auth";

export interface Account {
  id: string;
  email: string;
  passwordHash: string | null;
  apiKey: string;
  nvmApiKey: string | null;
  githubId: string | null;
  googleId: string | null;
  createdAt: number;
}

export class AuthRegistry extends DurableObject<Env> {
  private accounts: Map<string, Account> = new Map();
  private emailIndex: Map<string, string> = new Map();
  private apiKeyIndex: Map<string, string> = new Map();
  private githubIndex: Map<string, string> = new Map();
  private googleIndex: Map<string, string> = new Map();
  private initialized = false;

  private async ensureLoaded() {
    if (this.initialized) return;
    const stored = await this.ctx.storage.get<Record<string, Account>>("accounts");
    if (stored) {
      for (const [id, account] of Object.entries(stored)) {
        this.accounts.set(id, account);
        this.emailIndex.set(account.email.toLowerCase(), id);
        this.apiKeyIndex.set(account.apiKey, id);
        if (account.githubId) this.githubIndex.set(account.githubId, id);
        if (account.googleId) this.googleIndex.set(account.googleId, id);
      }
    }
    this.initialized = true;
  }

  private async save() {
    await this.ctx.storage.put("accounts", Object.fromEntries(this.accounts));
  }

  async createAccount(params: {
    email: string;
    passwordHash: string | null;
    apiKey: string;
    nvmApiKey?: string;
    githubId?: string;
    googleId?: string;
  }): Promise<Account> {
    await this.ensureLoaded();

    const emailLower = params.email.toLowerCase();
    if (this.emailIndex.has(emailLower)) {
      throw new Error("Account with this email already exists");
    }

    const account: Account = {
      id: crypto.randomUUID(),
      email: params.email,
      passwordHash: params.passwordHash,
      apiKey: params.apiKey,
      nvmApiKey: params.nvmApiKey ?? null,
      githubId: params.githubId ?? null,
      googleId: params.googleId ?? null,
      createdAt: Date.now(),
    };

    this.accounts.set(account.id, account);
    this.emailIndex.set(emailLower, account.id);
    this.apiKeyIndex.set(account.apiKey, account.id);
    if (account.githubId) this.githubIndex.set(account.githubId, account.id);
    if (account.googleId) this.googleIndex.set(account.googleId, account.id);

    await this.save();
    return account;
  }

  async getAccountByEmail(email: string): Promise<Account | null> {
    await this.ensureLoaded();
    const id = this.emailIndex.get(email.toLowerCase());
    return id ? this.accounts.get(id) ?? null : null;
  }

  async getAccountByApiKey(apiKey: string): Promise<AuthUser | null> {
    await this.ensureLoaded();
    const id = this.apiKeyIndex.get(apiKey);
    if (!id) return null;
    const account = this.accounts.get(id);
    if (!account) return null;
    return { id: account.id, email: account.email };
  }

  async getAccountByGithubId(githubId: string): Promise<Account | null> {
    await this.ensureLoaded();
    const id = this.githubIndex.get(githubId);
    return id ? this.accounts.get(id) ?? null : null;
  }

  async getAccountByGoogleId(googleId: string): Promise<Account | null> {
    await this.ensureLoaded();
    const id = this.googleIndex.get(googleId);
    return id ? this.accounts.get(id) ?? null : null;
  }

  async linkGithub(accountId: string, githubId: string): Promise<void> {
    await this.ensureLoaded();
    const account = this.accounts.get(accountId);
    if (!account) throw new Error("Account not found");
    account.githubId = githubId;
    this.githubIndex.set(githubId, accountId);
    await this.save();
  }

  async linkGoogle(accountId: string, googleId: string): Promise<void> {
    await this.ensureLoaded();
    const account = this.accounts.get(accountId);
    if (!account) throw new Error("Account not found");
    account.googleId = googleId;
    this.googleIndex.set(googleId, accountId);
    await this.save();
  }

  async setNvmApiKey(accountId: string, nvmApiKey: string): Promise<void> {
    await this.ensureLoaded();
    const account = this.accounts.get(accountId);
    if (!account) throw new Error("Account not found");
    account.nvmApiKey = nvmApiKey;
    await this.save();
  }

  async getNvmApiKey(accountId: string): Promise<string | null> {
    await this.ensureLoaded();
    const account = this.accounts.get(accountId);
    return account?.nvmApiKey ?? null;
  }

  async getFullAccount(apiKey: string): Promise<Account | null> {
    await this.ensureLoaded();
    const id = this.apiKeyIndex.get(apiKey);
    return id ? this.accounts.get(id) ?? null : null;
  }
}
