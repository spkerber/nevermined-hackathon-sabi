import { DurableObject } from "cloudflare:workers";
import type { Env } from "./types";
import type { AuthUser } from "./auth";

export interface Account {
  id: string;
  email: string;
  passwordHash: string | null;
  apiKey: string;
  createdAt: number;
}

export class AuthRegistry extends DurableObject<Env> {
  private accounts: Map<string, Account> = new Map();
  private emailIndex: Map<string, string> = new Map();
  private apiKeyIndex: Map<string, string> = new Map();
  private initialized = false;

  private async ensureLoaded() {
    if (this.initialized) return;
    const stored = await this.ctx.storage.get<Record<string, Account>>("accounts");
    if (stored) {
      for (const [id, account] of Object.entries(stored)) {
        this.accounts.set(id, account);
        this.emailIndex.set(account.email.toLowerCase(), id);
        this.apiKeyIndex.set(account.apiKey, id);
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
      createdAt: Date.now(),
    };

    this.accounts.set(account.id, account);
    this.emailIndex.set(emailLower, account.id);
    this.apiKeyIndex.set(account.apiKey, account.id);

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

  async getFullAccount(apiKey: string): Promise<Account | null> {
    await this.ensureLoaded();
    const id = this.apiKeyIndex.get(apiKey);
    return id ? this.accounts.get(id) ?? null : null;
  }
}
