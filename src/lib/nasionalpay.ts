import "server-only";
import QRCode from "qrcode";
import {
  getNasionalpayChannel,
  getNasionalpayKey,
  requireConfigured,
} from "@/lib/payment-provider-config";

const BASE_URL = "https://merchant.nasionalpay.com/api/payment";

type RawResponse = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
};

async function post(path: string, body: Record<string, unknown>): Promise<{ res: Response; raw: RawResponse }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const raw = (await res.json().catch(() => ({}))) as RawResponse;
  return { res, raw };
}

export type NasionalpayInvoice = {
  transactionId: string;
  channel: "QRIS" | "FUNDS";
  amount: number;
  qrString: string | null;
  qrImage: string | null;
  paymentUrl: string | null;
  expiredAt: string | null;
};

/** Creates a QRIS or DANA (FUNDS) invoice. Channel comes from the active gateway's settings. */
export async function createNasionalpayInvoice(options: {
  amountIdr: number;
  username: string;
}): Promise<NasionalpayInvoice> {
  const amount = Math.round(options.amountIdr);
  const key = await requireConfigured(await getNasionalpayKey(), "NasionalPay store key");
  const channel = await getNasionalpayChannel();

  const { res, raw } = await post("/generate", {
    key,
    channel,
    amount,
    player_username: options.username,
  });
  const data = raw.data ?? {};
  const transactionId = String(data.transaction_id ?? "").trim();
  const qrString = typeof data.qris_data === "string" ? data.qris_data.trim() : "";
  const qrUrl = typeof data.qris_image === "string" ? data.qris_image.trim() : "";
  const paymentUrl = typeof data.payment_url === "string" ? data.payment_url.trim() : "";

  const usable = channel === "QRIS" ? Boolean(qrString || qrUrl) : Boolean(paymentUrl);
  if (!res.ok || raw.success === false || !transactionId || !usable) {
    console.error("NASIONALPAY_CREATE_FAILED", { status: res.status, amount, channel, response: raw });
    throw new Error(raw.message || `NasionalPay invoice creation failed (HTTP ${res.status})`);
  }

  const qrImage = qrString ? await QRCode.toDataURL(qrString, { width: 360, margin: 1 }) : qrUrl || null;
  return {
    transactionId,
    channel,
    amount: Number(data.amount ?? amount) || amount,
    qrString: qrString || null,
    qrImage,
    paymentUrl: paymentUrl || null,
    expiredAt: typeof data.expired_at === "string" ? data.expired_at : null,
  };
}

export type NasionalpayStatus = "pending" | "success" | "expired" | "failed" | "unknown";

/** POST /status — also the only trustworthy confirmation, since callbacks carry no signature. */
export async function checkNasionalpayStatus(
  transactionId: string,
): Promise<{ status: NasionalpayStatus; amount?: number; rawStatus?: string }> {
  const key = await requireConfigured(await getNasionalpayKey(), "NasionalPay store key");
  let result: Awaited<ReturnType<typeof post>>;
  try {
    result = await post("/status", { key, transaction_id: transactionId });
  } catch (err) {
    console.warn("NASIONALPAY_STATUS_FETCH_FAILED", { transactionId, err });
    return { status: "unknown", rawStatus: "network_error" };
  }
  const { res, raw } = result;
  if (!res.ok) return { status: "unknown", rawStatus: `HTTP_${res.status}` };

  const rawStatus = String(raw.data?.status ?? "").trim();
  const value = rawStatus.toLowerCase();
  const n = Number(raw.data?.amount);
  const amount = Number.isFinite(n) ? n : undefined;

  if (["success", "paid", "settlement", "completed"].includes(value)) return { status: "success", amount, rawStatus };
  if (["pending", "waiting", "unpaid", "process", "processing"].includes(value)) return { status: "pending", amount, rawStatus };
  if (["expired", "expire"].includes(value)) return { status: "expired", amount, rawStatus };
  if (["failed", "fail", "cancel", "cancelled", "canceled"].includes(value)) return { status: "failed", amount, rawStatus };
  return { status: "unknown", amount, rawStatus };
}
