import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

/** Per-gateway overrides read by `payment-provider-config` getters. */
export type GatewayContext = {
  creds: Record<string, string>;
  qrUrl: string;
};

const store = new AsyncLocalStorage<GatewayContext>();

export function runWithGateway<T>(ctx: GatewayContext, fn: () => Promise<T>): Promise<T> {
  return store.run(ctx, fn);
}

export function currentGateway(): GatewayContext | undefined {
  return store.getStore();
}

/** Gateway-specific credential if set, else undefined (callers fall back to global config). */
export function gatewayCred(key: string): string | undefined {
  return currentGateway()?.creds[key]?.trim() || undefined;
}
