import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import {
  createSupportBotStep,
  listSupportBotSteps,
  summarizeSupportBot,
  type SupportBotStepInput,
} from "@/lib/support-bot";
import { MAX_SUPPORT_BOT_BUTTONS } from "@/types/support";
import { z } from "zod";

const buttonSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(60),
  type: z.enum(["step", "link", "back", "input"]),
  row: z.number().int().min(1).max(20).optional(),
  targetStepId: z.string().trim().max(64).optional(),
  href: z.string().trim().max(300).optional(),
});

const createSchema = z.object({
  slug: z.string().trim().max(64).optional(),
  title: z.string().trim().min(1).max(120),
  messageText: z.string().trim().min(1).max(4000),
  isEntry: z.boolean().optional(),
  isFallback: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  buttons: z.array(buttonSchema).max(MAX_SUPPORT_BOT_BUTTONS),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const steps = await listSupportBotSteps();
  return jsonOk({ steps, summary: summarizeSupportBot(steps) });
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid step.",
      400,
    );
  }

  try {
    const input: SupportBotStepInput = {
      slug: parsed.data.slug ?? "",
      title: parsed.data.title,
      messageText: parsed.data.messageText,
      isEntry: parsed.data.isEntry,
      isFallback: parsed.data.isFallback,
      active: parsed.data.active,
      sortOrder: parsed.data.sortOrder,
      buttons: parsed.data.buttons,
    };
    const step = await createSupportBotStep(input);
    return jsonOk({ step });
  } catch (err) {
    return jsonError(
      "VALIDATION",
      err instanceof Error ? err.message : "Could not create step.",
      400,
    );
  }
}
