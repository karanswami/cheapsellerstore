declare module "@cashfreepayments/cashfree-js" {
  export type CashfreeMode = "sandbox" | "production";

  export type CashfreeCheckoutOptions = {
    paymentSessionId: string;
    redirectTarget?: "_self" | "_blank" | string;
  };

  export type CashfreeInstance = {
    checkout: (options: CashfreeCheckoutOptions) => Promise<unknown>;
  };

  export function load(options: {
    mode: CashfreeMode;
  }): Promise<CashfreeInstance | null>;
}
