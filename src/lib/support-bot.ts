import { prisma } from "@/lib/prisma";
import {
  MAX_SUPPORT_BOT_BUTTONS,
  type SupportBotButton,
  type SupportBotStepRow,
  type SupportButton,
  type SupportChatReply,
} from "@/types/support";

function parseButtons(raw: unknown): SupportBotButton[] {
  if (!Array.isArray(raw)) return [];
  const out: SupportBotButton[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const label = typeof o.label === "string" ? o.label : "";
    const type = o.type;
    if (!id || !label) continue;
    if (type !== "step" && type !== "link" && type !== "back" && type !== "input") {
      continue;
    }
    const btn: SupportBotButton = { id, label, type };
    if (typeof o.targetStepId === "string" && o.targetStepId) {
      btn.targetStepId = o.targetStepId;
    }
    if (typeof o.href === "string" && o.href) {
      btn.href = o.href;
    }
    if (typeof o.row === "number" && Number.isFinite(o.row) && o.row > 0) {
      btn.row = Math.min(20, Math.floor(o.row));
    }
    out.push(btn);
  }
  return out.slice(0, MAX_SUPPORT_BOT_BUTTONS);
}

function toRow(row: {
  id: string;
  slug: string;
  title: string;
  messageText: string;
  isEntry: boolean;
  isFallback: boolean;
  active: boolean;
  sortOrder: number;
  buttons: unknown;
  createdAt: Date;
  updatedAt: Date;
}): SupportBotStepRow {
  return {
    ...row,
    buttons: parseButtons(row.buttons),
  };
}

export function mapStepButtons(buttons: SupportBotButton[]): SupportButton[] {
  return buttons.map((b) => {
    const row = b.row && b.row > 0 ? b.row : undefined;
    if (b.type === "link" && b.href) {
      return { id: b.id, label: b.label, href: b.href, row };
    }
    if (b.type === "back") {
      return { id: b.id, label: b.label, action: "back", row };
    }
    if (b.type === "input") {
      return { id: b.id, label: b.label, action: "focus_input", row };
    }
    return { id: b.id, label: b.label, meta: b.targetStepId, row };
  });
}

function replyFromStep(
  step: SupportBotStepRow,
  source: SupportChatReply["source"],
  userEcho?: string,
): SupportChatReply {
  return {
    reply: step.messageText,
    source,
    stepId: step.id,
    stepSlug: step.slug,
    buttons: mapStepButtons(step.buttons),
    userEcho,
  };
}

export async function listSupportBotSteps(): Promise<SupportBotStepRow[]> {
  const rows = await prisma.supportBotStep.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  return rows.map(toRow);
}

export async function listActiveSupportBotSteps(): Promise<SupportBotStepRow[]> {
  const rows = await prisma.supportBotStep.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  return rows.map(toRow);
}

export async function getSupportBotStep(id: string): Promise<SupportBotStepRow | null> {
  const row = await prisma.supportBotStep.findUnique({ where: { id } });
  return row ? toRow(row) : null;
}

export async function getEntryStep(): Promise<SupportBotStepRow | null> {
  const row = await prisma.supportBotStep.findFirst({
    where: { active: true, isEntry: true },
    orderBy: { sortOrder: "asc" },
  });
  if (row) return toRow(row);
  const fallback = await prisma.supportBotStep.findFirst({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return fallback ? toRow(fallback) : null;
}

export async function getFallbackStep(): Promise<SupportBotStepRow | null> {
  const row = await prisma.supportBotStep.findFirst({
    where: { active: true, isFallback: true },
    orderBy: { sortOrder: "asc" },
  });
  if (row) return toRow(row);
  return getEntryStep();
}

export type SupportBotNavigateInput = {
  stepId?: string | null;
  buttonId?: string | null;
  buttonAction?: string | null;
  message?: string | null;
};

export async function navigateSupportBot(
  input: SupportBotNavigateInput,
): Promise<SupportChatReply> {
  const message = input.message?.trim() ?? "";
  const buttonId = input.buttonId?.trim() || null;
  const buttonAction = input.buttonAction?.trim() || null;
  const stepId = input.stepId?.trim() || null;

  if (buttonAction === "back" && stepId) {
    const step = await getSupportBotStep(stepId);
    if (step?.active) {
      return replyFromStep(step, "bot", "Back");
    }
  }

  if (buttonId && stepId) {
    const current = await getSupportBotStep(stepId);
    if (!current?.active) {
      const entry = await getEntryStep();
      if (!entry) {
        return {
          reply: "Support bot is not configured yet.",
          source: "bot",
          stepId: "",
          stepSlug: "",
          buttons: [],
        };
      }
      return replyFromStep(entry, "bot");
    }

    const btn = current.buttons.find((b) => b.id === buttonId);
    if (!btn) {
      const fallback = await getFallbackStep();
      return fallback
        ? replyFromStep(fallback, "fallback", message || "…")
        : replyFromStep(current, "bot");
    }

    if (btn.type === "back") {
      const entry = await getEntryStep();
      if (entry) return replyFromStep(entry, "bot", btn.label);
      return replyFromStep(current, "bot", btn.label);
    }

    if (btn.type === "input") {
      return {
        reply: "Type your question below and send — we'll show the closest help options.",
        source: "bot",
        stepId: current.id,
        stepSlug: current.slug,
        buttons: mapStepButtons(current.buttons),
        userEcho: btn.label,
      };
    }

    if (btn.type === "link" && btn.href) {
      return {
        reply: `Opening ${btn.label}. You can also tap the button again anytime.`,
        source: "link",
        stepId: current.id,
        stepSlug: current.slug,
        buttons: [{ id: btn.id, label: btn.label, href: btn.href }],
        userEcho: btn.label,
      };
    }

    if (btn.type === "step" && btn.targetStepId) {
      const target = await getSupportBotStep(btn.targetStepId);
      if (target?.active) {
        return replyFromStep(target, "bot", btn.label);
      }
    }

    const fallback = await getFallbackStep();
    return fallback
      ? replyFromStep(fallback, "fallback", btn.label)
      : replyFromStep(current, "bot", btn.label);
  }

  if (message) {
    const fallback = await getFallbackStep();
    if (fallback) {
      return replyFromStep(fallback, "fallback", message);
    }
  }

  const entry = await getEntryStep();
  if (entry) {
    return replyFromStep(entry, "bot");
  }

  return {
    reply: "Support bot is not configured yet. Please check back later.",
    source: "bot",
    stepId: "",
    stepSlug: "",
    buttons: [],
  };
}

export type SupportBotStepInput = {
  slug: string;
  title: string;
  messageText: string;
  isEntry?: boolean;
  isFallback?: boolean;
  active?: boolean;
  sortOrder?: number;
  buttons: SupportBotButton[];
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}

function validateButtons(
  buttons: SupportBotButton[],
  stepIds: Set<string>,
  selfId?: string,
) {
  if (buttons.length > MAX_SUPPORT_BOT_BUTTONS) {
    throw new Error(`At most ${MAX_SUPPORT_BOT_BUTTONS} buttons per step.`);
  }
  for (const b of buttons) {
    if (!b.id?.trim() || !b.label?.trim()) {
      throw new Error("Each button needs an id and label.");
    }
    if (b.type === "step") {
      if (!b.targetStepId) throw new Error("Step buttons need a target step.");
      if (!stepIds.has(b.targetStepId)) {
        throw new Error("Button target step does not exist.");
      }
      if (selfId && b.targetStepId === selfId) {
        throw new Error("A step cannot link to itself.");
      }
    }
    if (b.type === "link" && !b.href?.trim()) {
      throw new Error("Link buttons need an href.");
    }
  }
}

async function clearExclusiveFlags(
  field: "isEntry" | "isFallback",
  exceptId?: string,
) {
  await prisma.supportBotStep.updateMany({
    where: exceptId ? { id: { not: exceptId }, [field]: true } : { [field]: true },
    data: { [field]: false },
  });
}

export async function createSupportBotStep(
  input: SupportBotStepInput,
): Promise<SupportBotStepRow> {
  const slug = slugify(input.slug || input.title);
  if (!slug) throw new Error("Slug is required.");

  const all = await prisma.supportBotStep.findMany({ select: { id: true } });
  const stepIds = new Set(all.map((s) => s.id));
  validateButtons(input.buttons, stepIds);

  if (input.isEntry) await clearExclusiveFlags("isEntry");
  if (input.isFallback) await clearExclusiveFlags("isFallback");

  const row = await prisma.supportBotStep.create({
    data: {
      slug,
      title: input.title.trim(),
      messageText: input.messageText.trim(),
      isEntry: input.isEntry ?? false,
      isFallback: input.isFallback ?? false,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 100,
      buttons: input.buttons,
    },
  });
  return toRow(row);
}

export async function updateSupportBotStep(
  id: string,
  input: Partial<SupportBotStepInput>,
): Promise<SupportBotStepRow> {
  const existing = await prisma.supportBotStep.findUnique({ where: { id } });
  if (!existing) throw new Error("Step not found.");

  const all = await prisma.supportBotStep.findMany({ select: { id: true } });
  const stepIds = new Set(all.map((s) => s.id));
  if (input.buttons) {
    validateButtons(input.buttons, stepIds, id);
  }

  if (input.isEntry) await clearExclusiveFlags("isEntry", id);
  if (input.isFallback) await clearExclusiveFlags("isFallback", id);

  const row = await prisma.supportBotStep.update({
    where: { id },
    data: {
      ...(input.slug !== undefined ? { slug: slugify(input.slug) } : {}),
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.messageText !== undefined
        ? { messageText: input.messageText.trim() }
        : {}),
      ...(input.isEntry !== undefined ? { isEntry: input.isEntry } : {}),
      ...(input.isFallback !== undefined ? { isFallback: input.isFallback } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.buttons !== undefined ? { buttons: input.buttons } : {}),
    },
  });
  return toRow(row);
}

export async function deleteSupportBotStep(id: string): Promise<SupportBotStepRow> {
  const existing = await prisma.supportBotStep.findUnique({ where: { id } });
  if (!existing) throw new Error("Step not found.");

  const all = await listSupportBotSteps();
  for (const step of all) {
    if (step.id === id) continue;
    for (const btn of step.buttons) {
      if (btn.type === "step" && btn.targetStepId === id) {
        throw new Error(
          `Step is linked from "${step.title}". Remove that button first.`,
        );
      }
    }
  }

  await prisma.supportBotStep.delete({ where: { id } });
  return toRow(existing);
}

export function summarizeSupportBot(steps: SupportBotStepRow[]) {
  const active = steps.filter((s) => s.active).length;
  const entry = steps.find((s) => s.isEntry);
  return {
    total: steps.length,
    active,
    entryTitle: entry?.title ?? "Not set",
  };
}
