import { getResendApiKey, getResendFromEmail } from "@/lib/auth-config";
import { Resend } from "resend";

let cachedKey: string | null = null;
let resendClient: Resend | null = null;

async function getResend(): Promise<Resend> {
  const apiKey = await getResendApiKey();
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }
  if (!resendClient || cachedKey !== apiKey) {
    resendClient = new Resend(apiKey);
    cachedKey = apiKey;
  }
  return resendClient;
}

export async function sendPasswordResetOtpEmail(params: {
  to: string;
  code: string;
  name?: string;
}) {
  if (!/^\d{6}$/.test(params.code)) {
    throw new Error("Invalid password reset OTP for email.");
  }

  const resendFromEmail = await getResendFromEmail();
  const greeting = params.name ? `Hi ${params.name},` : "Hi,";

  const client = await getResend();
  const { error } = await client.emails.send({
    from: resendFromEmail,
    to: params.to,
    subject: `${params.code} is your Cheap Seller password reset code`,
    text: [
      greeting,
      "",
      `Your password reset code is: ${params.code}`,
      "",
      "This code expires in 10 minutes. If you did not request a reset, you can ignore this email.",
      "",
      "— Cheap Seller",
    ].join("\n"),
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
        <p>${greeting}</p>
        <p>Your password reset code is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em; margin: 24px 0;">${params.code}</p>
        <p style="color: #555;">This code expires in 10 minutes. If you did not request a reset, you can ignore this email.</p>
        <p style="color: #555;">— Cheap Seller</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }
}
