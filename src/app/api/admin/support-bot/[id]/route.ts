import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import {
  deleteSupportBotStep,
  getSupportBotStep,
  updateSupportBotStep,
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

const patchSchema = z.object({
  slug: z.string().trim().max(64).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  messageText: z.string().trim().min(1).max(4000).optional(),
  isEntry: z.boolean().optional(),
  isFallback: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  buttons: z.array(buttonSchema).max(MAX_SUPPORT_BOT_BUTTONS).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const { id } = await params;
  const step = await getSupportBotStep(id);
  if (!step) return jsonError("NOT_FOUND", "Step not found.", 404);
  return jsonOk({ step });
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid step.",
      400,
    );
  }

  try {
    const step = await updateSupportBotStep(id, parsed.data as Partial<SupportBotStepInput>);
    return jsonOk({ step });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    const status = message === "Step not found." ? 404 : 400;
    return jsonError(status === 404 ? "NOT_FOUND" : "VALIDATION", message, status);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { id } = await params;
  try {
    const step = await deleteSupportBotStep(id);
    return jsonOk({ step, deleted: true });
  } catch (err) {
    return jsonError(
      "VALIDATION",
      err instanceof Error ? err.message : "Delete failed.",
      400,
    );
  }
}
